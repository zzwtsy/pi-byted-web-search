/**
 * 多 API Key 池：轮询选择 + 故障转移。
 *
 * @module
 */

import type { KeyState, SearchVersion } from "./types.ts";

export class KeyPool {
  private states: KeyState[];
  private nextIndex = 0;

  constructor(keys: KeyState[]) {
    // 防御性拷贝，避免外部修改影响池内状态
    this.states = keys.map(k => ({ ...k }));
  }

  /**
   * 获取指定 API 版本的下一个可用 Key。
   *
   * - `custom`：优先 subscription Key，回退到 postpaid。
   * - `global`：仅 postpaid Key（subscription 不支持 Global）。
   *
   * 在候选组内 round-robin 轮询。无可用 Key 时返回 `null`。
   */
  acquire(version: SearchVersion): KeyState | null {
    this.restoreExpired();

    let candidates: KeyState[];

    if (version === "global") {
      candidates = this.states.filter(
        s => s.status === "active" && s.billingType === "postpaid",
      );
    } else {
      // custom：subscription 优先，回退 postpaid
      const subscription = this.states.filter(
        s => s.status === "active" && s.billingType === "subscription",
      );
      candidates = subscription.length > 0
        ? subscription
        : this.states.filter(s => s.status === "active" && s.billingType === "postpaid");
    }

    if (candidates.length === 0)
      return null;

    const idx = this.nextIndex % candidates.length;
    this.nextIndex++;
    candidates[idx].useCount++;
    return candidates[idx];
  }

  /** 临时标记 Key 为限流状态，冷却后自动恢复。 */
  markRateLimited(key: string, cooldownMs: number): void {
    const s = this.states.find(s => s.key === key);
    if (s) {
      s.status = "rate_limited";
      s.rateLimitedUntil = Date.now() + cooldownMs;
    }
  }

  /** 永久标记 Key 为耗尽状态（额度用尽或 Key 无效）。 */
  markExhausted(key: string, reason: string): void {
    const s = this.states.find(s => s.key === key);
    if (s) {
      s.status = "exhausted";
      s.lastError = reason;
    }
  }

  /**
   * 返回所有 Key 状态的脱敏副本（Key 截断显示）。
   * 返回前会先恢复已过期的限流 Key。
   */
  getStatus(): KeyState[] {
    this.restoreExpired();
    return this.states.map(s => ({
      ...s,
      key: s.key.length > 8 ? `${s.key.slice(0, 4)}...${s.key.slice(-4)}` : s.key,
    }));
  }

  get size(): number {
    return this.states.length;
  }

  /** 恢复冷却已过期的限流 Key。 */
  private restoreExpired(): void {
    const now = Date.now();
    for (const s of this.states) {
      if (s.status === "rate_limited" && s.rateLimitedUntil != null && s.rateLimitedUntil <= now) {
        s.status = "active";
        s.rateLimitedUntil = undefined;
      }
    }
  }
}
