import "@mash/ui/button/register";
import "@mash/ui/icon/register";
import { ShrinePathRow } from "./path-row.js";

if (!customElements.get("sh-path-row")) customElements.define("sh-path-row", ShrinePathRow);

declare global {
  interface HTMLElementTagNameMap {
    "sh-path-row": ShrinePathRow;
  }
}

export * from "./path-row.js";
