import { UIMotion } from "./motion.js";

if (!customElements.get("ui-motion")) {
  customElements.define("ui-motion", UIMotion);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-motion": UIMotion;
  }
}

export { UIMotion };
