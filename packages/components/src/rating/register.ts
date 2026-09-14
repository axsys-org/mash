import { UIRating } from "./rating.js";
if (!customElements.get("ui-rating")) customElements.define("ui-rating", UIRating);
export * from "./rating.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-rating": UIRating;
  }
}
