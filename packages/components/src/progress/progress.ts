import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The semantic meaning of a progress operation. */
export type ProgressTone = "accent" | "positive" | "warning" | "critical";

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
 * </div>
 *
 * @csspart root - The accessible progressbar element.
 * @csspart track - The recessed track.
 * @csspart indicator - The filled value indicator.
 */
export class UIProgress extends LitElement {
  static override properties = {
    value: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    tone: { type: String, reflect: true },
    label: { type: String, reflect: true },
  };

  /** Current amount completed. */
  declare value: number;
  /** Maximum amount representing completion. */
  declare max: number;
  /** Semantic meaning. */
  declare tone: ProgressTone;
  /** Accessible description of the progress operation. */
  declare label: string;

  constructor() {
    super();
    this.value = 0;
    this.max = 100;
    this.tone = "accent";
    this.label = "Progress";
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;

        --_fill: var(--color-action);
      }

      :host([tone="positive"]) {
        --_fill: var(--color-positive);
      }

      :host([tone="warning"]) {
        --_fill: var(--color-warning);
      }

      :host([tone="critical"]) {
        --_fill: var(--color-critical);
      }

      .track {
        display: block;
        overflow: hidden;
        block-size: var(--border-strong);
        border-radius: var(--radius-pill);
        background: var(--color-surface-sunken);
      }

      .indicator {
        display: block;
        block-size: 100%;
        border-radius: inherit;
        background: var(--_fill);
        transition: inline-size var(--duration-control) var(--easing-control);
      }

      @media (prefers-reduced-motion: reduce) {
        .indicator {
          transition: none;
        }
      }
    `,
  ];

  #normalizedValue(): number {
    const maximum = Number.isFinite(this.max) && this.max > 0 ? this.max : 1;
    const value = Number.isFinite(this.value) ? this.value : 0;
    return Math.min(Math.max(value / maximum, 0), 1);
  }

  protected override render(): TemplateResult {
    const maximum = Number.isFinite(this.max) && this.max > 0 ? this.max : 1;
    const value = Math.min(Math.max(Number.isFinite(this.value) ? this.value : 0, 0), maximum);
    const percent = `${this.#normalizedValue() * 100}%`;

    return html`
      <div
        part="root"
        role="progressbar"
        aria-label=${this.label}
        aria-valuemin="0"
        aria-valuemax=${maximum}
        aria-valuenow=${value}
      >
        <span part="track" class="track"
          ><span part="indicator" class="indicator" style=${`inline-size:${percent}`}></span
        ></span>
      </div>
    `;
  }
}
