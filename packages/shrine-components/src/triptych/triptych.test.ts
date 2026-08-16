import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { ShrineTriptych } from "./triptych.js";
import "./register.js";

describe("sh-triptych", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("sh-triptych")).toBe(ShrineTriptych);

    const el = await fixture<ShrineTriptych>(`<sh-triptych>content</sh-triptych>`);
    expect(el).toBeInstanceOf(ShrineTriptych);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its default slot", async () => {
    const el = await fixture<ShrineTriptych>(`<sh-triptych>content</sh-triptych>`);
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
