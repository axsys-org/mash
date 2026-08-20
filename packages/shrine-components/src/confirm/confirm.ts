import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import type { ButtonTone } from "@mash/ui";

import { baseStyles } from "../internal/base-styles.js";

/** How consequential the confirmed action is. Selects the tone of the confirm button. */
export type ConfirmTone = "accent" | "critical";

/** Maps this component's tone onto the button tone it delegates to. */
const BUTTON_TONE: Record<ConfirmTone, ButtonTone> = {
  accent: "accent",
  critical: "critical",
};

/**
 * Asks the user to confirm an action.
 *
 * This component owns no visual language. It composes `<ui-card>` and
 * `<ui-button>` from `@mash/ui` into a recurring pattern and exposes their
 * parts to an opt-in catalogue recipe.
 *
 * Both buttons are `@mash/ui` elements, so everything already true of them
 * stays true here: focus delegation, keyboard activation, `:state(loading)`,
 * theme inheritance and forced-colors handling all come for free.
 *
 * @tag shrine-confirm
 * @summary Asks the user to confirm an action, and reports the answer as an event.
 *
 * @example Delete project
 * <shrine-confirm tone="critical">
 *   <span slot="title">Delete Billing Migration?</span>
 *   <span slot="description">This removes the project and cannot be undone.</span>
 *   <span slot="cancel">Keep project</span>
 *   <span slot="confirm">Delete project</span>
 * </shrine-confirm>
 *
 * @slot - Compatibility fallback for the `description` slot.
 * @slot title - Optional heading. The heading is hidden entirely when empty.
 * @slot description - The explanatory message.
 * @slot confirm - Label for the confirm button. Defaults to "Confirm".
 * @slot cancel - Label for the cancel button. Defaults to "Cancel".
 *
 * @csspart card - The underlying `<ui-card>`.
 * @csspart title - The heading element.
 * @csspart description - The explanatory-message region.
 * @csspart message - Compatibility alias for the `description` part.
 * @csspart actions - The row holding both buttons.
 * @csspart confirm - The confirm `<ui-button>`.
 * @csspart cancel - The cancel `<ui-button>`.
 * @csspart card-header - The underlying card header.
 * @csspart card-content - The underlying card content region.
 * @csspart card-footer - The underlying card footer.
 * @csspart cancel-control - The cancel button's native control.
 * @csspart cancel-prefix - The cancel button's prefix.
 * @csspart cancel-label - The cancel button's label region.
 * @csspart cancel-suffix - The cancel button's suffix.
 * @csspart cancel-spinner - The cancel button's loading indicator.
 * @csspart confirm-control - The confirm button's native control.
 * @csspart confirm-prefix - The confirm button's prefix.
 * @csspart confirm-label - The confirm button's label region.
 * @csspart confirm-suffix - The confirm button's suffix.
 * @csspart confirm-spinner - The confirm button's loading indicator.
 *
 * @cssstate pending - Matches `:state(pending)` while confirmation is awaiting completion.
 *
 * @fires {CustomEvent<void>} shrine-confirm - The user confirmed. Bubbles and composed,
 *   so it can be handled anywhere above the element. Not fired while `pending`.
 * @fires {CustomEvent<void>} shrine-cancel - The user declined. Bubbles and composed.
 *
 * @mashrole slot default description
 * @mashrole slot confirm label confirm-label
 * @mashrole slot cancel label cancel-label
 * @mashrole part card root root
 * @mashrole part message description description
 * @mashrole part card-header header header
 * @mashrole part card-content content content
 * @mashrole part card-footer footer footer
 * @mashrole part cancel-control control cancel-control
 * @mashrole part cancel-prefix prefix cancel-prefix
 * @mashrole part cancel-label label cancel-label
 * @mashrole part cancel-suffix suffix cancel-suffix
 * @mashrole part cancel-spinner spinner cancel-spinner
 * @mashrole part confirm-control control confirm-control
 * @mashrole part confirm-prefix prefix confirm-prefix
 * @mashrole part confirm-label label confirm-label
 * @mashrole part confirm-suffix suffix confirm-suffix
 * @mashrole part confirm-spinner spinner confirm-spinner
 * @mashfallback slot confirm literal "Confirm"
 * @mashfallback slot cancel literal "Cancel"
 * @mashnode root root
 * @mashnode header header root
 * @mashnode title title header
 * @mashnode content content root
 * @mashnode description description content
 * @mashnode footer footer root
 * @mashnode actions actions footer
 * @mashnode cancel cancel actions
 * @mashnode cancel-control control cancel
 * @mashnode cancel-prefix prefix cancel-control
 * @mashnode cancel-label label cancel-control
 * @mashnode cancel-suffix suffix cancel-control
 * @mashnode cancel-spinner spinner cancel-control
 * @mashnode confirm confirm actions
 * @mashnode confirm-control control confirm
 * @mashnode confirm-prefix prefix confirm-control
 * @mashnode confirm-label label confirm-control
 * @mashnode confirm-suffix suffix confirm-control
 * @mashnode confirm-spinner spinner confirm-control
 * @mashnode pending pending root
 * @mashnode tone tone root
 */
export class ShrineConfirm extends LitElement {
  static override properties = {
    tone: { type: String, reflect: true },
    pending: { type: Boolean, reflect: true },
    _hasTitle: { type: Boolean, state: true },
  };

  /** How consequential the confirmed action is. */
  declare tone: ConfirmTone;
  /** Shows the confirm button as loading and blocks both answers while an action is in flight. */
  declare pending: boolean;

  declare private _hasTitle: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.tone = "accent";
    this.pending = false;
    this._hasTitle = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("pending")) return;
    if (this.pending) this.#internals.states.add("pending");
    else this.#internals.states.delete("pending");
  }

  #onTitleSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this._hasTitle = slot.assignedNodes({ flatten: true }).length > 0;
  };

  // The event names are written as literals rather than passed through a
  // shared helper on purpose: the manifest analyzer reads the first argument
  // to `new CustomEvent(...)` to discover events, and a variable there gets
  // recorded under the variable's own name, polluting the published schema.
  #onConfirm = (): void => {
    if (this.pending) return;
    this.dispatchEvent(new CustomEvent("shrine-confirm", { bubbles: true, composed: true }));
  };

  #onCancel = (): void => {
    if (this.pending) return;
    this.dispatchEvent(new CustomEvent("shrine-cancel", { bubbles: true, composed: true }));
  };

  protected override render(): TemplateResult {
    return html`
      <ui-card
        part="card"
        elevation="raised"
        exportparts="header:card-header,content:card-content,footer:card-footer"
      >
        <h2 slot="title" part="title" class="title" ?hidden=${!this._hasTitle}>
          <slot name="title" @slotchange=${this.#onTitleSlotChange}></slot>
        </h2>

        <div slot="content" part="description message" class="message">
          <slot name="description"><slot></slot></slot>
        </div>

        <div slot="footer" part="actions" class="actions">
          <ui-button
            part="cancel"
            variant="quiet"
            tone="neutral"
            exportparts="control:cancel-control,prefix:cancel-prefix,label:cancel-label,suffix:cancel-suffix,spinner:cancel-spinner"
            ?disabled=${this.pending}
            @click=${this.#onCancel}
          >
            <slot name="cancel">Cancel</slot>
          </ui-button>

          <ui-button
            part="confirm"
            variant="primary"
            tone=${BUTTON_TONE[this.tone]}
            exportparts="control:confirm-control,prefix:confirm-prefix,label:confirm-label,suffix:confirm-suffix,spinner:confirm-spinner"
            ?loading=${this.pending}
            @click=${this.#onConfirm}
          >
            <slot name="confirm">Confirm</slot>
          </ui-button>
        </div>
      </ui-card>
    `;
  }
}
