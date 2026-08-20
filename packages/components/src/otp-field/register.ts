import { UIOtpField } from "./otp-field.js";

if (!customElements.get("ui-otp-field")) {
  customElements.define("ui-otp-field", UIOtpField);
}

declare global {
  interface HTMLElementTagNameMap {
    "ui-otp-field": UIOtpField;
  }
}

export { UIOtpField };
