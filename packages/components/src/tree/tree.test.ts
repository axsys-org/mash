import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UITree } from "./tree.js";
import "./register.js";

describe("ui-tree", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("ui-tree")).toBe(UITree);

    const el = await fixture<UITree>(`<ui-tree>content</ui-tree>`);
    expect(el).toBeInstanceOf(UITree);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its default slot", async () => {
    const el = await fixture<UITree>(`<ui-tree>content</ui-tree>`);
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
