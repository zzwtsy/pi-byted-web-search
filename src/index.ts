/**
 * 豆包搜索扩展入口：生命周期管理，注册工具和命令。
 *
 * @module
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { loadConfig, loadKeysFromEnv } from "./config.ts";
import { KeyPool } from "./key-pool.ts";
import { KeyStatusComponent } from "./key-status.ts";
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
        "No Doubao Search API key configured. Set the DOUBAO_SEARCH_API_KEYS or DOUBAO_SEARCH_API_KEY environment variable.",
        "warning",
      );
    }
  });

  pi.on("session_shutdown", async () => {
    // KeyPool 无需显式清理（无打开的资源/定时器）
    pool = null;
  });

  // 注册 doubao_web_search 工具（通过 getter 传入最新 pool/config 引用）
  pi.registerTool(createWebSearchTool(
    () => {
      if (!pool) {
        throw new Error("Doubao Search extension not initialized (session_start not fired). Please retry.");
      }
      return pool;
    },
    () => config,
  ));

  // 注册 /doubao-keys 命令
  pi.registerCommand("doubao-keys", {
    description: "Show Doubao Search API key pool status",
    handler: async (_args, ctx) => {
      // hasUI 在 RPC 模式同样为 true（见 pi types.d.ts），终端 UI 用 mode 守卫
      if (ctx.mode !== "tui" || pool === null)
        return;
      // 快照引用，避免组件打开期间 session_shutdown 将 pool 置 null
      const currentPool = pool;
      await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
        return new KeyStatusComponent(() => currentPool.getStatus(), theme, () => done());
      });
    },
  });
}
