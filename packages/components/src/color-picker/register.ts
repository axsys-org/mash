import { UIColorPicker, UIColorSwatch } from "./color-picker.js";

const definitions = [
  ["ui-color-picker", UIColorPicker],
  ["ui-color-swatch", UIColorSwatch],
] as const;

for (const [tag, definition] of definitions) {
  if (!customElements.get(tag)) customElements.define(tag, definition);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-color-picker": UIColorPicker;
    "ui-color-swatch": UIColorSwatch;
  }
}

export { UIColorPicker, UIColorSwatch };
