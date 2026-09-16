import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { UITreeItem } from "./tree-item.js";
import "./register.js";
import "../tree/register.js";
import "../icon/register.js";

describe("ui-tree-item", () => {
  it("stops inferred ancestry at a preview tree boundary", async () => {
    const outer = await fixture<HTMLElement>(`
      <ui-tree><ui-tree-item value="outer" title="Outer" kind="folder" preview-open>
        <ui-tree slot="preview">
          <ui-tree-item value="inner" title="Inner" kind="folder" expanded>
            <ui-tree-item slot="children" value="leaf" title="Leaf"></ui-tree-item>
          </ui-tree-item>
        </ui-tree>
      </ui-tree-item></ui-tree>
    `);
    const inner = outer.querySelector<UITreeItem>('[value="inner"]')!;
    const leaf = outer.querySelector<UITreeItem>('[value="leaf"]')!;
    expect(inner.parentItem).toBeUndefined();
    expect(leaf.parentItem).toBe(inner);
    expect(inShadow(inner, '[part="control"]').getAttribute("aria-level")).toBe("1");
    expect(inShadow(leaf, '[part="control"]').getAttribute("aria-level")).toBe("2");
  });

  it("keeps flattened parents and sibling counts inside their nearest tree", async () => {
    const outer = await fixture<HTMLElement>(`
      <ui-tree>
        <ui-tree-item value="shared-parent" title="Outer" kind="folder" expanded preview-open>
          <ui-tree slot="preview">
            <ui-tree-item value="shared-parent" title="Inner" kind="folder" expanded></ui-tree-item>
            <ui-tree-item value="inner-a" title="A" parent-value="shared-parent"></ui-tree-item>
            <ui-tree-item value="inner-b" title="B" parent-value="shared-parent"></ui-tree-item>
            <ui-tree-item value="inner-only" title="Inner only" kind="folder"></ui-tree-item>
          </ui-tree>
        </ui-tree-item>
        <ui-tree-item value="outer-child" title="Outer child" parent-value="shared-parent"></ui-tree-item>
        <ui-tree-item value="orphan" title="Orphan" parent-value="inner-only"></ui-tree-item>
      </ui-tree>
    `);
    const inner = outer.querySelector("ui-tree")!;
    const parent = inner.querySelector<UITreeItem>('[value="shared-parent"]')!;
    const a = inner.querySelector<UITreeItem>('[value="inner-a"]')!;
    const b = inner.querySelector<UITreeItem>('[value="inner-b"]')!;
    const child = outer.querySelector<UITreeItem>('[value="outer-child"]')!;
    const orphan = outer.querySelector<UITreeItem>('[value="orphan"]')!;
    expect(parent.parentItem).toBeUndefined();
    expect(a.parentItem).toBe(parent);
    expect(b.parentItem).toBe(parent);
    expect(child.parentItem).toBe(outer.querySelector(':scope > [value="shared-parent"]'));
    expect(orphan.parentItem).toBeUndefined();
    expect(inShadow(a, '[part="control"]').getAttribute("aria-level")).toBe("2");
    expect(inShadow(a, '[part="control"]').getAttribute("aria-posinset")).toBe("1");
    expect(inShadow(b, '[part="control"]').getAttribute("aria-posinset")).toBe("2");
    expect(inShadow(a, '[part="control"]').getAttribute("aria-setsize")).toBe("2");
    expect(inShadow(child, '[part="control"]').getAttribute("aria-setsize")).toBe("1");
    expect(inShadow(orphan, '[part="control"]').getAttribute("aria-level")).toBe("1");
  });

  it("registers with tree-item semantics and documented defaults", async () => {
    expect(customElements.get("ui-tree-item")).toBe(UITreeItem);

    const item = await fixture<UITreeItem>(`<ui-tree-item>src</ui-tree-item>`);
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');

    expect(item).toBeInstanceOf(UITreeItem);
    expect(item.kind).toBe("file");
    expect(item.activation).toBe("combined");
    expect(item.expanded).toBe(false);
    expect(item.previewOpen).toBe(null);
    expect(item.selected).toBe(false);
    expect(control.localName).toBe("button");
    expect(control.getAttribute("role")).toBe("treeitem");
    expect(control.hasAttribute("aria-expanded")).toBe(false);
    const disclosure = inShadow<HTMLElement>(item, '[part="disclosure"]');
    expect(disclosure.dataset.branch).toBe("false");
    expect(control.contains(disclosure)).toBe(true);
    expect(item.matches(":state(branch)")).toBe(false);
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
        "label-viewport",
        "label-content",
        "meta",
        "actions",
        "preview",
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

  it("uses one branch row to request selection and expansion without owning state", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item kind="folder"><ui-tree-item slot="children">app.ts</ui-tree-item>src</ui-tree-item>
    `);
    await settled(item.parentElement!);
    const disclosure = inShadow<HTMLElement>(item, '[part="disclosure"]');
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');
    const requests: boolean[] = [];
    let selections = 0;
    item.addEventListener("ui-tree-item-toggle", (event) => {
      requests.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    item.addEventListener("ui-tree-item-select", () => (selections += 1));

    control.click();

    expect(control.contains(disclosure)).toBe(true);
    expect(item.matches(":state(branch)")).toBe(true);
    expect(selections).toBe(1);
    expect(requests).toEqual([true]);
    expect(item.expanded).toBe(false);
    expect(inShadow<HTMLElement>(item, '[part="children"]').hidden).toBe(true);

    item.expanded = true;
    await settled(item.parentElement!);
    expect(disclosure.textContent?.trim()).toBe("▾");

    disclosure.click();

    expect(selections).toBe(2);
    expect(requests).toEqual([true, false]);
    expect(item.expanded).toBe(true);
  });

  it("reports activation without claiming selection ownership", async () => {
    const item = await fixture<UITreeItem>(`<ui-tree-item>README.md</ui-tree-item>`);
    let selections = 0;
    item.addEventListener("ui-tree-item-select", () => (selections += 1));

    inShadow<HTMLButtonElement>(item, '[part="control"]').click();

    expect(selections).toBe(1);
    expect(item.selected).toBe(false);
  });

  it("splits slotted disclosure clicks from label selection when requested", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item activation="split" kind="folder" title="/hello">
        <ui-icon slot="disclosure" name="navigation.chevron-right" data-chevron></ui-icon>
        <span slot="label">hello</span>
      </ui-tree-item>
    `);
    const expansion: boolean[] = [];
    let selections = 0;
    item.addEventListener("ui-tree-item-toggle", (event) => {
      expansion.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    item.addEventListener("ui-tree-item-select", () => (selections += 1));
    item.querySelector<HTMLElement>("[data-chevron]")!.click();
    expect(expansion).toEqual([true]);
    expect(selections).toBe(0);
    expect(item.expanded).toBe(false);
    item.querySelector<HTMLElement>('[slot="label"]')!.click();
    expect(expansion).toEqual([true]);
    expect(selections).toBe(1);

    item.expanded = true;
    await settled(item.parentElement!);
    item.querySelector<HTMLElement>("[data-chevron]")!.click();
    expect(expansion).toEqual([true, false]);
    expect(selections).toBe(1);
    item.disabled = true;
    await settled(item.parentElement!);
    item.querySelector<HTMLElement>("[data-chevron]")!.click();
    item.querySelector<HTMLElement>('[slot="label"]')!.click();
    expect(expansion).toEqual([true, false]);
    expect(selections).toBe(1);
  });

  it("keeps split disclosure on arrow keys while Enter and Space select without toggling", async () => {
    const tree = await fixture<HTMLElement>(`
      <ui-tree><ui-tree-item activation="split" kind="folder" title="/hello"></ui-tree-item></ui-tree>
    `);
    const item = tree.querySelector<UITreeItem>("ui-tree-item")!;
    const expansion: boolean[] = [];
    let selections = 0;
    tree.addEventListener("ui-tree-toggle", (event) => {
      expansion.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    tree.addEventListener("ui-tree-select", () => (selections += 1));
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');
    control.focus();
    const key = (name: string) =>
      control.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: name,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
    key("ArrowRight");
    expect(expansion).toEqual([true]);
    expect(selections).toBe(0);
    item.expanded = true;
    await settled(tree);
    key("Enter");
    key(" ");
    expect(expansion).toEqual([true]);
    expect(selections).toBe(2);
    key("ArrowLeft");
    expect(expansion).toEqual([true, false]);
    expect(selections).toBe(2);
    expect(item.expanded).toBe(true);
  });

  it("keeps an empty folder explicit for lazy loading", async () => {
    const item = await fixture<UITreeItem>(
      `<ui-tree-item kind="folder" path="/archive"></ui-tree-item>`,
    );
    const disclosure = inShadow<HTMLElement>(item, '[part="disclosure"]');

    expect(item.branch).toBe(true);
    expect(item.matches(":state(branch)")).toBe(true);
    expect(disclosure.dataset.branch).toBe("true");
    expect(disclosure.hidden).toBe(false);
    expect(
      inShadow<HTMLButtonElement>(item, '[part="control"]').getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("reveals an accessible preview before child names through parent-owned expansion", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item title="/hello" kind="folder">
        <section slot="preview"><span>Record data</span><button>Inspect value</button></section>
        <ui-tree-item slot="children" title="op"></ui-tree-item>
      </ui-tree-item>
    `);
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');
    const preview = inShadow<HTMLElement>(item, '[part="preview"]');
    const children = inShadow<HTMLElement>(item, '[part="children"]');
    expect(preview.hidden).toBe(true);
    expect(preview.getBoundingClientRect().height).toBe(0);
    expect(preview.getAttribute("role")).toBe("region");
    expect(preview.getAttribute("aria-labelledby")).toBe(control.id);
    expect(control.getAttribute("aria-controls")).toBe(`${preview.id} ${children.id}`);
    expect(preview.nextElementSibling).toBe(children);

    let requests = 0;
    item.addEventListener("ui-tree-item-toggle", () => (requests += 1));
    control.click();
    expect(requests).toBe(1);
    expect(item.expanded).toBe(false);
    expect(preview.hidden).toBe(true);
    item.expanded = true;
    await settled(item.parentElement!);
    expect(preview.hidden).toBe(false);
    expect(preview.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(children.hidden).toBe(false);
    expect(inShadow<HTMLSlotElement>(item, 'slot[name="preview"]').assignedElements()).toHaveLength(
      1,
    );
  });

  it("controls preview independently from hierarchy without changing compatibility defaults", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item title="app" kind="folder" expanded preview-open="false">
        <span slot="preview">Namespace lore</span>
        <ui-tree-item slot="children" title="srs"></ui-tree-item>
      </ui-tree-item>
    `);
    const preview = inShadow<HTMLElement>(item, '[part="preview"]');
    const children = inShadow<HTMLElement>(item, '[part="children"]');
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');
    expect(item.previewOpen).toBe(false);
    expect(preview.hidden).toBe(true);
    expect(children.hidden).toBe(false);
    expect(control.getAttribute("aria-controls")).toBe("children");
    item.previewOpen = true;
    item.expanded = false;
    await settled(item.parentElement!);
    expect(preview.hidden).toBe(false);
    expect(children.hidden).toBe(true);
    expect(item.getAttribute("preview-open")).toBe("");
    expect(control.getAttribute("aria-expanded")).toBe("false");
    item.previewOpen = null;
    await settled(item.parentElement!);
    expect(item.hasAttribute("preview-open")).toBe(false);
    expect(preview.hidden).toBe(true);
    expect(control.getAttribute("aria-controls")).toBe("preview children");
  });

  it("does not invent a hierarchy disclosure for an independently previewed leaf", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item title="srs" preview-open><span slot="preview">Review cards</span></ui-tree-item>
    `);
    expect(item.previewOpen).toBe(true);
    expect(item.branch).toBe(false);
    expect(inShadow<HTMLElement>(item, '[part="preview"]').hidden).toBe(false);
    expect(
      inShadow<HTMLButtonElement>(item, '[part="control"]').hasAttribute("aria-expanded"),
    ).toBe(false);
    item.removeAttribute("preview-open");
    await settled(item.parentElement!);
    expect(item.previewOpen).toBe(null);
    expect(item.branch).toBe(true);
  });

  it("supports preview-only records without inventing child tree items", async () => {
    const item = await fixture<UITreeItem>(`
      <ui-tree-item>Greeting<span slot="preview">Hello, world</span></ui-tree-item>
    `);
    expect(item.branch).toBe(true);
    expect(item.kind).toBe("file");
    expect(item.childItems).toHaveLength(0);
    expect(item.accessibleLabel).toBe("Greeting");
    expect(item.identity).toBe("Greeting");
    expect(
      inShadow<HTMLButtonElement>(item, '[part="control"]').getAttribute("aria-expanded"),
    ).toBe("false");
    item.expanded = true;
    await settled(item.parentElement!);
    expect(inShadow<HTMLElement>(item, '[part="preview"]').hidden).toBe(false);

    item.querySelector('[slot="preview"]')!.remove();
    await settled(item.parentElement!);
    expect(item.branch).toBe(false);
    expect(inShadow<HTMLElement>(item, '[part="preview"]').hidden).toBe(true);
    expect(
      inShadow<HTMLButtonElement>(item, '[part="control"]').hasAttribute("aria-expanded"),
    ).toBe(false);
  });

  it("accepts late preview data on a lazy folder without changing selection or keyboard behavior", async () => {
    const tree = await fixture<HTMLElement>(`
      <ui-tree><ui-tree-item kind="folder" title="/lazy" expanded></ui-tree-item></ui-tree>
    `);
    const item = tree.querySelector<UITreeItem>("ui-tree-item")!;
    const preview = inShadow<HTMLElement>(item, '[part="preview"]');
    expect(preview.hidden).toBe(true);
    const input = document.createElement("input");
    input.slot = "preview";
    input.setAttribute("aria-label", "Record value");
    input.value = "Live data";
    item.append(input);
    await settled(tree);
    expect(preview.hidden).toBe(false);
    expect(item.childItems).toHaveLength(0);

    let selections = 0;
    const expansion: boolean[] = [];
    tree.addEventListener("ui-tree-select", () => (selections += 1));
    tree.addEventListener("ui-tree-toggle", (event) => {
      expansion.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    input.click();
    input.focus();
    const editing = new KeyboardEvent("keydown", {
      key: "ArrowLeft",
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    input.dispatchEvent(editing);
    expect(editing.defaultPrevented).toBe(false);
    expect(selections).toBe(0);
    expect(expansion).toEqual([]);
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');
    control.focus();
    control.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        composed: true,
      }),
    );
    expect(expansion).toEqual([false]);
    expect(item.expanded).toBe(true);
  });
});
