import { UISpinner } from "./spinner.js";

/** Registers `<ui-spinner>` without registering any unrelated component. */
if (!customElements.get("ui-spinner")) {
  customElements.define("ui-spinner", UISpinner);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-spinner": UISpinner;
  }
}

export { UISpinner };
