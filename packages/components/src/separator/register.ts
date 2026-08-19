import { UISeparator } from "./separator.js";

/** Registers `<ui-separator>` without registering any unrelated component. */
if (!customElements.get("ui-separator")) {
  customElements.define("ui-separator", UISeparator);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-separator": UISeparator;
  }
}

export { UISeparator };
