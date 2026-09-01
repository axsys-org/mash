import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { ShrineTree } from "./tree.js";
import "./register.js";

describe("sh-tree", () => {
  it("registers its complete interactive composition", async () => {
    expect(customElements.get("sh-tree")).toBe(ShrineTree);
    expect(customElements.get("ui-tree")).toBeDefined();
    expect(customElements.get("ui-tree-item")).toBeDefined();

    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree>
        <ui-tree slot="tree" label="Revisions"><ui-tree-item value="head">Head</ui-tree-item></ui-tree>
      </sh-tree>
    `);
    const slot = inShadow<HTMLSlotElement>(shrineTree, 'slot[name="tree"]');

    expect(slot.assignedElements({ flatten: true })[0]?.localName).toBe("ui-tree");
    expect(inShadow(shrineTree, '[part="graph"]').getAttribute("aria-hidden")).toBe("true");
  });

  it("reflects the ledger pronunciation without changing the authored tree", async () => {
    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree variant="ledger">
        <ui-tree slot="tree"><ui-tree-item value="KTK-1">Current</ui-tree-item></ui-tree>
      </sh-tree>
    `);

    expect(shrineTree.variant).toBe("ledger");
    expect(shrineTree.getAttribute("variant")).toBe("ledger");
    expect(shrineTree.querySelector('ui-tree-item[value="KTK-1"]')).not.toBeNull();
  });

  it("uses ledger capsules as pointer proxies for the existing tree selection contract", async () => {
    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree variant="ledger">
        <ui-tree slot="tree">
          <ui-tree-item value="KTK-1" selected data-shrine-lane="0">Current</ui-tree-item>
          <ui-tree-item value="MIR-8" data-shrine-lane="1">Projected witness</ui-tree-item>
        </ui-tree>
      </sh-tree>
    `);
    await settled(shrineTree.parentElement!);
    const item = shrineTree.querySelector<HTMLElement>('ui-tree-item[value="MIR-8"]')!;
    const selections: string[] = [];
    shrineTree.addEventListener("ui-tree-select", (event) => {
      selections.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    const capsule = shadow(shrineTree).querySelector<SVGGElement>(
      '[part~="capsule"][data-node-id="MIR-8"]',
    )!;
    capsule.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(selections).toEqual(["MIR-8"]);
    expect(shadow(item).activeElement).toBe(inShadow<HTMLButtonElement>(item, '[part="control"]'));
    expect(shadow(shrineTree).querySelectorAll('[part~="capsule"]')).toHaveLength(2);
    expect(shadow(shrineTree).querySelectorAll('[part~="node"]')).toHaveLength(0);
  });

  it("places inline rows beside selectable regular nodes and permits capsule opt-in", async () => {
    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree variant="inline">
        <ui-tree slot="tree">
          <ui-tree-item value="dot" data-shrine-lane="2">Regular node</ui-tree-item>
          <ui-tree-item value="pill" data-shrine-lane="0" data-shrine-capsule="HEAD">Capsule node</ui-tree-item>
        </ui-tree>
      </sh-tree>
    `);
    await settled(shrineTree.parentElement!);
    const item = shrineTree.querySelector<HTMLElement>('ui-tree-item[value="dot"]')!;
    const selections: string[] = [];
    shrineTree.addEventListener("ui-tree-select", (event) => {
      selections.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    const anchor = shadow(shrineTree).querySelector<SVGGElement>(
      '[part~="node-anchor"][data-node-id="dot"]',
    )!;
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(selections).toEqual(["dot"]);
    expect(item.style.getPropertyValue("--_sh-tree-item-inline-start")).toMatch(/px$/u);
    expect(shadow(shrineTree).querySelectorAll('[part~="node"]')).toHaveLength(1);
    expect(shadow(shrineTree).querySelectorAll('[part~="capsule"]')).toHaveLength(1);
  });

  it("projects visible revision nodes and explicit parent edges", async () => {
    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree>
        <ui-tree slot="tree">
          <ui-tree-item value="head" data-shrine-lane="0" data-shrine-parents="branch main" current>Head</ui-tree-item>
          <ui-tree-item value="branch" data-shrine-lane="2" data-shrine-parents="main">Branch</ui-tree-item>
          <ui-tree-item value="main" data-shrine-lane="0">Main</ui-tree-item>
        </ui-tree>
      </sh-tree>
    `);
    await settled(shrineTree.parentElement!);

    const nodes = shadow(shrineTree).querySelectorAll('[part~="node"]');
    const edges = shadow(shrineTree).querySelectorAll('[part~="edge"]');

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(3);
    expect(nodes[0]?.getAttribute("part")).toContain("current");
    expect(nodes[1]?.getAttribute("part")).toContain("lane-2");
    expect(edges[0]?.getAttribute("d")).toMatch(/^M /u);
  });

  it("tracks disclosure without inventing a second expansion state", async () => {
    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree>
        <ui-tree slot="tree">
          <ui-tree-item value="revision" kind="folder" data-shrine-lane="0">Revision
            <ui-tree-item slot="children" value="detail" data-shrine-lane="1">Detail</ui-tree-item>
          </ui-tree-item>
          <ui-tree-item value="parent" data-shrine-lane="0">Parent</ui-tree-item>
        </ui-tree>
      </sh-tree>
    `);
    const revision = shrineTree.querySelector<HTMLElement>('ui-tree-item[value="revision"]')!;

    expect(shadow(shrineTree).querySelectorAll('[part~="node"]')).toHaveLength(2);
    expect(revision.hasAttribute("expanded")).toBe(false);

    revision.setAttribute("expanded", "");
    await settled(shrineTree.parentElement!);

    expect(shadow(shrineTree).querySelectorAll('[part~="node"]')).toHaveLength(3);
  });

  it("preserves ui-tree keyboard navigation and composed selection events", async () => {
    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree>
        <ui-tree slot="tree">
          <ui-tree-item value="alpha">Alpha</ui-tree-item>
          <ui-tree-item value="billing">Billing</ui-tree-item>
        </ui-tree>
      </sh-tree>
    `);
    const items = [...shrineTree.querySelectorAll<HTMLElement>("ui-tree-item")];
    const selections: string[] = [];
    shrineTree.addEventListener("ui-tree-select", (event) => {
      selections.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    const first = inShadow<HTMLButtonElement>(items[0]!, '[part="control"]');
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
    );

    expect(shadow(items[1]!).activeElement).toBe(
      inShadow<HTMLButtonElement>(items[1]!, '[part="control"]'),
    );
    expect(selections).toEqual(["billing"]);
  });

  it("never rewrites authored namespace identity or compaction provenance", async () => {
    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree>
        <ui-tree slot="tree">
          <ui-tree-item value="preserved" title="/foo" kind="folder" expanded>
            <ui-tree-item slot="children" value="preserved-leaf" title="/foo/baz"></ui-tree-item>
          </ui-tree-item>
          <ui-tree-item value="compact" title="/records/archive/import" data-shrine-compressed-from="/records /records/archive"></ui-tree-item>
        </ui-tree>
      </sh-tree>
    `);

    expect(shrineTree.querySelectorAll("ui-tree-item")).toHaveLength(3);
    expect(
      shrineTree.querySelector<HTMLElement>('ui-tree-item[value="compact"]')?.dataset
        .shrineCompressedFrom,
    ).toBe("/records /records/archive");
  });

  it("keeps the graph on the logical start edge", async () => {
    const shrineTree = await fixture<ShrineTree>(`
      <sh-tree dir="rtl" style="display:block;width:320px">
        <ui-tree slot="tree"><ui-tree-item value="head">Head</ui-tree-item></ui-tree>
      </sh-tree>
    `);
    await settled(shrineTree.parentElement!);
    const node = shadow(shrineTree).querySelector<SVGCircleElement>('[part~="node"]')!;

    expect(node.cx.baseVal.value).toBeGreaterThan(shrineTree.getBoundingClientRect().width / 2);
  });
});
