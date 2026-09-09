import { UIStagger } from "./stagger.js";

if (!customElements.get("ui-stagger")) {
  customElements.define("ui-stagger", UIStagger);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-stagger": UIStagger;
  }
}

export { UIStagger };

export * from "./stagger.js";
