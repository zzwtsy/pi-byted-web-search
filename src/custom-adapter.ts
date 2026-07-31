/**
 * Custom 版适配器：统一模型 <-> Custom API 请求/响应互转。
 *
 * @module
 */

import type { ApiError } from "./errors.ts";
import type {
  DoubaoSearchConfig,
  SearchAdapter,
  UnifiedSearchItem,
  UnifiedSearchRequest,
  UnifiedSearchResult,
} from "./types.ts";

// ============================================================================
// Custom 版 API 原始响应类型（就近放置，仅本适配器消费）
// ============================================================================

export interface CustomApiResponse {
  ResponseMetadata: {
    RequestId: string;
    Action?: string;
    Version?: string;
    Service?: string;
    Region?: string;
    Error?: ApiError;
  };
  Result?: {
    ResultCount: number;
    WebResults?: CustomWebResult[];
    SearchContext?: { SearchType: string; OriginQuery: string };
    TimeCost: number;
    LogId: string;
    CardResults?: unknown;
  };
}

export interface CustomWebResult {
  Id: string;
  SortId: number;
  Title: string;
  SiteName?: string;
  Url?: string;
  Snippet: string;
  Summary?: string;
  Content?: string;
  PublishTime?: string;
  LogoUrl?: string;
  RankScore?: number;
  AuthInfoDes: string;
  AuthInfoLevel: number;
  ContentFormats?: string;
  RuyiInfo?: unknown;
}

export const customAdapter: SearchAdapter = {
  version: "custom",
  apiUrl: "https://open.feedcoopapi.com/search_api/web_search",

  buildRequest(req: UnifiedSearchRequest, config: DoubaoSearchConfig): Record<string, unknown> {
    return {
      Query: req.query,
      SearchType: "web",
      Count: Math.min(req.count, 50),
      Filter: {
        NeedContent: false,
        NeedUrl: true,
        ...(req.sites != null && { Sites: req.sites }),
        ...(req.blockHosts != null && { BlockHosts: req.blockHosts }),
        ...(config.authInfoLevel !== 0 && { AuthInfoLevel: config.authInfoLevel }),
      },
      ...(req.timeRange != null && { TimeRange: req.timeRange }),
      ContentFormats: req.contentFormat,
      ...(config.industry != null && { Industry: config.industry }),
      QueryControl: { QueryRewrite: config.queryRewrite },
    };
  },

  parseResponse(raw: unknown): UnifiedSearchResult {
    const data = raw as CustomApiResponse;
    const result = data.Result;

    if (!result) {
      return { totalCount: 0, results: [], version: "custom" };
    }

    const items: UnifiedSearchItem[] = (result.WebResults ?? []).map(w => ({
      title: w.Title ?? "",
      url: w.Url ?? "",
      snippet: w.Snippet ?? "",
      summary: w.Summary,
      content: w.Content,
      publishTime: w.PublishTime,
      siteName: w.SiteName,
      rankScore: w.RankScore,
      authInfoDes: w.AuthInfoDes,
      authInfoLevel: w.AuthInfoLevel,
    }));

    return {
      totalCount: result.ResultCount,
      results: items,
      timeCostMs: result.TimeCost,
      logId: result.LogId,
      version: "custom",
    };
  },
};
