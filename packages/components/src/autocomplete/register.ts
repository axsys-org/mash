import { UIAutocomplete } from "./autocomplete.js";
import "../chip/register.js";
import "../option/register.js";
import "../option-group/register.js";

if (!customElements.get("ui-autocomplete"))
  customElements.define("ui-autocomplete", UIAutocomplete);

declare global {
  interface HTMLElementTagNameMap {
    "ui-autocomplete": UIAutocomplete;
  }
}

export { UIAutocomplete };

export * from "./autocomplete.js";
