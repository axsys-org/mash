import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A semantic scalar measurement rendered with the platform's native meter.
 *
 * Use `ui-progress` for task completion; use this component for a value that
 * has known low/high/optimum context, such as capacity or score. Styling lives
 * in a catalogue rather than changing that semantic distinction.
 *
 * @tag ui-meter
 * @summary Shows a bounded measurement with optional optimum thresholds.
 *
 * @example Capacity
 * <ui-meter value="72" min="0" max="100" low="30" high="80" optimum="100" label="Capacity"></ui-meter>
 *
 * @csspart root - The native meter element.
 */
export class UIMeter extends LitElement {
  static override properties = {
    value: { type: Number, reflect: true },
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    low: { type: Number, reflect: true },
    high: { type: Number, reflect: true },
    optimum: { type: Number, reflect: true },
    label: { type: String, reflect: true },
  };

  /** Current measurement. */
  declare value: number;
  /** Inclusive lower bound. */
  declare min: number;
  /** Inclusive upper bound. */
  declare max: number;
  /** Lower threshold for the measurement. */
  declare low: number;
  /** Upper threshold for the measurement. */
  declare high: number;
  /** Preferred measurement. */
  declare optimum: number;
  /** Accessible description of the measurement. */
  declare label: string;

  constructor() {
    super();
    this.value = 0;
    this.min = 0;
    this.max = 100;
    this.low = 0;
    this.high = 100;
    this.optimum = 100;
    this.label = "Meter";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`
      <meter
        part="root"
        value=${this.value}
        min=${this.min}
        max=${this.max}
        low=${this.low}
        high=${this.high}
        optimum=${this.optimum}
        aria-label=${this.label}
      ></meter>
    `;
  }
}
