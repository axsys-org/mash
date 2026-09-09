// A composed component's registration module also registers what it composes.
// Importing this is enough to make <shrine-confirm> render correctly; without
// these, its shadow DOM would contain unupgraded <ui-card> and <ui-button>
// elements. Definition modules stay pure — importing `@mash/shrine/confirm`
// still registers nothing.
import "@mash/ui/card/register";
import "@mash/ui/button/register";

import { ShrineConfirm } from "./confirm.js";

if (!customElements.get("shrine-confirm")) {
  customElements.define("shrine-confirm", ShrineConfirm);
}

declare global {
  interface HTMLElementTagNameMap {
    "shrine-confirm": ShrineConfirm;
  }
}

export { ShrineConfirm };

export * from "./confirm.js";
