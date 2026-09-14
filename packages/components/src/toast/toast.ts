import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import {
  PresenceLifecycleController,
  type PresenceLifecycleContext,
  type PresenceLifecycleEventDetail,
  type PresenceState,
} from "../internal/presence-lifecycle.js";

/** Semantic meaning carried by a toast announcement. */
export type ToastTone = "neutral" | "positive" | "warning" | "critical";

function hasAssignedSlotContent(slot: HTMLSlotElement): boolean {
  return slot
    .assignedNodes({ flatten: true })
    .some((node) => node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").trim().length > 0);
}

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
 * @slot title - Optional notification title.
 * @slot icon - Optional symbolic status content before the message.
 * @slot actions - Optional semantic action controls owned by the application.
 * @slot close - Optional authored dismiss action; the native button is the fallback.
 *
 * @csspart root - The semantic live-region toast surface.
 * @csspart icon - The optional symbolic status content.
 * @csspart body - The title, message, and action stack.
 * @csspart title - The optional notification title.
 * @csspart message - The authored notification message.
 * @csspart actions - The optional action-control region.
 * @csspart close - The optional native dismiss button.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate present - Matches while the toast is rendered, including exit motion.
 * @cssstate entering - Matches while the toast is entering.
 * @cssstate active - Matches after enter motion settles.
 * @cssstate exiting - Matches while the toast is exiting.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 * @cssstate paused - Matches `:state(paused)` while automatic dismissal is suspended.
 *
 * @fires {CustomEvent<{ open: boolean, reason: string }>} ui-toast-open-change - Emitted after timeout or user dismissal requests a new open state.
 * @fires {CustomEvent<PresenceLifecycleEventDetail>} mash-presence-start - Announces toast enter or exit presence.
 * @fires {CustomEvent<PresenceLifecycleEventDetail>} mash-presence-end - Announces completion or interruption of toast presence.
 *
 * @mashnode root root
 * @mashnode icon icon root
 * @mashnode body body root
 * @mashnode title title body
 * @mashnode message message body
 * @mashnode actions actions body
 * @mashnode close close root
 * @mashnode open open root
 * @mashnode present present root
 * @mashnode entering entering root
 * @mashnode active active root
 * @mashnode exiting exiting root
 * @mashnode reduced-motion reduced-motion root
 * @mashnode paused paused root
 * @mashnode duration duration root
 * @mashrole slot icon icon icon
 * @mashrole slot title title title
 * @mashrole event ui-toast-open-change open open
 * @mashrole slot default message message
 * @mashrole slot actions actions actions
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
    toastPresent: { state: true },
    _interactionPaused: { type: Boolean, state: true },
    _hasIcon: { type: Boolean, state: true },
    _hasTitle: { type: Boolean, state: true },
    _hasActions: { type: Boolean, state: true },
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
  /** Internal render-presence; public state remains the `open` contract. */
  declare protected toastPresent: boolean;
  declare _interactionPaused: boolean;
  declare private _hasIcon: boolean;
  declare private _hasTitle: boolean;
  declare private _hasActions: boolean;

  readonly #internals: ElementInternals;
  readonly #presence: PresenceLifecycleController<"entering" | "exiting">;
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
    this.toastPresent = false;
    this._interactionPaused = false;
    this._hasIcon = false;
    this._hasTitle = false;
    this._hasActions = false;
    this.#internals = this.attachInternals();
    this.#presence = new PresenceLifecycleController(this, {
      target: () => this.renderRoot.querySelector<HTMLElement>("[part='root']"),
      present: () => this.toastPresent,
      setPresent: (present) => {
        this.toastPresent = present;
      },
      setState: (state, present) => this.#setPresenceState(state, present),
      onStart: (context) => this.#emitPresenceEvent("mash-presence-start", context),
      onFinish: (context) => this.#emitPresenceEvent("mash-presence-end", context),
    });
  }

  static override styles = baseStyles;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#presence.destroy();
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

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("open") && this.open) this.toastPresent = true;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("open")) {
      if (this.open) this.#presence.enter("entering");
      else this.#presence.exit("exiting", changed.get("open") === true);
    }
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

  #setPresenceState(state: PresenceState, present: boolean): void {
    if (present) this.#internals.states.add(state);
    else this.#internals.states.delete(state);
  }

  #emitPresenceEvent(
    type: "mash-presence-start" | "mash-presence-end",
    context: PresenceLifecycleContext<"entering" | "exiting">,
  ): void {
    const eventInit: CustomEventInit<PresenceLifecycleEventDetail> = {
      bubbles: true,
      composed: true,
      detail: {
        open: context.open,
        phase: context.phase,
        reducedMotion: context.reducedMotion,
        interrupted: context.interrupted,
      },
    };
    if (type === "mash-presence-start") {
      this.dispatchEvent(
        new CustomEvent<PresenceLifecycleEventDetail>("mash-presence-start", eventInit),
      );
      return;
    }
    this.dispatchEvent(
      new CustomEvent<PresenceLifecycleEventDetail>("mash-presence-end", eventInit),
    );
  }

  #setInteractionPaused(paused: boolean): void {
    this._interactionPaused = this.pauseOnHover && paused;
  }

  #onFocusOut = (event: FocusEvent): void => {
    const root = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    this.#setInteractionPaused(false);
  };

  #onSlotChange = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const hasContent = hasAssignedSlotContent(slot);
    if (slot.name === "icon") this._hasIcon = hasContent;
    else if (slot.name === "title") this._hasTitle = hasContent;
    else if (slot.name === "actions") this._hasActions = hasContent;
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
      ?hidden=${!this.toastPresent}
      .inert=${!this.open}
      @pointerenter=${() => this.#setInteractionPaused(true)}
      @pointerleave=${() => this.#setInteractionPaused(false)}
      @focusin=${() => this.#setInteractionPaused(true)}
      @focusout=${this.#onFocusOut}
    >
      <span part="icon" ?hidden=${!this._hasIcon}
        ><slot name="icon" @slotchange=${this.#onSlotChange}></slot
      ></span>
      <span part="body">
        <span part="title" ?hidden=${!this._hasTitle}
          ><slot name="title" @slotchange=${this.#onSlotChange}></slot
        ></span>
        <span part="message"><slot></slot></span>
        <span part="actions" ?hidden=${!this._hasActions}
          ><slot name="actions" @slotchange=${this.#onSlotChange}></slot
        ></span>
      </span>
      ${
        this.dismissible
          ? html`<button
              part="close"
              type="button"
              aria-label="Dismiss notification"
              @click=${() => this.requestClose("dismiss")}
            >
              <slot name="close">×</slot>
            </button>`
          : null
      }
    </div>`;
  }
}
