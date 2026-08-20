import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UIOptionGroup } from "./option-group.js";
import "./register.js";

describe("ui-option-group", () => {
  it("associates its label with the grouped option collection", async () => {
    const group = await fixture<UIOptionGroup>(`
      <ui-option-group label="People"><ui-option value="maya">Maya</ui-option></ui-option-group>
    `);
    const root = inShadow<HTMLElement>(group, "[role=group]");
    const label = inShadow<HTMLElement>(group, "[part=label]");

    expect(root.getAttribute("aria-labelledby")).toBe(label.id);
    expect(label.textContent).toContain("People");
    expect(inShadow<HTMLSlotElement>(group, "slot:not([name])").assignedElements()).toHaveLength(1);
  });
});
