import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import {
  UITable,
  UITableBody,
  UITableCaption,
  UITableCell,
  UITableHead,
  UITableHeader,
  UITableRow,
} from "./table.js";
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

  it("exposes every structural layer as a semantic styling part", async () => {
    const table = await fixture<UITable>(`
      <ui-table>
        <ui-table-caption slot="caption">Projects</ui-table-caption>
        <ui-table-header>
          <ui-table-row>
            <ui-table-head>Project</ui-table-head>
          </ui-table-row>
        </ui-table-header>
        <ui-table-body>
          <ui-table-row>
            <ui-table-cell>Billing migration</ui-table-cell>
          </ui-table-row>
        </ui-table-body>
      </ui-table>
    `);
    const caption = table.querySelector<UITableCaption>("ui-table-caption")!;
    const header = table.querySelector<UITableHeader>("ui-table-header")!;
    const body = table.querySelector<UITableBody>("ui-table-body")!;
    const rows = [...table.querySelectorAll<UITableRow>("ui-table-row")];
    const head = table.querySelector<UITableHead>("ui-table-head")!;
    const cell = table.querySelector<UITableCell>("ui-table-cell")!;

    expect(inShadow(table, `[part~="table"]`)).toBeTruthy();
    expect(inShadow(table, `[part~="rowgroups"]`)).toBeTruthy();
    expect(inShadow(caption, `[part~="caption"]`)).toBeTruthy();
    expect(inShadow(caption, `[part~="title"]`)).toBeTruthy();
    expect(inShadow(header, `[part~="rowgroup"][part~="header"]`)).toBeTruthy();
    expect(inShadow(header, `[part~="rows"]`)).toBeTruthy();
    expect(inShadow(body, `[part~="rowgroup"][part~="body"]`)).toBeTruthy();
    expect(inShadow(body, `[part~="rows"]`)).toBeTruthy();
    for (const row of rows) {
      expect(inShadow(row, `[part~="row"]`)).toBeTruthy();
      expect(inShadow(row, `[part~="cells"]`)).toBeTruthy();
    }
    expect(inShadow(head, `[part~="column-header"]`)).toBeTruthy();
    expect(inShadow(head, `[part~="content"]`)).toBeTruthy();
    expect(inShadow(cell, `[part~="cell"]`)).toBeTruthy();
    expect(inShadow(cell, `[part~="content"]`)).toBeTruthy();
  });
});
