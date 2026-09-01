import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UIMenuLabel } from "./menu-label.js";
import "./register.js";

describe("ui-menu-label", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("ui-menu-label")).toBe(UIMenuLabel);

    const el = await fixture<UIMenuLabel>(`<ui-menu-label>content</ui-menu-label>`);
    expect(el).toBeInstanceOf(UIMenuLabel);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its default slot", async () => {
    const el = await fixture<UIMenuLabel>(`<ui-menu-label>content</ui-menu-label>`);
    // `slot:not([name])` rather than `slot` — a component with named slots may
    // well render one of those first.
    const slot = inShadow<HTMLSlotElement>(el, "slot:not([name])");

    expect(
      slot
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent?.trim())
        .join(""),
    ).toBe("content");
  });

  it("exposes non-interactive prefix, label, and suffix lanes", async () => {
    const el = await fixture<UIMenuLabel>(`
      <ui-menu-label><span slot="prefix">P</span>Navigate<span slot="suffix">S</span></ui-menu-label>
    `);

    expect(el.getAttribute("role")).toBeNull();
    expect(el.matches(":defined")).toBe(true);
    for (const part of ["prefix", "label", "suffix"])
      expect(inShadow(el, `[part="${part}"]`)).toBeInstanceOf(HTMLElement);
  });
});
