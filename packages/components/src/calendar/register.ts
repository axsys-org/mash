import { UICalendar } from "./calendar.js";

/** Registers `<ui-calendar>` without registering unrelated components. */
if (!customElements.get("ui-calendar")) customElements.define("ui-calendar", UICalendar);

declare global {
  interface HTMLElementTagNameMap {
    "ui-calendar": UICalendar;
  }
}

export { UICalendar };

export * from "./calendar.js";
