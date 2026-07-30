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
 * 项目配置覆盖全局配置，全局配置覆盖默认值。
 */
export function loadConfig(cwd: string): DoubaoSearchConfig {
  const globalPath = join(getAgentDir(), "doubao-search.json");
  const projectPath = join(cwd, CONFIG_DIR_NAME, "doubao-search.json");

  const globalConfig = loadJsonFile(globalPath);
  const projectConfig = loadJsonFile(projectPath);

  return { ...DEFAULT_CONFIG, ...globalConfig, ...projectConfig };
}

function loadJsonFile(filePath: string): Partial<DoubaoSearchConfig> {
  if (!existsSync(filePath))
    return {};
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as Partial<DoubaoSearchConfig>;
  } catch (e) {
    console.error(`加载配置失败 ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
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
 * 从配置文件或环境变量加载 API Key。
 *
 * 优先级：
 * 1. 配置文件的 `postpaidKeys` / `subscriptionKeys`（任一存在时）
 * 2. 环境变量 `DOUBAO_SEARCH_API_KEYS`（逗号分隔，推荐）
 * 3. 环境变量 `DOUBAO_SEARCH_API_KEY`（单 Key）
 */
export function loadKeysFromEnv(config: DoubaoSearchConfig): KeyState[] {
  const raw: { key: string; billingType: BillingType }[] = [];

  // 优先级 1：配置文件中的 Key
  if (config.postpaidKeys || config.subscriptionKeys) {
    for (const k of config.postpaidKeys ?? []) {
      if (k.trim())
        raw.push({ key: k.trim(), billingType: "postpaid" });
    }
    for (const k of config.subscriptionKeys ?? []) {
      if (k.trim())
        raw.push({ key: k.trim(), billingType: "subscription" });
    }
  } else {
    // 优先级 2/3：环境变量
    const multi = process.env.DOUBAO_SEARCH_API_KEYS;
    const single = process.env.DOUBAO_SEARCH_API_KEY;
    const rawStr = multi ?? single;

    if (rawStr != null) {
      for (const part of rawStr.split(",")) {
        if (part.trim()) {
          raw.push(parseKeyWithBilling(part));
        }
      }
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
