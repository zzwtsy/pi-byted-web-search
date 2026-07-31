/**
 * TUI 自定义渲染函数（renderCall + renderResult）。
 *
 * @module
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { WebSearchDetails } from "./types.ts";
import { keyHint } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { truncateText } from "./formatter.ts";

/** renderCall 中 query 的最大显示长度。 */
const QUERY_MAX_CHARS = 60;
/** renderCall 中 sites/block_hosts 的最大显示长度。 */
const FILTER_MAX_CHARS = 30;
/** 展开视图最多渲染的结果条数（单行 Text 无滚动，防止撑爆视口）。 */
const MAX_EXPANDED_RESULTS = 5;
/** 展开视图中摘要预览的最大字符数。 */
const PREVIEW_MAX_CHARS = 200;
/** isError 时错误消息的最大显示长度。 */
const ERROR_MAX_CHARS = 120;

/**
 * 渲染工具调用行（搜索进行中显示）。
 */
export function renderSearchCall(
  args: { query?: string; version?: string; time_range?: string; sites?: string; block_hosts?: string },
  theme: Theme,
): Text {
  let text = theme.fg("toolTitle", theme.bold("doubao_web_search "));
  const query = truncateText(args.query ?? "", QUERY_MAX_CHARS);
  text += theme.fg("accent", `"${query}"`);

  if (args.version != null && args.version === "global") {
    text += theme.fg("dim", " (global)");
  }

  if (args.time_range != null) {
    text += theme.fg("muted", ` ${args.time_range}`);
  }

  if (args.sites != null) {
    text += theme.fg("dim", ` @${truncateText(args.sites, FILTER_MAX_CHARS)}`);
  }

  if (args.block_hosts != null) {
    text += theme.fg("dim", ` -${truncateText(args.block_hosts, FILTER_MAX_CHARS)}`);
  }

  return new Text(text, 0, 0);
}

/**
 * 渲染工具结果行（搜索完成后显示）。
 *
 * 折叠：✓ N results (Custom, 372ms) + expand hint
 * 展开：前 5 条结果的标题 + URL + 摘要预览
 */
export function renderSearchResult(
  result: { content?: Array<{ type: string; text?: string }>; details?: unknown },
  options: { expanded: boolean; isPartial: boolean },
  theme: Theme,
  context?: { isError?: boolean },
): Text {
  const details = result.details as WebSearchDetails | undefined;

  // 搜索中
  if (options.isPartial) {
    return new Text(theme.fg("warning", "Searching..."), 0, 0);
  }

  // 执行失败：展示 pi 填充到 content 的真实错误消息（execute 抛错时
  // agent-loop 将错误文本放入 result.content[0].text 后仍调用 renderResult）
  if (context?.isError) {
    let errText = "Search failed";
    const content0 = result.content?.[0];
    if (content0?.type === "text" && content0.text != null && content0.text !== "") {
      errText = content0.text;
    }
    return new Text(theme.fg("error", truncateText(errText, ERROR_MAX_CHARS)), 0, 0);
  }

  // 无结果
  if (details === undefined || details.returnedCount === 0) {
    return new Text(theme.fg("dim", "No results"), 0, 0);
  }

  // 折叠视图
  let text = theme.fg("success", `✓ ${details.returnedCount} results`);
  const versionLabel = details.version === "global" ? "Global" : "Custom";
  text += theme.fg("dim", ` (${versionLabel}`);

  if (details.timeCostMs != null) {
    text += theme.fg("dim", `, ${details.timeCostMs}ms`);
  }

  text += theme.fg("dim", ")");

  if (details.truncated) {
    text += theme.fg("warning", " (truncated)");
  }

  if (!options.expanded) {
    text += ` (${keyHint("app.tools.expand", "expand")})`;
    return new Text(text, 0, 0);
  }

  // 展开视图：前 MAX_EXPANDED_RESULTS 条 + 摘要预览
  const shown = Math.min(details.results.length, MAX_EXPANDED_RESULTS);
  for (let i = 0; i < shown; i++) {
    const r = details.results[i];
    text += `\n  ${theme.fg("accent", `[${i + 1}] ${r.title}`)}`;
    text += `\n  ${theme.fg("dim", r.url)}`;

    const summary = r.summary ?? r.snippet;
    if (summary != null) {
      // 统一码点截断 + 单行预览（Global 版 snippet 以 \n 拼接）
      const preview = truncateText(summary.replace(/\n/g, " "), PREVIEW_MAX_CHARS);
      text += `\n  ${theme.fg("muted", preview)}`;
    }
  }

  if (details.results.length > MAX_EXPANDED_RESULTS) {
    text += `\n${theme.fg("dim", `... ${details.results.length - MAX_EXPANDED_RESULTS} more`)}`;
  }

  return new Text(text, 0, 0);
}
