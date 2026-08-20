import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { stringArrayConverter } from "../internal/string-array.js";

export type CalendarMode = "single" | "range";
export type CalendarView = "day" | "month" | "year";

export interface CalendarChangeDetail {
  value: string;
  start: string | null;
  end: string | null;
}

const DAY = 86_400_000;

function parseDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthValue(date: Date): string {
  return formatDate(date).slice(0, 7);
}

function startOfMonth(value: string): Date {
  const now = new Date();
  const fallback = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (!/^\d{4}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) ? fallback : parsed;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.valueOf() + days * DAY);
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/**
 * A complete unstyled calendar grid and selection state machine.
 *
 * Mash owns month navigation, day-grid construction, disabled bounds,
 * keyboard movement, single/range selection, and emitted values. Header
 * controls remain replaceable slots and every generated day state is exposed
 * as a semantic part for catalogue or native-renderer realization.
 *
 * @tag ui-calendar
 * @summary Selects one date or a date range from an accessible month grid.
 *
 * @example Billing window
 * <ui-calendar month="2026-08" value="2026-08-18" label="Billing date"></ui-calendar>
 *
 * @slot previous - Replaces the previous-month control.
 * @slot title - Replaces the visible month heading.
 * @slot month-title - Replaces the single-calendar month toggle label.
 * @slot year-title - Replaces the single-calendar year toggle label.
 * @slot next - Replaces the next-month control.
 *
 * @csspart root - The calendar root.
 * @csspart header - The month navigation group.
 * @csspart previous - The previous-month realization.
 * @csspart title - The month heading realization.
 * @csspart month-toggle - The control that opens or closes month selection.
 * @csspart month-title - The authored month-toggle label.
 * @csspart year-toggle - The control that opens or closes year selection.
 * @csspart year-title - The authored year-toggle label.
 * @csspart titles - The heading collection for a multi-month calendar.
 * @csspart next - The next-month realization.
 * @csspart month-panels - The visible collection of month grids.
 * @csspart month-panel - One visible month grid and its weekday labels.
 * @csspart weekdays - The weekday-label row.
 * @csspart weekday - One weekday label.
 * @csspart grid - The month day grid.
 * @csspart day - One generated day control.
 * @csspart outside - A day outside the current month.
 * @csspart today - Today's day control.
 * @csspart selected - A selected day control.
 * @csspart range-start - The selected range start.
 * @csspart range-end - The selected range end.
 * @csspart in-range - A day inside the selected range.
 * @csspart disabled - A disabled day control.
 * @csspart picker-grid - The month or year selection grid.
 * @csspart month-option - One month-selection control.
 * @csspart year-option - One year-selection control.
 *
 * @cssstate selected - Matches `:state(selected)` while the calendar has a value.
 *
 * @fires {CustomEvent<CalendarChangeDetail>} ui-calendar-change - Reports the selected date value.
 * @fires {CustomEvent<{month: string}>} ui-calendar-month-change - Reports month navigation.
 * @fires {CustomEvent<{view: CalendarView}>} ui-calendar-view-change - Reports a day, month, or year view change.
 *
 * @mashnode root grid
 * @mashnode header header root
 * @mashnode previous previous header
 * @mashnode title title header
 * @mashnode month-toggle trigger title
 * @mashnode month-title title month-toggle
 * @mashnode year-toggle trigger title
 * @mashnode year-title title year-toggle
 * @mashnode titles group header
 * @mashnode next next header
 * @mashnode month-panels group root
 * @mashnode month-panel grid month-panels
 * @mashnode weekdays header root
 * @mashnode weekday label weekdays
 * @mashnode days list root
 * @mashnode day date days
 * @mashnode outside muted day
 * @mashnode today today day
 * @mashnode selected selected day
 * @mashnode range-start range-start day
 * @mashnode range-end range-end day
 * @mashnode in-range in-range day
 * @mashnode disabled disabled day
 * @mashnode picker-grid grid root
 * @mashnode month-option option picker-grid
 * @mashnode year-option option picker-grid
 * @mashnode value value root
 * @mashnode month month root
 * @mashnode mode mode root
 * @mashnode min min root
 * @mashnode max max root
 * @mashnode disabled-values disabled-values root
 * @mashnode label label root
 * @mashnode first-day first-day root
 * @mashnode view view root
 * @mashnode months months root
 * @mashnode change change root
 * @mashnode month-change change root
 * @mashnode view-change change root
 * @mashrole part root grid root
 * @mashrole slot previous previous previous
 * @mashrole slot title title title
 * @mashrole slot month-title title month-title
 * @mashrole slot year-title title year-title
 * @mashrole slot next next next
 * @mashrole part month-toggle trigger month-toggle
 * @mashrole part month-title title month-title
 * @mashrole part year-toggle trigger year-toggle
 * @mashrole part year-title title year-title
 * @mashrole part titles group titles
 * @mashrole part month-panels group month-panels
 * @mashrole part month-panel grid month-panel
 * @mashrole part weekdays header weekdays
 * @mashrole part weekday label weekday
 * @mashrole part grid list days
 * @mashrole part day date day
 * @mashrole part outside muted outside
 * @mashrole part today today today
 * @mashrole part selected selected selected
 * @mashrole part range-start range-start range-start
 * @mashrole part range-end range-end range-end
 * @mashrole part in-range in-range in-range
 * @mashrole part disabled disabled disabled
 * @mashrole part picker-grid grid picker-grid
 * @mashrole part month-option option month-option
 * @mashrole part year-option option year-option
 * @mashrole event ui-calendar-change change change
 * @mashrole event ui-calendar-month-change change month-change
 * @mashrole event ui-calendar-view-change change view-change
 */
export class UICalendar extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    month: { type: String, reflect: true },
    mode: { type: String, reflect: true },
    min: { type: String, reflect: true },
    max: { type: String, reflect: true },
    label: { type: String, reflect: true },
    firstDay: { type: Number, attribute: "first-day", reflect: true },
    view: { type: String, reflect: true },
    months: { type: Number, reflect: true },
    disabledValues: {
      converter: stringArrayConverter,
      attribute: "disabled-values",
      reflect: true,
    },
  };

  /** Selected ISO date or slash-delimited ISO date range. */
  declare value: string;
  /** Visible month in `YYYY-MM` form. */
  declare month: string;
  /** Single-date or range selection behavior. */
  declare mode: CalendarMode;
  /** Earliest selectable ISO date. */
  declare min: string;
  /** Latest selectable ISO date. */
  declare max: string;
  /** Accessible name for the calendar grid. */
  declare label: string;
  /** First weekday, where zero is Sunday and six is Saturday. */
  declare firstDay: number;
  /** Active day, month, or year selection view. */
  declare view: CalendarView;
  /** Number of consecutive month grids realized in day view. */
  declare months: number;
  /** Explicit ISO dates unavailable for selection in addition to min and max bounds. */
  declare disabledValues: string[];

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.month = "";
    this.mode = "single";
    this.min = "";
    this.max = "";
    this.label = "Calendar";
    this.firstDay = 0;
    this.view = "day";
    this.months = 1;
    this.disabledValues = [];
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get #selection(): { start: Date | null; end: Date | null } {
    const [start, end] = this.value.split("/");
    return { start: parseDate(start), end: parseDate(end) };
  }

  #daysForMonth(month: Date): Date[] {
    const offset = (month.getUTCDay() - Math.max(0, Math.min(6, this.firstDay)) + 7) % 7;
    const first = addDays(month, -offset);
    return Array.from({ length: 42 }, (_, index) => addDays(first, index));
  }

  get #visibleMonths(): Date[] {
    const count = Math.max(1, Math.min(12, Math.trunc(this.months) || 1));
    const first = startOfMonth(this.month);
    return Array.from({ length: count }, (_, index) => addMonths(first, index));
  }

  #isDisabled(date: Date): boolean {
    const min = parseDate(this.min);
    const max = parseDate(this.max);
    return Boolean(
      (min && date < min) || (max && date > max) || this.disabledValues.includes(formatDate(date)),
    );
  }

  #select(date: Date): void {
    if (this.#isDisabled(date)) return;
    const selected = formatDate(date);
    let start: string | null = selected;
    let end: string | null = null;

    if (this.mode === "range") {
      const current = this.#selection;
      if (current.start && !current.end) {
        if (date < current.start) {
          start = selected;
          end = formatDate(current.start);
        } else {
          start = formatDate(current.start);
          end = selected;
        }
      }
      this.value = end ? `${start}/${end}` : (start ?? "");
    } else {
      this.value = selected;
    }

    this.dispatchEvent(
      new CustomEvent<CalendarChangeDetail>("ui-calendar-change", {
        detail: { value: this.value, start, end },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #navigate(months: number): void {
    if (this.view === "month") return;
    const amount = this.view === "year" ? months * 20 * 12 : months;
    this.month = monthValue(addMonths(startOfMonth(this.month), amount));
    this.#announceMonth();
  }

  #announceMonth(): void {
    this.dispatchEvent(
      new CustomEvent<{ month: string }>("ui-calendar-month-change", {
        detail: { month: this.month },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #setView(view: CalendarView): void {
    if (this.view === view) return;
    this.view = view;
    this.dispatchEvent(
      new CustomEvent<{ view: CalendarView }>("ui-calendar-view-change", {
        detail: { view },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #toggleView(view: Exclude<CalendarView, "day">): void {
    this.#setView(this.view === view ? "day" : view);
  }

  #selectMonth(month: number): void {
    const current = startOfMonth(this.month);
    this.month = monthValue(new Date(Date.UTC(current.getUTCFullYear(), month, 1)));
    this.#setView("day");
    this.#announceMonth();
  }

  #selectYear(year: number): void {
    const current = startOfMonth(this.month);
    this.month = monthValue(new Date(Date.UTC(year, current.getUTCMonth(), 1)));
    this.#setView("day");
    this.#announceMonth();
  }

  #onClick = (event: Event): void => {
    const target = (event.target as Element).closest<HTMLButtonElement>("button[data-date]");
    const date = parseDate(target?.dataset.date);
    if (date) this.#select(date);
  };

  #focusDate(date: Date): void {
    const nextMonth = monthValue(date);
    const visible = this.#visibleMonths.map(monthValue);
    if (nextMonth < visible[0]!) this.#navigate(-1);
    else if (nextMonth > visible.at(-1)!) this.#navigate(1);
    void this.updateComplete.then(() =>
      (
        this.renderRoot.querySelector<HTMLElement>(
          `[data-date="${formatDate(date)}"]:not([part~="outside"])`,
        ) ?? this.renderRoot.querySelector<HTMLElement>(`[data-date="${formatDate(date)}"]`)
      )?.focus(),
    );
  }

  #onDayKeydown = (event: KeyboardEvent): void => {
    const target = event.currentTarget as HTMLButtonElement;
    const current = parseDate(target.dataset.date);
    if (!current) return;
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -((current.getUTCDay() - this.firstDay + 7) % 7),
      End: 6 - ((current.getUTCDay() - this.firstDay + 7) % 7),
    };
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const month = addMonths(current, event.key === "PageUp" ? -1 : 1);
      this.#focusDate(
        new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), current.getUTCDate())),
      );
      return;
    }
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    this.#focusDate(addDays(current, offset));
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("value")) return;
    if (this.value) this.#internals.states.add("selected");
    else this.#internals.states.delete("selected");
  }

  #dayParts(date: Date, displayMonth: Date): string {
    const parts = ["day"];
    const currentMonth = displayMonth.getUTCMonth();
    const today = formatDate(new Date());
    const value = formatDate(date);
    const { start, end } = this.#selection;
    if (date.getUTCMonth() !== currentMonth) parts.push("outside");
    if (value === today) parts.push("today");
    if (start && value === formatDate(start)) parts.push("selected", "range-start");
    if (end && value === formatDate(end)) parts.push("selected", "range-end");
    if (start && end && date > start && date < end) parts.push("in-range");
    if (this.#isDisabled(date)) parts.push("disabled");
    return parts.join(" ");
  }

  #renderMonthPanel(month: Date, index: number): TemplateResult {
    const monthLabel = month.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const weekdayOrigin = addDays(new Date(Date.UTC(2026, 7, 16)), this.firstDay);
    const weekdays = Array.from({ length: 7 }, (_, weekday) => addDays(weekdayOrigin, weekday));
    return html`
      <section part="month-panel" aria-label=${monthLabel} data-month=${monthValue(month)}>
        ${this.months > 1 ? html`<div part="title">${monthLabel}</div>` : ""}
        <div part="weekdays" aria-hidden="true">
          ${weekdays.map(
            (date) =>
              html`<span part="weekday"
                >${date.toLocaleDateString(undefined, {
                  weekday: "short",
                  timeZone: "UTC",
                })}</span
              >`,
          )}
        </div>
        <div
          part="grid"
          role="grid"
          aria-label=${`${this.label}: ${monthLabel}`}
          @click=${this.#onClick}
        >
          ${this.#daysForMonth(month).map((date) => {
            const value = formatDate(date);
            const parts = this.#dayParts(date, month);
            const selected = parts.split(" ").includes("selected");
            const focusable = this.#selection.start
              ? value === formatDate(this.#selection.start)
              : index === 0 &&
                date.getUTCDate() === 1 &&
                date.getUTCMonth() === month.getUTCMonth();
            return html`
              <button
                part=${parts}
                type="button"
                role="gridcell"
                data-date=${value}
                aria-label=${date.toLocaleDateString(undefined, { dateStyle: "full", timeZone: "UTC" })}
                aria-selected=${selected ? "true" : "false"}
                ?disabled=${this.#isDisabled(date)}
                tabindex=${focusable ? 0 : -1}
                @keydown=${this.#onDayKeydown}
              >
                ${date.getUTCDate()}
              </button>
            `;
          })}
        </div>
      </section>
    `;
  }

  protected override render(): TemplateResult {
    const month = startOfMonth(this.month);
    const monthLabel = month.toLocaleDateString(undefined, { month: "long", timeZone: "UTC" });
    const year = month.getUTCFullYear();
    const yearPageStart = Math.floor(year / 20) * 20;
    return html`
      <div part="root">
        <div part="header">
          <slot name="previous" part="previous">
            <button
              part="previous"
              type="button"
              aria-label=${this.view === "year" ? "Previous years" : "Previous month"}
              ?disabled=${this.view === "month"}
              @click=${() => this.#navigate(-1)}
            >
              ‹
            </button>
          </slot>
          <div part="title" aria-live="polite">
            <slot name="title">
              ${
                this.months === 1
                  ? html`
                      <button
                        part="month-toggle"
                        type="button"
                        aria-pressed=${this.view === "month" ? "true" : "false"}
                        @click=${() => this.#toggleView("month")}
                      >
                        <slot name="month-title" part="month-title">${monthLabel}</slot>
                      </button>
                      <button
                        part="year-toggle"
                        type="button"
                        aria-pressed=${this.view === "year" ? "true" : "false"}
                        @click=${() => this.#toggleView("year")}
                      >
                        <slot name="year-title" part="year-title">${year}</slot>
                      </button>
                    `
                  : html`<span part="titles"
                      >${this.#visibleMonths.map(
                        (visible) =>
                          html`<span
                            >${visible.toLocaleDateString(undefined, {
                              month: "long",
                              year: "numeric",
                              timeZone: "UTC",
                            })}</span
                          >`,
                      )}</span
                    >`
              }
            </slot>
          </div>
          <slot name="next" part="next">
            <button
              part="next"
              type="button"
              aria-label=${this.view === "year" ? "Next years" : "Next month"}
              ?disabled=${this.view === "month"}
              @click=${() => this.#navigate(1)}
            >
              ›
            </button>
          </slot>
        </div>
        ${
          this.view === "day"
            ? html`<div part="month-panels">
                ${this.#visibleMonths.map((visible, index) =>
                  this.#renderMonthPanel(visible, index),
                )}
              </div>`
            : this.view === "month"
              ? html`<div part="picker-grid month-grid" role="grid" aria-label="Choose month">
                  ${Array.from({ length: 12 }, (_, index) => {
                    const date = new Date(Date.UTC(year, index, 1));
                    return html`<button
                      part=${index === month.getUTCMonth() ? "month-option selected" : "month-option"}
                      type="button"
                      role="gridcell"
                      aria-selected=${index === month.getUTCMonth() ? "true" : "false"}
                      @click=${() => this.#selectMonth(index)}
                    >
                      ${date.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}
                    </button>`;
                  })}
                </div>`
              : html`<div part="picker-grid year-grid" role="grid" aria-label="Choose year">
                  ${Array.from({ length: 20 }, (_, index) => yearPageStart + index).map(
                    (option) =>
                      html`<button
                        part=${option === year ? "year-option selected" : "year-option"}
                        type="button"
                        role="gridcell"
                        aria-selected=${option === year ? "true" : "false"}
                        @click=${() => this.#selectYear(option)}
                      >
                        ${option}
                      </button>`,
                  )}
                </div>`
        }
      </div>
    `;
  }
}
