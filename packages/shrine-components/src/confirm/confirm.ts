import { LitElement, css, html, type TemplateResult } from "lit";

import type { ButtonTone } from "@mash/ui";

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
 * This is the shape a `@mash/shrine` component takes: it owns no colours,
 * spacing or interaction of its own, and instead composes `<ui-card>` and
 * `<ui-button>` from `@mash/ui` into a pattern that recurs across an
 * application. The only styling it adds is the layout *between* those parts.
 *
 * Both buttons are `@mash/ui` elements, so everything already true of them
 * stays true here: focus delegation, keyboard activation, `:state(loading)`,
 * theme inheritance and forced-colors handling all come for free.
 *
 * @tag shrine-confirm
 * @summary Asks the user to confirm an action, and reports the answer as an event.
 *
 * @slot - The explanatory message.
 * @slot title - Optional heading. The heading is hidden entirely when empty.
 * @slot confirm - Label for the confirm button. Defaults to "Confirm".
 * @slot cancel - Label for the cancel button. Defaults to "Cancel".
 *
 * @csspart card - The underlying `<ui-card>`.
 * @csspart title - The heading element.
 * @csspart message - The wrapper around the default slot.
 * @csspart actions - The row holding both buttons.
 * @csspart confirm - The confirm `<ui-button>`.
 * @csspart cancel - The cancel `<ui-button>`.
 *
 * @fires {CustomEvent<void>} shrine-confirm - The user confirmed. Bubbles and composed,
 *   so it can be handled anywhere above the element. Not fired while `pending`.
 * @fires {CustomEvent<void>} shrine-cancel - The user declined. Bubbles and composed.
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

  constructor() {
    super();
    this.tone = "accent";
    this.pending = false;
    this._hasTitle = false;
  }

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
    }

    :host([hidden]) {
      display: none !important;
    }

    /* Everything below is layout between composed parts. Colour, radius,
       elevation and control styling belong to <ui-card> and <ui-button>, and
       are deliberately not restated here. */

    .title {
      margin: 0 0 var(--space-stack);
      font-family: var(--type-heading-font-family);
      font-size: var(--type-heading-font-size);
      font-weight: var(--type-heading-font-weight);
      line-height: var(--type-heading-line-height);
      color: var(--color-text);
    }

    .title[hidden] {
      display: none;
    }

    .message {
      color: var(--color-text-muted);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-inline);
      /* Actions sit at the trailing edge, which flips under RTL. */
      justify-content: flex-end;
    }
  `;

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
      <ui-card part="card" elevation="raised">
        <h2 part="title" class="title" ?hidden=${!this._hasTitle}>
          <slot name="title" @slotchange=${this.#onTitleSlotChange}></slot>
        </h2>

        <div part="message" class="message"><slot></slot></div>

        <div slot="footer" part="actions" class="actions">
          <ui-button
            part="cancel"
            variant="quiet"
            tone="neutral"
            ?disabled=${this.pending}
            @click=${this.#onCancel}
          >
            <slot name="cancel">Cancel</slot>
          </ui-button>

          <ui-button
            part="confirm"
            variant="primary"
            tone=${BUTTON_TONE[this.tone]}
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
