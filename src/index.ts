/**
 * 豆包搜索扩展入口：生命周期管理，注册工具和命令。
 *
 * @module
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { UnifiedSearchResult } from "./types.ts";
import { TtlCache } from "./cache.ts";
import { loadConfig, loadKeysFromEnv } from "./config.ts";
import { KeyPool } from "./key-pool.ts";
import { formatKeyStatus, KeyStatusComponent } from "./key-status.ts";
import { createWebSearchTool } from "./tool.ts";
import { DEFAULT_CONFIG } from "./types.ts";

/** 搜索缓存单例：模块级共享，session_start 时按配置 TTL 创建。 */
let sharedCache: TtlCache<UnifiedSearchResult> | undefined;

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

    // 4. 初始化缓存（TTL=0 禁用）
    sharedCache = config.cacheTtlMs > 0 ? new TtlCache<UnifiedSearchResult>(config.cacheTtlMs) : undefined;

    // 5. 启动检查：未配置 Key 时警告
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
    sharedCache = undefined;
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
    () => sharedCache,
  ));

  // 注册 /doubao-keys 命令
  pi.registerCommand("doubao-keys", {
    description: "Show Doubao Search API key pool status",
    handler: async (_args, ctx) => {
      const currentPool = pool;
      if (currentPool === null)
        return;

      if (ctx.mode === "tui") {
        // 交互式可滚动面板（保持现状）
        await ctx.ui.custom<void>((_tui, theme, _kb, done) => {
          return new KeyStatusComponent(() => currentPool.getStatus(), theme, () => done());
        });
      } else if (ctx.mode === "rpc") {
        // RPC 兜底：fire-and-forget notify，通过 extension_ui_request 发给客户端
        ctx.ui.notify(formatKeyStatus(currentPool.getStatus()), "info");
      }
      // json / print：hasUI 为 false，notify 是 no-op，无需处理
    },
  });
}
