import { UIBubble, UIBubbleGroup } from "./bubble.js";

/**
 * Registers `<ui-bubble>` and `<ui-bubble-group>`.
 *
 * Importing `@mash/ui/bubble` defines nothing; this module owns the
 * side-effectful custom element registration.
 */
if (!customElements.get("ui-bubble")) {
  customElements.define("ui-bubble", UIBubble);
}

if (!customElements.get("ui-bubble-group")) {
  customElements.define("ui-bubble-group", UIBubbleGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-bubble": UIBubble;
    "ui-bubble-group": UIBubbleGroup;
  }
}

export { UIBubble, UIBubbleGroup };
