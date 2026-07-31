import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { loadConfig, loadKeysFromEnv } from "../src/config.ts";

import { formatKeyStatus } from "../src/formatter.ts";
import { createWebSearchTool } from "../src/tool.ts";
import { DEFAULT_CONFIG } from "../src/types.ts";

// mock config 和 key-pool 模块
vi.mock("../src/config.ts", () => ({
  loadConfig: vi.fn(() => DEFAULT_CONFIG),
  loadKeysFromEnv: vi.fn(() => [
    { key: "test-key", label: "key1", billingType: "postpaid", status: "active" as const, useCount: 0 },
  ]),
}));

vi.mock("../src/tool.ts", () => ({
  createWebSearchTool: vi.fn((getPool?: () => unknown) => ({
    name: "doubao_web_search",
    getPool,
    execute: vi.fn(),
  })),
}));

vi.mock("../src/formatter.ts", () => ({
  formatKeyStatus: vi.fn(() => "Key 池状态"),
}));

/** Mock 函数类型 */
type MockFn = ReturnType<typeof vi.fn>;

/** Mock PI 接口（只实现测试需要的字段） */
interface MockPi {
  on: MockFn;
  registerTool: MockFn;
  registerCommand: MockFn;
}

/** 创建 mock ExtensionAPI */
function mockPi(): ExtensionAPI {
  return {
    on: vi.fn(),
    registerTool: vi.fn(),
    registerCommand: vi.fn(),
  } as unknown as ExtensionAPI;
}

/** 从 mock pi 中提取 MockPi 视图 */
function asMockPi(pi: ExtensionAPI): MockPi {
  return pi as unknown as MockPi;
}

/** Handler 类型 */
type Handler = (event: unknown, ctx: unknown) => Promise<void> | void;

/** 提取 session_start handler */
function getSessionStartHandler(pi: ExtensionAPI): Handler | undefined {
  const mock = asMockPi(pi);
  for (const call of mock.on.mock.calls as unknown[][]) {
    if (call[0] === "session_start") {
      return call[1] as Handler;
    }
  }
  return undefined;
}

/** 提取 session_shutdown handler */
function getSessionShutdownHandler(pi: ExtensionAPI): Handler | undefined {
  const mock = asMockPi(pi);
  for (const call of mock.on.mock.calls as unknown[][]) {
    if (call[0] === "session_shutdown") {
      return call[1] as Handler;
    }
  }
  return undefined;
}

/** 提取 doubao-keys 命令 handler */
function getCommandHandler(pi: ExtensionAPI): { handler: (args: string, ctx: unknown) => Promise<void> } | undefined {
  const mock = asMockPi(pi);
  for (const call of mock.registerCommand.mock.calls as unknown[][]) {
    if (call[0] === "doubao-keys") {
      return call[1] as { handler: (args: string, ctx: unknown) => Promise<void> };
    }
  }
  return undefined;
}

/** 简单 mock ctx */
function mockCtx(overrides: Record<string, unknown> = {}): { cwd: string; hasUI: boolean; ui: { notify: ReturnType<typeof vi.fn> } } {
  return {
    cwd: "/tmp",
    hasUI: false,
    ui: { notify: vi.fn() },
    ...overrides,
  };
}

describe("index.ts 扩展入口", () => {
  it("注册 doubao_web_search 工具", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    expect(asMockPi(pi).registerTool).toHaveBeenCalledTimes(1);
    expect(createWebSearchTool).toHaveBeenCalled();
  });

  it("注册 /doubao-keys 命令", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    const mock = asMockPi(pi);
    expect(mock.registerCommand).toHaveBeenCalledTimes(1);
    const cmdCall = mock.registerCommand.mock.calls[0] as unknown[];
    expect(cmdCall[0]).toBe("doubao-keys");
    const cmdOpts = cmdCall[1] as { description?: string; handler: unknown };
    expect(cmdOpts.description).toBeTypeOf("string");
    expect(cmdOpts.handler).toBeTypeOf("function");
  });

  it("注册 session_start 和 session_shutdown 事件", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    const events = (asMockPi(pi).on.mock.calls as unknown[][]).map(call => call[0] as string);
    expect(events).toContain("session_start");
    expect(events).toContain("session_shutdown");
  });

  it("session_start 初始化 config 和 pool", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    const handler = getSessionStartHandler(pi);
    expect(handler).toBeDefined();

    await handler?.({}, mockCtx());

    expect(loadConfig).toHaveBeenCalledWith("/tmp");
    expect(loadKeysFromEnv).toHaveBeenCalledWith(DEFAULT_CONFIG);
  });

  it("未配置 Key 时发送 warning 通知", async () => {
    vi.mocked(loadKeysFromEnv).mockReturnValueOnce([]);

    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    const handler = getSessionStartHandler(pi);
    const ctx = mockCtx({ hasUI: true });

    await handler?.({}, ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("未配置豆包搜索 API Key"),
      "warning",
    );
  });

  it("配置了 Key 时不发送 warning 通知", async () => {
    vi.mocked(loadKeysFromEnv).mockReturnValueOnce([
      { key: "k", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    const handler = getSessionStartHandler(pi);
    const ctx = mockCtx({ hasUI: true });

    await handler?.({}, ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("hasUI=false 时不发送通知", async () => {
    vi.mocked(loadKeysFromEnv).mockReturnValueOnce([]);

    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    const handler = getSessionStartHandler(pi);
    const ctx = mockCtx({ hasUI: false });

    await handler?.({}, ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("pool 未初始化时工具 getter 抛出友好错误", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    // 取最后一次调用（本测试的工厂闭包），避免与其他测试的 mock.calls 混淆
    const getPool = vi.mocked(createWebSearchTool).mock.calls.at(-1)?.[0] as () => unknown;
    expect(getPool).toBeTypeOf("function");

    // session_start 之前调用 → 抛出可操作错误而非 TypeError
    expect(() => getPool()).toThrow(/尚未初始化/);

    // session_start 之后 → 返回 pool
    const startHandler = getSessionStartHandler(pi);
    await startHandler?.({}, mockCtx());
    expect(getPool()).toBeDefined();

    // session_shutdown 之后 → 再次抛错
    const shutdownHandler = getSessionShutdownHandler(pi);
    await shutdownHandler?.({}, {});
    expect(() => getPool()).toThrow(/尚未初始化/);
  });

  it("/doubao-keys 命令在 pool 初始化后显示状态", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    // 先触发 session_start 初始化 pool
    const startHandler = getSessionStartHandler(pi);
    await startHandler?.({}, mockCtx());

    // 再调用命令
    const cmdOpts = getCommandHandler(pi);
    expect(cmdOpts).toBeDefined();

    const ctx = mockCtx({ hasUI: true });
    await cmdOpts!.handler("", ctx);

    expect(formatKeyStatus).toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith("Key 池状态", "info");
  });

  it("/doubao-keys 命令在 pool 未初始化时不报错", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    // 不触发 session_start，直接调用命令
    const cmdOpts = getCommandHandler(pi);
    const ctx = mockCtx({ hasUI: true });
    await cmdOpts!.handler("", ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("/doubao-keys 命令在 hasUI=false 时不执行", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    const startHandler = getSessionStartHandler(pi);
    await startHandler?.({}, mockCtx());

    const cmdOpts = getCommandHandler(pi);
    const ctx = mockCtx({ hasUI: false });
    await cmdOpts!.handler("", ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("session_shutdown 将 pool 置 null", async () => {
    const pi = mockPi();
    const { default: factory } = await import("../src/index.ts");
    factory(pi);

    // 先 session_start 初始化
    const startHandler = getSessionStartHandler(pi);
    await startHandler?.({}, mockCtx());

    // 再 session_shutdown
    const shutdownHandler = getSessionShutdownHandler(pi);
    expect(shutdownHandler).toBeDefined();
    await shutdownHandler?.({}, {});

    // 命令应不报错且不显示状态（pool 为 null）
    const cmdOpts = getCommandHandler(pi);
    const ctx = mockCtx({ hasUI: true });
    await cmdOpts!.handler("", ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });
});
