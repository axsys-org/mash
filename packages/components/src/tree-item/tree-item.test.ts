import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
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

  it("renders a path label through ui-path", async () => {
    const el = await fixture<UITreeItem>(
      `<ui-tree-item path="/shrine/axiomatic" title="Axiomatic"></ui-tree-item>`,
    );
    const path = shadow(el).querySelector("ui-path");

    expect(path).toBeInstanceOf(HTMLElement);
    expect(path?.getAttribute("path")).toBe("/shrine/axiomatic");
    expect(path?.getAttribute("title")).toBe("Axiomatic");
  });

  it("keeps empty intermediate nodes and toggles nested children", async () => {
    const el = await fixture<UITreeItem>(`
      <ui-tree-item path="/foo">
        <ui-tree-item slot="children" path="/foo/baz"></ui-tree-item>
      </ui-tree-item>
    `);
    const disclosure = inShadow<HTMLButtonElement>(el, ".disclosure");
    const children = inShadow(el, ".children");

    expect(disclosure.hidden).toBe(false);
    expect(el.getAttribute("expanded")).toBeNull();
    expect(children.hidden).toBe(true);
    const childrenSlot = shadow(el).querySelector('slot[name="children"]') as HTMLSlotElement;
    expect(childrenSlot.assignedElements()).toHaveLength(1);

    disclosure.click();
    await settled(el.parentElement!);

    expect(el.getAttribute("expanded")).toBe("");
    expect(children.hidden).toBe(false);
    expect(el.querySelector('[path="/foo/baz"]')).not.toBeNull();
  });
});
