import type { Theme } from "@earendil-works/pi-coding-agent";
import type { WebSearchDetails } from "../src/types.ts";
import { keyHint } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { renderSearchCall, renderSearchResult } from "../src/renderer.ts";

// mock keyHint
vi.mock("@earendil-works/pi-coding-agent", () => ({
  keyHint: vi.fn((key: string, desc: string) => `[${key}:${desc}]`),
}));

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
    );
    expect(fg).toHaveBeenCalledWith("warning", "搜索中...");
  });

  it("无结果显示", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails({ returnedCount: 0, results: [] }) },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("dim", "无结果");
  });

  it("details 缺失时显示无结果", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: undefined },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("dim", "无结果");
  });

  it("折叠视图显示结果数和展开提示", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails() },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("success", "✓ 2 条结果");
    expect(fg).toHaveBeenCalledWith("dim", " (Custom版");
    expect(keyHint).toHaveBeenCalledWith("app.tools.expand", "展开");
  });

  it("global 版标记", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails({ version: "global" }) },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("dim", " (Global版");
  });

  it("截断标记", () => {
    const { theme, fg } = mockTheme();
    renderSearchResult(
      { details: makeDetails({ truncated: true }) },
      { expanded: false, isPartial: false },
      theme,
    );
    expect(fg).toHaveBeenCalledWith("warning", " (已截断)");
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
});
