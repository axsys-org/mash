import {
  UITable,
  UITableBody,
  UITableCaption,
  UITableCell,
  UITableHead,
  UITableHeader,
  UITableRow,
} from "./table.js";

const definitions = [
  ["ui-table", UITable],
  ["ui-table-header", UITableHeader],
  ["ui-table-body", UITableBody],
  ["ui-table-row", UITableRow],
  ["ui-table-head", UITableHead],
  ["ui-table-cell", UITableCell],
  ["ui-table-caption", UITableCaption],
] as const;

for (const [tag, definition] of definitions) {
  if (!customElements.get(tag)) customElements.define(tag, definition);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-table": UITable;
    "ui-table-header": UITableHeader;
    "ui-table-body": UITableBody;
    "ui-table-row": UITableRow;
    "ui-table-head": UITableHead;
    "ui-table-cell": UITableCell;
    "ui-table-caption": UITableCaption;
  }
}

export {
  UITable,
  UITableBody,
  UITableCaption,
  UITableCell,
  UITableHead,
  UITableHeader,
  UITableRow,
};
