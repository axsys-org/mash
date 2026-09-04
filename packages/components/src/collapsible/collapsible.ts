import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

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
 * @csspart reveal-root - The forwarded reveal render-presence boundary.
 * @csspart reveal-content - The forwarded clipped disclosure region.
 * @csspart reveal-measure - The forwarded natural-size measurement wrapper.
 *
 * @cssstate open - Matches `:state(open)` while the content is visible.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-collapsible-change - Emitted after user activation changes disclosure state.
 *
 * @mashnode root root
 * @mashnode trigger trigger root
 * @mashnode content content root
 * @mashnode reveal-root root content
 * @mashnode reveal-content content reveal-root
 * @mashnode reveal-measure measure reveal-content
 * @mashnode open open root
 * @mashnode disabled disabled root
 * @mashnode change change root
 * @mashrole slot trigger trigger trigger
 * @mashrole slot default content content
 * @mashrole part reveal-content content content
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
      <ui-reveal
        part="content"
        exportparts="root:reveal-root, content:reveal-content, measure:reveal-measure"
        id=${this.#contentId}
        .open=${this.open}
        aria-hidden=${this.open ? nothing : "true"}
      >
        <slot></slot>
      </ui-reveal>
    `;
  }
}
