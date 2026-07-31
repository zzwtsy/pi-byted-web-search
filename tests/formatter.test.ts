import type { KeyState, UnifiedSearchResult } from "../src/types.ts";
import { describe, expect, it } from "vitest";
import { formatKeyStatus, formatResults } from "../src/formatter.ts";

function makeResult(overrides: Partial<UnifiedSearchResult> = {}): UnifiedSearchResult {
  return {
    totalCount: 2,
    results: [
      {
        title: "标题1",
        url: "https://example.com/1",
        snippet: "短摘要1",
        summary: "长摘要1".repeat(10),
        publishTime: "2025-06-19T15:10:00+08:00",
        siteName: "站点1",
        rankScore: 0.95,
        authInfoDes: "非常权威",
        authInfoLevel: 1,
      },
      {
        title: "标题2",
        url: "https://example.com/2",
        snippet: "短摘要2",
      },
    ],
    version: "custom",
    ...overrides,
  };
}

describe("formatResults", () => {
  it("输出包含查询词", () => {
    const text = formatResults(makeResult(), "summary", "测试查询");
    expect(text).toContain("查询: 测试查询");
  });

  it("未传 query 时查询行为空且不报错", () => {
    const text = formatResults(makeResult(), "summary");
    expect(text).toContain("查询: ");
  });

  it("detail_level=brief 输出紧凑格式", () => {
    const text = formatResults(makeResult(), "brief");
    expect(text).toContain("[1] 标题1");
    expect(text).toContain("https://example.com/1");
    expect(text).toContain("短摘要1");
    expect(text).not.toContain("🔗");
    expect(text).not.toContain("📝");
  });

  it("detail_level=summary 输出详细格式", () => {
    const text = formatResults(makeResult(), "summary");
    expect(text).toContain("[1] 标题1");
    expect(text).toContain("🔗 https://example.com/1");
    expect(text).toContain("📝");
    expect(text).toContain("站点: 站点1");
    expect(text).toContain("权威度: 非常权威");
    expect(text).toContain("相关度: 0.95");
  });

  it("detail_level=full 包含正文", () => {
    const result = makeResult({
      results: [{
        title: "标题",
        url: "https://example.com",
        snippet: "短",
        summary: "长摘要",
        content: "正文内容".repeat(100),
      }],
    });
    const text = formatResults(result, "full");
    expect(text).toContain("📄 正文");
    expect(text).toContain("正文内容");
  });

  it("detail_level=full 无正文时不显示正文行", () => {
    const result = makeResult({
      results: [{ title: "t", url: "u", snippet: "s" }],
    });
    const text = formatResults(result, "full");
    expect(text).not.toContain("📄 正文");
  });

  it("global 版输出 unsupportedParams 提示", () => {
    const text = formatResults(
      makeResult({ version: "global", unsupportedParams: ["time_range", "sites"] }),
      "summary",
    );
    expect(text).toContain("已被忽略: time_range, sites");
  });

  it("结果数小于总数时显示截断提示", () => {
    const text = formatResults(
      makeResult({ totalCount: 20, results: makeResult().results.slice(0, 1) }),
      "summary",
    );
    expect(text).toContain("共找到 20 条");
    expect(text).toContain("返回了 1 条");
  });

  it("空结果", () => {
    const text = formatResults(
      makeResult({ totalCount: 0, results: [] }),
      "summary",
    );
    expect(text).toContain("返回 0 条结果");
  });

  it("global 版标记", () => {
    const text = formatResults(makeResult({ version: "global" }), "brief");
    expect(text).toContain("Global");
  });

  it("custom 版标记", () => {
    const text = formatResults(makeResult({ version: "custom" }), "brief");
    expect(text).toContain("Custom");
  });
});

describe("formatKeyStatus", () => {
  it("空池", () => {
    expect(formatKeyStatus([])).toBe("未配置 API Key");
  });

  it("正常输出各字段", () => {
    const states: KeyState[] = [
      {
        key: "abc...xyz",
        label: "key1",
        billingType: "postpaid",
        status: "active",
        useCount: 5,
      },
    ];
    const text = formatKeyStatus(states);
    expect(text).toContain("[key1]");
    expect(text).toContain("postpaid");
    expect(text).toContain("active");
    expect(text).toContain("使用 5 次");
  });

  it("限流状态显示冷却时间", () => {
    const states: KeyState[] = [
      {
        key: "k",
        label: "key1",
        billingType: "subscription",
        status: "rate_limited",
        rateLimitedUntil: Date.now() + 30_000,
        useCount: 3,
      },
    ];
    const text = formatKeyStatus(states);
    expect(text).toContain("rate_limited");
    expect(text).toContain("冷却中");
  });

  it("耗尽状态显示错误原因", () => {
    const states: KeyState[] = [
      {
        key: "k",
        label: "key1",
        billingType: "postpaid",
        status: "exhausted",
        lastError: "额度耗尽",
        useCount: 500,
      },
    ];
    const text = formatKeyStatus(states);
    expect(text).toContain("exhausted");
    expect(text).toContain("额度耗尽");
  });
});
