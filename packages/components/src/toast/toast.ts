import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** Semantic meaning carried by a toast announcement. */
export type ToastTone = "neutral" | "positive" | "warning" | "critical";

/**
 * A transient live-region message with optional timeout dismissal.
 *
 * A product-level queue decides which messages exist and in what order. This
 * primitive owns the individual announcement, tone, lifecycle state, and a
 * cancellation-safe close event—not global notification policy.
 *
 * @tag ui-toast
 * @summary Announces a transient status message with optional auto-dismissal.
 *
 * @example Saved
 * <ui-toast open tone="positive" duration="5000">Project saved</ui-toast>
 *
 * @slot - Toast message and optional passive content.
 *
 * @csspart root - The semantic live-region toast surface.
 * @csspart close - The optional native dismiss button.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 *
 * @fires {CustomEvent<{ open: boolean, reason: string }>} ui-toast-open-change - Emitted after timeout or user dismissal requests a new open state.
 */
export class UIToast extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static override properties = {
    open: { type: Boolean, reflect: true },
    tone: { type: String, reflect: true },
    duration: { type: Number, reflect: true },
    label: { type: String, reflect: true },
    dismissible: { type: Boolean, reflect: true },
  };

  /** Whether the toast is visible. */
  declare open: boolean;
  /** Semantic meaning of the status message. */
  declare tone: ToastTone;
  /** Auto-dismiss delay in milliseconds. Set zero to keep it open. */
  declare duration: number;
  /** Accessible name for the toast status region. */
  declare label: string;
  /** Whether a visible close button is rendered. */
  declare dismissible: boolean;

  readonly #internals: ElementInternals;
  #timeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.open = false;
    this.tone = "neutral";
    this.duration = 5000;
    this.label = "Notification";
    this.dismissible = true;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#clearTimeout();
  }

  #clearTimeout(): void {
    if (this.#timeout) {
      clearTimeout(this.#timeout);
      this.#timeout = undefined;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("open") && !changed.has("duration")) return;
    this.#clearTimeout();
    if (this.open) {
      this.#internals.states.add("open");
      if (this.duration > 0)
        this.#timeout = setTimeout(() => this.#requestClose("timeout"), this.duration);
    } else this.#internals.states.delete("open");
  }

  #requestClose(reason: string): void {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(
      new CustomEvent<{ open: boolean; reason: string }>("ui-toast-open-change", {
        bubbles: true,
        composed: true,
        detail: { open: false, reason },
      }),
    );
  }

  protected override render(): TemplateResult {
    return html`<div
      part="root"
      role=${this.tone === "critical" ? "alert" : "status"}
      aria-label=${this.label}
      ?hidden=${!this.open}
    >
      <slot></slot
      >${this.dismissible ? html`<button part="close" type="button" aria-label="Dismiss notification" @click=${() => this.#requestClose("dismiss")}>×</button>` : null}
    </div>`;
  }
}
