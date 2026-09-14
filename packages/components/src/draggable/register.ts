import { UIDraggable } from "./draggable.js";

if (!customElements.get("ui-draggable")) {
  customElements.define("ui-draggable", UIDraggable);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-draggable": UIDraggable;
  }
}

export { UIDraggable };

export * from "./draggable.js";
