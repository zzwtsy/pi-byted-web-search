/**
 * HTTP 请求封装 + KeyPool failover 重试。
 *
 * @module
 */

import type { KeyPool } from "./key-pool.ts";
import type {
  DoubaoSearchConfig,
  SearchAdapter,
  UnifiedSearchRequest,
  UnifiedSearchResult,
} from "./types.ts";
import { DoubaoApiError, getErrorStrategy } from "./errors.ts";

/** 搜索结果 + 使用的 Key 标签。 */
export interface SearchOutcome {
  result: UnifiedSearchResult;
  keyLabel: string;
}

/** 换 Key 重试的进度信息（回调用，仅含 label 不含明文 Key）。 */
export interface RetryInfo {
  /** 当前是第几次尝试（1-based；0 表示首次，不触发回调）。 */
  attempt: number;
  /** 换用 Key 的 label（如 "key2"）。 */
  keyLabel: string;
  /** 上次失败原因（API 错误消息或网络错误描述）。 */
  reason: string;
}

/**
 * 可重试的网络错误（连接失败等瞬时故障）。
 *
 * 与超时/用户取消区分：这两类不重试——超时可能已在服务端计费，
 * 免费额度有限，重试有重复扣费风险。
 */
class NetworkRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkRequestError";
  }
}

/** 内部错误（10500/10501）的同 Key 重试次数上限。 */
const SAME_KEY_RETRIES = 1;
/** 同 Key 重试退避间隔（ms），降低 QPS 叠加。 */
const SAME_KEY_RETRY_DELAY_MS = 200;

/**
 * 带 KeyPool failover 的搜索请求。
 *
 * - 限流（700429）/ 额度耗尽（10406/10412 等）→ 标记后换下一个 Key；
 * - 内部错误（10500/10501，官方标注可重试）→ 同 Key 重试 1 次，仍失败则换 Key；
 * - 连接类网络错误 → 换下一个 Key 重试；
 * - 不可重试的错误（10400 参数错误等）→ 直接抛出。
 */
export async function searchWithKeyPool(
  pool: KeyPool,
  adapter: SearchAdapter,
  req: UnifiedSearchRequest,
  config: DoubaoSearchConfig,
  signal?: AbortSignal,
  onRetry?: (info: RetryInfo) => void,
): Promise<SearchOutcome> {
  if (pool.size === 0) {
    throw new Error("No API key configured. Set the DOUBAO_SEARCH_API_KEYS or DOUBAO_SEARCH_API_KEY environment variable.");
  }

  const maxRetries = pool.size;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyState = pool.acquire(adapter.version);
    if (!keyState) {
      throw new Error(formatNoKeyError(pool));
    }

    // 换 Key 后通知进度（首次尝试不通知）
    if (attempt > 0 && onRetry) {
      onRetry({
        attempt,
        keyLabel: keyState.label,
        reason: lastError?.message ?? "previous attempt failed",
      });
    }

    try {
      // 内层循环：同 Key 重试由 sameKeyRetries 控制，其余失败路径 break 换 Key
      let sameKeyRetries = SAME_KEY_RETRIES;
      for (;;) {
        try {
          const raw = await doRequest(adapter, req, config, keyState.key, signal);
          return { result: adapter.parseResponse(raw), keyLabel: keyState.label };
        } catch (err) {
          lastError = err as Error;

          // 豆包 API 错误：按策略决定处理方式
          if (err instanceof DoubaoApiError) {
            const strategy = getErrorStrategy(err.codeN);

            if (strategy === "rateLimited") {
              pool.markRateLimited(keyState.key, config.rateLimitCooldownMs);
              break; // 外层循环换 Key
            }
            if (strategy === "exhausted") {
              pool.markExhausted(keyState.key, err.message);
              break; // 外层循环换 Key
            }
            if (strategy === "retrySameKey" && sameKeyRetries > 0) {
              sameKeyRetries--;
              await sleep(SAME_KEY_RETRY_DELAY_MS);
              continue; // 同 Key 重试
            }
            if (strategy === "retrySameKey") {
              break; // 同 Key 重试耗尽：换下一个 Key（不标记，非 Key 的问题）
            }
          }

          // 连接类网络错误：换 Key 重试（若还有剩余尝试次数）
          if (err instanceof NetworkRequestError && attempt < maxRetries - 1) {
            break;
          }

          // fatal / 超时 / 用户取消 / 网络错误重试耗尽：直接抛出
          throw err;
        }
      }
    } finally {
      // 无论成功、换 Key 还是抛出，都释放 in-flight 计数
      pool.endUse(keyState.key);
    }
  }

  throw new Error(
    `All API keys unavailable.${lastError ? ` Last error: ${lastError.message}` : ""}`,
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 单次 HTTP 请求。 */
async function doRequest(
  adapter: SearchAdapter,
  req: UnifiedSearchRequest,
  config: DoubaoSearchConfig,
  apiKey: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const body = adapter.buildRequest(req, config);

  // 组合超时 + 用户取消
  const signals: AbortSignal[] = [AbortSignal.timeout(config.requestTimeoutMs)];
  if (signal) {
    signals.push(signal);
  }
  const combinedSignal = AbortSignal.any(signals);

  let response: Response;
  try {
    response = await fetch(adapter.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    });
  } catch (err) {
    const name = (err as Error).name;
    if (name === "TimeoutError") {
      throw new Error("Search request timed out. Try a smaller count or a shorter query.");
    }
    if (name === "AbortError") {
      throw new Error("Search cancelled.");
    }
    // 连接类错误（fetch failed / ECONNRESET 等）：瞬时故障，可换 Key 重试
    throw new NetworkRequestError(`Network request failed: ${(err as Error).message}`);
  }

  // 非 2xx：先尝试解析 API 错误体（网关/代理可能返回带错误码的 JSON），
  // 让 failover 与 Key 标记逻辑生效；非 JSON 则回退通用 HTTP 错误。
  if (!response.ok) {
    try {
      const raw = await response.json();
      checkApiError(raw);
    } catch (err) {
      if (err instanceof DoubaoApiError) {
        throw err;
      }
      // 其他（非 JSON / 无错误体）：回退
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new Error(
      `Failed to parse search response (HTTP ${response.status}). The server returned non-JSON content. Please retry.`,
    );
  }
  checkApiError(raw);
  return raw;
}

/** 检查响应体中的 API 错误。 */
function checkApiError(raw: unknown): void {
  const meta = (
    raw as {
      ResponseMetadata?: {
        Error?: { CodeN: number; Code: string; Message: string };
      };
    }
  )?.ResponseMetadata;

  if (meta?.Error) {
    throw new DoubaoApiError(meta.Error.CodeN, meta.Error.Message);
  }
}

/** 格式化"无可用 Key"错误信息。 */
function formatNoKeyError(pool: KeyPool): string {
  const status = pool.getStatus()
    .map(s => `${s.label}=${s.status}`)
    .join(", ");
  return `All API keys unavailable. Key status: ${status}. Wait for cooldown or add new keys.`;
}
