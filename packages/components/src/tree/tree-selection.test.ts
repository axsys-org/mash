import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { fixture, settled } from "../test-support/fixture.js";
import type { UITree } from "./tree.js";
import "../tree-item/register.js";
import "./register.js";

describe("managed tree selection", () => {
  it("keeps focus separate from selection, ranges over visible enabled rows, and toggles without expanding", async () => {
    const tree = await fixture<UITree>(
      '<ui-tree selection-mode="multiple"><ui-tree-item value="a" title="Alpha" kind="folder"><ui-tree-item slot="children" value="hidden" title="Hidden"></ui-tree-item></ui-tree-item><ui-tree-item value="disabled" title="Unavailable" disabled></ui-tree-item><ui-tree-item value="b" title="Beta"></ui-tree-item><ui-tree-item value="c" title="Charlie"></ui-tree-item></ui-tree>',
    );
    await settled(tree);
    tree.focusItem("a");
    await userEvent.keyboard(" {ArrowDown}");
    expect(tree.selectedValues).toEqual(["a"]);
    expect(tree.querySelector('[value="a"]')!.hasAttribute("expanded")).toBe(false);
    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(tree.selectedValues).toEqual(["a", "b", "c"]);
    await userEvent.keyboard(" ");
    expect(tree.selectedValues).toEqual(["a", "b"]);
    await userEvent.keyboard("{Control>}a{/Control}");
    expect(tree.selectedValues).toEqual(["a", "b", "c"]);
    tree.selectedValues = ["b"];
    await settled(tree);
    expect(tree.querySelector('[value="b"]')!.getAttribute("selected")).toBe("");
    expect(
      tree.shadowRoot!.querySelector('[role="tree"]')!.getAttribute("aria-multiselectable"),
    ).toBe("true");
  });
});
