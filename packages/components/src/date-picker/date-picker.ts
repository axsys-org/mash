import { html, type PropertyValues, type TemplateResult } from "lit";

import type { CalendarChangeDetail, UICalendar } from "../calendar/calendar.js";
import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";

/**
 * An unstyled, controlled date-picker overlay.
 *
 * The picker reuses Mash's shared overlay behavior and composes an authored
 * calendar through its default semantic slot. It owns open/dismiss behavior,
 * projects its ISO value into owned calendars, keeps partial ranges open, and leaves the trigger, calendar recipe,
 * placement, and application formatting entirely replaceable.
 *
 * @tag ui-date-picker
 * @summary Coordinates a trigger, calendar popup, and selected date value.
 *
 * @example Due date
 * <ui-date-picker label="Due date">
 *   <ui-button slot="trigger">Choose due date</ui-button>
 *   <ui-calendar month="2026-08"></ui-calendar>
 * </ui-date-picker>
 *
 * @slot trigger - The control that opens or closes the calendar.
 * @slot - The calendar or date-selection composition.
 * @slot close - An optional explicit dismiss action.
 *
 * @csspart root - The date-picker behavior root.
 * @csspart trigger - The trigger binding.
 * @csspart backdrop - The dismissible overlay layer.
 * @csspart positioner - The anchor-relative placement owner.
 * @csspart popup - The calendar popup.
 * @csspart content - The authored calendar binding.
 * @csspart close - The explicit dismiss binding.
 *
 * @cssstate open - Matches `:state(open)` while the calendar popup is visible.
 * @cssstate present - Matches while the popup is rendered, including exit motion.
 * @cssstate entering - Matches while the popup is entering.
 * @cssstate active - Matches after enter motion settles.
 * @cssstate exiting - Matches while the popup is exiting.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-date-picker-open-change - Reports a requested open-state change and why it occurred.
 * @fires {CustomEvent<CalendarChangeDetail>} ui-date-picker-change - Reports a selected date value.
 *
 * @mashnode root control
 * @mashnode trigger trigger root
 * @mashnode backdrop backdrop root
 * @mashnode positioner positioner backdrop
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode calendar grid popup
 * @mashnode close close popup
 * @mashnode value value root
 * @mashnode label label root
 * @mashnode open open root
 * @mashnode present present popup
 * @mashnode entering entering popup
 * @mashnode active active popup
 * @mashnode exiting exiting popup
 * @mashnode reduced-motion reduced-motion popup
 * @mashnode disabled disabled root
 * @mashnode change change root
 * @mashrole part root control root
 * @mashrole slot default grid calendar
 * @mashrole part content grid calendar
 * @mashrole event ui-date-picker-change change change
 */
export class UIDatePicker extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    value: { type: String, reflect: true },
  };

  /** Selected ISO date or slash-delimited ISO range, projected into owned calendars. */
  declare value: string;

  protected readonly overlayRole = "dialog" as const;
  protected override readonly rendersClose = true;
  #calendars = new MutationObserver(() => this.#syncCalendars());

  constructor() {
    super();
    this.value = "";
    this.addEventListener("ui-calendar-change", this.#onCalendarChange as EventListener);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#calendars.observe(this, { childList: true, subtree: true });
    this.#syncCalendars();
    // A parent may upgrade before its already-parsed calendar descendants.
    // Revisit after their definitions and the current upgrade turn complete.
    void customElements.whenDefined("ui-calendar").then(() => {
      if (this.isConnected) this.#syncCalendars();
    });
  }

  override disconnectedCallback(): void {
    this.#calendars.disconnect();
    super.disconnectedCallback();
  }

  #syncCalendars(): void {
    for (const calendar of this.querySelectorAll<UICalendar>("ui-calendar")) {
      if (calendar.closest("ui-date-picker") !== this || !calendar.matches(":defined")) continue;
      calendar.value = this.value;
      const selectedMonth = this.value.slice(0, 7);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) continue;
      const [year, month] = calendar.month.split("-").map(Number);
      const lastMonth =
        year && month
          ? new Date(Date.UTC(year, month - 1 + Math.max(1, calendar.months || 1) - 1, 1))
              .toISOString()
              .slice(0, 7)
          : "";
      if (!calendar.month || selectedMonth < calendar.month || selectedMonth > lastMonth) {
        calendar.month = selectedMonth;
      }
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has("value") || changed.has("open")) this.#syncCalendars();
  }

  protected emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-date-picker-open-change", {
        detail: { open, reason },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #onCalendarChange = (event: CustomEvent<CalendarChangeDetail>): void => {
    const calendar = event
      .composedPath()
      .find(
        (node): node is UICalendar =>
          node instanceof HTMLElement && node.localName === "ui-calendar",
      );
    if (!calendar || calendar.closest("ui-date-picker") !== this || this.disabled) return;
    this.value = event.detail.value;
    this.dispatchEvent(
      new CustomEvent<CalendarChangeDetail>("ui-date-picker-change", {
        detail: event.detail,
        bubbles: true,
        composed: true,
      }),
    );
    // A range start is an intermediate value, not a completed selection.
    if (calendar.mode !== "range" || this.value.split("/")[1])
      this.requestOpenChange(false, "select");
  };

  protected override render(): TemplateResult {
    return html`<div part="root">${this.renderOverlay()}</div>`;
  }
}
