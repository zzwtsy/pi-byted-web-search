/**
 * 搜索结果格式化 + 截断。版本无关，只消费 UnifiedSearchResult。
 *
 * @module
 */

import type { DetailLevel, KeyState, UnifiedSearchItem, UnifiedSearchResult } from "./types.ts";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateHead,
} from "@earendil-works/pi-coding-agent";

/** 单条结果各字段的截断上限 */
const SNIPPET_MAX_CHARS = 200;
const SUMMARY_MAX_CHARS = 1000;
const CONTENT_MAX_CHARS = 5000;

/**
 * 格式化搜索结果为 LLM 文本。
 *
 * 按 detailLevel 选择字段，三层截断（单条 + 总条数 + 总输出）。
 */
export function formatResults(
  result: UnifiedSearchResult,
  detailLevel: DetailLevel,
  query?: string,
): string {
  const lines: string[] = [];

  // 头部
  const versionLabel = result.version === "global" ? "Global" : "Custom";
  lines.push(`搜索完成，返回 ${result.results.length} 条结果（豆包搜索 ${versionLabel} 版）`);
  lines.push(`查询: ${query ?? ""}`);
  lines.push("");

  // 每条结果
  for (let i = 0; i < result.results.length; i++) {
    const item = result.results[i];
    lines.push(formatItem(item, i + 1, detailLevel));
    lines.push("");
  }

  // 被忽略的参数提示
  if (result.unsupportedParams && result.unsupportedParams.length > 0) {
    lines.push(`⚠️ 以下参数在 Global 版中不支持，已被忽略: ${result.unsupportedParams.join(", ")}`);
    lines.push("");
  }

  // 截断提示
  if (result.results.length < result.totalCount) {
    lines.push(
      `⚠️ 部分结果已截断。共找到 ${result.totalCount} 条，返回了 ${result.results.length} 条。`,
    );
    lines.push("");
  }

  // 总输出截断
  const fullText = lines.join("\n");
  const truncation = truncateHead(fullText, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  if (truncation.truncated) {
    return (
      `${truncation.content
      }\n\n[输出截断: 显示 ${truncation.outputLines} / ${truncation.totalLines} 行`
      + ` (${formatSize(truncation.outputBytes)} / ${formatSize(truncation.totalBytes)})]`
    );
  }

  return fullText;
}

/**
 * 格式化单条搜索结果。
 */
function formatItem(item: UnifiedSearchItem, index: number, detailLevel: DetailLevel): string {
  const lines: string[] = [];

  if (detailLevel === "brief") {
    // brief: 紧凑格式
    const meta = [
      item.publishTime?.slice(0, 10) ?? "",
      item.rankScore != null ? `相关度: ${item.rankScore.toFixed(2)}` : "",
    ].filter(Boolean).join(" | ");

    lines.push(`[${index}] ${item.title}`);
    lines.push(`    ${item.url}${meta ? ` | ${meta}` : ""}`);
    lines.push(`    ${truncateText(item.snippet, SNIPPET_MAX_CHARS)}`);
  } else {
    // summary / full: 详细格式
    lines.push(`[${index}] ${item.title}`);
    lines.push(`    🔗 ${item.url}`);

    const metaParts: string[] = [];
    if (item.publishTime != null) {
      metaParts.push(`📅 ${item.publishTime.slice(0, 10)}`);
    }
    if (item.siteName != null) {
      metaParts.push(`站点: ${item.siteName}`);
    }
    if (item.authInfoDes != null) {
      metaParts.push(`权威度: ${item.authInfoDes}`);
    }
    if (item.rankScore != null) {
      metaParts.push(`相关度: ${item.rankScore.toFixed(2)}`);
    }
    if (metaParts.length > 0) {
      lines.push(`    ${metaParts.join(" | ")}`);
    }

    // 摘要
    const summaryText = item.summary ?? item.snippet;
    if (summaryText != null) {
      lines.push(`    📝 ${truncateText(summaryText, SUMMARY_MAX_CHARS)}`);
    }

    // full: 正文
    if (detailLevel === "full" && item.content != null) {
      lines.push(`    📄 正文（截断至 ${CONTENT_MAX_CHARS} 字）:`);
      lines.push(`    ${truncateText(item.content, CONTENT_MAX_CHARS)}`);
    }
  }

  return lines.join("\n");
}

/** 截断文本到指定字符数（按码点计数，代理对如 emoji 算 1 字符），超出时加省略号。 */
function truncateText(text: string, maxChars: number): string {
  const chars = Array.from(text);
  if (chars.length <= maxChars) {
    return text;
  }
  return `${chars.slice(0, maxChars).join("")}...`;
}

/**
 * 格式化 KeyPool 状态为文本（给 /doubao-keys 命令用）。
 */
export function formatKeyStatus(states: KeyState[]): string {
  if (states.length === 0) {
    return "未配置 API Key";
  }

  const lines: string[] = [];
  for (const s of states) {
    const parts = [
      `[${s.label}]`,
      `(${s.key})`,
      s.billingType,
      s.status,
    ];

    if (s.status === "rate_limited" && s.rateLimitedUntil != null) {
      const remaining = Math.ceil((s.rateLimitedUntil - Date.now()) / 1000);
      parts.push(`冷却中（剩余 ${Math.max(0, remaining)}s）`);
    }

    if (s.lastError != null) {
      parts.push(s.lastError);
    }

    parts.push(`使用 ${s.useCount} 次`);

    lines.push(parts.join("  "));
  }

  return lines.join("\n");
}
