/**
 * 配置加载：环境变量 + JSON 配置文件。
 *
 * @module
 */

import type { BillingType, DoubaoSearchConfig, KeyState } from "./types.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import {
  DEFAULT_CONFIG,
} from "./types.ts";

/**
 * 加载并合并全局（~/.pi/agent/）和项目（.pi/）配置。
 * 优先级：环境变量 > 项目配置 > 全局配置 > 默认值。
 * 合并后做合法性校验与 clamp，避免越界配置直接透传给 API。
 */
export function loadConfig(cwd: string): DoubaoSearchConfig {
  const globalPath = join(getAgentDir(), "doubao-search.json");
  const projectPath = join(cwd, CONFIG_DIR_NAME, "doubao-search.json");

  const globalConfig = loadJsonFile(globalPath);
  const projectConfig = loadJsonFile(projectPath);

  return normalizeConfig({ ...DEFAULT_CONFIG, ...globalConfig, ...projectConfig });
}

/** 校验并修正配置值，越界时 clamp 并告警。 */
export function normalizeConfig(config: DoubaoSearchConfig): DoubaoSearchConfig {
  const c: DoubaoSearchConfig = { ...config };
  const warn = (key: string, value: unknown, fixed: unknown) => {
    console.warn(`[doubao-search] Invalid config ${key}=${String(value)}, adjusted to ${String(fixed)}`);
  };

  // maxSnippetLength：Global 版 API 上限 3000
  if (!Number.isFinite(c.maxSnippetLength) || c.maxSnippetLength < 1) {
    warn("maxSnippetLength", c.maxSnippetLength, 1000);
    c.maxSnippetLength = 1000;
  } else if (c.maxSnippetLength > 3000) {
    warn("maxSnippetLength", c.maxSnippetLength, 3000);
    c.maxSnippetLength = 3000;
  }

  // requestTimeoutMs：过低会立即超时，过高会让取消响应变迟钝
  if (!Number.isFinite(c.requestTimeoutMs) || c.requestTimeoutMs < 1000) {
    warn("requestTimeoutMs", c.requestTimeoutMs, 10_000);
    c.requestTimeoutMs = 10_000;
  } else if (c.requestTimeoutMs > 60_000) {
    warn("requestTimeoutMs", c.requestTimeoutMs, 60_000);
    c.requestTimeoutMs = 60_000;
  }

  // authInfoLevel：Custom 版仅支持 0（不限制）/ 1（仅非常权威）
  if (c.authInfoLevel !== 0 && c.authInfoLevel !== 1) {
    warn("authInfoLevel", c.authInfoLevel, 0);
    c.authInfoLevel = 0;
  }

  // defaultCount：工具执行时还会二次 clamp，这里提前修正
  if (!Number.isFinite(c.defaultCount)) {
    warn("defaultCount", c.defaultCount, 5);
    c.defaultCount = 5;
  } else {
    c.defaultCount = Math.min(Math.max(1, Math.round(c.defaultCount)), 10);
  }

  // rateLimitCooldownMs：负值会让限流立即恢复，失去冷却意义
  if (!Number.isFinite(c.rateLimitCooldownMs) || c.rateLimitCooldownMs < 0) {
    warn("rateLimitCooldownMs", c.rateLimitCooldownMs, 60_000);
    c.rateLimitCooldownMs = 60_000;
  }

  // cacheTtlMs：负值无意义，0 = 禁用缓存
  if (!Number.isFinite(c.cacheTtlMs) || c.cacheTtlMs < 0) {
    warn("cacheTtlMs", c.cacheTtlMs, 300_000);
    c.cacheTtlMs = 300_000;
  } else if (c.cacheTtlMs > 3_600_000) {
    warn("cacheTtlMs", c.cacheTtlMs, 3_600_000);
    c.cacheTtlMs = 3_600_000;
  }

  return c;
}

function loadJsonFile(filePath: string): Partial<DoubaoSearchConfig> {
  if (!existsSync(filePath))
    return {};
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as Partial<DoubaoSearchConfig>;
  } catch (e) {
    console.error(`Failed to load config ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
    return {};
  }
}

/**
 * 解析带计费类型前缀的 Key 字符串。
 *
 * - `"postpaid:xxx"` -> `{ key: "xxx", billingType: "postpaid" }`
 * - `"subscription:xxx"` -> `{ key: "xxx", billingType: "subscription" }`
 * - `"xxx"` -> `{ key: "xxx", billingType: "postpaid" }`（默认）
 */
function parseKeyWithBilling(raw: string): { key: string; billingType: BillingType } {
  const trimmed = raw.trim();
  if (trimmed.startsWith("postpaid:")) {
    return { key: trimmed.slice("postpaid:".length), billingType: "postpaid" };
  }
  if (trimmed.startsWith("subscription:")) {
    return { key: trimmed.slice("subscription:".length), billingType: "subscription" };
  }
  return { key: trimmed, billingType: "postpaid" };
}

/**
 * 从环境变量或配置文件加载 API Key。
 *
 * 优先级：
 * 1. 环境变量 `DOUBAO_SEARCH_API_KEYS`（逗号分隔，推荐）
 * 2. 环境变量 `DOUBAO_SEARCH_API_KEY`（单 Key）
 * 3. 配置文件的 `postpaidKeys` / `subscriptionKeys`（任一存在时）
 */
export function loadKeysFromEnv(config: DoubaoSearchConfig): KeyState[] {
  const raw: { key: string; billingType: BillingType }[] = [];

  // 优先级 1/2：环境变量
  const multi = process.env.DOUBAO_SEARCH_API_KEYS;
  const single = process.env.DOUBAO_SEARCH_API_KEY;
  const rawStr = multi ?? single;

  if (rawStr != null) {
    for (const part of rawStr.split(",")) {
      if (part.trim()) {
        raw.push(parseKeyWithBilling(part));
      }
    }
  } else {
    // 优先级 3：配置文件中的 Key
    for (const k of config.postpaidKeys ?? []) {
      if (k.trim())
        raw.push({ key: k.trim(), billingType: "postpaid" });
    }
    for (const k of config.subscriptionKeys ?? []) {
      if (k.trim())
        raw.push({ key: k.trim(), billingType: "subscription" });
    }
  }

  return raw.map((k, i) => ({
    key: k.key,
    label: `key${i + 1}`,
    billingType: k.billingType,
    status: "active" as const,
    useCount: 0,
  }));
}
