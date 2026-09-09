import { UIOption } from "./option.js";

if (!customElements.get("ui-option")) customElements.define("ui-option", UIOption);

declare global {
  interface HTMLElementTagNameMap {
    "ui-option": UIOption;
  }
}

export { UIOption };

export * from "./option.js";
