import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { ShrineLocator } from "./locator.js";
import "./register.js";

describe("sh-locator", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("sh-locator")).toBe(ShrineLocator);

    const el = await fixture<ShrineLocator>(`<sh-locator>content</sh-locator>`);
    expect(el).toBeInstanceOf(ShrineLocator);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its default slot", async () => {
    const el = await fixture<ShrineLocator>(`<sh-locator>content</sh-locator>`);
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
});
