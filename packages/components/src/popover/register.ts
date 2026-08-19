import { UIPopover } from "./popover.js";

if (!customElements.get("ui-popover")) customElements.define("ui-popover", UIPopover);

declare global {
  interface HTMLElementTagNameMap {
    "ui-popover": UIPopover;
  }
}

export { UIPopover };
