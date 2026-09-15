import { LitElement, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The visual pronunciation of a Shrine record. */
export type ShrineMythVariant = "record" | "embedded" | "preview";

/**
 * A record header with composable Shrine limbs.
 *
 * `sh-myth` establishes the identity of one Shrine record. Each `sh-limb`
 * projected into its default slot provides one labelled value; the Myth never
 * needs to know a limb's domain-specific meaning or value representation.
 *
 * @tag sh-myth
 * @summary Presents a Shrine record's identity and its composed limbs.
 *
 * @example Project record
 * <sh-myth kind="Project" title="Billing Migration" path="/rec/project/billing-migration">
 *   <sh-limb>
 *     <sh-slot slot="slot" title="status"></sh-slot>
 *     <sh-pail slot="value" text="active"></sh-pail>
 *   </sh-limb>
 *   <sh-limb>
 *     <sh-slot slot="slot" title="goal"></sh-slot>
 *     <sh-pail slot="value" text="replace legacy invoicer"></sh-pail>
 *   </sh-limb>
 * </sh-myth>
 *
 * @example Embedded fields
 * <sh-myth variant="embedded" data-mash-size="compact" title="Fields" description="Authored record values.">
 *   <span slot="meta">2 fields</span>
 *   <sh-limb><sh-slot slot="label" title="/title"></sh-slot><sh-pail slot="value" text="Demo card"></sh-pail></sh-limb>
 *   <sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb>
 * </sh-myth>
 *
 * @example Inline record preview
 * <sh-myth variant="preview" data-mash-size="compact" title="Demo card" description="Practice card in this collection.">
 *   <sh-limb><sh-slot slot="label" title="/state"></sh-slot><sh-pail slot="value" text="ready"></sh-pail></sh-limb>
 *   <span slot="meta">2 fields · 1 child</span>
 *   <a slot="actions" href="#demo">Open record</a>
 * </sh-myth>
 *
 * @slot - Compatibility fallback for the `limbs` slot.
 * @slot limbs - `sh-limb` elements describing the record's fields.
 * @slot title - Rich record title content. Overrides the `title` attribute.
 * @slot path - Rich canonical path content. Overrides the `path` attribute.
 * @slot description - Authored supporting description. Overrides the `description` attribute.
 * @slot kind - Rich record-kind content. Overrides the `kind` attribute.
 * @slot meta - Secondary metadata; in the header for records and the footer for previews.
 * @slot annotation - Static supporting context above the fields, outside record identity and live value status.
 * @slot actions - Actions associated with the record.
 *
 * @attr variant - `record` is framed; `embedded` is an unframed full record; `preview` is a compact inline excerpt. All preserve authored content.
 *
 * @csspart root - The card surface containing the record.
 * @csspart card-header - The card header containing record identity.
 * @csspart identity - The region containing title, path, and description.
 * @csspart card-title - The card's title wrapper.
 * @csspart title - The record title.
 * @csspart card-description - The card's supporting identity wrapper.
 * @csspart summary - The path and description group.
 * @csspart path - The canonical Shrine path.
 * @csspart description - The authored supporting description.
 * @csspart card-value - The card's kind wrapper.
 * @csspart kind - The UI badge that carries the record kind.
 * @csspart kind-content - The badge content realization.
 * @csspart card-meta - The card's metadata wrapper.
 * @csspart meta - Secondary record metadata.
 * @csspart card-actions - The card action wrapper.
 * @csspart card-footer - The preview footer wrapper used by compact actions.
 * @csspart actions - The record action region.
 * @csspart card-content - The card's primary content region.
 * @csspart annotation - Optional static supporting context immediately before the limbs.
 * @csspart limbs - The composed limb region.
 * @mashnode root record
 * @mashnode identity identity root
 * @mashnode title title identity
 * @mashnode path path identity
 * @mashnode description description identity
 * @mashnode kind kind identity
 * @mashnode meta meta root
 * @mashnode actions actions root
 * @mashnode content content root
 * @mashnode annotation meta content
 * @mashnode limbs fields content
 * @mashnode variant variant root
 * @mashrole slot default fields limbs
 * @mashrole slot limbs fields limbs
 * @mashrole slot title title title
 * @mashrole slot path path path
 * @mashrole slot description description description
 * @mashrole slot kind kind kind
 * @mashrole slot meta meta meta
 * @mashrole slot annotation meta annotation
 * @mashrole slot actions actions actions
 * @mashrole part root record root
 * @mashrole part identity identity identity
 * @mashrole part title title title
 * @mashrole part path path path
 * @mashrole part description description description
 * @mashrole part kind kind kind
 * @mashrole part meta meta meta
 * @mashrole part annotation meta annotation
 * @mashrole part actions actions actions
 * @mashrole part limbs fields limbs
 * @mashrole attribute variant variant variant
 */
export class ShrineMyth extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    kind: { type: String, reflect: true },
    title: { type: String, reflect: true },
    path: { type: String, reflect: true },
    description: { type: String, reflect: true },
    _filledSlots: { state: true },
  };

  /** Visual pronunciation; record identity and limb semantics do not change. */
  declare variant: ShrineMythVariant;

  /** The record's stable kind, rendered with the shared UI badge. */
  declare kind: string;
  /** The human-readable record title. */
  declare title: string;
  /** The record's canonical Shrine path. */
  declare path: string;
  /** Authored supporting prose; never inferred, shortened, or parsed. */
  declare description: string;
  declare private _filledSlots: ReadonlySet<string>;

  constructor() {
    super();
    this.variant = "record";
    this.kind = "";
    this.title = "";
    this.path = "";
    this.description = "";
    this._filledSlots = new Set();
  }

  static override styles = baseStyles;

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const filled = slot
      .assignedNodes()
      .some((node) => node.nodeType === Node.ELEMENT_NODE || Boolean(node.textContent?.trim()));
    if (filled === this._filledSlots.has(slot.name)) return;
    const next = new Set(this._filledSlots);
    if (filled) next.add(slot.name);
    else next.delete(slot.name);
    this._filledSlots = next;
  };

  protected override render(): TemplateResult {
    const title = Boolean(this.title) || this._filledSlots.has("title");
    const path = Boolean(this.path) || this._filledSlots.has("path");
    const description = Boolean(this.description) || this._filledSlots.has("description");
    const kind = Boolean(this.kind) || this._filledSlots.has("kind");
    const meta = this._filledSlots.has("meta");
    const annotation = this._filledSlots.has("annotation");
    const actions = this._filledSlots.has("actions");
    return html`
      <ui-card
        part="root"
        elevation="flat"
        exportparts="header:card-header,identity:identity,title:card-title,description:card-description,value:card-value,meta:card-meta,actions:card-actions,content:card-content,footer:card-footer"
      >
        <h2 slot=${title ? "title" : nothing} part="title" class="title" ?hidden=${!title}>
          <slot name="title" @slotchange=${this.#onSlotChange}>${this.title}</slot>
        </h2>
        <div
          slot=${path || description ? "description" : nothing}
          part="summary"
          ?hidden=${!path && !description}
        >
          <p part="path" class="path" ?hidden=${!path}>
            <slot name="path" @slotchange=${this.#onSlotChange}>${this.path}</slot>
          </p>
          <div part="description" ?hidden=${!description}>
            <slot name="description" @slotchange=${this.#onSlotChange}>${this.description}</slot>
          </div>
        </div>
        <ui-badge
          slot=${kind ? "value" : nothing}
          part="kind"
          class="kind"
          exportparts="root:kind-content"
          ?hidden=${!kind}
        >
          <slot name="kind" @slotchange=${this.#onSlotChange}>${this.kind}</slot>
        </ui-badge>
        <div
          slot=${meta ? (this.variant === "preview" ? "footer" : "meta") : nothing}
          part="meta"
          ?hidden=${!meta}
        >
          <slot name="meta" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div
          slot=${actions ? (this.variant === "preview" ? "footer" : "actions") : nothing}
          part="actions"
          ?hidden=${!actions}
        >
          <slot name="actions" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div slot="content" part="annotation" ?hidden=${!annotation}>
          <slot name="annotation" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div slot="content" part="limbs" class="limbs">
          <slot name="limbs"><slot></slot></slot>
        </div>
      </ui-card>
    `;
  }
}
