/**
 * 豆包搜索扩展入口：生命周期管理，注册工具和命令。
 *
 * @module
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { loadConfig, loadKeysFromEnv } from "./config.ts";
import { formatKeyStatus } from "./formatter.ts";
import { KeyPool } from "./key-pool.ts";
import { createWebSearchTool } from "./tool.ts";
import { DEFAULT_CONFIG } from "./types.ts";

export default function (pi: ExtensionAPI) {
  let pool: KeyPool | null = null;
  let config = DEFAULT_CONFIG;

  pi.on("session_start", async (_event, ctx) => {
    // 1. 加载配置
    config = loadConfig(ctx.cwd);

    // 2. 加载 Key
    const keys = loadKeysFromEnv(config);

    // 3. 初始化 KeyPool
    pool = new KeyPool(keys);

    // 4. 启动检查：未配置 Key 时警告
    if (keys.length === 0 && ctx.hasUI) {
      ctx.ui.notify(
        "未配置豆包搜索 API Key。请设置环境变量 DOUBAO_SEARCH_API_KEYS 或 DOUBAO_SEARCH_API_KEY。",
        "warning",
      );
    }
  });

  pi.on("session_shutdown", async () => {
    // KeyPool 无需显式清理（无打开的资源/定时器）
    pool = null;
  });

  // 注册 doubao_web_search 工具（通过 getter 传入最新 pool/config 引用）
  pi.registerTool(createWebSearchTool(() => pool!, () => config));

  // 注册 /doubao-keys 命令
  pi.registerCommand("doubao-keys", {
    description: "显示豆包搜索 API Key 池状态",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI || pool === null)
        return;
      ctx.ui.notify(formatKeyStatus(pool.getStatus()), "info");
    },
  });
}
