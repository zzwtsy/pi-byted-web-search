/**
 * TUI 自定义渲染函数（renderCall + renderResult）。
 *
 * @module
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { WebSearchDetails } from "./types.ts";
import { keyHint } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

/**
 * 渲染工具调用行（搜索进行中显示）。
 */
export function renderSearchCall(
  args: { query?: string; version?: string; time_range?: string; sites?: string; block_hosts?: string },
  theme: Theme,
): Text {
  let text = theme.fg("toolTitle", theme.bold("doubao_web_search "));
  text += theme.fg("accent", `"${args.query ?? ""}"`);

  if (args.version != null && args.version === "global") {
    text += theme.fg("dim", " (global)");
  }

  if (args.time_range != null) {
    text += theme.fg("muted", ` ${args.time_range}`);
  }

  if (args.sites != null) {
    text += theme.fg("dim", ` @${args.sites}`);
  }

  if (args.block_hosts != null) {
    text += theme.fg("dim", ` -${args.block_hosts}`);
  }

  return new Text(text, 0, 0);
}

/**
 * 渲染工具结果行（搜索完成后显示）。
 *
 * 折叠：✓ N 条结果 (Custom版, 372ms) + 展开提示
 * 展开：全部结果的标题 + URL + 摘要
 */
export function renderSearchResult(
  result: { details?: unknown },
  options: { expanded: boolean; isPartial: boolean },
  theme: Theme,
): Text {
  const details = result.details as WebSearchDetails | undefined;

  // 搜索中
  if (options.isPartial) {
    return new Text(theme.fg("warning", "搜索中..."), 0, 0);
  }

  // 无结果
  if (details === undefined || details.returnedCount === 0) {
    return new Text(theme.fg("dim", "无结果"), 0, 0);
  }

  // 折叠视图
  let text = theme.fg("success", `✓ ${details.returnedCount} 条结果`);
  const versionLabel = details.version === "global" ? "Global" : "Custom";
  text += theme.fg("dim", ` (${versionLabel}版`);

  if (details.timeCostMs != null) {
    text += theme.fg("dim", `, ${details.timeCostMs}ms`);
  }

  text += theme.fg("dim", ")");

  if (details.truncated) {
    text += theme.fg("warning", " (已截断)");
  }

  if (!options.expanded) {
    text += ` (${keyHint("app.tools.expand", "展开")})`;
    return new Text(text, 0, 0);
  }

  // 展开视图：全部结果 + 摘要
  for (let i = 0; i < details.results.length; i++) {
    const r = details.results[i];
    text += `\n  ${theme.fg("accent", `[${i + 1}] ${r.title}`)}`;
    text += `\n  ${theme.fg("dim", r.url)}`;

    const summary = r.summary ?? r.snippet;
    if (summary != null) {
      // 截断到 200 字防止过长
      const preview = summary.length > 200 ? `${summary.slice(0, 200)}...` : summary;
      text += `\n  ${theme.fg("muted", preview)}`;
    }
  }

  return new Text(text, 0, 0);
}
