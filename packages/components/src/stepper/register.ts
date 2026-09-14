import { UIStepper, UIStep } from "./stepper.js";
if (!customElements.get("ui-stepper")) customElements.define("ui-stepper", UIStepper);
export * from "./stepper.js";
declare global {
  interface HTMLElementTagNameMap {
    "ui-stepper": UIStepper;
  }
}

if (!customElements.get("ui-step")) customElements.define("ui-step", UIStep);
declare global {
  interface HTMLElementTagNameMap {
    "ui-step": UIStep;
  }
}
