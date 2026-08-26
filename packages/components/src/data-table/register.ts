import { UIDataTable } from "./data-table.js";

if (!customElements.get("ui-data-table")) {
  customElements.define("ui-data-table", UIDataTable);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-data-table": UIDataTable;
  }
}

export { UIDataTable };
