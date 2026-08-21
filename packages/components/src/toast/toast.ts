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
 * @slot icon - Optional symbolic status content before the message.
 * @slot close - Optional authored dismiss action; the native button is the fallback.
 *
 * @csspart root - The semantic live-region toast surface.
 * @csspart icon - The optional symbolic status content.
 * @csspart message - The authored notification message.
 * @csspart close - The optional native dismiss button.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate paused - Matches `:state(paused)` while automatic dismissal is suspended.
 *
 * @fires {CustomEvent<{ open: boolean, reason: string }>} ui-toast-open-change - Emitted after timeout or user dismissal requests a new open state.
 *
 * @mashnode root root
 * @mashnode message message root
 * @mashnode close close root
 * @mashnode open open root
 * @mashnode paused paused root
 * @mashnode duration duration root
 * @mashrole event ui-toast-open-change open open
 * @mashrole slot default message message
 * @mashrole slot close close close
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
    paused: { type: Boolean, reflect: true },
    pauseOnHover: { type: Boolean, attribute: "pause-on-hover", reflect: true },
    _interactionPaused: { type: Boolean, state: true },
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
  /** Suspends the remaining automatic-dismiss duration. */
  declare paused: boolean;
  /** Suspends automatic dismissal while pointer or keyboard focus is within the toast. */
  declare pauseOnHover: boolean;
  declare _interactionPaused: boolean;

  readonly #internals: ElementInternals;
  #timeout: ReturnType<typeof setTimeout> | undefined;
  #remaining = 0;
  #startedAt = 0;

  constructor() {
    super();
    this.open = false;
    this.tone = "neutral";
    this.duration = 5000;
    this.label = "Notification";
    this.dismissible = true;
    this.paused = false;
    this.pauseOnHover = true;
    this._interactionPaused = false;
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
    this.#startedAt = 0;
  }

  get #isPaused(): boolean {
    return this.paused || this._interactionPaused;
  }

  #pauseTimeout(): void {
    if (!this.#timeout) return;
    this.#remaining = Math.max(0, this.#remaining - (Date.now() - this.#startedAt));
    this.#clearTimeout();
  }

  #scheduleTimeout(): void {
    if (!this.open || this.#isPaused || this.duration <= 0 || this.#remaining <= 0) return;
    this.#startedAt = Date.now();
    this.#timeout = setTimeout(() => this.requestClose("timeout"), this.#remaining);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (this.open) {
      this.#internals.states.add("open");
    } else this.#internals.states.delete("open");
    if (this.#isPaused) this.#internals.states.add("paused");
    else this.#internals.states.delete("paused");

    if (changed.has("open") || changed.has("duration")) {
      this.#clearTimeout();
      this.#remaining = this.open ? Math.max(0, this.duration) : 0;
      this.#scheduleTimeout();
    } else if (
      changed.has("paused") ||
      changed.has("_interactionPaused") ||
      changed.has("pauseOnHover")
    ) {
      if (this.#isPaused) this.#pauseTimeout();
      else this.#scheduleTimeout();
    }
  }

  #setInteractionPaused(paused: boolean): void {
    this._interactionPaused = this.pauseOnHover && paused;
  }

  #onFocusOut = (event: FocusEvent): void => {
    const root = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    this.#setInteractionPaused(false);
  };

  /** Requests dismissal with a renderer-neutral reason. */
  requestClose(reason = "dismiss"): void {
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
      @pointerenter=${() => this.#setInteractionPaused(true)}
      @pointerleave=${() => this.#setInteractionPaused(false)}
      @focusin=${() => this.#setInteractionPaused(true)}
      @focusout=${this.#onFocusOut}
    >
      <span part="icon"><slot name="icon"></slot></span
      ><slot part="message"></slot
      >${this.dismissible ? html`<button part="close" type="button" aria-label="Dismiss notification" @click=${() => this.requestClose("dismiss")}><slot name="close">×</slot></button>` : null}
    </div>`;
  }
}
