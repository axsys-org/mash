import { UIOptionGroup } from "./option-group.js";

if (!customElements.get("ui-option-group")) {
  customElements.define("ui-option-group", UIOptionGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-option-group": UIOptionGroup;
  }
}

export { UIOptionGroup };

export * from "./option-group.js";
