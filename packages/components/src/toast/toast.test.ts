import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIToast } from "./toast.js";
import "./register.js";

describe("ui-toast", () => {
  it("pauses its remaining timeout during pointer interaction", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const toast = await fixture<UIToast>(`<ui-toast open duration="30">Saved</ui-toast>`);
      const root = inShadow<HTMLElement>(toast, '[part="root"]');

      root.dispatchEvent(new PointerEvent("pointerenter"));
      await settled(toast.parentElement!);
      expect(toast.matches(":state(paused)")).toBe(true);

      await vi.advanceTimersByTimeAsync(50);
      expect(toast.open).toBe(true);

      root.dispatchEvent(new PointerEvent("pointerleave"));
      await settled(toast.parentElement!);
      await vi.advanceTimersByTimeAsync(35);
      await settled(toast.parentElement!);
      expect(toast.open).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("exposes an authored icon without changing message ownership", async () => {
    const toast = await fixture<UIToast>(`
      <ui-toast open duration="0"><span slot="icon">✓</span>Project saved</ui-toast>
    `);

    expect(
      inShadow<HTMLSlotElement>(toast, 'slot[name="icon"]').assignedElements()[0]?.textContent,
    ).toBe("✓");
    expect(inShadow<HTMLSlotElement>(toast, "slot:not([name])").assignedNodes()).not.toHaveLength(
      0,
    );
  });
});
