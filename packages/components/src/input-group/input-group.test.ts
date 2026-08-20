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
    ).toEqual(["root", "prefix", "control", "suffix"]);
    expect(
      shadow(group).querySelector<HTMLSlotElement>('slot[name="control"]')?.assignedElements(),
    ).toHaveLength(1);
  });
});
