import type { UnifiedSearchRequest } from "../src/types.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchWithKeyPool } from "../src/client.ts";
import { customAdapter } from "../src/custom-adapter.ts";
import { DoubaoApiError, ErrorCode, getErrorStrategy, SearchError } from "../src/errors.ts";
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

  it("内部错误 10500 同 Key 重试后成功", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(errorBody(10500, "inner error")))
      .mockResolvedValueOnce(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const outcome = await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG);
    expect(outcome.keyLabel).toBe("key1");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    // 内部错误不标记 Key
    const status = pool.getStatus();
    expect(status.find(s => s.label === "key1")?.status).toBe("active");
  });

  it("换 Key 时触发 onRetry 回调", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(errorBody(700429, "rate limited")))
      .mockResolvedValueOnce(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const onRetry = vi.fn();
    const outcome = await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG, undefined, onRetry);
    expect(outcome.keyLabel).toBe("key2");
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith({
      attempt: 1,
      keyLabel: "key2",
      reason: "rate limited",
    });
  });

  it("首次尝试成功时不触发 onRetry", async () => {
    mockFetch.mockResolvedValue(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const onRetry = vi.fn();
    await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG, undefined, onRetry);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("内部错误同 Key 重试耗尽后换 Key", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(errorBody(10500, "inner")))
      .mockResolvedValueOnce(makeResponse(errorBody(10500, "inner")))
      .mockResolvedValueOnce(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const outcome = await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG);
    expect(outcome.keyLabel).toBe("key2");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("网络连接错误换 Key 重试", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const outcome = await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG);
    expect(outcome.keyLabel).toBe("key2");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("网络错误重试耗尽后抛出", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("Network request failed");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("超时不换 Key 重试", async () => {
    const timeoutError = new Error("The operation timed out");
    timeoutError.name = "TimeoutError";
    mockFetch.mockRejectedValue(timeoutError);

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("Search request timed out");
    // 超时可能已在服务端计费，不重试
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("非 2xx 且带 API 错误体时触发 failover", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response(
        JSON.stringify(errorBody(700429, "rate limited")),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ))
      .mockResolvedValueOnce(makeResponse(successBody()));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const outcome = await searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG);
    expect(outcome.keyLabel).toBe("key2");

    // k1 应被标记为 rate_limited（错误体被解析而非丢弃）
    const status = pool.getStatus();
    expect(status.find(s => s.label === "key1")?.status).toBe("rate_limited");
  });

  it("响应体不是 JSON 时抛出友好错误", async () => {
    mockFetch.mockResolvedValue(new Response("<html>gateway error</html>", { status: 200 }));

    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("Failed to parse search response");
  });

  it("空 Key 池时提示未配置", async () => {
    const pool = new KeyPool([]);
    await expect(searchWithKeyPool(pool, customAdapter, baseReq, DEFAULT_CONFIG))
      .rejects
      .toThrow("No API key configured");
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
      .toThrow("All API keys unavailable");
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
      .toThrow("Search request timed out");
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
      .toThrow("Search cancelled");
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
    expect(getErrorStrategy(ErrorCode.InvalidSearchType)).toBe("fatal");
  });

  it("内部错误码返回 retrySameKey", () => {
    expect(getErrorStrategy(ErrorCode.InnerError)).toBe("retrySameKey");
    expect(getErrorStrategy(ErrorCode.FreeQuotaLinkError)).toBe("retrySameKey");
  });

  it("未知错误码默认 fatal", () => {
    expect(getErrorStrategy(99999)).toBe("fatal");
  });
});

describe("SearchError", () => {
  it("携带 code", () => {
    const err = new SearchError("Search cancelled.", "aborted");
    expect(err.code).toBe("aborted");
    expect(err.message).toBe("Search cancelled.");
    expect(err.name).toBe("SearchError");
    expect(err instanceof Error).toBe(true);
  });

  it("超时错误携带 timeout code", () => {
    const err = new SearchError("Request timed out", "timeout");
    expect(err.code).toBe("timeout");
  });
});
