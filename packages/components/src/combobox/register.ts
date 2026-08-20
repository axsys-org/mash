import { UICombobox } from "./combobox.js";
import "../chip/register.js";
import "../option/register.js";
import "../option-group/register.js";
import "../option-row/register.js";

if (!customElements.get("ui-combobox")) customElements.define("ui-combobox", UICombobox);

declare global {
  interface HTMLElementTagNameMap {
    "ui-combobox": UICombobox;
  }
}

export { UICombobox };
