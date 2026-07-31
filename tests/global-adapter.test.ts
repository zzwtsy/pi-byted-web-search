import type { GlobalApiResponse } from "../src/global-adapter.ts";
import type { UnifiedSearchRequest } from "../src/types.ts";
import { describe, expect, it } from "vitest";
import { globalAdapter } from "../src/global-adapter.ts";
import { DEFAULT_CONFIG } from "../src/types.ts";

const baseReq: UnifiedSearchRequest = {
  query: "test",
  count: 5,
  detailLevel: "summary",
  contentFormat: "markdown",
};

describe("globalAdapter.buildRequest", () => {
  it("基本请求体映射", () => {
    const body = globalAdapter.buildRequest(baseReq, DEFAULT_CONFIG);
    expect(body).toMatchObject({
      Query: "test",
      DocCount: 5,
      MaxImageCountPerDoc: 0,
    });
  });

  it("count 上限 20", () => {
    const body = globalAdapter.buildRequest({ ...baseReq, count: 100 }, DEFAULT_CONFIG);
    expect(body).toMatchObject({ DocCount: 20 });
  });

  it("detail_level=brief 时 MaxSnippetLength=200", () => {
    const body = globalAdapter.buildRequest({ ...baseReq, detailLevel: "brief" }, DEFAULT_CONFIG);
    expect(body).toMatchObject({ MaxSnippetLength: 200 });
  });

  it("detail_level=summary 时 MaxSnippetLength 取 config", () => {
    const body = globalAdapter.buildRequest(baseReq, { ...DEFAULT_CONFIG, maxSnippetLength: 1000 });
    expect(body).toMatchObject({ MaxSnippetLength: 1000 });
  });

  it("includeImages=true 时 MaxImageCountPerDoc=3", () => {
    const body = globalAdapter.buildRequest({ ...baseReq, includeImages: true }, DEFAULT_CONFIG);
    expect(body).toMatchObject({ MaxImageCountPerDoc: 3 });
  });
});

describe("globalAdapter.parseResponse", () => {
  it("正常响应字段映射", () => {
    const raw: GlobalApiResponse = {
      ResponseMetadata: { RequestId: "req-1" },
      Result: {
        TotalDocCount: 20,
        Documents: [
          {
            Rank: 0,
            Url: "https://example.com/1",
            Title: "标题1",
            Snippet: [
              { Type: "text", Text: "第一段文本" },
              { Type: "image", Image: { Width: 100, Height: 50, ImageUrl: "https://img.com/1.jpg" } },
              { Type: "text", Text: "第二段文本" },
            ],
            DocumentInfo: {
              ContentCharCount: 1000,
              ContentTokenCount: 700,
              Filetype: "webpage",
              PublishTime: "2025-06-19T15:10:00+08:00",
            },
            HostInfo: { Hostname: "示例站点", IconUrl: "https://icon.com/1.ico" },
          },
        ],
        ErrorCode: 0,
        ErrorMsg: "",
      },
    };

    const result = globalAdapter.parseResponse(raw);
    expect(result.version).toBe("global");
    expect(result.totalCount).toBe(20);
    expect(result.results).toHaveLength(1);
    // unsupportedParams 由 tool.ts 按实际传入参数计算，适配器不再无条件上报
    expect(result.unsupportedParams).toBeUndefined();

    const item = result.results[0];
    expect(item.title).toBe("标题1");
    expect(item.url).toBe("https://example.com/1");
    // text 类型 snippet 拼接，image 被过滤
    expect(item.summary).toBe("第一段文本\n第二段文本");
    expect(item.snippet).toBe("第一段文本\n第二段文本".slice(0, 200));
    expect(item.filetype).toBe("webpage");
    expect(item.publishTime).toBe("2025-06-19T15:10:00+08:00");
    expect(item.siteName).toBe("示例站点");
  });

  it("result 为 null 时返回空结果", () => {
    const result = globalAdapter.parseResponse({ ResponseMetadata: { RequestId: "r" }, Result: null });
    expect(result.totalCount).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("snippet 全是 image 时文本为空", () => {
    const result = globalAdapter.parseResponse({
      ResponseMetadata: { RequestId: "r" },
      Result: {
        TotalDocCount: 1,
        Documents: [{
          Rank: 0,
          Title: "t",
          Snippet: [{ Type: "image", Image: { ImageUrl: "https://img.com/1.jpg" } }],
        }],
        ErrorCode: 0,
        ErrorMsg: "",
      },
    });
    expect(result.results[0].snippet).toBe("");
    expect(result.results[0].summary).toBe("");
  });

  it("snippet 缺失时不报错", () => {
    const result = globalAdapter.parseResponse({
      ResponseMetadata: { RequestId: "r" },
      Result: {
        TotalDocCount: 1,
        Documents: [{ Rank: 0, Title: "t" }],
        ErrorCode: 0,
        ErrorMsg: "",
      },
    });
    expect(result.results[0].snippet).toBe("");
  });
});
