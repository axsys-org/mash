import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { hideEmptySlot } from "../internal/slot-visibility.js";

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
 * @slot prefix - Optional content before the item title.
 * @slot title - Authored item title; the `title` attribute is the compatibility fallback.
 * @slot suffix - Optional content after the item title.
 * @slot disclosure - Optional disclosure glyph; the recipe may orient it from open state.
 * @slot - Disclosure body.
 *
 * @csspart header - The semantic heading around the trigger.
 * @csspart trigger - The native item button.
 * @csspart prefix - The wrapper around the leading content.
 * @csspart title - The item title inside the trigger.
 * @csspart suffix - The wrapper around the trailing content.
 * @csspart disclosure - The disclosure glyph.
 * @csspart content - The labelled disclosure region.
 * @csspart reveal-root - The forwarded reveal render-presence boundary.
 * @csspart reveal-content - The forwarded clipped disclosure region.
 * @csspart reveal-measure - The forwarded natural-size measurement wrapper.
 *
 * @cssstate open - Matches `:state(open)` while the item is expanded.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ open: boolean, value: string }>} ui-accordion-item-change - Emitted after user activation changes item state.
 *
 * @mashnode root root
 * @mashnode header header root
 * @mashnode trigger trigger header
 * @mashnode prefix prefix trigger
 * @mashnode title title trigger
 * @mashnode suffix suffix trigger
 * @mashnode disclosure disclosure trigger
 * @mashnode content content root
 * @mashnode reveal-root root content
 * @mashnode reveal-content content reveal-root
 * @mashnode reveal-measure measure reveal-content
 * @mashnode level level header
 * @mashnode value value root
 * @mashnode open open root
 * @mashnode disabled disabled root
 * @mashnode change change root
 * @mashrole attribute heading-level level level
 * @mashrole slot default content content
 * @mashrole part reveal-content content content
 * @mashfallback slot disclosure literal "▸"
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
    headingLevel: { type: Number, attribute: "heading-level", reflect: true },
  };

  /** Text rendered in the item's native trigger. */
  declare title: string;
  /** Stable identifier used by the containing accordion. */
  declare value: string;
  /** Whether the body is visible. */
  declare open: boolean;
  /** Prevents disclosure changes. */
  declare disabled: boolean;
  /** Accessible heading level for this disclosure's header. */
  declare headingLevel: number;

  readonly #internals: ElementInternals;
  readonly #itemId = ++accordionItemId;
  readonly #triggerId = `ui-accordion-item-trigger-${this.#itemId}`;
  readonly #contentId = `ui-accordion-item-content-${this.#itemId}`;

  constructor() {
    super();
    this.title = "Section";
    this.value = "";
    this.open = false;
    this.disabled = false;
    this.headingLevel = 3;
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
      <div part="header" role="heading" aria-level=${Math.max(1, Math.round(this.headingLevel))}>
        <button
          part="trigger"
          id=${this.#triggerId}
          type="button"
          aria-expanded=${this.open ? "true" : "false"}
          aria-controls=${this.#contentId}
          ?disabled=${this.disabled}
          @click=${this.#onClick}
        >
          <span part="prefix" hidden><slot name="prefix" @slotchange=${hideEmptySlot}></slot></span>
          <span part="title"><slot name="title">${this.title}</slot></span>
          <span part="suffix" hidden><slot name="suffix" @slotchange=${hideEmptySlot}></slot></span>
          <span part="disclosure" aria-hidden="true"><slot name="disclosure">▸</slot></span>
        </button>
      </div>
      <ui-reveal
        part="content"
        exportparts="root:reveal-root, content:reveal-content, measure:reveal-measure"
        id=${this.#contentId}
        role="region"
        aria-labelledby=${this.#triggerId}
        aria-hidden=${this.open ? nothing : "true"}
        .open=${this.open}
      >
        <slot></slot>
      </ui-reveal>
    `;
  }
}
