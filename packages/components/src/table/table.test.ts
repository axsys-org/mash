import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UITable, UITableCell, UITableRow } from "./table.js";
import "./register.js";

describe("ui-table", () => {
  it("projects logical counts and accessibility indices", async () => {
    const table = await fixture<UITable>(`
      <ui-table label="Projects" row-count="200" column-count="4">
        <ui-table-body>
          <ui-table-row row-index="17">
            <ui-table-cell column-index="3">Active</ui-table-cell>
          </ui-table-row>
        </ui-table-body>
      </ui-table>
    `);
    const row = table.querySelector<UITableRow>("ui-table-row")!;
    const cell = table.querySelector<UITableCell>("ui-table-cell")!;

    expect(inShadow(table, `[role="table"]`).getAttribute("aria-rowcount")).toBe("200");
    expect(inShadow(table, `[role="table"]`).getAttribute("aria-colcount")).toBe("4");
    expect(inShadow(row, `[role="row"]`).getAttribute("aria-rowindex")).toBe("17");
    expect(inShadow(cell, `[role="cell"]`).getAttribute("aria-colindex")).toBe("3");
  });

  it("keeps every semantic region authored through slots", async () => {
    const table = await fixture<UITable>(`
      <ui-table>
        <ui-table-caption slot="caption">Projects</ui-table-caption>
        <ui-table-header></ui-table-header>
        <ui-table-body></ui-table-body>
      </ui-table>
    `);

    expect(
      inShadow<HTMLSlotElement>(table, `slot[name="caption"]`).assignedElements(),
    ).toHaveLength(1);
    expect(inShadow<HTMLSlotElement>(table, `slot:not([name])`).assignedElements()).toHaveLength(2);
  });
});
