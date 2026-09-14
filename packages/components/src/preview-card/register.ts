import { UIPreviewCard } from "./preview-card.js";

if (!customElements.get("ui-preview-card")) customElements.define("ui-preview-card", UIPreviewCard);

declare global {
  interface HTMLElementTagNameMap {
    "ui-preview-card": UIPreviewCard;
  }
}

export { UIPreviewCard };

export * from "./preview-card.js";
