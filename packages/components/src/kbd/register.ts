import { UIKbd } from "./kbd.js";

/** Registers `<ui-kbd>` without registering any unrelated component. */
if (!customElements.get("ui-kbd")) {
  customElements.define("ui-kbd", UIKbd);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-kbd": UIKbd;
  }
}

export { UIKbd };
