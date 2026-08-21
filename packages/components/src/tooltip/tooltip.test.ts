import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UITooltip } from "./tooltip.js";
import "../button/register.js";
import "./register.js";

describe("ui-tooltip", () => {
  it("supports click-controlled visibility through the same open-change event", async () => {
    const tooltip = await fixture<UITooltip>(`
      <ui-tooltip trigger="click" label="Details">
        <ui-button slot="trigger" type="button">Details</ui-button>
        Project details
      </ui-tooltip>
    `);
    const listener = vi.fn();
    tooltip.addEventListener("ui-tooltip-open-change", listener);

    tooltip.querySelector("ui-button")!.click();
    await settled(tooltip.parentElement!);

    expect(tooltip.open).toBe(true);
    expect(listener.mock.calls[0]?.[0].detail).toEqual({ open: true, reason: "trigger" });
    expect(inShadow(tooltip, '[part="popup"]').getAttribute("role")).toBe("tooltip");
  });

  it("keeps manual tooltips inert until their imperative state API is used", async () => {
    const tooltip = await fixture<UITooltip>(`
      <ui-tooltip trigger="manual" label="Details">
        <button slot="trigger">Details</button>
        Project details
      </ui-tooltip>
    `);

    tooltip
      .querySelector("button")!
      .dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    await settled(tooltip.parentElement!);
    expect(tooltip.open).toBe(false);

    tooltip.show();
    await settled(tooltip.parentElement!);
    expect(tooltip.open).toBe(true);
  });
});
