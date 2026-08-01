import type { CustomApiResponse } from "../src/custom-adapter.ts";
import type { UnifiedSearchRequest } from "../src/types.ts";
import { describe, expect, it } from "vitest";
import { customAdapter } from "../src/custom-adapter.ts";
import { DEFAULT_CONFIG } from "../src/types.ts";

const baseReq: UnifiedSearchRequest = {
  query: "测试",
  count: 5,
  detailLevel: "summary",
  contentFormat: "markdown",
};

describe("customAdapter.buildRequest", () => {
  it("基本请求体映射", () => {
    const body = customAdapter.buildRequest(baseReq, DEFAULT_CONFIG);
    expect(body).toMatchObject({
      Query: "测试",
      SearchType: "web",
      Count: 5,
      ContentFormats: "markdown",
    });
  });

  it("count 上限 50", () => {
    const body = customAdapter.buildRequest({ ...baseReq, count: 100 }, DEFAULT_CONFIG);
    expect(body).toMatchObject({ Count: 50 });
  });

  it("带过滤参数", () => {
    const body = customAdapter.buildRequest(
      { ...baseReq, sites: "a.com|b.com", blockHosts: "c.com", timeRange: "OneWeek" },
      DEFAULT_CONFIG,
    );
    expect(body).toMatchObject({
      Filter: { Sites: "a.com|b.com", BlockHosts: "c.com" },
      TimeRange: "OneWeek",
    });
  });

  it("无过滤参数时不包含 Filter.Sites 等", () => {
    const body = customAdapter.buildRequest(baseReq, DEFAULT_CONFIG);
    const filter = body.Filter as Record<string, unknown>;
    expect(filter.Sites).toBeUndefined();
    expect(filter.BlockHosts).toBeUndefined();
    expect(filter.AuthInfoLevel).toBeUndefined();
    expect(body.TimeRange).toBeUndefined();
  });

  it("config.industry 映射", () => {
    const body = customAdapter.buildRequest(baseReq, { ...DEFAULT_CONFIG, industry: "finance" });
    expect(body).toMatchObject({ Industry: "finance" });
  });

  it("config.authInfoLevel 映射", () => {
    const body = customAdapter.buildRequest(baseReq, { ...DEFAULT_CONFIG, authInfoLevel: 1 });
    expect(body).toMatchObject({ Filter: { AuthInfoLevel: 1 } });
  });

  it("detail_level=full 时 NeedContent=true", () => {
    const body = customAdapter.buildRequest({ ...baseReq, detailLevel: "full" }, DEFAULT_CONFIG);
    expect(body).toMatchObject({ Filter: { NeedContent: true } });
  });

  it("detail_level=summary/brief 时 NeedContent=false", () => {
    const summaryBody = customAdapter.buildRequest(baseReq, DEFAULT_CONFIG);
    expect(summaryBody).toMatchObject({ Filter: { NeedContent: false } });

    const briefBody = customAdapter.buildRequest({ ...baseReq, detailLevel: "brief" }, DEFAULT_CONFIG);
    expect(briefBody).toMatchObject({ Filter: { NeedContent: false } });
  });
});

describe("customAdapter.parseResponse", () => {
  it("正常响应字段映射", () => {
    const raw: CustomApiResponse = {
      ResponseMetadata: { RequestId: "req-1" },
      Result: {
        ResultCount: 2,
        WebResults: [
          {
            Id: "id-1",
            SortId: 1,
            Title: "标题1",
            SiteName: "站点1",
            Url: "https://example.com/1",
            Snippet: "短摘要",
            Summary: "长摘要",
            Content: "正文内容",
            PublishTime: "2025-06-19T15:10:00+08:00",
            RankScore: 0.95,
            AuthInfoDes: "非常权威",
            AuthInfoLevel: 1,
          },
          {
            Id: "id-2",
            SortId: 2,
            Title: "标题2",
            Snippet: "短摘要2",
            AuthInfoDes: "正常权威",
            AuthInfoLevel: 2,
          },
        ],
        SearchContext: { SearchType: "web", OriginQuery: "测试" },
        TimeCost: 372,
        LogId: "log-1",
      },
    };

    const result = customAdapter.parseResponse(raw);
    expect(result.version).toBe("custom");
    expect(result.totalCount).toBe(2);
    expect(result.timeCostMs).toBe(372);
    expect(result.logId).toBe("log-1");
    expect(result.results).toHaveLength(2);

    const item0 = result.results[0];
    expect(item0.title).toBe("标题1");
    expect(item0.url).toBe("https://example.com/1");
    expect(item0.snippet).toBe("短摘要");
    expect(item0.summary).toBe("长摘要");
    expect(item0.content).toBe("正文内容");
    expect(item0.siteName).toBe("站点1");
    expect(item0.rankScore).toBe(0.95);
    expect(item0.authInfoDes).toBe("非常权威");
    expect(item0.authInfoLevel).toBe(1);
    expect(item0.publishTime).toBe("2025-06-19T15:10:00+08:00");
  });

  it("result 为 null 时返回空结果", () => {
    const result = customAdapter.parseResponse({ ResponseMetadata: { RequestId: "r" }, Result: null });
    expect(result.totalCount).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("webResults 为空数组", () => {
    const result = customAdapter.parseResponse({
      ResponseMetadata: { RequestId: "r" },
      Result: { ResultCount: 0, WebResults: [], TimeCost: 100, LogId: "l" },
    });
    expect(result.totalCount).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("可选字段缺失时为 undefined", () => {
    const result = customAdapter.parseResponse({
      ResponseMetadata: { RequestId: "r" },
      Result: {
        ResultCount: 1,
        WebResults: [{
          Id: "1",
          SortId: 1,
          Title: "t",
          Snippet: "s",
          AuthInfoDes: "正常权威",
          AuthInfoLevel: 2,
        }],
        TimeCost: 50,
        LogId: "l",
      },
    });
    const item = result.results[0];
    expect(item.summary).toBeUndefined();
    expect(item.content).toBeUndefined();
    expect(item.url).toBe("");
    expect(item.siteName).toBeUndefined();
    expect(item.rankScore).toBeUndefined();
  });
});
