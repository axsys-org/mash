import { html, type TemplateResult } from "lit";

import type { CalendarChangeDetail } from "../calendar/calendar.js";
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
 * propagates the selected ISO value, and leaves the trigger, calendar recipe,
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

  /** Selected ISO date or slash-delimited ISO date range. */
  declare value: string;

  protected readonly overlayRole = "dialog" as const;
  protected override readonly rendersClose = true;

  constructor() {
    super();
    this.value = "";
    this.addEventListener("ui-calendar-change", this.#onCalendarChange as EventListener);
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
    this.value = event.detail.value;
    this.dispatchEvent(
      new CustomEvent<CalendarChangeDetail>("ui-date-picker-change", {
        detail: event.detail,
        bubbles: true,
        composed: true,
      }),
    );
    this.requestOpenChange(false, "select");
  };

  protected override render(): TemplateResult {
    return html`<div part="root">${this.renderOverlay()}</div>`;
  }
}
