import { describe, expect, it } from "vitest";

import { fixture, shadow } from "../test-support/fixture.js";
import { UIInputGroup } from "./input-group.js";
import "./register.js";

describe("ui-input-group", () => {
  it("keeps adornment anatomy outside the input primitive", async () => {
    const group = await fixture<UIInputGroup>(`
      <ui-input-group>
        <span slot="prefix">⌕</span>
        <input slot="control" aria-label="Search" />
        <kbd slot="suffix">⌘ K</kbd>
      </ui-input-group>
    `);

    expect(group).toBeInstanceOf(UIInputGroup);
    expect(
      [...shadow(group).querySelectorAll("[part]")].map((node) => node.getAttribute("part")),
    ).toEqual(["root", "prefix", "prefix-separator", "control", "suffix-separator", "suffix"]);
    expect(
      shadow(group).querySelector<HTMLSlotElement>('slot[name="control"]')?.assignedElements(),
    ).toHaveLength(1);
    expect(group.matches(":state(has-prefix)")).toBe(true);
    expect(group.matches(":state(has-control)")).toBe(true);
    expect(group.matches(":state(has-suffix)")).toBe(true);
  });

  it("hides empty anatomy without reserving layout lanes", async () => {
    const group = await fixture<UIInputGroup>(`
      <ui-input-group>
        <input slot="control" aria-label="Project" />
      </ui-input-group>
    `);

    expect(group.matches(":state(has-prefix)")).toBe(false);
    expect(group.matches(":state(has-control)")).toBe(true);
    expect(group.matches(":state(has-suffix)")).toBe(false);
    expect(shadow(group).querySelector<HTMLElement>('[part="prefix"]')?.hidden).toBe(true);
    expect(shadow(group).querySelector<HTMLElement>('[part="prefix-separator"]')?.hidden).toBe(
      true,
    );
    expect(shadow(group).querySelector<HTMLElement>('[part="suffix-separator"]')?.hidden).toBe(
      true,
    );
    expect(shadow(group).querySelector<HTMLElement>('[part="suffix"]')?.hidden).toBe(true);
  });
});
