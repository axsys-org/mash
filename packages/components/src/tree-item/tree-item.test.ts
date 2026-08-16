import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UITreeItem } from "./tree-item.js";
import "./register.js";

describe("ui-tree-item", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("ui-tree-item")).toBe(UITreeItem);

    const el = await fixture<UITreeItem>(`<ui-tree-item>content</ui-tree-item>`);
    expect(el).toBeInstanceOf(UITreeItem);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its default slot", async () => {
    const el = await fixture<UITreeItem>(`<ui-tree-item>content</ui-tree-item>`);
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
