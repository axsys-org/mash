import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

let accordionItemId = 0;

/**
 * One independently labelled disclosure inside `ui-accordion`.
 *
 * This item can operate by itself, but an accordion parent takes ownership of
 * its open policy. Keep its title in the `title` attribute and put arbitrary
 * body composition in the default slot.
 *
 * @tag ui-accordion-item
 * @summary A labelled accordion disclosure item.
 *
 * @example Account section
 * <ui-accordion-item title="Account" value="account">
 *   <p>Account settings are available here.</p>
 * </ui-accordion-item>
 *
 * @slot - Disclosure body.
 *
 * @csspart trigger - The native item button.
 * @csspart content - The labelled disclosure region.
 *
 * @cssstate open - Matches `:state(open)` while the item is expanded.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ open: boolean, value: string }>} ui-accordion-item-change - Emitted after user activation changes item state.
 */
export class UIAccordionItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    title: { type: String, reflect: true },
    value: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Text rendered in the item's native trigger. */
  declare title: string;
  /** Stable identifier used by the containing accordion. */
  declare value: string;
  /** Whether the body is visible. */
  declare open: boolean;
  /** Prevents disclosure changes. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;
  readonly #contentId = `ui-accordion-item-content-${++accordionItemId}`;

  constructor() {
    super();
    this.title = "Section";
    this.value = "";
    this.open = false;
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("open") && !changed.has("disabled")) return;
    if (this.open) this.#internals.states.add("open");
    else this.#internals.states.delete("open");
    if (this.disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  #onClick = (): void => {
    if (this.disabled) return;
    this.open = !this.open;
    this.dispatchEvent(
      new CustomEvent<{ open: boolean; value: string }>("ui-accordion-item-change", {
        bubbles: true,
        composed: true,
        detail: { open: this.open, value: this.value },
      }),
    );
  };

  protected override render(): TemplateResult {
    return html`
      <button
        part="trigger"
        type="button"
        aria-expanded=${this.open ? "true" : "false"}
        aria-controls=${this.#contentId}
        ?disabled=${this.disabled}
        @click=${this.#onClick}
      >
        ${this.title}
      </button>
      <div
        part="content"
        id=${this.#contentId}
        role="region"
        aria-label=${this.title}
        ?hidden=${!this.open}
      >
        <slot></slot>
      </div>
    `;
  }
}
