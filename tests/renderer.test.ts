import type { Theme } from "@earendil-works/pi-coding-agent";
import type { WebSearchDetails } from "../src/types.ts";
import { keyHint } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { renderSearchCall, renderSearchResult } from "../src/renderer.ts";

// mock keyHint，保留模块其他导出（formatter 依赖 truncateHead 等）
vi.mock("@earendil-works/pi-coding-agent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@earendil-works/pi-coding-agent")>();
  return { ...actual, keyHint: vi.fn((key: string, desc: string) => `[${key}:${desc}]`) };
});

/** 创建 mock Theme，返回带 spy 的 fg/bold */
function mockTheme() {
  const fg = vi.fn((_color: string, text: string) => text);
  const bold = vi.fn((text: string) => text);
  return { theme: { fg, bold } as unknown as Theme, fg, bold };
}

describe("renderSearchCall", () => {
  it("基本调用行", () => {
    const { theme, fg } = mockTheme();
    renderSearchCall({ query: "test" }, theme);
    expect(fg).toHaveBeenCalledWith("toolTitle", "doubao_web_search ");
    expect(fg).toHaveBeenCalledWith("accent", "\"test\"");
  });

  it("global 版标注", () => {
    const { theme, fg } = mockTheme();
    renderSearchCall({ query: "test", version: "global" }, theme);
    expect(fg).toHaveBeenCalledWith("dim", " (global)");
  });

  it("带 time_range", () => {
    const { theme, fg } = mockTheme();
    renderSearchCall({ query: "test", time_range: "OneWeek" }, theme);
    expect(fg).toHaveBeenCalledWith("muted", " OneWeek");
  });

  it("带 sites", () => {
    const { theme, fg } = mockTheme();
    renderSearchCall({ query: "test", sites: "github.com" }, theme);
    expect(fg).toHaveBeenCalledWith("dim", " @github.com");
  });

  it("带 block_hosts", () => {
    const { theme, fg } = mockTheme();
    renderSearchCall({ query: "test", block_hosts: "pinterest.com" }, theme);
    expect(fg).toHaveBeenCalledWith("dim", " -pinterest.com");
  });

  it("超长 query 截断到 60 字符", () => {
    const { theme, fg } = mockTheme();
    const longQuery = "q".repeat(100);
    renderSearchCall({ query: longQuery }, theme);
    const expected = `"${"q".repeat(60)}..."`;
    expect(fg).toHaveBeenCalledWith("accent", expected);
  });

  it("超长 sites 截断到 30 字符", () => {
    const { theme, fg } = mockTheme();
    const longSites = "abcdefghijklmnopqrstuvwxyz0123456789".repeat(3);
    renderSearchCall({ query: "test", sites: longSites }, theme);
    expect(fg).toHaveBeenCalledWith("dim", ` @${`${longSites.slice(0, 30)}...`}`);
  });
});

describe("renderSearchResult", () => {
  function makeDetails(overrides: Partial<WebSearchDetails> = {}): WebSearchDetails {
    return {
      query: "test",
      version: "custom",
      totalCount: 2,
      returnedCount: 2,
      detailLevel: "summary",
      truncated: false,
      keyUsed: "key1",
      results: [
        { title: "标题1", url: "https://example.com/1", snippet: "短摘要1", summary: "长摘要1" },
        { title: "标题2", url: "https://example.com/2", snippet: "短摘要2" },
      ],
      ...overrides,
    };
  }

  it("搜索中显示 isPartial", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails() },
      { expanded: false, isPartial: true },
      theme,
      { isError: false },
    );
    expect(fg).toHaveBeenCalledWith("warning", "Searching...");
  });

  it("isError 时显示搜索失败（优先于无结果）", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails() },
      { expanded: false, isPartial: false },
      theme,
      { isError: true },
    );
    expect(fg).toHaveBeenCalledWith("error", "Search failed");
  });

  it("isError 时即使无 details 也显示失败", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: undefined },
      { expanded: false, isPartial: false },
      theme,
      { isError: true },
    );
    expect(fg).toHaveBeenCalledWith("error", "Search failed");
  });

  it("isError 时显示 content 中的真实错误消息", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      {
        content: [{ type: "text", text: "All API keys unavailable. Key status: key1=exhausted" }],
        details: undefined,
      },
      { expanded: false, isPartial: false },
      theme,
      { isError: true },
    );
    expect(fg).toHaveBeenCalledWith("error", "All API keys unavailable. Key status: key1=exhausted");
    expect(fg).not.toHaveBeenCalledWith("error", "Search failed");
  });

  it("isError 错误消息过长时截断", () => {
    const { theme, fg } = mockTheme();
    const longErr = "e".repeat(300);
    renderSearchResult(
      { content: [{ type: "text", text: longErr }], details: undefined },
      { expanded: false, isPartial: false },
      theme,
      { isError: true },
    );
    expect(fg).toHaveBeenCalledWith("error", `${"e".repeat(120)}...`);
  });

  it("无结果显示", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails({ returnedCount: 0, results: [] }) },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("dim", "No results");
  });

  it("details 缺失时显示无结果", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: undefined },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("dim", "No results");
  });

  it("折叠视图显示结果数和展开提示", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails() },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("success", "✓ 2 results");
    expect(fg).toHaveBeenCalledWith("dim", " (Custom");
    expect(keyHint).toHaveBeenCalledWith("app.tools.expand", "expand");
  });

  it("global 版标记", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails({ version: "global" }) },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("dim", " (Global");
  });

  it("截断标记", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails({ truncated: true }) },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("warning", " (truncated)");
  });

  it("展开视图显示全部结果标题和 URL", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails() },
      { expanded: true, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("accent", "[1] 标题1");
    expect(fg).toHaveBeenCalledWith("accent", "[2] 标题2");
    expect(fg).toHaveBeenCalledWith("dim", "https://example.com/1");
    expect(fg).toHaveBeenCalledWith("dim", "https://example.com/2");
  });

  it("展开视图显示摘要", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails() },
      { expanded: true, isPartial: false },
      theme,
    );
    // 第一条有 summary，应显示
    expect(fg).toHaveBeenCalledWith("muted", "长摘要1");
    // 第二条只有 snippet，应显示 snippet
    expect(fg).toHaveBeenCalledWith("muted", "短摘要2");
  });

  it("展开视图长摘要截断到 200 字", () => {
    const { theme, fg } = mockTheme();
    const longSummary = "x".repeat(300);
    renderSearchResult(
      {
        details: makeDetails({
          results: [{ title: "t", url: "u", snippet: "s", summary: longSummary }],
        }),
      },
      { expanded: true, isPartial: false },
      theme,
    );
    const expected = `${"x".repeat(200)}...`;
    expect(fg).toHaveBeenCalledWith("muted", expected);
  });

  it("展开视图超过 5 条时只显示前 5 条并提示更多", () => {
    const { theme, fg } = mockTheme();
    const results = Array.from({ length: 8 }, (_, i) => ({
      title: `标题${i + 1}`,
      url: `https://example.com/${i + 1}`,
      snippet: `短摘要${i + 1}`,
    }));
    renderSearchResult(
      { details: makeDetails({ returnedCount: 8, results }) },
      { expanded: true, isPartial: false },
      theme,
    );

    // 只渲染前 5 条
    expect(fg).toHaveBeenCalledWith("accent", "[1] 标题1");
    expect(fg).toHaveBeenCalledWith("accent", "[5] 标题5");
    expect(fg).not.toHaveBeenCalledWith("accent", "[6] 标题6");
    // 提示剩余条数
    expect(fg).toHaveBeenCalledWith("dim", "... 3 more");
  });

  it("结果不超过 5 条时不显示 more 提示", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails() },
      { expanded: true, isPartial: false },
      theme,
    );
    expect(fg).not.toHaveBeenCalledWith("dim", "... 0 more");
  });

  it("多行 summary 预览为单行", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      {
        details: makeDetails({
          results: [{ title: "t", url: "u", snippet: "s", summary: "第一行\n第二行\n第三行" }],
        }),
      },
      { expanded: true, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("muted", "第一行 第二行 第三行");
  });
});
