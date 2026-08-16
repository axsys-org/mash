import { UICard } from "./card.js";

/**
 * Registers `<ui-card>`.
 *
 * See `../button/register.ts` for why registration is a separate module from
 * the definition.
 */
if (!customElements.get("ui-card")) {
  customElements.define("ui-card", UICard);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-card": UICard;
  }
}

export { UICard };
