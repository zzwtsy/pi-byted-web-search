/**
 * /doubao-keys 命令的 TUI 交互组件：可滚动 Key 状态列表。
 *
 * 参照 pi examples/extensions/todo.ts 的组件模式：
 * render(width) + handleInput(data) + invalidate()，键盘 ↑/↓ 选择、Esc 关闭。
 *
 * @module
 */

import type { Theme } from "@earendil-works/pi-coding-agent";
import type { KeyState } from "./types.ts";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import { truncateText } from "./formatter.ts";

/** lastError 的最大显示长度。 */
const ERROR_MAX_CHARS = 40;

/**
 * Key 状态列表组件。
 *
 * 每次 render 通过 getStatus 读取最新状态（脱敏后），
 * 因此组件打开期间 Key 状态变化（限流/冷却恢复）会自动反映。
 */
export class KeyStatusComponent {
  private getStatus: () => KeyState[];
  private theme: Theme;
  private onClose: () => void;
  private selected = 0;

  constructor(getStatus: () => KeyState[], theme: Theme, onClose: () => void) {
    this.getStatus = getStatus;
    this.theme = theme;
    this.onClose = onClose;
  }

  handleInput(data: string): void {
    const states = this.getStatus();
    if (states.length === 0)
      return;

    if (matchesKey(data, Key.up)) {
      this.selected = (this.selected - 1 + states.length) % states.length;
    } else if (matchesKey(data, Key.down)) {
      this.selected = (this.selected + 1) % states.length;
    } else if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
      this.onClose();
    }
  }

  render(width: number): string[] {
    const th = this.theme;
    const lines: string[] = [];
    const states = this.getStatus();

    // 标题行
    const title = " Doubao Search Keys ";
    lines.push(
      truncateToWidth(
        th.fg("accent", title) + th.fg("borderMuted", "─".repeat(Math.max(0, width - title.length))),
        width,
      ),
    );
    lines.push("");

    if (states.length === 0) {
      lines.push(truncateToWidth(`  ${th.fg("dim", "No API keys configured.")}`, width));
    } else {
      // 防止状态数在渲染间隙减少导致 selected 越界
      this.selected = Math.min(this.selected, states.length - 1);

      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        const prefix = i === this.selected ? th.fg("accent", "> ") : "  ";
        const line = [
          prefix,
          th.fg("accent", `#${i + 1}`),
          th.fg("dim", s.key),
          th.fg("muted", s.billingType === "subscription" ? "sub" : "postpaid"),
          statusColor(th, s),
          cooldownText(th, s),
          errorText(th, s),
          th.fg("dim", `${s.useCount} calls`),
        ].join(" ");
        lines.push(truncateToWidth(line, width));
      }

      lines.push("");
      lines.push(truncateToWidth(`  ${th.fg("dim", "↑/↓ select · Esc close")}`, width));
    }

    lines.push("");

    return lines;
  }

  /** Component 接口要求；无缓存可失效，空实现。 */
  invalidate(): void {}
}

/** Key 状态的颜色化文本。 */
function statusColor(theme: Theme, s: KeyState): string {
  switch (s.status) {
    case "active":
      return theme.fg("success", "active");
    case "rate_limited":
      return theme.fg("warning", "rate_limited");
    case "exhausted":
      return theme.fg("error", "exhausted");
  }
}

/** 限流冷却剩余时间。 */
function cooldownText(theme: Theme, s: KeyState): string {
  if (s.status === "rate_limited" && s.rateLimitedUntil != null) {
    const remaining = Math.ceil((s.rateLimitedUntil - Date.now()) / 1000);
    return ` ${theme.fg("warning", `(${Math.max(0, remaining)}s left)`)}`;
  }
  return "";
}

/** 上次错误信息（截断）。 */
function errorText(theme: Theme, s: KeyState): string {
  if (s.lastError != null) {
    return ` ${theme.fg("dim", truncateText(s.lastError, ERROR_MAX_CHARS))}`;
  }
  return "";
}

/**
 * 纯文本 Key 状态视图（无颜色，供 RPC notify 等非 TUI 场景使用）。
 *
 * 输入直接用 `KeyPool.getStatus()` 的返回值（已脱敏 key、已恢复过期限流）。
 */
export function formatKeyStatus(states: KeyState[]): string {
  const lines = [`Doubao Search Keys (${states.length}):`];
  if (states.length === 0) {
    lines.push("  No API keys configured.");
    return lines.join("\n");
  }
  states.forEach((s, i) => {
    const parts = [
      `#${i + 1}`,
      s.key,
      s.billingType === "subscription" ? "sub" : "postpaid",
      s.status,
    ];
    if (s.status === "rate_limited" && s.rateLimitedUntil != null) {
      const remaining = Math.max(0, Math.ceil((s.rateLimitedUntil - Date.now()) / 1000));
      parts.push(`(${remaining}s left)`);
    }
    if (s.lastError != null) {
      parts.push(truncateText(s.lastError, ERROR_MAX_CHARS));
    }
    parts.push(`${s.useCount} calls`);
    lines.push(`  ${parts.join("  ")}`);
  });
  return lines.join("\n");
}
