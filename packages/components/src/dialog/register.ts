import { UIDialog } from "./dialog.js";

if (!customElements.get("ui-dialog")) customElements.define("ui-dialog", UIDialog);

declare global {
  interface HTMLElementTagNameMap {
    "ui-dialog": UIDialog;
  }
}

export { UIDialog };
