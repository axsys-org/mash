import { UISelect } from "./select.js";

if (!customElements.get("ui-select")) customElements.define("ui-select", UISelect);

declare global {
  interface HTMLElementTagNameMap {
    "ui-select": UISelect;
  }
}

export { UISelect };
