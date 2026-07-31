import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadKeysFromEnv, normalizeConfig } from "../src/config.ts";
import { KeyPool } from "../src/key-pool.ts";
import { DEFAULT_CONFIG } from "../src/types.ts";

// ---------------------------------------------------------------------------
// types.ts: DEFAULT_CONFIG
// ---------------------------------------------------------------------------

describe("DEFAULT_CONFIG", () => {
  it("默认值正确", () => {
    expect(DEFAULT_CONFIG.defaultVersion).toBe("custom");
    expect(DEFAULT_CONFIG.defaultCount).toBe(5);
    expect(DEFAULT_CONFIG.defaultDetailLevel).toBe("summary");
    expect(DEFAULT_CONFIG.contentFormat).toBe("markdown");
    expect(DEFAULT_CONFIG.requestTimeoutMs).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// config.ts: normalizeConfig
// ---------------------------------------------------------------------------

describe("normalizeConfig", () => {
  it("maxSnippetLength 超过 3000 时 clamp", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = normalizeConfig({ ...DEFAULT_CONFIG, maxSnippetLength: 5000 });
    expect(c.maxSnippetLength).toBe(3000);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("maxSnippetLength 非法时回退默认值", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = normalizeConfig({ ...DEFAULT_CONFIG, maxSnippetLength: NaN });
    expect(c.maxSnippetLength).toBe(1000);
    warn.mockRestore();
  });

  it("requestTimeoutMs 过小时回退默认值", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = normalizeConfig({ ...DEFAULT_CONFIG, requestTimeoutMs: 0 });
    expect(c.requestTimeoutMs).toBe(10_000);
  });

  it("authInfoLevel 非 0/1 时回退 0", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = normalizeConfig({ ...DEFAULT_CONFIG, authInfoLevel: 2 });
    expect(c.authInfoLevel).toBe(0);
  });

  it("defaultCount 越界时 clamp 到 [1,10] 并取整", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(normalizeConfig({ ...DEFAULT_CONFIG, defaultCount: 0 }).defaultCount).toBe(1);
    expect(normalizeConfig({ ...DEFAULT_CONFIG, defaultCount: 50 }).defaultCount).toBe(10);
    expect(normalizeConfig({ ...DEFAULT_CONFIG, defaultCount: 4.7 }).defaultCount).toBe(5);
  });

  it("rateLimitCooldownMs 为负时回退默认值", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = normalizeConfig({ ...DEFAULT_CONFIG, rateLimitCooldownMs: -1 });
    expect(c.rateLimitCooldownMs).toBe(60_000);
  });

  it("合法配置不被修改", () => {
    const c = normalizeConfig({ ...DEFAULT_CONFIG, maxSnippetLength: 1000, requestTimeoutMs: 8000 });
    expect(c.maxSnippetLength).toBe(1000);
    expect(c.requestTimeoutMs).toBe(8000);
  });
});

// ---------------------------------------------------------------------------
// config.ts: loadKeysFromEnv
// ---------------------------------------------------------------------------

describe("loadKeysFromEnv", () => {
  beforeEach(() => {
    delete process.env.DOUBAO_SEARCH_API_KEYS;
    delete process.env.DOUBAO_SEARCH_API_KEY;
  });

  it("多 Key 带前缀解析", () => {
    process.env.DOUBAO_SEARCH_API_KEYS = "postpaid:k1,subscription:k2,k3";
    const keys = loadKeysFromEnv(DEFAULT_CONFIG);
    expect(keys).toHaveLength(3);
    expect(keys[0]).toMatchObject({ key: "k1", billingType: "postpaid" });
    expect(keys[1]).toMatchObject({ key: "k2", billingType: "subscription" });
    expect(keys[2]).toMatchObject({ key: "k3", billingType: "postpaid" });
    expect(keys[0].label).toBe("key1");
    expect(keys[0].status).toBe("active");
  });

  it("单 Key 环境变量", () => {
    process.env.DOUBAO_SEARCH_API_KEY = "single-key";
    const keys = loadKeysFromEnv(DEFAULT_CONFIG);
    expect(keys).toHaveLength(1);
    expect(keys[0].key).toBe("single-key");
  });

  it("配置文件 Key 优先于环境变量", () => {
    process.env.DOUBAO_SEARCH_API_KEYS = "env-key";
    const keys = loadKeysFromEnv({
      ...DEFAULT_CONFIG,
      postpaidKeys: ["cfg-key1"],
      subscriptionKeys: ["cfg-key2"],
    });
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatchObject({ key: "cfg-key1", billingType: "postpaid" });
    expect(keys[1]).toMatchObject({ key: "cfg-key2", billingType: "subscription" });
  });

  it("配置文件空数组不遮蔽环境变量", () => {
    process.env.DOUBAO_SEARCH_API_KEYS = "env-key1,env-key2";
    const keys = loadKeysFromEnv({
      ...DEFAULT_CONFIG,
      postpaidKeys: [],
      subscriptionKeys: [],
    });
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatchObject({ key: "env-key1", billingType: "postpaid" });
    expect(keys[1]).toMatchObject({ key: "env-key2", billingType: "postpaid" });
  });

  it("未配置 Key 时返回空数组", () => {
    const keys = loadKeysFromEnv(DEFAULT_CONFIG);
    expect(keys).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// key-pool.ts: KeyPool
// ---------------------------------------------------------------------------

describe("KeyPool", () => {
  it("custom 优先 subscription", () => {
    const pool = new KeyPool([
      { key: "post1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "sub1", label: "key2", billingType: "subscription", status: "active", useCount: 0 },
    ]);
    expect(pool.acquire("custom")?.key).toBe("sub1");
  });

  it("custom 在 subscription 内 round-robin", () => {
    const pool = new KeyPool([
      { key: "sub1", label: "key1", billingType: "subscription", status: "active", useCount: 0 },
      { key: "sub2", label: "key2", billingType: "subscription", status: "active", useCount: 0 },
    ]);
    expect(pool.acquire("custom")?.key).toBe("sub1");
    expect(pool.acquire("custom")?.key).toBe("sub2");
    expect(pool.acquire("custom")?.key).toBe("sub1");
  });

  it("global 只用 postpaid", () => {
    const pool = new KeyPool([
      { key: "post1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "sub1", label: "key2", billingType: "subscription", status: "active", useCount: 0 },
    ]);
    const k = pool.acquire("global");
    expect(k?.billingType).toBe("postpaid");
    expect(k?.key).toBe("post1");
  });

  it("global 在 postpaid 内 round-robin", () => {
    const pool = new KeyPool([
      { key: "post1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "post2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);
    expect(pool.acquire("global")?.key).toBe("post1");
    expect(pool.acquire("global")?.key).toBe("post2");
    expect(pool.acquire("global")?.key).toBe("post1");
  });

  it("限流后跳过", () => {
    const pool = new KeyPool([
      { key: "rp1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);
    pool.markRateLimited("rp1", 60_000);
    expect(pool.acquire("global")).toBeNull();
  });

  it("subscription 耗尽后回退 postpaid", () => {
    const pool = new KeyPool([
      { key: "post1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "sub1", label: "key2", billingType: "subscription", status: "active", useCount: 0 },
    ]);
    pool.markExhausted("sub1", "额度耗尽");
    expect(pool.acquire("custom")?.billingType).toBe("postpaid");
  });

  it("所有 Key 耗尽时返回 null", () => {
    const pool = new KeyPool([
      { key: "post1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "sub1", label: "key2", billingType: "subscription", status: "active", useCount: 0 },
    ]);
    pool.markExhausted("post1", "耗尽");
    pool.markExhausted("sub1", "耗尽");
    expect(pool.acquire("custom")).toBeNull();
    expect(pool.acquire("global")).toBeNull();
  });

  it("限流冷却后自动恢复", async () => {
    const pool = new KeyPool([
      { key: "rk1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);
    pool.markRateLimited("rk1", 1);
    await new Promise(r => setTimeout(r, 10));
    expect(pool.acquire("global")?.key).toBe("rk1");
  });

  it("getStatus 返回脱敏 Key", () => {
    const pool = new KeyPool([
      { key: "verylongkey123456", label: "key1", billingType: "postpaid", status: "active", useCount: 5 },
    ]);
    const status = pool.getStatus();
    expect(status[0].key).toBe("very...3456");
    expect(status[0].useCount).toBe(5);
  });

  it("getStatus 对过短 Key 完全隐藏", () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
    ]);
    const status = pool.getStatus();
    expect(status[0].key).toBe("***");
  });

  it("in-flight 未满时优先选择空闲 Key", () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    // k1 已有 2 个 in-flight 请求（达到上限）
    pool.beginUse("k1");
    pool.beginUse("k1");

    // 应跳过 k1，选择 k2
    expect(pool.acquire("custom")?.key).toBe("k2");

    // k2 达到上限后，回退到全部候选，避免无谓失败（round-robin 继续轮询）
    pool.beginUse("k2");
    pool.beginUse("k2");
    const fallback = pool.acquire("custom");
    expect(fallback).not.toBeNull();
    expect(["k1", "k2"]).toContain(fallback?.key);
  });

  it("endUse 释放后恢复可选", () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "postpaid", status: "active", useCount: 0 },
    ]);

    pool.beginUse("k1");
    pool.beginUse("k1");
    pool.endUse("k1");
    pool.endUse("k1");

    // k1 in-flight 归零后恢复为候选（round-robin 从头开始）
    const acquired = pool.acquire("custom");
    expect(acquired?.key).toBe("k1");
  });

  it("size 返回 Key 数量", () => {
    const pool = new KeyPool([
      { key: "k1", label: "key1", billingType: "postpaid", status: "active", useCount: 0 },
      { key: "k2", label: "key2", billingType: "subscription", status: "active", useCount: 0 },
    ]);
    expect(pool.size).toBe(2);
  });
});
