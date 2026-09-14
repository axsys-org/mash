import { UIOptionRow } from "./option-row.js";

if (!customElements.get("ui-option-row")) {
  customElements.define("ui-option-row", UIOptionRow);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-option-row": UIOptionRow;
  }
}

export { UIOptionRow };

export * from "./option-row.js";
