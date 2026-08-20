import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

let collapsibleId = 0;

/**
 * A labelled disclosure region with a native button trigger.
 *
 * Use the `trigger` slot for wording or an icon and the default slot for the
 * disclosure body. `open` is reflected so application state can own it; user
 * activation emits a request-style, bubbling change event rather than hiding
 * state inside a visual recipe.
 *
 * @tag ui-collapsible
 * @summary Shows or hides a labelled content region.
 *
 * @example Advanced options
 * <ui-collapsible>
 *   <span slot="trigger">Advanced options</span>
 *   <p>Content that can be disclosed when needed.</p>
 * </ui-collapsible>
 *
 * @slot trigger - Trigger label or icon content.
 * @slot - Content that becomes visible when open.
 *
 * @csspart trigger - The native disclosure button.
 * @csspart content - The labelled disclosure region.
 *
 * @cssstate open - Matches `:state(open)` while the content is visible.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-collapsible-change - Emitted after user activation changes disclosure state.
 *
 * @mashfallback slot trigger literal "Details"
 */
export class UICollapsible extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Whether the content region is visible. */
  declare open: boolean;
  /** Prevents disclosure changes. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;
  readonly #contentId = `ui-collapsible-content-${++collapsibleId}`;

  constructor() {
    super();
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
      new CustomEvent<{ open: boolean }>("ui-collapsible-change", {
        bubbles: true,
        composed: true,
        detail: { open: this.open },
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
        <slot name="trigger">Details</slot>
      </button>
      <div part="content" id=${this.#contentId} ?hidden=${!this.open}><slot></slot></div>
    `;
  }
}
