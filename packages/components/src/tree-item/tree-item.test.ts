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
    expect(item.kind).toBe("file");
    expect(item.expanded).toBe(false);
    expect(item.selected).toBe(false);
    expect(control.localName).toBe("button");
    expect(control.getAttribute("role")).toBe("treeitem");
    expect(control.hasAttribute("aria-expanded")).toBe(false);
  });

  it("keeps its documented parts available for a path title", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item kind="folder" path="/interzone/projects" title="Projects">
        <span slot="icon">▣</span><span slot="meta">3 records</span>
      </ui-tree-item>
    `);
    await settled(item.parentElement!);
    const parts = [...shadow(item).querySelectorAll("[part]")].map((node) =>
      node.getAttribute("part"),
    );

    expect(parts).toEqual(
      expect.arrayContaining([
        "root",
        "control",
        "disclosure",
        "icon",
        "label",
        "meta",
        "actions",
        "children",
      ]),
    );
    expect(inShadow<HTMLElement>(item, '[part="label"]').textContent).toContain("Projects");
    expect(
      shadow(item)
        .querySelector<HTMLSlotElement>('slot[name="meta"]')!
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent)
        .join(""),
    ).toContain("3 records");
    expect(shadow(item).querySelector("ui-path")).toBeNull();
  });

  it("uses named label and disclosure slots before compatibility fallbacks", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item kind="folder" title="Fallback">
        <span slot="label">Authored label</span>
        <span slot="disclosure">+</span>
      </ui-tree-item>
    `);

    expect(
      inShadow<HTMLSlotElement>(item, 'slot[name="label"]').assignedElements()[0]?.textContent,
    ).toBe("Authored label");
    expect(
      inShadow<HTMLSlotElement>(item, 'slot[name="disclosure"]').assignedElements(),
    ).toHaveLength(1);
  });

  it("mirrors parent-owned state attributes into custom states", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item kind="folder" expanded current selected disabled>Folder</ui-tree-item>
    `);

    for (const state of ["expanded", "current", "selected", "disabled"]) {
      expect(item.matches(`:state(${state})`)).toBe(true);
    }

    item.expanded = false;
    item.current = false;
    item.selected = false;
    item.disabled = false;
    await settled(item.parentElement!);

    for (const state of ["expanded", "current", "selected", "disabled"]) {
      expect(item.matches(`:state(${state})`)).toBe(false);
    }
  });

  it("requests expansion from the disclosure without mutating parent-owned state", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item kind="folder"><ui-tree-item slot="children">app.ts</ui-tree-item>src</ui-tree-item>
    `);
    await settled(item.parentElement!);
    const disclosure = inShadow<HTMLElement>(item, '[part="disclosure"]');
    const requests: boolean[] = [];
    item.addEventListener("ui-tree-item-toggle", (event) => {
      requests.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });

    disclosure.click();

    expect(requests).toEqual([true]);
    expect(item.expanded).toBe(false);
    expect(inShadow<HTMLElement>(item, '[part="children"]').hidden).toBe(true);
  });

  it("reports activation without claiming selection ownership", async () => {
    const item = await fixture<UITreeItem>(`<ui-tree-item>README.md</ui-tree-item>`);
    let selections = 0;
    item.addEventListener("ui-tree-item-select", () => (selections += 1));

    inShadow<HTMLButtonElement>(item, '[part="control"]').click();

    expect(selections).toBe(1);
    expect(item.selected).toBe(false);
  });

  it("keeps an empty folder explicit for lazy loading", async () => {
    const item = await fixture<UITreeItem>(
      `<ui-tree-item kind="folder" path="/archive"></ui-tree-item>`,
    );
    const disclosure = inShadow<HTMLElement>(item, '[part="disclosure"]');

    expect(item.branch).toBe(true);
    expect(disclosure.hidden).toBe(false);
    expect(
      inShadow<HTMLButtonElement>(item, '[part="control"]').getAttribute("aria-expanded"),
    ).toBe("false");
  });
});
