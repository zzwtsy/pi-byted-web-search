/**
 * 豆包搜索 API 错误码与处理策略。
 *
 * 参考官方文档：
 * - Custom 版: https://www.volcengine.com/docs/87772/2272953
 * - Global 版: https://www.volcengine.com/docs/87772/2548026
 * 10500/10501 官方标注"可重试"，10408 为账号级功能不可用（换 Key 无意义）。
 *
 * @module
 */

/** 错误处理策略 */
export type ErrorStrategy
  = | "rateLimited" // 标记限流，换 Key 重试
    | "exhausted" // 标记耗尽，换 Key 重试
    | "retrySameKey" // 内部错误，同 Key 重试（官方标注可重试）
    | "fatal"; // 直接抛出，不换 Key

/** 豆包搜索 API 错误码 */
export const ErrorCode = {
  ParamError: 10400,
  InvalidSearchType: 10402,
  InvalidAccountId: 10403,
  FreeQuotaExhausted: 10406,
  FeatureUnavailable: 10408, // Global: 功能不可用
  PackageModeUnsupported: 10409,
  NoPackage: 10410,
  PackageQuotaExhausted: 10412,
  InnerError: 10500, // 默认内部错误，官方：一般情况可以重试解决
  FreeQuotaLinkError: 10501, // Global: 免费额度链路依赖失败，官方：可重试
  RateLimited: 700429,
  InvalidApiKey: 700901,
} as const;

/** 错误码 -> 处理策略映射 */
const ERROR_STRATEGIES: Readonly<Record<number, ErrorStrategy>> = {
  [ErrorCode.RateLimited]: "rateLimited",
  [ErrorCode.InvalidAccountId]: "exhausted",
  [ErrorCode.FreeQuotaExhausted]: "exhausted",
  [ErrorCode.PackageModeUnsupported]: "exhausted",
  [ErrorCode.NoPackage]: "exhausted",
  [ErrorCode.PackageQuotaExhausted]: "exhausted",
  [ErrorCode.InvalidApiKey]: "exhausted",
  [ErrorCode.ParamError]: "fatal",
  [ErrorCode.InvalidSearchType]: "fatal",
  [ErrorCode.FeatureUnavailable]: "fatal",
  [ErrorCode.InnerError]: "retrySameKey",
  [ErrorCode.FreeQuotaLinkError]: "retrySameKey",
};

/**
 * 获取错误码对应的处理策略。
 * 未知错误码默认为 fatal（安全兜底）。
 */
export function getErrorStrategy(codeN: number): ErrorStrategy {
  return ERROR_STRATEGIES[codeN] ?? "fatal";
}

/** 豆包 API 错误，携带数字错误码供 failover 决策。 */
export class DoubaoApiError extends Error {
  readonly codeN: number;

  constructor(codeN: number, message: string) {
    super(message);
    this.name = "DoubaoApiError";
    this.codeN = codeN;
  }
}
