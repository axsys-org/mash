import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UITree } from "./tree.js";
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

  it("reflects its accessible name and projects tree items", async () => {
    const tree = await fixture<UITree>(`<ui-tree><ui-tree-item>src</ui-tree-item></ui-tree>`);
    const slot = inShadow<HTMLSlotElement>(tree, "slot:not([name])");

    tree.label = "Project files";
    await settled(tree.parentElement!);

    expect(tree.getAttribute("label")).toBe("Project files");
    expect(slot.assignedElements().map((item) => item.localName)).toEqual(["ui-tree-item"]);
  });

  it("uses a descriptive accessible name when no label is supplied", async () => {
    const tree = await fixture<UITree>(`<ui-tree>content</ui-tree>`);
    const root = inShadow<HTMLElement>(tree, '[part="root"]');

    expect(root.getAttribute("aria-label")).toBe("Shrine tree");
  });
});
