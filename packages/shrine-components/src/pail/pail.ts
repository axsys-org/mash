import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * The value held by a Shrine limb.
 *
 * The Mash recipe preserves whitespace in authored `pre` values, wraps long
 * runs, and never truncates content. A consumer can compose `ui-scroll-area`
 * for a bounded viewport without changing the value or hiding its scrollbar.
 *
 * @tag sh-pail
 * @summary Renders a readable Shrine field value.
 *
 * @example Text value
 * <sh-pail text="active"></sh-pail>
 *
 * @example Authored value annotation
 * <sh-pail text="First lines of the value…">
 *   <span slot="status">Excerpt shown</span>
 *   <ui-button slot="actions" variant="ghost" size="small">Show full value</ui-button>
 * </sh-pail>
 *
 * @slot - Compatibility fallback for the `value` slot.
 * @slot value - Optional rich value content. Overrides the `text` fallback.
 * @slot status - Authored supporting status, announced politely when it changes.
 * @slot actions - Authored controls associated with the value; outside the live status region.
 * @csspart root - The visible field value.
 * @csspart value - The authored rich value slot.
 * @csspart annotation - The optional wrapping status and actions row below the value.
 * @csspart status - The polite, atomic live status region.
 * @csspart actions - The authored value actions region.
 * @mashnode root value
 * @mashnode content content root
 * @mashnode annotation meta root
 * @mashnode status status annotation
 * @mashnode actions actions annotation
 * @mashrole slot default content content
 * @mashrole slot value content content
 * @mashrole slot status status status
 * @mashrole slot actions actions actions
 * @mashrole part root value root
 * @mashrole part value content content
 * @mashrole part annotation meta annotation
 * @mashrole part status status status
 * @mashrole part actions actions actions
 */
export class ShrinePail extends LitElement {
  static override properties = {
    text: { type: String, reflect: true },
    _hasValue: { state: true },
    _filledAnnotations: { state: true },
  };

  /** The textual value used when no default-slot content is supplied. */
  declare text: string;
  declare private _hasValue: boolean;
  declare private _filledAnnotations: ReadonlySet<string>;

  constructor() {
    super();
    this.text = "";
    this._hasValue = false;
    this._filledAnnotations = new Set();
  }

  static override styles = baseStyles;

  #onValueSlotChange = (event: Event): void => {
    this._hasValue = (event.target as HTMLSlotElement).assignedNodes().length > 0;
  };

  #onAnnotationSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const filled = slot
      .assignedNodes()
      .some((node) => node.nodeType === Node.ELEMENT_NODE || Boolean(node.textContent?.trim()));
    if (filled === this._filledAnnotations.has(slot.name)) return;
    const next = new Set(this._filledAnnotations);
    if (filled) next.add(slot.name);
    else next.delete(slot.name);
    this._filledAnnotations = next;
  };

  protected override render(): TemplateResult {
    const status = this._filledAnnotations.has("status");
    const actions = this._filledAnnotations.has("actions");
    // Keep the compatibility slot adjacent rather than inside native fallback
    // content. Nested fallback slots can retain a zero-size layout for a
    // dynamically inserted custom element after focus changes in Chromium.
    return html`<span part="root"
      ><slot
        name="value"
        part="value"
        @slotchange=${this.#onValueSlotChange}
        ?hidden=${!this._hasValue}
      ></slot
      ><slot part="value" ?hidden=${this._hasValue}>${this.text}</slot
      ><span part="annotation" ?hidden=${!status && !actions}
        ><span part="status" role="status" aria-atomic="true" ?hidden=${!status}
          ><slot name="status" @slotchange=${this.#onAnnotationSlotChange}></slot></span
        ><span part="actions" ?hidden=${!actions}
          ><slot name="actions" @slotchange=${this.#onAnnotationSlotChange}></slot></span></span
    ></span>`;
  }
}
