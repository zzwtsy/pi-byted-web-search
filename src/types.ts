/**
 * 豆包搜索 pi 扩展的类型定义。
 *
 * @module
 */

// ============================================================================
// 配置
// ============================================================================

export interface DoubaoSearchConfig {
  defaultVersion: SearchVersion;
  defaultCount: number;
  defaultDetailLevel: DetailLevel;
  contentFormat: "text" | "markdown";
  queryRewrite: boolean;
  authInfoLevel: number;
  industry: string | null;
  maxSnippetLength: number;
  requestTimeoutMs: number;
  rateLimitCooldownMs: number;
  /** 配置文件中指定的 Key（优先于环境变量）。 */
  postpaidKeys?: string[];
  subscriptionKeys?: string[];
}

export const DEFAULT_CONFIG: DoubaoSearchConfig = {
  defaultVersion: "custom",
  defaultCount: 5,
  defaultDetailLevel: "summary",
  contentFormat: "markdown",
  queryRewrite: false,
  authInfoLevel: 0,
  industry: null,
  maxSnippetLength: 1000,
  requestTimeoutMs: 10_000,
  rateLimitCooldownMs: 60_000,
};

// ============================================================================
// Key 管理
// ============================================================================

export type KeyStatus = "active" | "rate_limited" | "exhausted";

export type BillingType = "postpaid" | "subscription";

export interface KeyState {
  key: string;
  label: string;
  billingType: BillingType;
  status: KeyStatus;
  rateLimitedUntil?: number;
  lastError?: string;
  useCount: number;
}

// ============================================================================
// 统一模型（适配器输入/输出）
// ============================================================================

export type SearchVersion = "custom" | "global";

export type DetailLevel = "brief" | "summary" | "full";

export interface UnifiedSearchRequest {
  query: string;
  count: number;
  detailLevel: DetailLevel;
  timeRange?: string;
  sites?: string;
  blockHosts?: string;
  contentFormat: "text" | "markdown";
  includeImages?: boolean;
}

export interface UnifiedSearchItem {
  title: string;
  url: string;
  snippet: string;
  summary?: string;
  content?: string;
  publishTime?: string;
  siteName?: string;
  rankScore?: number;
  authInfoDes?: string;
  authInfoLevel?: number;
  filetype?: string;
}

export interface UnifiedSearchResult {
  totalCount: number;
  results: UnifiedSearchItem[];
  timeCostMs?: number;
  logId?: string;
  version: SearchVersion;
  /** 因 API 版本不支持而被忽略的参数。 */
  unsupportedParams?: string[];
}

// ============================================================================
// 适配器接口
// ============================================================================

export interface SearchAdapter {
  readonly version: SearchVersion;
  readonly apiUrl: string;
  buildRequest: (req: UnifiedSearchRequest, config: DoubaoSearchConfig) => Record<string, unknown>;
  parseResponse: (raw: unknown) => UnifiedSearchResult;
}

// ============================================================================
// 工具 details（execute 返回，供 renderResult 使用）
// ============================================================================

export interface WebSearchDetails {
  query: string;
  version: SearchVersion;
  totalCount: number;
  returnedCount: number;
  detailLevel: DetailLevel;
  truncated: boolean;
  timeCostMs?: number;
  keyUsed: string;
  results: UnifiedSearchItem[];
}

// ============================================================================
// 共享类型（API 原始响应类型就近放在各 adapter 文件中）
// ============================================================================
