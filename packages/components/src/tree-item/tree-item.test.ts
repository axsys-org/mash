import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { UITreeItem } from "./tree-item.js";
import "./register.js";

describe("ui-tree-item", () => {
  it("registers with tree-item semantics and documented defaults", async () => {
    expect(customElements.get("ui-tree-item")).toBe(UITreeItem);

    const item = await fixture<UITreeItem>(`<ui-tree-item>src</ui-tree-item>`);
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');

    expect(item).toBeInstanceOf(UITreeItem);
    expect(item.expanded).toBe(false);
    expect(item.selected).toBe(false);
    expect(item.size).toBe("medium");
    expect(control.localName).toBe("button");
    expect(control.getAttribute("role")).toBe("treeitem");
    expect(control.hasAttribute("aria-expanded")).toBe(false);
  });

  it("projects icons, labels and nested children into their distinct slots", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item>
        <span slot="icon">▣</span>src
        <ui-tree-item slot="children">app.ts</ui-tree-item>
      </ui-tree-item>
    `);
    await settled(item.parentElement!);

    const parts = [...shadow(item).querySelectorAll("[part]")].map((node) =>
      node.getAttribute("part"),
    );
    expect(parts).toEqual(
      expect.arrayContaining(["control", "disclosure", "icon", "label", "children"]),
    );
    expect(inShadow<HTMLSlotElement>(item, 'slot[name="icon"]').assignedElements()).toHaveLength(1);
    expect(
      inShadow<HTMLSlotElement>(item, 'slot[name="children"]').assignedElements(),
    ).toHaveLength(1);
    expect(
      inShadow<HTMLButtonElement>(item, '[part="control"]').getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("opens and closes a branch on activation and arrow keys", async () => {
    const item = await fixture<UITreeItem>(
      `<ui-tree-item><ui-tree-item slot="children">app.ts</ui-tree-item>src</ui-tree-item>`,
    );
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');
    const toggles: boolean[] = [];
    item.addEventListener("ui-tree-item-toggle", (event) => {
      toggles.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    await settled(item.parentElement!);

    control.click();
    await settled(item.parentElement!);
    expect(item.expanded).toBe(true);
    expect(inShadow<HTMLElement>(item, '[part="children"]').hasAttribute("hidden")).toBe(false);

    control.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await settled(item.parentElement!);
    expect(item.expanded).toBe(false);
    expect(toggles).toEqual([true, false]);
  });

  it("reports activation without claiming selection ownership", async () => {
    const item = await fixture<UITreeItem>(`<ui-tree-item>README.md</ui-tree-item>`);
    let selections = 0;
    item.addEventListener("ui-tree-item-select", () => (selections += 1));

    inShadow<HTMLButtonElement>(item, '[part="control"]').click();

    expect(selections).toBe(1);
    expect(item.selected).toBe(false);
  });
});
