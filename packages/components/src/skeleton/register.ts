import { UISkeleton } from "./skeleton.js";

/** Registers `<ui-skeleton>` without registering unrelated components. */
if (!customElements.get("ui-skeleton")) {
  customElements.define("ui-skeleton", UISkeleton);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-skeleton": UISkeleton;
  }
}

export { UISkeleton };
