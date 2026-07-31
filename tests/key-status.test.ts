import type { Theme } from "@earendil-works/pi-coding-agent";
import type { KeyState } from "../src/types.ts";
import { describe, expect, it, vi } from "vitest";
import { KeyStatusComponent } from "../src/key-status.ts";

/** 创建 mock Theme，返回带 spy 的 fg/bold */
function mockTheme() {
  const fg = vi.fn((_color: string, text: string) => text);
  const bold = vi.fn((text: string) => text);
  return { theme: { fg, bold } as unknown as Theme, fg, bold };
}

function makeState(overrides: Partial<KeyState> = {}): KeyState {
  return {
    key: "abcd...wxyz",
    label: "key1",
    billingType: "postpaid",
    status: "active",
    useCount: 0,
    ...overrides,
  };
}

describe("KeyStatusComponent", () => {
  it("空池时显示提示", () => {
    const { theme } = mockTheme();
    const comp = new KeyStatusComponent(() => [], theme, vi.fn());
    const lines = comp.render(80);
    expect(lines.join("\n")).toContain("No API keys configured");
  });

  it("渲染各字段与选中标记", () => {
    const { theme, fg } = mockTheme();
    const states = [
      makeState({ key: "abcd...wxyz", label: "key1", billingType: "postpaid", status: "active", useCount: 5 }),
      makeState({ key: "efgh...stuv", label: "key2", billingType: "subscription", status: "exhausted", useCount: 500 }),
    ];
    const comp = new KeyStatusComponent(() => states, theme, vi.fn());
    const lines = comp.render(80);

    expect(lines.join("\n")).toContain("Doubao Search Keys");
    // 第一个 Key 带选中标记
    expect(lines[2]).toContain(">");
    expect(fg).toHaveBeenCalledWith("success", "active");
    expect(fg).toHaveBeenCalledWith("error", "exhausted");
    expect(fg).toHaveBeenCalledWith("muted", "sub");
    expect(fg).toHaveBeenCalledWith("dim", "5 calls");
  });

  it("限流状态显示冷却剩余时间", () => {
    const { theme, fg } = mockTheme();
    const states = [
      makeState({
        status: "rate_limited",
        rateLimitedUntil: Date.now() + 30_000,
        useCount: 3,
      }),
    ];
    const comp = new KeyStatusComponent(() => states, theme, vi.fn());
    comp.render(80);

    expect(fg).toHaveBeenCalledWith("warning", "rate_limited");
    const cooldownCall = fg.mock.calls.find(c => c[0] === "warning" && /s left/.test(c[1]));
    expect(cooldownCall).toBeDefined();
  });

  it("lastError 过长时截断", () => {
    const { theme, fg } = mockTheme();
    const longError = "e".repeat(200);
    const states = [makeState({ status: "exhausted", lastError: longError })];
    const comp = new KeyStatusComponent(() => states, theme, vi.fn());
    comp.render(80);

    const errCall = fg.mock.calls.find(c => c[0] === "dim" && c[1].includes("..."));
    expect(errCall).toBeDefined();
  });

  it("↑/↓ 循环选择并失效缓存", () => {
    const { theme } = mockTheme();
    const states = [makeState(), makeState({ key: "efgh...stuv" })];
    const comp = new KeyStatusComponent(() => states, theme, vi.fn());

    comp.render(80);
    // 向下选择第二个（渲染显示脱敏 key；lines[3] 为第二个 Key 行）
    comp.handleInput("\u001B[B"); // down
    const afterDown = comp.render(80);
    expect(afterDown[3]).toContain("efgh...stuv");
    expect(afterDown[3]).toContain(">");
    expect(afterDown[2]).not.toContain(">");

    // 再向下循环回第一个
    comp.handleInput("\u001B[B");
    expect(comp.render(80)[2]).toContain("abcd...wxyz");

    // 向上循环回最后一个
    comp.handleInput("\u001B[A"); // up
    expect(comp.render(80)[3]).toContain("efgh...stuv");
  });

  it("esc 与 Ctrl+C 触发关闭", () => {
    const { theme } = mockTheme();
    const onClose = vi.fn();
    const comp = new KeyStatusComponent(() => [makeState()], theme, onClose);

    comp.handleInput("\u001B"); // escape
    expect(onClose).toHaveBeenCalledTimes(1);

    comp.handleInput("\u0003"); // ctrl+c
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("空池时按键不响应且不关闭", () => {
    const { theme } = mockTheme();
    const onClose = vi.fn();
    const comp = new KeyStatusComponent(() => [], theme, onClose);

    comp.handleInput("\u001B");
    comp.handleInput("\u001B[B");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("相同宽度下命中缓存", () => {
    const { theme } = mockTheme();
    const comp = new KeyStatusComponent(() => [makeState()], theme, vi.fn());

    const first = comp.render(80);
    const second = comp.render(80);
    expect(second).toBe(first);

    // invalidate 后重新渲染（新数组）
    comp.invalidate();
    const third = comp.render(80);
    expect(third).not.toBe(first);
  });
});
