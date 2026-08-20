import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The semantic meaning of a progress operation. */
export type ProgressTone = "accent" | "positive" | "warning" | "critical";
/** Physical progress realization selected by the active catalogue. */
export type ProgressShape = "linear" | "circular";

/**
 * Shows bounded progress for a task.
 *
 * `value` and `max` stay as numbers instead of a pre-computed percentage so a
 * consuming workflow can retain its own domain units while the primitive owns
 * the accessible progressbar calculation.
 *
 * @tag ui-progress
 * @summary Shows progress toward a bounded task.
 *
 * @example Progress meanings
 * <div class="demo button-showcase-heading">
 *   <ui-progress value="64" label="Uploading 64 percent"></ui-progress>
 *   <ui-progress value="100" tone="positive" label="Upload complete"></ui-progress>
 *   <ui-progress shape="circular" value="72" label="Analysis 72 percent"></ui-progress>
 * </div>
 *
 * @csspart root - The accessible progressbar element.
 * @csspart track - The recessed track.
 * @csspart indicator - The filled value indicator.
 * @cssstate indeterminate - Matches `:state(indeterminate)` when no numeric completion is known.
 *
 * @mashnode root progress
 * @mashnode track track root
 * @mashnode indicator indicator track
 * @mashnode value value root
 * @mashnode max max root
 * @mashnode tone tone root
 * @mashnode shape shape root
 * @mashnode label label root
 * @mashnode indeterminate indeterminate root
 * @mashrole part root progress root
 */
export class UIProgress extends LitElement {
  static override properties = {
    value: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    tone: { type: String, reflect: true },
    shape: { type: String, reflect: true },
    label: { type: String, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
  };

  /** Current amount completed. */
  declare value: number;
  /** Maximum amount representing completion. */
  declare max: number;
  /** Semantic meaning. */
  declare tone: ProgressTone;
  /** Linear bar or circular ring realization. */
  declare shape: ProgressShape;
  /** Accessible description of the progress operation. */
  declare label: string;
  /** Omits the numeric value while work has an unknown completion amount. */
  declare indeterminate: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = 0;
    this.max = 100;
    this.tone = "accent";
    this.shape = "linear";
    this.label = "Progress";
    this.indeterminate = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  #normalizedValue(): number {
    const maximum = Number.isFinite(this.max) && this.max > 0 ? this.max : 1;
    const value = Number.isFinite(this.value) ? this.value : 0;
    return Math.min(Math.max(value / maximum, 0), 1);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("indeterminate")) return;
    if (this.indeterminate) this.#internals.states.add("indeterminate");
    else this.#internals.states.delete("indeterminate");
  }

  protected override render(): TemplateResult {
    const maximum = Number.isFinite(this.max) && this.max > 0 ? this.max : 1;
    const value = Math.min(Math.max(Number.isFinite(this.value) ? this.value : 0, 0), maximum);
    const normalized = this.#normalizedValue() * 100;
    const percent = `${normalized}%`;
    const valueNow = this.indeterminate ? nothing : String(value);

    if (this.shape === "circular") {
      return html`
        <svg
          part="root"
          role="progressbar"
          viewBox="0 0 32 32"
          aria-label=${this.label}
          aria-valuemin="0"
          aria-valuemax=${maximum}
          aria-valuenow=${valueNow}
        >
          <circle part="track" cx="16" cy="16" r="14" pathLength="100"></circle>
          <circle
            part="indicator"
            cx="16"
            cy="16"
            r="14"
            pathLength="100"
            style=${`stroke-dasharray:${this.indeterminate ? 28 : normalized} 100`}
          ></circle>
        </svg>
      `;
    }

    return html`
      <div
        part="root"
        role="progressbar"
        aria-label=${this.label}
        aria-valuemin="0"
        aria-valuemax=${maximum}
        aria-valuenow=${valueNow}
      >
        <span part="track" class="track"
          ><span
            part="indicator"
            class="indicator"
            style=${`inline-size:${this.indeterminate ? "40%" : percent}`}
          ></span
        ></span>
      </div>
    `;
  }
}
