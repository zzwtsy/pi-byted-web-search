import { beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/cache.ts";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("命中缓存", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("未命中返回 undefined", () => {
    const cache = new TtlCache<string>(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("过期后惰性删除", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("key", "value");
    vi.advanceTimersByTime(1001);
    expect(cache.get("key")).toBeUndefined();
  });

  it("clear 清空所有条目", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  it("size 统计有效条目数", () => {
    const cache = new TtlCache<string>(1000);
    cache.set("a", "1");
    cache.set("b", "2");
    expect(cache.size()).toBe(2);

    // 过期条目不计入
    vi.advanceTimersByTime(1001);
    cache.set("c", "3");
    expect(cache.size()).toBe(1);
  });
});
