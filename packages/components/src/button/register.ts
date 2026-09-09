import { UIButton } from "./button.js";

/**
 * Registers `<ui-button>`.
 *
 * This is the only side-effectful module for this component; importing
 * `@mash/ui/button` defines nothing. The guard makes the import idempotent, so
 * two copies of the package on a page do not throw on the second definition.
 */
if (!customElements.get("ui-button")) {
  customElements.define("ui-button", UIButton);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-button": UIButton;
  }
}

export { UIButton };

export * from "./button.js";
