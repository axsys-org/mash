import { UILink } from "./link.js";

/** Registers `<ui-link>` without registering unrelated components. */
if (!customElements.get("ui-link")) {
  customElements.define("ui-link", UILink);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-link": UILink;
  }
}

export { UILink };

export * from "./link.js";
