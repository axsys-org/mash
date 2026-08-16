import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UIPath } from "./path.js";
import "./register.js";

describe("ui-path", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("ui-path")).toBe(UIPath);

    const el = await fixture<UIPath>(`<ui-path>content</ui-path>`);
    expect(el).toBeInstanceOf(UIPath);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its default slot", async () => {
    const el = await fixture<UIPath>(`<ui-path>content</ui-path>`);
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
