import { LitElement, css, html, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";
import { hideEmptySlot } from "../internal/slot-visibility.js";
/**
 * Shows persistent feedback beside the content it concerns.
 * @example Basic
 * <ui-alert tone="positive"><strong slot="title">Saved</strong>Your changes are up to date.</ui-alert>
 * @fires {CustomEvent} ui-alert-dismiss - Cancelable request to hide the alert.
 * @tag ui-alert
 * @summary Shows persistent feedback beside the content it concerns.
 * @slot  - Explanation or recovery instructions.
 * @slot icon - Status icon.
 * @slot title - Short heading.
 * @slot actions - Optional recovery action.
 * @csspart close - Dismiss control.
 * @mashnode close control root
 * @csspart root - The root region.
 * @mashnode root root
 * @csspart icon - The icon region.
 * @mashnode icon icon root
 * @csspart title - The title region.
 * @mashnode title title root
 * @csspart actions - The actions region.
 * @mashnode actions actions root
 */
export class UIAlert extends LitElement {
  static override properties = {
    tone: { type: String, reflect: true },
    closable: { type: Boolean, reflect: true },
    banner: { type: Boolean, reflect: true },
  };
  /** Semantic meaning of the feedback. */
  declare tone: "neutral" | "info" | "positive" | "warning" | "critical";
  /** Show a dismiss button. */
  declare closable: boolean;
  /** Use an edge-to-edge banner surface. */
  declare banner: boolean;
  constructor() {
    super();
    this.tone = "info";
    this.closable = false;
    this.banner = false;
  }
  static override styles = [
    baseStyles,
    css`
      .stack {
        min-inline-size: 0;
        flex: 1;
      }
    `,
  ];
  protected emptySlot = hideEmptySlot;
  /** Dismiss the alert, unless a listener cancels ui-alert-dismiss. */
  dismiss = (): void => {
    if (
      this.dispatchEvent(
        new CustomEvent("ui-alert-dismiss", { bubbles: true, composed: true, cancelable: true }),
      )
    )
      this.hidden = true;
  };
  protected override render(): TemplateResult {
    return html`<div part="root" role=${this.tone === "critical" ? "alert" : "status"}>
      <div part="icon"><slot name="icon" @slotchange=${this.emptySlot}></slot></div>
      <div class="stack">
        <div part="title"><slot name="title" @slotchange=${this.emptySlot}></slot></div>
        <slot></slot>
      </div>
      <div part="actions"><slot name="actions" @slotchange=${this.emptySlot}></slot></div>
      ${this.closable ? html`<button part="close" type="button" aria-label="Dismiss alert" @click=${this.dismiss}>×</button>` : ""}
    </div>`;
  }
}
