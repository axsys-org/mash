import { UIAutocomplete } from "./autocomplete.js";

if (!customElements.get("ui-autocomplete"))
  customElements.define("ui-autocomplete", UIAutocomplete);

declare global {
  interface HTMLElementTagNameMap {
    "ui-autocomplete": UIAutocomplete;
  }
}

export { UIAutocomplete };
