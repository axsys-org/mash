import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { UITree } from "./tree.js";
import "../tree-item/register.js";
import "./register.js";

describe("ui-tree", () => {
  it("registers, upgrades and exposes a labelled tree landmark", async () => {
    expect(customElements.get("ui-tree")).toBe(UITree);

    const tree = await fixture<UITree>(`<ui-tree label="Workspace files">content</ui-tree>`);
    const root = inShadow<HTMLElement>(tree, '[part="root"]');

    expect(tree).toBeInstanceOf(UITree);
    expect(root.getAttribute("role")).toBe("tree");
    expect(root.getAttribute("aria-label")).toBe("Workspace files");
  });

  it("moves between visible items with Arrow keys", async () => {
    const tree = await fixture<UITree>(`
      <ui-tree>
        <ui-tree-item kind="folder" expanded>src
          <ui-tree-item slot="children">app.ts</ui-tree-item>
        </ui-tree-item>
        <ui-tree-item>README.md</ui-tree-item>
      </ui-tree>
    `);
    await settled(tree.parentElement!);
    const [src, app] = [...tree.querySelectorAll<HTMLElement>("ui-tree-item")];
    const control = inShadow<HTMLButtonElement>(src!, '[part="control"]');

    control.focus();
    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
    );

    expect(shadow(app!).activeElement).toBe(inShadow(app!, '[part="control"]'));
    expect(inShadow<HTMLButtonElement>(src!, '[part="control"]').tabIndex).toBe(-1);
    expect(inShadow<HTMLButtonElement>(app!, '[part="control"]').tabIndex).toBe(0);
  });

  it("exposes one tab stop and supports label typeahead", async () => {
    const tree = await fixture<UITree>(`
      <ui-tree>
        <ui-tree-item>Alpha</ui-tree-item>
        <ui-tree-item>Billing</ui-tree-item>
        <ui-tree-item>Charlie</ui-tree-item>
      </ui-tree>
    `);
    await settled(tree.parentElement!);
    const [alpha, billing, charlie] = [...tree.querySelectorAll<HTMLElement>("ui-tree-item")];
    const alphaControl = inShadow<HTMLButtonElement>(alpha!, '[part="control"]');

    expect(
      [alpha, billing, charlie].filter(
        (item) => inShadow<HTMLButtonElement>(item!, '[part="control"]').tabIndex === 0,
      ),
    ).toHaveLength(1);

    alphaControl.focus();
    alphaControl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", bubbles: true, composed: true }),
    );

    expect(shadow(billing!).activeElement).toBe(inShadow(billing!, '[part="control"]'));
  });

  it("leaves expansion parent-controlled while requesting it from ArrowRight", async () => {
    const tree = await fixture<UITree>(`
      <ui-tree><ui-tree-item kind="folder">src</ui-tree-item></ui-tree>
    `);
    const item = tree.querySelector<HTMLElement>("ui-tree-item")!;
    const control = inShadow<HTMLButtonElement>(item, '[part="control"]');
    const requests: boolean[] = [];
    item.addEventListener("ui-tree-item-toggle", (event) => {
      requests.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });

    control.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }),
    );

    expect(requests).toEqual([true]);
    expect(item.hasAttribute("expanded")).toBe(false);
  });

  it("wraps keyboard movement and reports stable tree-level selection", async () => {
    const tree = await fixture<UITree>(`
      <ui-tree>
        <ui-tree-item value="alpha">Alpha</ui-tree-item>
        <ui-tree-item value="billing">Billing</ui-tree-item>
      </ui-tree>
    `);
    await settled(tree.parentElement!);
    const [alpha, billing] = [...tree.querySelectorAll<HTMLElement>("ui-tree-item")];
    const selections: Array<{ value: string; reason: string }> = [];
    tree.addEventListener("ui-tree-select", (event) => {
      selections.push((event as CustomEvent<{ value: string; reason: string }>).detail);
    });

    inShadow<HTMLButtonElement>(alpha!, '[part="control"]').focus();
    inShadow<HTMLButtonElement>(alpha!, '[part="control"]').dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, composed: true }),
    );

    expect(shadow(billing!).activeElement).toBe(inShadow(billing!, '[part="control"]'));
    expect(selections).toEqual([{ value: "billing", reason: "keyboard", index: 1 }]);
  });

  it("reveals identified nested items through controlled ancestor requests", async () => {
    const tree = await fixture<UITree>(`
      <ui-tree>
        <ui-tree-item value="root" kind="folder">Root
          <ui-tree-item slot="children" value="leaf">Leaf</ui-tree-item>
        </ui-tree-item>
      </ui-tree>
    `);
    const [root, leaf] = [...tree.querySelectorAll<HTMLElement>("ui-tree-item")];
    const toggleRequests: boolean[] = [];
    const reveals: unknown[] = [];
    root!.addEventListener("ui-tree-item-toggle", (event) => {
      toggleRequests.push((event as CustomEvent<{ expanded: boolean }>).detail.expanded);
    });
    tree.addEventListener("ui-tree-reveal", (event) => {
      reveals.push((event as CustomEvent).detail);
    });
    const scrollIntoView = vi.fn();
    leaf!.scrollIntoView = scrollIntoView;

    expect(tree.revealItem("leaf", "center")).toBe(true);
    expect(toggleRequests).toEqual([true]);
    expect(reveals).toEqual([{ value: "leaf", ancestors: ["root"], alignment: "center" }]);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", inline: "nearest" });
    expect(root!.hasAttribute("expanded")).toBe(false);
  });

  it("supports flattened renderer topology through parent-value and explicit level", async () => {
    const tree = await fixture<UITree>(`
      <ui-tree>
        <ui-tree-item value="root" kind="folder" expanded level="1">Root</ui-tree-item>
        <ui-tree-item value="leaf" parent-value="root" level="2">Leaf</ui-tree-item>
      </ui-tree>
    `);
    await settled(tree.parentElement!);
    const leaf = tree.querySelector<HTMLElement>('ui-tree-item[value="leaf"]')!;

    expect(inShadow(leaf, '[part="control"]').getAttribute("aria-level")).toBe("2");
    expect(tree.indexOf("leaf")).toBe(1);
  });
});
