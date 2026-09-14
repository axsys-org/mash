import { UIAlert } from "./alert.js";
if (!customElements.get("ui-alert")) customElements.define("ui-alert", UIAlert);
export * from "./alert.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-alert": UIAlert;
  }
}
