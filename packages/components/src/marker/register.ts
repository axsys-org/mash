import { UIMarker } from "./marker.js";
if (!customElements.get("ui-marker")) customElements.define("ui-marker", UIMarker);
export * from "./marker.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-marker": UIMarker;
  }
}
