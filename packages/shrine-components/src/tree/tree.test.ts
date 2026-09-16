import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { ShrineTree } from "./tree.js";
import "./register.js";
import "@mash/ui/catalogue/mash.css";
import "../catalogue/mash.css";

describe("sh-tree", () => {
  for (const theme of ["light", "dark"]) {
    it(`keeps namespace location neutral in the ${theme} theme`, async () => {
      const root = await fixture<HTMLElement>(`
        <div data-mash-catalogue="mash" data-theme="${theme}">
          <sh-tree variant="namespace"><ui-tree slot="tree">
            <ui-tree-item value="/due" title="due" current selected>
              <span slot="icon">◈</span>
            </ui-tree-item>
          </ui-tree></sh-tree>
          <span data-token="selected" style="color:var(--color-selection)"></span>
          <span data-token="foreground" style="color:var(--color-on-selection)"></span>
          <span data-token="positive" style="color:var(--color-positive)"></span>
        </div>
      `);
      const item = root.querySelector("ui-tree-item")!;
      const control = getComputedStyle(inShadow<HTMLElement>(item, '[part="control"]'));
      const token = (name: string) =>
        getComputedStyle(root.querySelector(`[data-token="${name}"]`)!).color;
      // Namespace selection is a compact neutral surface, not a leading
      // accent stripe. Color is irrelevant when the border has no width.
      expect(control.borderInlineStartWidth).toBe("0px");
      expect(control.borderInlineEndWidth).toBe("0px");
      expect(control.boxShadow).toBe("none");
      expect(control.borderRadius).toBe("8px");
      expect(control.backgroundColor).toBe(token("selected"));
      expect(control.color).toBe(token("foreground"));
      expect(getComputedStyle(inShadow<HTMLElement>(item, '[part="icon"]')).color).toBe(
        control.color,
      );
      expect(control.backgroundColor).not.toBe(token("positive"));
    });
  }

  it("does not clear a nested preview graph's offsets when refreshing its namespace owner", async () => {
    const outer = await fixture<ShrineTree>(`
      <sh-tree variant="namespace"><ui-tree slot="tree">
        <ui-tree-item value="outer" title="Outer" preview-open>
          <sh-tree slot="preview" variant="inline"><ui-tree slot="tree">
            <ui-tree-item value="inner" title="Inner" data-shrine-lane="2"></ui-tree-item>
          </ui-tree></sh-tree>
        </ui-tree-item>
      </ui-tree></sh-tree>
    `);
    const inner = outer.querySelector<ShrineTree>("sh-tree")!;
    const innerItem = inner.querySelector<HTMLElement>("ui-tree-item")!;
    const outerItem = outer.querySelector<HTMLElement>("ui-tree-item")!;
    await settled(outer);
    inner.refreshGraph();
    await settled(outer);
    const offset = innerItem.style.getPropertyValue("--_sh-tree-item-inline-start");
    expect(Number.parseFloat(offset)).toBeGreaterThan(0);
    expect(shadow(inner).querySelectorAll('[part~="node"]')).toHaveLength(1);
    outerItem.style.setProperty("--_sh-tree-item-inline-start", "999px");
    outer.refreshGraph();
    await settled(outer);
    expect(outerItem.style.getPropertyValue("--_sh-tree-item-inline-start")).toBe("");
    expect(innerItem.style.getPropertyValue("--_sh-tree-item-inline-start")).toBe(offset);
    expect(shadow(inner).querySelectorAll('[part~="node"]')).toHaveLength(1);
    expect(shadow(outer).querySelectorAll('[part~="node"]')).toHaveLength(0);
  });

  it("exposes graph parts separately from the authored row and its slots", async () => {
    const graph = await fixture<ShrineTree>(`<sh-tree variant="inline"><ui-tree slot="tree">
      <ui-tree-item value="root" data-shrine-parents="" expanded>
        <span slot="label">Root</span>
        <ui-tree-item slot="children" value="a" data-shrine-lane="1" data-shrine-parents="root">A</ui-tree-item>
        <ui-tree-item slot="children" value="b" data-shrine-lane="1" data-shrine-parents="root">B</ui-tree-item>
      </ui-tree-item>
    </ui-tree></sh-tree>`);
    await settled(graph.parentElement!);
    for (const part of [
      "root",
      "graph",
      "canvas",
      "tree",
      "node-anchor",
      "node-hit-target",
      "node",
      "edge",
    ]) {
      expect(shadow(graph).querySelector(`[part~="${part}"]`)).not.toBeNull();
    }
    expect(shadow(graph).querySelectorAll('[part~="edge"]')).toHaveLength(2);
    expect(shadow(graph).querySelector('[role="tree"]')).toBeNull();
    const item = graph.querySelector('ui-tree-item[value="a"]')!;
    for (const part of ["control", "disclosure", "label", "meta", "actions", "children"]) {
      expect(shadow(item).querySelector(`[part~="${part}"]`)).not.toBeNull();
    }
  });

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
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        composed: true,
      }),
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

  it("uses the authored namespace hierarchy without revision nodes or synthetic connections", async () => {
    const tree =
      await fixture<ShrineTree>(`<sh-tree variant="namespace"><ui-tree slot="tree" label="Namespace">
      <ui-tree-item value="/hello" title="hello" kind="folder" expanded data-shrine-lane="7" data-shrine-capsule="ignored">
        <span slot="preview">Record data</span>
        <ui-tree-item slot="children" value="/hello/op" title="op" kind="folder"></ui-tree-item>
      </ui-tree-item>
      <ui-tree-item value="/app" title="app" kind="folder"></ui-tree-item>
    </ui-tree></sh-tree>`);
    await settled(tree.parentElement!);
    expect(tree.variant).toBe("namespace");
    expect(inShadow<HTMLElement>(tree, '[part="graph"]').hidden).toBe(true);
    expect(
      shadow(tree).querySelectorAll(
        '[part~="node"], [part~="edge"], [part~="capsule"], [part~="node-anchor"]',
      ),
    ).toHaveLength(0);
    const branch = tree.querySelector<HTMLElement>('ui-tree-item[value="/hello"]')!;
    const child = tree.querySelector<HTMLElement>('ui-tree-item[value="/hello/op"]')!;
    expect(child.parentElement).toBe(branch);
    expect(inShadow<HTMLButtonElement>(child, '[part="control"]').getAttribute("aria-level")).toBe(
      "2",
    );
    expect(inShadow<HTMLElement>(branch, '[part="preview"]').hidden).toBe(false);
    expect(branch.style.getPropertyValue("--_sh-tree-item-inline-start")).toBe("");
    const first = inShadow<HTMLButtonElement>(branch, '[part="control"]');
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        composed: true,
      }),
    );
    expect(shadow(child).activeElement).toBe(
      inShadow<HTMLButtonElement>(child, '[part="control"]'),
    );
  });

  it("releases revision offsets when switching into namespace presentation and restores graph opt-in", async () => {
    const tree = await fixture<ShrineTree>(`<sh-tree variant="inline"><ui-tree slot="tree">
      <ui-tree-item value="/hello" title="hello" data-shrine-lane="3"></ui-tree-item>
    </ui-tree></sh-tree>`);
    await settled(tree.parentElement!);
    const item = tree.querySelector<HTMLElement>("ui-tree-item")!;
    expect(item.style.getPropertyValue("--_sh-tree-item-inline-start")).not.toBe("");
    tree.variant = "namespace";
    await settled(tree.parentElement!);
    await settled(tree.parentElement!);
    expect(inShadow<HTMLElement>(tree, '[part="graph"]').hidden).toBe(true);
    expect(item.style.getPropertyValue("--_sh-tree-item-inline-start")).toBe("");
    expect(shadow(tree).querySelectorAll('[part~="node"]')).toHaveLength(0);
    tree.variant = "inline";
    await settled(tree.parentElement!);
    await settled(tree.parentElement!);
    expect(inShadow<HTMLElement>(tree, '[part="graph"]').hidden).toBe(false);
    expect(shadow(tree).querySelectorAll('[part~="node"]')).toHaveLength(1);
  });

  it("keeps expanded namespace previews above their native compact guide lanes", async () => {
    const fixtureRoot = await fixture<HTMLElement>(`
      <div data-mash-catalogue="mash" style="width:260px">
        <sh-tree variant="namespace"><ui-tree slot="tree" label="Namespace">
          <ui-tree-item value="/hello" title="hello" kind="folder" expanded>
            <div slot="preview">A long inline record value that wraps without overlapping its child names or creating graph hit targets.</div>
            <ui-tree-item slot="children" value="/hello/op" title="op" kind="folder"></ui-tree-item>
          </ui-tree-item>
        </ui-tree></sh-tree>
      </div>
    `);
    const tree = fixtureRoot.querySelector<ShrineTree>("sh-tree")!;
    const item = tree.querySelector<HTMLElement>('ui-tree-item[value="/hello"]')!;
    const child = tree.querySelector<HTMLElement>('ui-tree-item[value="/hello/op"]')!;
    await settled(fixtureRoot);
    const control = inShadow<HTMLElement>(item, '[part="control"]').getBoundingClientRect();
    const preview = inShadow<HTMLElement>(item, '[part="preview"]').getBoundingClientRect();
    const childControl = inShadow<HTMLElement>(child, '[part="control"]').getBoundingClientRect();
    expect(preview.top).toBeGreaterThanOrEqual(control.bottom);
    expect(childControl.top).toBeGreaterThanOrEqual(preview.bottom);
    expect(childControl.left).toBeGreaterThan(control.left);
    expect(childControl.right).toBeLessThanOrEqual(fixtureRoot.getBoundingClientRect().right);
    const children = inShadow<HTMLElement>(item, '[part="children"]');
    expect(Number.parseFloat(getComputedStyle(children).borderInlineStartWidth)).toBeGreaterThan(0);
    expect(inShadow<HTMLElement>(tree, '[part="graph"]').getBoundingClientRect().width).toBe(0);
    expect(inShadow<HTMLElement>(tree, '[part="tree"]').getBoundingClientRect().left).toBe(
      tree.getBoundingClientRect().left,
    );
  });
});
