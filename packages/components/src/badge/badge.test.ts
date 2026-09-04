import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { UIBadge } from "./badge.js";
import "./register.js";

describe("ui-badge", () => {
  it("registers, upgrades and applies documented defaults", async () => {
    expect(customElements.get("ui-badge")).toBe(UIBadge);

    const badge = await fixture<UIBadge>(`<ui-badge>Ready</ui-badge>`);
    expect(badge).toBeInstanceOf(UIBadge);
    expect(badge.tone).toBe("accent");
    expect(badge.size).toBe("medium");
    expect(badge.variant).toBe("label");
    expect(badge.max).toBe(99);
    const content = shadow(badge).querySelector<HTMLSlotElement>("slot:not([name])")!;
    expect(content.assignedNodes().map((node) => node.textContent?.trim())).toContain("Ready");
  });

  it("reflects its independent meaning and scale axes", async () => {
    const badge = await fixture<UIBadge>(`<ui-badge>Ready</ui-badge>`);
    badge.tone = "warning";
    badge.size = "large";
    await settled(badge.parentElement!);

    expect(badge.getAttribute("tone")).toBe("warning");
    expect(badge.getAttribute("size")).toBe("large");
  });

  it("formats count indicators and hides empty counts without removing the target", async () => {
    const badge = await fixture<UIBadge>(`
      <ui-badge variant="count" count="12" max="9">
        <span slot="target">Inbox</span>
      </ui-badge>
    `);
    await settled(badge.parentElement!);

    expect(inShadow<HTMLElement>(badge, '[part="value"]').textContent).toBe("9+");
    expect(inShadow<HTMLElement>(badge, '[part="indicator"]').hidden).toBe(false);
    expect(inShadow<HTMLSlotElement>(badge, 'slot[name="target"]').assignedElements()).toHaveLength(
      1,
    );
    expect(badge.matches(":state(anchored)")).toBe(true);
    expect(badge.matches(":state(empty)")).toBe(false);

    badge.count = 0;
    await settled(badge.parentElement!);

    expect(inShadow<HTMLElement>(badge, '[part="indicator"]').hidden).toBe(true);
    expect(badge.matches(":state(empty)")).toBe(true);
    expect(inShadow<HTMLElement>(badge, '[part="target"]').hidden).toBe(false);
  });

  it("keeps dot and icon variants distinct from text labels", async () => {
    const dot = await fixture<UIBadge>(
      `<ui-badge variant="dot" tone="positive" label="Online"></ui-badge>`,
    );
    const icon = await fixture<UIBadge>(`
      <ui-badge variant="icon" label="Verified">
        <span slot="icon">✓</span>
      </ui-badge>
    `);
    await settled(icon.parentElement!);

    expect(inShadow<HTMLElement>(dot, '[part="indicator"]').textContent?.trim()).toBe("");
    expect(inShadow<HTMLElement>(dot, '[part="root"]').getAttribute("aria-label")).toBe("Online");
    expect(inShadow<HTMLSlotElement>(icon, 'slot[name="icon"]').assignedElements()).toHaveLength(1);
  });
});
