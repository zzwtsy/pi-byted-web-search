/**
 * Global 版适配器：统一模型 <-> Global API 请求/响应互转。
 *
 * @module
 */

import type {
  DoubaoSearchConfig,
  GlobalApiResponse,
  SearchAdapter,
  UnifiedSearchItem,
  UnifiedSearchRequest,
  UnifiedSearchResult,
} from "./types.ts";

/** Global 版不支持的参数列表。 */
const UNSUPPORTED_PARAMS = ["time_range", "sites", "block_hosts", "content_format"];

export const globalAdapter: SearchAdapter = {
  version: "global",
  apiUrl: "https://open.feedcoopapi.com/search_api/global_search",

  buildRequest(req: UnifiedSearchRequest, config: DoubaoSearchConfig): Record<string, unknown> {
    return {
      Query: req.query,
      DocCount: Math.min(req.count, 20),
      MaxSnippetLength: req.detailLevel === "brief" ? 200 : config.maxSnippetLength,
      MaxImageCountPerDoc: req.includeImages ? 3 : 0,
    };
  },

  parseResponse(raw: unknown): UnifiedSearchResult {
    const data = raw as GlobalApiResponse;
    const result = data.Result;

    if (!result) {
      return { totalCount: 0, results: [], version: "global", unsupportedParams: UNSUPPORTED_PARAMS };
    }

    const items: UnifiedSearchItem[] = (result.Documents ?? []).map((d) => {
      // Global 的 Snippet 是数组，混合 text 和 image，拼接为纯文本
      const textSnippets = (d.Snippet ?? [])
        .filter(s => s.Type === "text")
        .map(s => s.Text ?? "")
        .join("\n");

      return {
        title: d.Title ?? "",
        url: d.Url ?? "",
        snippet: textSnippets.slice(0, 200),
        summary: textSnippets,
        publishTime: d.DocumentInfo?.PublishTime,
        siteName: d.HostInfo?.Hostname,
        filetype: d.DocumentInfo?.Filetype,
      };
    });

    return {
      totalCount: result.TotalDocCount,
      results: items,
      version: "global",
      unsupportedParams: UNSUPPORTED_PARAMS,
    };
  },
};
