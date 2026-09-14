import { UIToast } from "./toast.js";

if (!customElements.get("ui-toast")) customElements.define("ui-toast", UIToast);

declare global {
  interface HTMLElementTagNameMap {
    "ui-toast": UIToast;
  }
}

export { UIToast };

export * from "./toast.js";
