import { UISwitch } from "./switch.js";

if (!customElements.get("ui-switch")) {
  customElements.define("ui-switch", UISwitch);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-switch": UISwitch;
  }
}

export { UISwitch };

export * from "./switch.js";
