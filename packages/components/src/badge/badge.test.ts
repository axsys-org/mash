import { describe, expect, it } from "vitest";

import { fixture, settled, shadow } from "../test-support/fixture.js";
import { UIBadge } from "./badge.js";
import "./register.js";

describe("ui-badge", () => {
  it("registers, upgrades and applies documented defaults", async () => {
    expect(customElements.get("ui-badge")).toBe(UIBadge);

    const badge = await fixture<UIBadge>(`<ui-badge>Ready</ui-badge>`);
    expect(badge).toBeInstanceOf(UIBadge);
    expect(badge.tone).toBe("accent");
    expect(badge.size).toBe("medium");
    const content = shadow(badge).querySelector<HTMLSlotElement>("slot")!;
    expect(content.assignedNodes().map((node) => node.textContent?.trim())).toContain("Ready");
  });

  it("reflects its independent meaning and scale axes", async () => {
    const badge = await fixture<UIBadge>(`<ui-badge>Ready</ui-badge>`);
    badge.tone = "warning";
    badge.size = "small";
    await settled(badge.parentElement!);

    expect(badge.getAttribute("tone")).toBe("warning");
    expect(badge.getAttribute("size")).toBe("small");
  });
});
