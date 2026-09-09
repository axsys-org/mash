import { UIChip } from "./chip.js";

if (!customElements.get("ui-chip")) customElements.define("ui-chip", UIChip);

declare global {
  interface HTMLElementTagNameMap {
    "ui-chip": UIChip;
  }
}

export { UIChip };

export * from "./chip.js";
