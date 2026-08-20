import { UIInput } from "./input.js";

/** Registers `<ui-input>` without registering any unrelated component. */
if (!customElements.get("ui-input")) {
  customElements.define("ui-input", UIInput);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-input": UIInput;
  }
}

export { UIInput };
