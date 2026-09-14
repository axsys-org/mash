import { UILabel } from "./label.js";

/**
 * Registers `<ui-label>`.
 *
 * This is the only side-effectful module for this component; importing
 * `@mash/ui/label` defines nothing.
 */
if (!customElements.get("ui-label")) {
  customElements.define("ui-label", UILabel);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-label": UILabel;
  }
}

export { UILabel };

export * from "./label.js";
