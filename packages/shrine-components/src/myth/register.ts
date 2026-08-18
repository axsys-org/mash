import { ShrineMyth } from "./myth.js";

// The definition stays pure. Registration owns the composed elements so an
// application only needs to import `@mash/shrine/myth/register`.
import "@mash/ui/card/register";
import "@mash/ui/path/register";

if (!customElements.get("sh-myth")) {
  customElements.define("sh-myth", ShrineMyth);
}

declare global {
  interface HTMLElementTagNameMap {
    "sh-myth": ShrineMyth;
  }
}

export { ShrineMyth };
