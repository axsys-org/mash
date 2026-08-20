import { UISelect } from "./select.js";
import "../option/register.js";
import "../option-group/register.js";

if (!customElements.get("ui-select")) customElements.define("ui-select", UISelect);

declare global {
  interface HTMLElementTagNameMap {
    "ui-select": UISelect;
  }
}

export { UISelect };
