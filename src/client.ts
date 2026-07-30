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

/**
 * 带 KeyPool failover 的搜索请求。
 *
 * 遇到限流（700429）或额度耗尽（10406/10412 等）时自动切换到下一个 Key。
 * 不可重试的错误（10400 参数错误、10500 内部错误）直接抛出。
 */
export async function searchWithKeyPool(
  pool: KeyPool,
  adapter: SearchAdapter,
  req: UnifiedSearchRequest,
  config: DoubaoSearchConfig,
  signal?: AbortSignal,
): Promise<SearchOutcome> {
  const maxRetries = pool.size;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyState = pool.acquire(adapter.version);
    if (!keyState) {
      throw new Error(formatNoKeyError(pool));
    }

    try {
      const raw = await doRequest(adapter, req, config, keyState.key, signal);
      return { result: adapter.parseResponse(raw), keyLabel: keyState.label };
    } catch (err) {
      lastError = err as Error;

      // 豆包 API 错误：按策略决定是否换 Key
      if (err instanceof DoubaoApiError) {
        const strategy = getErrorStrategy(err.codeN);

        if (strategy === "rateLimited") {
          pool.markRateLimited(keyState.key, config.rateLimitCooldownMs);
          continue;
        }
        if (strategy === "exhausted") {
          pool.markExhausted(keyState.key, err.message);
          continue;
        }
      }

      // fatal 或其他错误（网络超时、用户取消等）直接抛出
      throw err;
    }
  }

  throw new Error(
    `所有 API Key 均不可用。${lastError ? `最后错误: ${lastError.message}` : ""}`,
  );
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
      throw new Error("搜索请求超时。可尝试减少 count 或使用更简短的 query 重试。");
    }
    if (name === "AbortError") {
      throw new Error("搜索已取消。");
    }
    throw new Error(`网络请求失败: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const raw = await response.json();
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
  return `所有 API Key 均不可用。Key 状态: ${status}。请等待冷却或补充新 Key。`;
}
