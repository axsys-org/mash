import "../calendar/register.js";

import { UIDatePicker } from "./date-picker.js";

/** Registers `<ui-date-picker>` and its calendar dependency. */
if (!customElements.get("ui-date-picker")) customElements.define("ui-date-picker", UIDatePicker);

declare global {
  interface HTMLElementTagNameMap {
    "ui-date-picker": UIDatePicker;
  }
}

export { UIDatePicker };

export * from "./date-picker.js";
