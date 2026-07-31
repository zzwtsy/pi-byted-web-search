import type { UnifiedSearchResult } from "../src/types.ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyPool } from "../src/key-pool.ts";
import { createWebSearchTool } from "../src/tool.ts";
import { DEFAULT_CONFIG } from "../src/types.ts";

afterEach(() => {
  // 断言失败时末尾的 spy.mockRestore() 不会执行，这里兜底防止 spy 状态污染后续测试
  vi.restoreAllMocks();
});

/** mock searchWithKeyPool 的返回值 */
function mockOutcome(result: UnifiedSearchResult, keyLabel = "key1") {
  return { result, keyLabel };
}

/** 构造成功结果 */
function successResult(overrides: Partial<UnifiedSearchResult> = {}): UnifiedSearchResult {
  return {
    totalCount: 1,
    results: [{
      title: "测试标题",
      url: "https://example.com",
      snippet: "短摘要",
      summary: "长摘要",
    }],
    version: "custom",
    ...overrides,
  };
}

describe("createWebSearchTool", () => {
  it("工具定义基本属性", () => {
    const pool = new KeyPool([]);
    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);
    expect(tool.name).toBe("doubao_web_search");
    expect(tool.label).toBe("Web Search");
    expect(tool.promptSnippet).toBeDefined();
    expect(tool.promptGuidelines).toHaveLength(2);
    expect(tool.renderCall).toBeDefined();
    expect(tool.renderResult).toBeDefined();
  });

  it("execute 正常返回格式化结果", async () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    // mock searchWithKeyPool
    const mockModule = await import("../src/client.ts");
    const spy = vi.spyOn(mockModule, "searchWithKeyPool")
      .mockResolvedValue(mockOutcome(successResult()));

    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);
    const result = await tool.execute(
      "call-1",
      { query: "测试搜索" },
      undefined,
      undefined,
      {} as never,
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    const content = result.content[0];
    if (content.type === "text") {
      expect(content.text).toContain("测试标题");
      expect(content.text).toContain("Query: 测试搜索");
    }

    const details = result.details as { query: string; version: string; keyUsed: string };
    expect(details.query).toBe("测试搜索");
    expect(details.version).toBe("custom");
    expect(details.keyUsed).toBe("key1");

    spy.mockRestore();
  });

  it("execute 调用 onUpdate", async () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const mockModule = await import("../src/client.ts");
    const spy = vi.spyOn(mockModule, "searchWithKeyPool")
      .mockResolvedValue(mockOutcome(successResult()));

    const onUpdate = vi.fn();
    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);
    await tool.execute("call-1", { query: "test" }, undefined, onUpdate, {} as never);

    // 至少调用两次：开始搜索 + 找到结果
    expect(onUpdate).toHaveBeenCalledTimes(2);
    const firstCall = onUpdate.mock.calls[0]?.[0] as { content: Array<{ type: string; text: string }> };
    expect(firstCall.content[0]?.text).toContain("Searching");

    spy.mockRestore();
  });

  it("version=global 使用 globalAdapter", async () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const mockModule = await import("../src/client.ts");
    const spy = vi.spyOn(mockModule, "searchWithKeyPool")
      .mockResolvedValue(mockOutcome(successResult({ version: "global" })));

    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);
    const result = await tool.execute(
      "call-1",
      { query: "test", version: "global" },
      undefined,
      undefined,
      {} as never,
    );

    // 验证传入 searchWithKeyPool 的 adapter 是 globalAdapter
    const passedAdapter = spy.mock.calls[0][1];
    expect(passedAdapter.version).toBe("global");

    const details = result.details as { version: string };
    expect(details.version).toBe("global");

    spy.mockRestore();
  });

  it("version=global 仅传 query 时不报 unsupportedParams", async () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const mockModule = await import("../src/client.ts");
    const spy = vi.spyOn(mockModule, "searchWithKeyPool")
      .mockResolvedValue(mockOutcome(successResult({ version: "global" })));

    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);
    const result = await tool.execute(
      "call-1",
      { query: "test", version: "global" },
      undefined,
      undefined,
      {} as never,
    );

    const details = result.details as { results: unknown[]; version: string };
    const content = result.content[0] as { type: string; text: string };
    expect(content.text).not.toContain("were ignored");
    expect((result.details as { version: string }).version).toBe("global");
    expect(details.results).toBeDefined();

    spy.mockRestore();
  });

  it("version=global 传 time_range 时结果标记 unsupportedParams", async () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const mockModule = await import("../src/client.ts");
    const spy = vi.spyOn(mockModule, "searchWithKeyPool")
      .mockResolvedValue(mockOutcome(successResult({ version: "global" })));

    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);
    const result = await tool.execute(
      "call-1",
      { query: "test", version: "global", time_range: "OneWeek" },
      undefined,
      undefined,
      {} as never,
    );

    const content = result.content[0] as { type: string; text: string };
    expect(content.text).toContain("were ignored: time_range");
    expect(content.text).not.toContain("sites");

    spy.mockRestore();
  });

  it("include_images=true 时透传到 req（仅 Global 生效）", async () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const mockModule = await import("../src/client.ts");
    const spy = vi.spyOn(mockModule, "searchWithKeyPool")
      .mockResolvedValue(mockOutcome(successResult({ version: "global" })));

    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);
    await tool.execute(
      "call-1",
      { query: "test", version: "global", include_images: true },
      undefined,
      undefined,
      {} as never,
    );

    const passedReq = spy.mock.calls[0][2] as { includeImages?: boolean };
    expect(passedReq.includeImages).toBe(true);

    // 未传时缺省为 undefined（Global MaxImageCountPerDoc=0）
    await tool.execute("call-2", { query: "test", version: "global" }, undefined, undefined, {} as never);
    expect((spy.mock.calls[1][2] as { includeImages?: boolean }).includeImages).toBeUndefined();

    spy.mockRestore();
  });

  it("count 超过 10 时截断", async () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const mockModule = await import("../src/client.ts");
    const spy = vi.spyOn(mockModule, "searchWithKeyPool")
      .mockResolvedValue(mockOutcome(successResult()));

    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);
    await tool.execute("call-1", { query: "test", count: 50 }, undefined, undefined, {} as never);

    const passedReq = spy.mock.calls[0][2];
    expect(passedReq.count).toBe(10);

    spy.mockRestore();
  });

  it("config.defaultCount 越界时 clamp 到 [1,10]", async () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const mockModule = await import("../src/client.ts");
    const spy = vi.spyOn(mockModule, "searchWithKeyPool")
      .mockResolvedValue(mockOutcome(successResult()));

    // defaultCount = 0（下限）与非整数（取整）
    const toolLow = createWebSearchTool(() => pool, () => ({ ...DEFAULT_CONFIG, defaultCount: 0 }));
    await toolLow.execute("call-1", { query: "test" }, undefined, undefined, {} as never);
    expect(spy.mock.calls[0][2].count).toBe(1);

    const toolFloat = createWebSearchTool(() => pool, () => ({ ...DEFAULT_CONFIG, defaultCount: 4.7 }));
    await toolFloat.execute("call-1", { query: "test" }, undefined, undefined, {} as never);
    expect(spy.mock.calls[1][2].count).toBe(5);

    spy.mockRestore();
  });

  it("参数 schema 携带约束（min/max/pattern）", () => {
    const pool = new KeyPool([]);
    const tool = createWebSearchTool(() => pool, () => DEFAULT_CONFIG);

    const schema = tool.parameters as {
      properties: {
        query?: { minLength?: number; maxLength?: number };
        count?: { type?: string; minimum?: number; maximum?: number };
        time_range?: { pattern?: string };
      };
    };

    expect(schema.properties.query?.minLength).toBe(1);
    expect(schema.properties.query?.maxLength).toBe(100);
    expect(schema.properties.count?.type).toBe("integer");
    expect(schema.properties.count?.minimum).toBe(1);
    expect(schema.properties.count?.maximum).toBe(10);
    expect(schema.properties.time_range?.pattern).toBeDefined();
  });
});
