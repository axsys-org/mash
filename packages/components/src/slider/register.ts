import { UISlider } from "./slider.js";

if (!customElements.get("ui-slider")) {
  customElements.define("ui-slider", UISlider);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-slider": UISlider;
  }
}

export { UISlider };
