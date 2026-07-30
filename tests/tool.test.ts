import type { UnifiedSearchResult } from "../src/types.ts";
import { describe, expect, it, vi } from "vitest";
import { KeyPool } from "../src/key-pool.ts";
import { createWebSearchTool } from "../src/tool.ts";
import { DEFAULT_CONFIG } from "../src/types.ts";

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
    expect(firstCall.content[0]?.text).toContain("正在搜索");

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
});
