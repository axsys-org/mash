import { describe, expect, it, vi } from "vitest";

import { fixture, settled } from "../test-support/fixture.js";
import type { UIToast } from "../toast/toast.js";
import type { UIToastStack } from "./toast-stack.js";
import "../toast/register.js";
import "./register.js";

describe("ui-toast-stack", () => {
  it("limits collapsed announcements and reveals the authored stack on interaction", async () => {
    const stack = await fixture<UIToastStack>(`
      <ui-toast-stack limit="2">
        <ui-toast open duration="0">First</ui-toast>
        <ui-toast open duration="0">Second</ui-toast>
        <ui-toast open duration="0">Third</ui-toast>
      </ui-toast-stack>
    `);
    const toasts = [...stack.querySelectorAll<UIToast>("ui-toast")];

    expect(toasts.map((toast) => toast.hidden)).toEqual([true, false, false]);
    stack.shadowRoot
      ?.querySelector<HTMLElement>('[part="root"]')
      ?.dispatchEvent(new PointerEvent("pointerenter"));
    await settled(stack.parentElement!);

    expect(stack.matches(":state(expanded)")).toBe(true);
    expect(toasts.map((toast) => toast.hidden)).toEqual([false, false, false]);
  });

  it("dismisses the newest visible toast with Escape", async () => {
    const stack = await fixture<UIToastStack>(`
      <ui-toast-stack>
        <ui-toast open duration="0">First</ui-toast>
        <ui-toast open duration="0">Second</ui-toast>
      </ui-toast-stack>
    `);
    const listener = vi.fn();
    stack.addEventListener("ui-toast-open-change", listener);
    stack.shadowRoot
      ?.querySelector<HTMLElement>('[part="root"]')
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settled(stack.parentElement!);

    expect(stack.querySelectorAll<UIToast>("ui-toast")[1]!.open).toBe(false);
    expect(listener.mock.calls[0]?.[0].detail.reason).toBe("escape");
  });

  it("pauses automatic dismissal while the stack is expanded", async () => {
    const stack = await fixture<UIToastStack>(`
      <ui-toast-stack><ui-toast open duration="20">Saved</ui-toast></ui-toast-stack>
    `);
    const toast = stack.querySelector<UIToast>("ui-toast")!;
    const root = stack.shadowRoot!.querySelector<HTMLElement>('[part="root"]')!;

    root.dispatchEvent(new PointerEvent("pointerenter"));
    await settled(stack.parentElement!);
    expect(toast.paused).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 35));
    expect(toast.open).toBe(true);

    root.dispatchEvent(new PointerEvent("pointerleave"));
    await settled(stack.parentElement!);
    expect(toast.paused).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 25));
    await settled(stack.parentElement!);
    expect(toast.open).toBe(false);
  });
});
