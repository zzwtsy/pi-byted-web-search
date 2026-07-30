import type { UnifiedSearchRequest } from "../src/types.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchWithKeyPool } from "../src/client.ts";
import { customAdapter } from "../src/custom-adapter.ts";
import { DoubaoApiError, ErrorCode, getErrorStrategy } from "../src/errors.ts";
import { KeyPool } from "../src/key-pool.ts";
import { DEFAULT_CONFIG } from "../src/types.ts";

const baseReq: UnifiedSearchRequest = {
  query: "test",
  count: 5,
  detailLevel: "summary",
  contentFormat: "markdown",
};

/** 构造 API 成功响应体 */
function successBody(): unknown {
  return {
    ResponseMetadata: { RequestId: "req-ok" },
    Result: {
      ResultCount: 1,
      WebResults: [{
        Id: "1",
        SortId: 1,
        Title: "ok",
        Snippet: "snippet",
        AuthInfoDes: "正常权威",
        AuthInfoLevel: 2,
      }],
      TimeCost: 100,
      LogId: "log-1",
    },
  };
}

/** 构造 API 错误响应体 */
function errorBody(codeN: number, message: string): unknown {
  return {
    ResponseMetadata: { Error: { CodeN: codeN, Code: String(codeN), Message: message } },
    Result: null,
  };
}

/** 构造 fetch Response */
function makeResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("searchWithKeyPool", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("首次成功，不换 Key", async () => {
    mockFetch.mockResolvedValue(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const outcome = await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG);
    expect(outcome.keyLabel).toBe("key1");
    expect(outcome.result.totalCount).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("限流后切换到下一个 Key", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(errorBody(700429, "rate limited")))
      .mockResolvedValueOnce(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const outcome = await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG);
    expect(outcome.keyLabel).toBe("key2");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // k1 应被标记为 rate_limited
    const status = pool.getStatus();
    expect(status.find(s => s.label === "key1")?.status).toBe("rate_limited");
  });

  it("额度耗尽后切换到下一个 Key", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(errorBody(10406, "quota exhausted")))
      .mockResolvedValueOnce(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const outcome = await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG);
    expect(outcome.keyLabel).toBe("key2");

    // k1 应被标记为 exhausted
    const status = pool.getStatus();
    expect(status.find(s => s.label === "key1")?.status).toBe("exhausted");
  });

  it("参数错误不切换 Key，直接抛出", async () => {
    mockFetch.mockResolvedValue(makeResponse(errorBody(10400, "query is empty")));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("query is empty");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("所有 Key 都不可用时抛出错误", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(errorBody(700429, "rate limited")))
      .mockResolvedValueOnce(makeResponse(errorBody(700429, "rate limited")));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("所有 API Key 均不可用");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("网络超时时抛出友好错误", async () => {
    const timeoutError = new Error("The operation timed out");
    timeoutError.name = "TimeoutError";
    mockFetch.mockRejectedValue(timeoutError);

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("搜索请求超时");
  });

  it("用户取消时抛出友好错误", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValue(abortError);

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("搜索已取消");
  });

  it("hTTP 非 200 时抛出错误", async () => {
    mockFetch.mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("HTTP 500");
  });
});

describe("DoubaoApiError", () => {
  it("携带 codeN", () => {
    const err = new DoubaoApiError(ErrorCode.FreeQuotaExhausted, "额度耗尽");
    expect(err.codeN).toBe(10406);
    expect(err.message).toBe("额度耗尽");
    expect(err.name).toBe("DoubaoApiError");
    expect(err instanceof Error).toBe(true);
  });
});

describe("getErrorStrategy", () => {
  it("限流码返回 rateLimited", () => {
    expect(getErrorStrategy(ErrorCode.RateLimited)).toBe("rateLimited");
  });

  it("额度耗尽码返回 exhausted", () => {
    expect(getErrorStrategy(ErrorCode.FreeQuotaExhausted)).toBe("exhausted");
    expect(getErrorStrategy(ErrorCode.PackageQuotaExhausted)).toBe("exhausted");
    expect(getErrorStrategy(ErrorCode.InvalidApiKey)).toBe("exhausted");
  });

  it("参数错误码返回 fatal", () => {
    expect(getErrorStrategy(ErrorCode.ParamError)).toBe("fatal");
    expect(getErrorStrategy(ErrorCode.InnerError)).toBe("fatal");
  });

  it("未知错误码默认 fatal", () => {
    expect(getErrorStrategy(99999)).toBe("fatal");
  });
});
