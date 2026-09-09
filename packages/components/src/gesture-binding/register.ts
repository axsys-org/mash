import { UIGestureBinding } from "./gesture-binding.js";

if (!customElements.get("ui-gesture-binding")) {
  customElements.define("ui-gesture-binding", UIGestureBinding);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-gesture-binding": UIGestureBinding;
  }
}

export { UIGestureBinding };

export * from "./gesture-binding.js";
