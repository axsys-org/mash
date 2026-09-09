import { UIPagination } from "./pagination.js";

/** Registers `<ui-pagination>` without registering unrelated components. */
if (!customElements.get("ui-pagination")) {
  customElements.define("ui-pagination", UIPagination);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-pagination": UIPagination;
  }
}

export { UIPagination };

export * from "./pagination.js";
