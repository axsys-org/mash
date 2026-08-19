import { UITooltip } from "./tooltip.js";

if (!customElements.get("ui-tooltip")) customElements.define("ui-tooltip", UITooltip);

declare global {
  interface HTMLElementTagNameMap {
    "ui-tooltip": UITooltip;
  }
}

export { UITooltip };
