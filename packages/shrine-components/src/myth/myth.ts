import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The visual pronunciation of a Shrine record. */
export type ShrineMythVariant = "record" | "preview";

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
 * @slot - Compatibility fallback for the `limbs` slot.
 * @slot limbs - `sh-limb` elements describing the record's fields.
 * @slot title - Rich record title content. Overrides the `title` attribute.
 * @slot path - Rich canonical path content. Overrides the `path` attribute.
 * @slot kind - Rich record-kind content. Overrides the `kind` attribute.
 * @slot actions - Actions associated with the record.
 *
 * @attr variant - `record` is the full record surface; `preview` is a compact leaf for transient overlays and menus.
 *
 * @csspart root - The card surface containing the record.
 * @csspart card-header - The card header containing record identity.
 * @csspart identity - The region containing title and path.
 * @csspart card-title - The card's title wrapper.
 * @csspart title - The record title.
 * @csspart card-description - The card's path wrapper.
 * @csspart path - The canonical Shrine path.
 * @csspart card-value - The card's kind wrapper.
 * @csspart kind - The UI badge that carries the record kind.
 * @csspart kind-content - The badge content realization.
 * @csspart card-actions - The card action wrapper.
 * @csspart card-footer - The preview footer wrapper used by compact actions.
 * @csspart actions - The record action region.
 * @csspart card-content - The card's primary content region.
 * @csspart limbs - The composed limb region.
 * @mashnode root record
 * @mashnode identity identity root
 * @mashnode title title identity
 * @mashnode path path identity
 * @mashnode kind kind identity
 * @mashnode actions actions root
 * @mashnode content content root
 * @mashnode limbs fields content
 * @mashnode variant variant root
 * @mashrole slot default fields limbs
 * @mashrole slot limbs fields limbs
 * @mashrole slot title title title
 * @mashrole slot path path path
 * @mashrole slot kind kind kind
 * @mashrole slot actions actions actions
 * @mashrole part root record root
 * @mashrole part identity identity identity
 * @mashrole part title title title
 * @mashrole part path path path
 * @mashrole part kind kind kind
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
  declare private _filledSlots: ReadonlySet<string>;

  constructor() {
    super();
    this.variant = "record";
    this.kind = "";
    this.title = "";
    this.path = "";
    this._filledSlots = new Set();
  }

  static override styles = baseStyles;

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const next = new Set(this._filledSlots);
    if (slot.assignedNodes({ flatten: true }).length > 0) next.add(slot.name);
    else next.delete(slot.name);
    this._filledSlots = next;
  };

  protected override render(): TemplateResult {
    return html`
      <ui-card
        part="root"
        elevation="flat"
        exportparts="header:card-header,identity:identity,title:card-title,description:card-description,value:card-value,actions:card-actions,content:card-content,footer:card-footer"
      >
        <h2
          slot="title"
          part="title"
          class="title"
          ?hidden=${!this.title && !this._filledSlots.has("title")}
        >
          <slot name="title" @slotchange=${this.#onSlotChange}>${this.title}</slot>
        </h2>
        <p
          slot="description"
          part="path"
          class="path"
          ?hidden=${!this.path && !this._filledSlots.has("path")}
        >
          <slot name="path" @slotchange=${this.#onSlotChange}>${this.path}</slot>
        </p>
        <ui-badge
          slot="value"
          part="kind"
          class="kind"
          exportparts="root:kind-content"
          ?hidden=${!this.kind && !this._filledSlots.has("kind")}
        >
          <slot name="kind" @slotchange=${this.#onSlotChange}>${this.kind}</slot>
        </ui-badge>
        <div
          slot=${this.variant === "preview" ? "footer" : "actions"}
          part="actions"
          ?hidden=${!this._filledSlots.has("actions")}
        >
          <slot name="actions" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div slot="content" part="limbs" class="limbs">
          <slot name="limbs"><slot></slot></slot>
        </div>
      </ui-card>
    `;
  }
}
