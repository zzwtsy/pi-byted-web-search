/**
 * doubao_web_search 工具定义：串联适配器、客户端、格式化器、渲染器。
 *
 * @module
 */

import type { TtlCache } from "./cache.ts";
import type { KeyPool } from "./key-pool.ts";
import type {
  DoubaoSearchConfig,
  UnifiedSearchRequest,
  UnifiedSearchResult,
  WebSearchDetails,
} from "./types.ts";
import { StringEnum } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { searchWithKeyPool } from "./client.ts";
import { customAdapter } from "./custom-adapter.ts";
import { SearchError } from "./errors.ts";
import { formatResults, truncateText } from "./formatter.ts";
import { globalAdapter } from "./global-adapter.ts";
import { renderSearchCall, renderSearchResult } from "./renderer.ts";

/**
 * 创建 doubao_web_search 工具。
 *
 * 通过工厂函数注入 pool/config/cache 的 getter，确保 execute 时拿到最新引用。
 */
export function createWebSearchTool(
  getPool: () => KeyPool,
  getConfig: () => DoubaoSearchConfig,
  getCache: () => TtlCache<UnifiedSearchResult> | undefined,
) {
  return defineTool({
    name: "doubao_web_search",
    label: "Doubao Web Search",
    description: [
      "Search the web for current information using Doubao Search API.",
      "",
      "Use this tool when you need:",
      "- Real-time information (news, prices, weather, latest releases)",
      "- Information not available in the codebase or local files",
      "- Fact-checking or verifying claims",
      "",
      "Do NOT use this tool when:",
      "- The information is in local files (use read/grep instead)",
      "- You already have the answer in conversation context",
      "",
      "Examples:",
      "- \"Python 3.13 release date\"",
      "- \"latest React 19 documentation\"",
      "- \"Beijing weather today\"",
      "- \"北京今日天气\"",
      "",
      "Results are returned as summaries by default. Use detail_level=\"full\" only when you need complete article content.",
    ].join("\n"),

    promptSnippet: "Search the web for real-time information via Doubao Search",
    promptGuidelines: [
      "Use doubao_web_search when you need current information not in local files or conversation context.",
      "Use doubao_web_search with time_range='OneWeek' for recent events or latest releases.",
    ],

    parameters: Type.Object({
      query: Type.String({
        minLength: 1,
        maxLength: 100, // 对齐官方 Query 1~100 字符约束
        description: "Search query, 1-100 characters. Be specific and include relevant context.",
      }),
      count: Type.Optional(Type.Integer({
        minimum: 1,
        maximum: 10,
        description: "Number of results. Default 5, max 10. Fewer = faster + less tokens.",
      })),
      version: StringEnum(["custom", "global"] as const, {
        description: "custom: Chinese content, richer filters. global: international content. Default: custom.",
      }),
      detail_level: StringEnum(["brief", "summary", "full"] as const, {
        description: "brief: title+snippet. summary: title+summary(default). full: +full content(truncated).",
      }),
      time_range: Type.Optional(Type.String({
        pattern: "^(OneDay|OneWeek|OneMonth|OneYear|\\d{4}-\\d{2}-\\d{2}\\.\\.\\d{4}-\\d{2}-\\d{2})$",
        description: "OneDay/OneWeek/OneMonth/OneYear or YYYY-MM-DD..YYYY-MM-DD. Custom only.",
      })),
      sites: Type.Optional(Type.String({
        description: "Restrict to domains, pipe-separated. Example: stackoverflow.com|github.com",
      })),
      block_hosts: Type.Optional(Type.String({
        description: "Exclude domains, pipe-separated. Example: pinterest.com|quora.com",
      })),
      include_images: Type.Optional(Type.Boolean({
        description: "Include up to 3 image snippets per result. Global version only; ignored by Custom. Default: false.",
      })),
    }),

    async execute(_toolCallId, params, signal, onUpdate, _ctx) {
      const pool = getPool();
      const config = getConfig();

      // 合并参数与 config 默认值
      const version = (params.version ?? config.defaultVersion);
      const detailLevel = (params.detail_level ?? config.defaultDetailLevel);
      const count = params.count ?? config.defaultCount;

      const req: UnifiedSearchRequest = {
        query: params.query,
        // 防御非法 count（如配置文件中 defaultCount 越界）：封底 1、封顶 10、取整
        count: Math.min(Math.max(1, Math.round(count)), 10),
        detailLevel,
        ...(params.time_range != null && { timeRange: params.time_range }),
        ...(params.sites != null && { sites: params.sites }),
        ...(params.block_hosts != null && { blockHosts: params.block_hosts }),
        ...(params.include_images != null && { includeImages: params.include_images }),
        contentFormat: config.contentFormat,
      };

      // 选择适配器
      const adapter = version === "global" ? globalAdapter : customAdapter;

      // 缓存查找
      const cacheKey = buildCacheKey(req);
      const cache = getCache();
      const cachedResult = cache?.get(cacheKey);
      if (cachedResult != null) {
        const text = formatResults(cachedResult, detailLevel, req.query);
        const details: WebSearchDetails = {
          query: params.query,
          version,
          totalCount: cachedResult.totalCount,
          returnedCount: cachedResult.results.length,
          detailLevel,
          truncated: cachedResult.results.length < cachedResult.totalCount,
          timeCostMs: cachedResult.timeCostMs,
          keyUsed: "cache",
          results: cachedResult.results,
          cached: true,
        };
        return {
          content: [{ type: "text", text }],
          details,
        };
      }

      // 流式进度：开始搜索
      const emptyDetails: WebSearchDetails = {
        query: params.query,
        version,
        totalCount: 0,
        returnedCount: 0,
        detailLevel,
        truncated: false,
        keyUsed: "",
        results: [],
      };

      onUpdate?.({
        content: [{ type: "text", text: `Searching: ${params.query}...` }],
        details: emptyDetails,
      });

      // 执行搜索（换 Key 重试时通过 onRetry 推送流式进度）
      let outcome;
      try {
        outcome = await searchWithKeyPool(
          pool,
          adapter,
          req,
          config,
          signal,
          (info) => {
            onUpdate?.({
              content: [{
                type: "text",
                text: `Retrying with key ${info.keyLabel} (attempt ${info.attempt}): ${truncateText(info.reason, 100)}`,
              }],
              // 类型要求完整 AgentToolResult；isPartial 渲染忽略 details 内容
              details: emptyDetails,
            });
          },
        );
      } catch (err) {
        // 用户取消：不标记为错误，返回说明文本
        if (err instanceof SearchError && err.code === "aborted") {
          return {
            content: [{ type: "text", text: "The web search was cancelled." }],
            details: { ...emptyDetails, cancelled: true },
          };
        }
        throw err;
      }
      const result = outcome.result;

      // Global 版：按请求中实际出现的参数计算被忽略列表（适配器不再无条件上报）
      if (version === "global") {
        // [展示名, req 字段名]：req 使用 camelCase，展示名保持工具参数名
        const unsupportedMap: Array<[string, keyof UnifiedSearchRequest]> = [
          ["time_range", "timeRange"],
          ["sites", "sites"],
          ["block_hosts", "blockHosts"],
        ];
        const unsupported = unsupportedMap
          .filter(([, reqKey]) => req[reqKey] != null)
          .map(([name]) => name);
        result.unsupportedParams = unsupported.length > 0 ? unsupported : undefined;
      }

      // 流式进度：找到结果
      onUpdate?.({
        content: [{ type: "text", text: `Found ${result.totalCount} results, formatting...` }],
        details: {
          ...emptyDetails,
          totalCount: result.totalCount,
          returnedCount: result.results.length,
          keyUsed: outcome.keyLabel,
        },
      });

      // 格式化
      const text = formatResults(result, detailLevel, req.query);

      // 缓存写入
      cache?.set(cacheKey, result);

      // 构造 details
      const details: WebSearchDetails = {
        query: params.query,
        version,
        totalCount: result.totalCount,
        returnedCount: result.results.length,
        detailLevel,
        truncated: result.results.length < result.totalCount,
        timeCostMs: result.timeCostMs,
        keyUsed: outcome.keyLabel,
        results: result.results,
      };

      return {
        content: [{ type: "text", text }],
        details,
      };
    },

    renderCall: renderSearchCall,
    renderResult: renderSearchResult,
  });
}

/** 构造缓存 key：版本 + count + detailLevel + query + 过滤参数。 */
function buildCacheKey(req: UnifiedSearchRequest): string {
  const parts = [
    req.query,
    String(req.count),
    req.detailLevel,
    req.contentFormat,
    req.timeRange ?? "",
    req.sites ?? "",
    req.blockHosts ?? "",
    req.includeImages ? "1" : "0",
  ];
  return parts.join("\0");
}
