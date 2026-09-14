import { UIMeter } from "./meter.js";

if (!customElements.get("ui-meter")) {
  customElements.define("ui-meter", UIMeter);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-meter": UIMeter;
  }
}

export { UIMeter };

export * from "./meter.js";
