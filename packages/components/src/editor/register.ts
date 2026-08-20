import { UIEditor } from "./editor.js";

/** Registers `<ui-editor>` without registering unrelated components. */
if (!customElements.get("ui-editor")) customElements.define("ui-editor", UIEditor);

declare global {
  interface HTMLElementTagNameMap {
    "ui-editor": UIEditor;
  }
}

export { UIEditor };
