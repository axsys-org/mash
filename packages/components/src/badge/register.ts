import { UIBadge } from "./badge.js";

/** Registers `<ui-badge>` without registering any unrelated component. */
if (!customElements.get("ui-badge")) {
  customElements.define("ui-badge", UIBadge);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-badge": UIBadge;
  }
}

export { UIBadge };

export * from "./badge.js";
