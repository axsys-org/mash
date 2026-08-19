import { UICombobox } from "./combobox.js";

if (!customElements.get("ui-combobox")) customElements.define("ui-combobox", UICombobox);

declare global {
  interface HTMLElementTagNameMap {
    "ui-combobox": UICombobox;
  }
}

export { UICombobox };
