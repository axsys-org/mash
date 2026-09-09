import { UIAlertDialog } from "./alert-dialog.js";

if (!customElements.get("ui-alert-dialog")) customElements.define("ui-alert-dialog", UIAlertDialog);

declare global {
  interface HTMLElementTagNameMap {
    "ui-alert-dialog": UIAlertDialog;
  }
}

export { UIAlertDialog };

export * from "./alert-dialog.js";
