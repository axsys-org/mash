import {
  UITable,
  UITableBody,
  UITableCaption,
  UITableCell,
  UITableHead,
  UITableHeader,
  UITableRow,
} from "./table.js";

if (!customElements.get("ui-table")) customElements.define("ui-table", UITable);
if (!customElements.get("ui-table-header")) customElements.define("ui-table-header", UITableHeader);
if (!customElements.get("ui-table-body")) customElements.define("ui-table-body", UITableBody);
if (!customElements.get("ui-table-row")) customElements.define("ui-table-row", UITableRow);
if (!customElements.get("ui-table-head")) customElements.define("ui-table-head", UITableHead);
if (!customElements.get("ui-table-cell")) customElements.define("ui-table-cell", UITableCell);
if (!customElements.get("ui-table-caption"))
  customElements.define("ui-table-caption", UITableCaption);

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

export * from "./table.js";
