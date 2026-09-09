import { UIIntlFormatter } from "./intl-formatter.js";

/** Registers `<ui-intl-formatter>` without registering any unrelated component. */
if (!customElements.get("ui-intl-formatter")) {
  customElements.define("ui-intl-formatter", UIIntlFormatter);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-intl-formatter": UIIntlFormatter;
  }
}

export { UIIntlFormatter };

export * from "./intl-formatter.js";
