import { ShrineMyth } from "./myth.js";

// Registration owns the composed elements so an application only needs this
// one side-effect import for a complete Myth record.
import "../limb/register.js";
import "@mash/ui/badge/register";
import "@mash/ui/card/register";

if (!customElements.get("sh-myth")) {
  customElements.define("sh-myth", ShrineMyth);
}

declare global {
  interface HTMLElementTagNameMap {
    "sh-myth": ShrineMyth;
  }
}

export { ShrineMyth };
