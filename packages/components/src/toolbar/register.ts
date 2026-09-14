import { UIToolbar } from "./toolbar.js";

if (!customElements.get("ui-toolbar")) {
  customElements.define("ui-toolbar", UIToolbar);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-toolbar": UIToolbar;
  }
}

export { UIToolbar };

export * from "./toolbar.js";
