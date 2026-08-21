import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type IntlFormatterKind = "currency" | "date" | "datetime" | "number" | "percent" | "time";
export type IntlFormatterStyle = "full" | "long" | "medium" | "short";
export type IntlCurrencyDisplay = "code" | "name" | "narrowSymbol" | "symbol";

export interface IntlFormatterErrorDetail {
  kind: IntlFormatterKind;
  message: string;
  value: string;
}

interface FormatResult {
  error: string;
  formatted: string;
}

/**
 * A declarative headless adapter for the browser's native `Intl` formatters.
 *
 * The primitive owns locale-sensitive value transformation only. Typography,
 * alignment, tabular numerals, and surrounding dashboard layout remain
 * catalogue concerns.
 *
 * @tag ui-intl-formatter
 * @summary Formats dates, times, numbers, currencies, and percentages with native Intl.
 *
 * @example Localized values
 * <p>
 *   <ui-intl-formatter kind="currency" value="12840.5" currency="USD" locale="en-US"></ui-intl-formatter>
 *   <ui-intl-formatter kind="date" value="2026-08-20" locale="fr-FR"></ui-intl-formatter>
 * </p>
 *
 * @slot prefix - Authored content before the formatted output.
 * @slot suffix - Authored content after the formatted output.
 * @slot fallback - Content exposed when the value or formatter options are invalid; falls back to `value`.
 *
 * @csspart root - The complete formatted value.
 * @csspart prefix - Authored leading content.
 * @csspart output - The successfully formatted value.
 * @csspart suffix - Authored trailing content.
 * @csspart fallback - The invalid-value fallback.
 *
 * @cssstate invalid - Matches `:state(invalid)` when formatting fails.
 *
 * @fires {CustomEvent<IntlFormatterErrorDetail>} ui-intl-formatter-error - Reports an invalid value or formatter option.
 *
 */
export class UIIntlFormatter extends LitElement {
  static override properties = {
    kind: { type: String, reflect: true },
    value: { type: String, reflect: true },
    locale: { type: String, reflect: true },
    currency: { type: String, reflect: true },
    currencyDisplay: { type: String, attribute: "currency-display", reflect: true },
    dateStyle: { type: String, attribute: "date-style", reflect: true },
    timeStyle: { type: String, attribute: "time-style", reflect: true },
    timeZone: { type: String, attribute: "time-zone", reflect: true },
    minimumFractionDigits: {
      type: Number,
      attribute: "minimum-fraction-digits",
      reflect: true,
    },
    maximumFractionDigits: {
      type: Number,
      attribute: "maximum-fraction-digits",
      reflect: true,
    },
    noGrouping: { type: Boolean, attribute: "no-grouping", reflect: true },
  };

  /** The native formatter family used for the value. */
  declare kind: IntlFormatterKind;
  /** Date-like or numeric source value to format. */
  declare value: string;
  /** Optional BCP 47 locale; the browser locale is used when omitted. */
  declare locale: string;
  /** ISO 4217 currency code used by the currency formatter. */
  declare currency: string;
  /** How the currency name or symbol is presented. */
  declare currencyDisplay: IntlCurrencyDisplay;
  /** Native date presentation preset. */
  declare dateStyle: IntlFormatterStyle | "";
  /** Native time presentation preset. */
  declare timeStyle: IntlFormatterStyle | "";
  /** Optional IANA time-zone name used for date and time output. */
  declare timeZone: string;
  /** Optional minimum number of fractional digits. */
  declare minimumFractionDigits: number | undefined;
  /** Optional maximum number of fractional digits. */
  declare maximumFractionDigits: number | undefined;
  /** Disables locale-aware digit grouping. */
  declare noGrouping: boolean;

  readonly #internals: ElementInternals;
  #lastError = "";

  constructor() {
    super();
    this.kind = "number";
    this.value = "";
    this.locale = "";
    this.currency = "USD";
    this.currencyDisplay = "symbol";
    this.dateStyle = "";
    this.timeStyle = "";
    this.timeZone = "";
    this.minimumFractionDigits = undefined;
    this.maximumFractionDigits = undefined;
    this.noGrouping = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #format(): FormatResult {
    try {
      if (!this.value.trim()) throw new RangeError("A value is required.");
      const locale = this.locale || undefined;
      if (this.kind === "date" || this.kind === "time" || this.kind === "datetime") {
        const date = new Date(this.value);
        if (Number.isNaN(date.getTime())) throw new RangeError("The date value is invalid.");
        const options: Intl.DateTimeFormatOptions = {};
        if (this.timeZone) options.timeZone = this.timeZone;
        if (this.kind === "date") options.dateStyle = this.dateStyle || "medium";
        else if (this.kind === "time") options.timeStyle = this.timeStyle || "short";
        else {
          options.dateStyle = this.dateStyle || "medium";
          options.timeStyle = this.timeStyle || "short";
        }
        return { formatted: new Intl.DateTimeFormat(locale, options).format(date), error: "" };
      }

      const numeric = Number(this.value);
      if (!Number.isFinite(numeric)) throw new RangeError("The numeric value is invalid.");
      const options: Intl.NumberFormatOptions = {
        useGrouping: !this.noGrouping,
      };
      if (this.kind === "currency") {
        options.style = "currency";
        options.currency = this.currency;
        options.currencyDisplay = this.currencyDisplay;
      } else if (this.kind === "percent") options.style = "percent";
      else options.style = "decimal";
      if (this.minimumFractionDigits !== undefined)
        options.minimumFractionDigits = this.minimumFractionDigits;
      if (this.maximumFractionDigits !== undefined)
        options.maximumFractionDigits = this.maximumFractionDigits;
      return { formatted: new Intl.NumberFormat(locale, options).format(numeric), error: "" };
    } catch (error) {
      return {
        formatted: "",
        error: error instanceof Error ? error.message : "The value could not be formatted.",
      };
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.size === 0) return;
    const result = this.#format();
    if (!result.error) {
      this.#internals.states.delete("invalid");
      this.#lastError = "";
      return;
    }
    this.#internals.states.add("invalid");
    const signature = `${this.kind}\u0000${this.value}\u0000${result.error}`;
    if (signature === this.#lastError) return;
    this.#lastError = signature;
    this.dispatchEvent(
      new CustomEvent<IntlFormatterErrorDetail>("ui-intl-formatter-error", {
        bubbles: true,
        composed: true,
        detail: { kind: this.kind, value: this.value, message: result.error },
      }),
    );
  }

  protected override render(): TemplateResult {
    const result = this.#format();
    const dateLike = this.kind === "date" || this.kind === "time" || this.kind === "datetime";
    return html`
      <span part="root">
        <span part="prefix"><slot name="prefix"></slot></span>
        ${
          result.error
            ? html`<span part="fallback"><slot name="fallback">${this.value}</slot></span>`
            : dateLike
              ? html`<time part="output" datetime=${this.value}>${result.formatted}</time>`
              : html`<span part="output">${result.formatted}</span>`
        }
        <span part="suffix"><slot name="suffix"></slot></span>
      </span>
    `;
  }
}
