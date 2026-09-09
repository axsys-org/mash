import { UIColorPicker, UIColorSwatch } from "./color-picker.js";

if (!customElements.get("ui-color-picker")) customElements.define("ui-color-picker", UIColorPicker);
if (!customElements.get("ui-color-swatch")) customElements.define("ui-color-swatch", UIColorSwatch);

declare global {
  interface HTMLElementTagNameMap {
    "ui-color-picker": UIColorPicker;
    "ui-color-swatch": UIColorSwatch;
  }
}

export { UIColorPicker, UIColorSwatch };

export * from "./color-picker.js";
