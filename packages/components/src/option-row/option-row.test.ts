import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import "./register.js";
import "../option/register.js";

describe("ui-option-row", () => {
  it("realizes a headless semantic grid row with authored option cells", async () => {
    const row = await fixture<HTMLElement>(`
      <ui-option-row><ui-option value="maya">Maya</ui-option></ui-option-row>
    `);
    const option = row.querySelector<HTMLElement>("ui-option")!;

    expect(row.getAttribute("role")).toBe("row");
    expect(option.getAttribute("role")).toBe("gridcell");
    expect(inShadow<HTMLSlotElement>(row, "slot").assignedElements()).toEqual([option]);
  });
});
