import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

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
 * @csspart actions - The record action region.
 * @csspart card-content - The card's primary content region.
 * @csspart limbs - The composed limb region.
 *
 * @mashrole slot default limbs limbs
 * @mashrole part card-header header header
 * @mashrole part card-title title title
 * @mashrole part card-description path path
 * @mashrole part card-value kind kind
 * @mashrole part kind-content kind kind
 * @mashrole part card-actions actions actions
 * @mashrole part card-content content content
 * @mashnode root root
 * @mashnode header header root
 * @mashnode identity identity header
 * @mashnode title title identity
 * @mashnode path path identity
 * @mashnode kind kind header
 * @mashnode actions actions header
 * @mashnode content content root
 * @mashnode limbs limbs content
 */
export class ShrineMyth extends LitElement {
  static override properties = {
    kind: { type: String, reflect: true },
    title: { type: String, reflect: true },
    path: { type: String, reflect: true },
    _filledSlots: { state: true },
  };

  /** The record's stable kind, rendered with the shared UI badge. */
  declare kind: string;
  /** The human-readable record title. */
  declare title: string;
  /** The record's canonical Shrine path. */
  declare path: string;
  declare private _filledSlots: ReadonlySet<string>;

  constructor() {
    super();
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
        exportparts="header:card-header,identity:identity,title:card-title,description:card-description,value:card-value,actions:card-actions,content:card-content"
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
        <div slot="actions" part="actions" ?hidden=${!this._filledSlots.has("actions")}>
          <slot name="actions" @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div slot="content" part="limbs" class="limbs">
          <slot name="limbs"><slot></slot></slot>
        </div>
      </ui-card>
    `;
  }
}
