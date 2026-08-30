import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { MashCommandDetail } from "../gesture/gesture.js";
import { UITableCell, UITableHead, UITableRow } from "../table/table.js";
import "../table/register.js";
import { UIDataTable, type DataTableSelectionDetail } from "./data-table.js";
import "./register.js";

const authoredTable = `
  <ui-table label="Projects" row-count="3" column-count="2">
    <ui-table-header>
      <ui-table-row row-index="1">
        <ui-table-head column-index="1">Project</ui-table-head>
        <ui-table-head column-index="2">Status</ui-table-head>
      </ui-table-row>
    </ui-table-header>
    <ui-table-body>
      <ui-table-row row-index="2">
        <ui-table-cell column-index="1">Billing migration</ui-table-cell>
        <ui-table-cell column-index="2" editable>Active</ui-table-cell>
      </ui-table-row>
      <ui-table-row row-index="3">
        <ui-table-cell column-index="1">Archive import</ui-table-cell>
        <ui-table-cell column-index="2">Paused</ui-table-cell>
      </ui-table-row>
    </ui-table-body>
  </ui-table>
`;

const titledTable = authoredTable
  .replace(
    '<ui-table-cell column-index="1">Billing migration</ui-table-cell>',
    '<ui-table-head scope="row" column-index="1">1</ui-table-head>',
  )
  .replace(
    '<ui-table-cell column-index="1">Archive import</ui-table-cell>',
    '<ui-table-head scope="row" column-index="1">2</ui-table-head>',
  );

describe("ui-data-table", () => {
  it("keeps toolbar, table, state, and footer regions authored through slots", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table label="Project data">
        <ui-toolbar slot="toolbar"></ui-toolbar>
        ${authoredTable}
        <p slot="empty">No projects</p>
        <span slot="loading">Loading projects</span>
        <form slot="editor"><input name="value" /></form>
        <output slot="footer">4 rows</output>
      </ui-data-table>
    `);

    for (const part of [
      "root",
      "toolbar",
      "viewport",
      "table",
      "empty",
      "loading",
      "editor",
      "footer",
    ]) {
      expect(inShadow(dataTable, `[part~="${part}"]`)).toBeTruthy();
    }
    expect(
      inShadow<HTMLSlotElement>(dataTable, "slot:not([name])").assignedElements(),
    ).toHaveLength(1);
  });

  it("projects controlled cell selection into grid semantics", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell" selected="2:2">${authoredTable}</ui-data-table>
    `);
    await settled(dataTable.parentElement!);
    const table = dataTable.table!;
    const selected = dataTable.querySelector<UITableCell>(
      'ui-table-row[row-index="2"] ui-table-cell[column-index="2"]',
    )!;

    expect(table.interactive).toBe(true);
    expect(inShadow(table, '[role="grid"]')).toBeTruthy();
    expect(selected.selected).toBe(true);
    expect(selected.active).toBe(true);
    expect(selected.tabIndex).toBe(0);
    expect(inShadow(selected, '[role="gridcell"]').getAttribute("aria-selected")).toBe("true");
    expect(inShadow(selected, '[role="gridcell"]').getAttribute("aria-readonly")).toBe("false");
  });

  it("requests parent-owned selection without silently mutating it", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell" selected="2:1">${authoredTable}</ui-data-table>
    `);
    const listener = vi.fn();
    const commandListener = vi.fn();
    dataTable.addEventListener("ui-data-table-select", listener);
    dataTable.addEventListener("mash-command", commandListener);
    const target = dataTable.querySelector<UITableCell>(
      'ui-table-row[row-index="3"] ui-table-cell[column-index="2"]',
    )!;

    target.click();

    expect(listener).toHaveBeenCalledOnce();
    expect(
      (listener.mock.calls[0]![0] as CustomEvent<DataTableSelectionDetail>).detail,
    ).toMatchObject({
      selection: "cell",
      rowIndex: 3,
      columnIndex: 2,
      key: "3:2",
      reason: "pointer",
    });
    expect(dataTable.selected).toBe("2:1");
    expect(
      (commandListener.mock.calls[0]![0] as CustomEvent<MashCommandDetail>).detail,
    ).toMatchObject({
      command: "selection.set",
      gesture: "press",
      phase: "ended",
      source: "pointer",
      data: { key: "3:2", selection: "cell" },
    });
    await Promise.resolve();
    expect(document.activeElement).toBe(target);

    dataTable.selected = "3:2";
    await settled(dataTable.parentElement!);
    expect(target.selected).toBe(true);
  });

  it("uses the same controlled contract for keyboard navigation and activation", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell" selected="2:1">${authoredTable}</ui-data-table>
    `);
    await settled(dataTable.parentElement!);
    const selected = dataTable.querySelector<UITableCell>(
      'ui-table-row[row-index="2"] ui-table-cell[column-index="1"]',
    )!;
    const selectListener = vi.fn();
    const activateListener = vi.fn();
    dataTable.addEventListener("ui-data-table-select", selectListener);
    dataTable.addEventListener("ui-data-table-activate", activateListener);

    selected.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }),
    );
    expect(
      (selectListener.mock.calls[0]![0] as CustomEvent<DataTableSelectionDetail>).detail.key,
    ).toBe("2:2");

    selected.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F2", bubbles: true, composed: true }),
    );
    expect(activateListener).toHaveBeenCalledOnce();
    expect(activateListener.mock.calls[0]![0].detail).toMatchObject({
      rowIndex: 2,
      columnIndex: 1,
      reason: "keyboard",
    });
  });

  it("keeps the slotted editor lifecycle controlled and event driven", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell" selected="2:2">
        ${authoredTable}
        <form slot="editor"><input name="value" value="Active" /></form>
      </ui-data-table>
    `);
    await settled(dataTable.parentElement!);
    const cell = dataTable.querySelector<UITableCell>(
      'ui-table-row[row-index="2"] ui-table-cell[column-index="2"]',
    )!;
    const form = dataTable.querySelector<HTMLFormElement>('form[slot="editor"]')!;
    const input = form.querySelector<HTMLInputElement>("input")!;
    const requestListener = vi.fn();
    const commitListener = vi.fn();
    const cancelListener = vi.fn();
    dataTable.addEventListener("ui-data-table-edit-request", requestListener);
    dataTable.addEventListener("ui-data-table-edit-commit", commitListener);
    dataTable.addEventListener("ui-data-table-edit-cancel", cancelListener);

    cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));

    expect(requestListener).toHaveBeenCalledOnce();
    expect(requestListener.mock.calls[0]![0].detail).toMatchObject({
      key: "2:2",
      rowIndex: 2,
      columnIndex: 2,
      reason: "pointer",
    });
    expect(dataTable.editing).toBe("");
    expect(inShadow<HTMLElement>(dataTable, '[part="editor"]').hidden).toBe(true);

    dataTable.editing = "2:2";
    await settled(dataTable.parentElement!);
    expect(dataTable.matches(":state(editing)")).toBe(true);
    expect(cell.hasAttribute("data-editing")).toBe(true);
    expect(inShadow<HTMLElement>(dataTable, '[part="editor"]').hidden).toBe(false);

    form.requestSubmit();
    expect(commitListener).toHaveBeenCalledOnce();
    expect(commitListener.mock.calls[0]![0].detail).toMatchObject({
      key: "2:2",
      reason: "submit",
      form,
    });
    expect(dataTable.editing).toBe("2:2");

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    expect(cancelListener).toHaveBeenCalledOnce();
    expect(cancelListener.mock.calls[0]![0].detail).toMatchObject({
      key: "2:2",
      reason: "escape",
    });
    expect(dataTable.editing).toBe("2:2");
    dataTable.editing = "";
    await settled(dataTable.parentElement!);
    expect(dataTable.hasAttribute("editing")).toBe(false);
  });

  it("offers imperative edit requests without owning the editor identity", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell">${authoredTable}</ui-data-table>
    `);
    const requestListener = vi.fn();
    const commitListener = vi.fn();
    dataTable.addEventListener("ui-data-table-edit-request", requestListener);
    dataTable.addEventListener("ui-data-table-edit-commit", commitListener);

    expect(dataTable.requestEdit(2, 2)).toBe(true);
    expect(dataTable.requestEdit(3, 2)).toBe(false);
    expect(requestListener).toHaveBeenCalledOnce();
    expect(dataTable.editing).toBe("");

    dataTable.editing = "2:2";
    expect(dataTable.commitEdit()).toBe(true);
    expect(commitListener).toHaveBeenCalledOnce();
    expect(dataTable.editing).toBe("2:2");
  });

  it("requests and projects parent-owned rectangular ranges with Shift-click", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell" selected="2:1">${authoredTable}</ui-data-table>
    `);
    const listener = vi.fn();
    dataTable.addEventListener("ui-data-table-select", listener);
    const target = dataTable.querySelector<UITableCell>(
      'ui-table-row[row-index="3"] ui-table-cell[column-index="2"]',
    )!;

    target.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true, shiftKey: true }),
    );

    const detail = (listener.mock.calls[0]![0] as CustomEvent<DataTableSelectionDetail>).detail;
    expect(detail).toMatchObject({
      extended: true,
      key: "2:1..3:2",
      rowIndex: 3,
      columnIndex: 2,
      range: {
        anchor: { key: "2:1", rowIndex: 2, columnIndex: 1 },
        focus: { key: "3:2", rowIndex: 3, columnIndex: 2 },
        rowStart: 2,
        rowEnd: 3,
        columnStart: 1,
        columnEnd: 2,
      },
    });
    expect(dataTable.selected).toBe("2:1");

    dataTable.selected = detail.key;
    await settled(dataTable.parentElement!);
    expect(dataTable.querySelectorAll("ui-table-cell[selected]")).toHaveLength(4);
    expect(target.active).toBe(true);
    expect(target.tabIndex).toBe(0);
  });

  it("extends from the stable anchor with Shift-arrow navigation", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell" selected="3:2">${authoredTable}</ui-data-table>
    `);
    await settled(dataTable.parentElement!);
    const selected = dataTable.querySelector<UITableCell>(
      'ui-table-row[row-index="3"] ui-table-cell[column-index="2"]',
    )!;
    const listener = vi.fn();
    dataTable.addEventListener("ui-data-table-select", listener);

    selected.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowUp",
        bubbles: true,
        composed: true,
        shiftKey: true,
      }),
    );

    const first = (listener.mock.calls[0]![0] as CustomEvent<DataTableSelectionDetail>).detail;
    expect(first.key).toBe("3:2..2:2");
    expect(first.range).toMatchObject({ rowStart: 2, rowEnd: 3, columnStart: 2, columnEnd: 2 });

    dataTable.selected = first.key;
    await settled(dataTable.parentElement!);
    const focus = dataTable.querySelector<UITableCell>(
      'ui-table-row[row-index="2"] ui-table-cell[column-index="2"]',
    )!;
    expect(focus.active).toBe(true);
    expect(dataTable.querySelectorAll("ui-table-cell[selected]")).toHaveLength(2);

    focus.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        composed: true,
        shiftKey: true,
      }),
    );
    const second = (listener.mock.calls[1]![0] as CustomEvent<DataTableSelectionDetail>).detail;
    expect(second.key).toBe("3:2..2:1");
    expect(second.range.anchor.key).toBe("3:2");
  });

  it("uses the same range grammar for row and column bands", async () => {
    for (const testCase of [
      {
        selection: "row",
        selected: "2",
        selector: 'ui-table-row[row-index="3"] ui-table-cell[column-index="1"]',
        expected: "2..3",
      },
      {
        selection: "column",
        selected: "1",
        selector: 'ui-table-row[row-index="2"] ui-table-cell[column-index="2"]',
        expected: "1..2",
      },
    ] as const) {
      const dataTable = await fixture<UIDataTable>(`
        <ui-data-table selection="${testCase.selection}" selected="${testCase.selected}">
          ${authoredTable}
        </ui-data-table>
      `);
      const listener = vi.fn();
      dataTable.addEventListener("ui-data-table-select", listener);
      dataTable
        .querySelector<HTMLElement>(testCase.selector)!
        .dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, shiftKey: true }));

      const detail = (listener.mock.calls[0]![0] as CustomEvent<DataTableSelectionDetail>).detail;
      expect(detail.key).toBe(testCase.expected);
      expect(detail.range.anchor.key).toBe(testCase.selected);
    }
  });

  it("selects complete row and column bands from their authored titles", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell" selected="2:2">${titledTable}</ui-data-table>
    `);
    const listener = vi.fn();
    dataTable.addEventListener("ui-data-table-select", listener);
    const columnTitle = dataTable.querySelector<UITableHead>(
      'ui-table-header ui-table-head[column-index="2"]',
    )!;
    const rowTitle = dataTable.querySelector<UITableHead>(
      'ui-table-row[row-index="3"] ui-table-head[scope="row"]',
    )!;

    columnTitle.click();
    const columnDetail = (listener.mock.calls[0]![0] as CustomEvent<DataTableSelectionDetail>)
      .detail;
    expect(columnDetail).toMatchObject({
      selection: "column",
      key: "column:2",
      rowIndex: null,
      columnIndex: 2,
    });

    dataTable.selected = columnDetail.key;
    await settled(dataTable.parentElement!);
    expect(columnTitle.selected).toBe(true);
    expect(dataTable.querySelectorAll('ui-table-cell[column-index="2"][selected]')).toHaveLength(2);

    rowTitle.click();
    const rowDetail = (listener.mock.calls[1]![0] as CustomEvent<DataTableSelectionDetail>).detail;
    expect(rowDetail).toMatchObject({
      selection: "row",
      key: "row:3",
      rowIndex: 3,
      columnIndex: null,
    });

    dataTable.selected = rowDetail.key;
    await settled(dataTable.parentElement!);
    expect(rowTitle.selected).toBe(true);
    expect(dataTable.querySelector<UITableRow>('ui-table-row[row-index="3"]')!.selected).toBe(true);
  });

  it("extends title-selected row and column bands with Shift", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table selection="cell" selected="column:1">${titledTable}</ui-data-table>
    `);
    const listener = vi.fn();
    dataTable.addEventListener("ui-data-table-select", listener);
    const columnTwo = dataTable.querySelector<UITableHead>(
      'ui-table-header ui-table-head[column-index="2"]',
    )!;

    columnTwo.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true, shiftKey: true }),
    );
    const columnDetail = (listener.mock.calls[0]![0] as CustomEvent<DataTableSelectionDetail>)
      .detail;
    expect(columnDetail.key).toBe("column:1..2");
    expect(columnDetail.range).toMatchObject({ columnStart: 1, columnEnd: 2 });

    dataTable.selected = "row:2";
    await settled(dataTable.parentElement!);
    const rowTwo = dataTable.querySelector<UITableHead>(
      'ui-table-row[row-index="3"] ui-table-head[scope="row"]',
    )!;
    rowTwo.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true, shiftKey: true }),
    );
    const rowDetail = (listener.mock.calls[1]![0] as CustomEvent<DataTableSelectionDetail>).detail;
    expect(rowDetail.key).toBe("row:2..3");
    expect(rowDetail.range).toMatchObject({ rowStart: 2, rowEnd: 3 });
  });

  it("exposes loading and empty states independently of authored content", async () => {
    const dataTable = await fixture<UIDataTable>(`
      <ui-data-table loading empty>
        ${authoredTable}
        <span slot="loading">Loading</span>
        <span slot="empty">No results</span>
      </ui-data-table>
    `);

    expect(dataTable.matches(":state(loading)")).toBe(true);
    expect(dataTable.matches(":state(empty)")).toBe(true);
    expect(inShadow<HTMLElement>(dataTable, '[part="viewport"]').hidden).toBe(true);
    expect(inShadow<HTMLElement>(dataTable, '[part="loading"]').hidden).toBe(false);
    expect(inShadow<HTMLElement>(dataTable, '[part="empty"]').hidden).toBe(false);
  });
});
