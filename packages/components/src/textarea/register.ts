import { UITextarea } from "./textarea.js";

/** Registers `<ui-textarea>` without registering unrelated components. */
if (!customElements.get("ui-textarea")) {
  customElements.define("ui-textarea", UITextarea);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-textarea": UITextarea;
  }
}

export { UITextarea };

export * from "./textarea.js";
