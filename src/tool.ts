/**
 * doubao_web_search 工具定义：串联适配器、客户端、格式化器、渲染器。
 *
 * @module
 */

import type { KeyPool } from "./key-pool.ts";
import type {
  DoubaoSearchConfig,
  UnifiedSearchRequest,
  WebSearchDetails,
} from "./types.ts";
import { StringEnum } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { searchWithKeyPool } from "./client.ts";
import { customAdapter } from "./custom-adapter.ts";
import { formatResults } from "./formatter.ts";
import { globalAdapter } from "./global-adapter.ts";
import { renderSearchCall, renderSearchResult } from "./renderer.ts";

/**
 * 创建 doubao_web_search 工具。
 *
 * 通过工厂函数注入 pool/config 的 getter，确保 execute 时拿到最新引用。
 */
export function createWebSearchTool(
  getPool: () => KeyPool,
  getConfig: () => DoubaoSearchConfig,
) {
  return defineTool({
    name: "doubao_web_search",
    label: "Web Search",
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
        description: "Search query, 1-100 characters. Be specific and include relevant context.",
      }),
      count: Type.Optional(Type.Number({
        description: "Number of results. Default 5, max 10. Fewer = faster + less tokens.",
      })),
      version: StringEnum(["custom", "global"] as const, {
        description: "custom: Chinese content, richer filters. global: international content. Default: custom.",
      }),
      detail_level: StringEnum(["brief", "summary", "full"] as const, {
        description: "brief: title+snippet. summary: title+summary(default). full: +full content(truncated).",
      }),
      time_range: Type.Optional(Type.String({
        description: "OneDay/OneWeek/OneMonth/OneYear or YYYY-MM-DD..YYYY-MM-DD. Custom only.",
      })),
      sites: Type.Optional(Type.String({
        description: "Restrict to domains, pipe-separated. Example: stackoverflow.com|github.com",
      })),
      block_hosts: Type.Optional(Type.String({
        description: "Exclude domains, pipe-separated. Example: pinterest.com|quora.com",
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
        count: Math.min(count, 10),
        detailLevel,
        ...(params.time_range != null && { timeRange: params.time_range }),
        ...(params.sites != null && { sites: params.sites }),
        ...(params.block_hosts != null && { blockHosts: params.block_hosts }),
        contentFormat: config.contentFormat,
      };

      // 选择适配器
      const adapter = version === "global" ? globalAdapter : customAdapter;

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
        content: [{ type: "text", text: `正在搜索: ${params.query}...` }],
        details: emptyDetails,
      });

      // 执行搜索
      const outcome = await searchWithKeyPool(pool, adapter, req, config, signal);
      const result = outcome.result;

      // 流式进度：找到结果
      onUpdate?.({
        content: [{ type: "text", text: `找到 ${result.totalCount} 条结果，正在格式化...` }],
        details: {
          ...emptyDetails,
          totalCount: result.totalCount,
          returnedCount: result.results.length,
          keyUsed: outcome.keyLabel,
        },
      });

      // 格式化
      const text = formatResults(result, detailLevel);

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
