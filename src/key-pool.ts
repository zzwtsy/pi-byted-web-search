/**
 * 多 API Key 池：轮询选择 + 故障转移。
 *
 * @module
 */

import type { KeyState, SearchVersion } from "./types.ts";

/** 单 Key 最大并发 in-flight 请求数（API 默认 5 QPS/账号，留余量取 2）。 */
const MAX_IN_FLIGHT_PER_KEY = 2;

export class KeyPool {
  private states: KeyState[];
  private nextIndex = 0;
  /** key -> 当前 in-flight 请求数（并行工具调用时均衡负载用）。 */
  private inFlight = new Map<string, number>();

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
   * 在候选组内 round-robin 轮询，优先选择 in-flight 未满的 Key。
   * 无可用 Key 时返回 `null`。
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

    // 优先选 in-flight 未满的 Key；全部已满时回退到全部候选（避免无谓失败）
    const available = candidates.filter(
      s => (this.inFlight.get(s.key) ?? 0) < MAX_IN_FLIGHT_PER_KEY,
    );
    if (available.length > 0) {
      candidates = available;
    }

    const idx = this.nextIndex % candidates.length;
    this.nextIndex++;
    candidates[idx].useCount++;
    this.beginUse(candidates[idx].key);
    return candidates[idx];
  }

  /** 标记请求开始（acquire 内部已调用）。 */
  beginUse(key: string): void {
    this.inFlight.set(key, (this.inFlight.get(key) ?? 0) + 1);
  }

  /** 标记请求结束（请求成功/失败/取消后必须调用，建议 try/finally）。 */
  endUse(key: string): void {
    const n = (this.inFlight.get(key) ?? 0) - 1;
    if (n <= 0) {
      this.inFlight.delete(key);
    } else {
      this.inFlight.set(key, n);
    }
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
      key: maskKey(s.key),
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

/** 脱敏 Key：过短时完全隐藏，较长时保留首尾 4 位。 */
function maskKey(key: string): string {
  if (key.length <= 8) {
    return "***";
  }
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
