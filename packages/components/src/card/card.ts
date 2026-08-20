import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** How the card separates itself from what is behind it. */
export type CardElevation = "flat" | "raised";

/**
 * A surface that groups related content.
 *
 * `elevation` is the only axis, and it means different things per theme by
 * design: the light theme reads elevation as a shadow, while the dark theme
 * steps the surface lighter, because a soft shadow is invisible on a dark
 * canvas. Both are driven from theme tokens, so the component itself does not
 * know which theme it is in.
 *
 * @tag ui-card
 * @summary Groups related content on a surface.
 *
 * @slot - Compatibility fallback for the `content` slot.
 * @slot content - The card's primary body.
 * @slot header - Compatibility escape hatch replacing the structured header.
 * @slot prefix - Leading identity, avatar, or icon.
 * @slot title - The primary card title.
 * @slot description - Supporting text beneath the title.
 * @slot value - The primary value represented by the card.
 * @slot meta - Secondary metadata.
 * @slot actions - Actions associated with the card identity.
 * @slot footer - Content after the primary body.
 *
 * @csspart header - The semantic header region.
 * @csspart prefix - The leading identity region.
 * @csspart identity - The region holding title and description.
 * @csspart title - The primary title region.
 * @csspart description - The supporting-description region.
 * @csspart value - The primary-value region.
 * @csspart meta - The secondary-metadata region.
 * @csspart actions - The header action region.
 * @csspart content - The primary-body region.
 * @csspart footer - The footer region. Present only when the `footer` slot is filled.
 *
 * @mashnode root root
 * @mashnode header header root
 * @mashnode prefix prefix header
 * @mashnode identity identity header
 * @mashnode title title identity
 * @mashnode description description identity
 * @mashnode value value header
 * @mashnode meta meta header
 * @mashnode actions actions header
 * @mashnode content content root
 * @mashnode footer footer root
 * @mashnode elevation elevation root
 */
export class UICard extends LitElement {
  static override properties = {
    elevation: { type: String, reflect: true },
    _filledSlots: { state: true },
  };

  /** Whether the card sits flat against the canvas or lifts off it. */
  declare elevation: CardElevation;

  declare private _filledSlots: ReadonlySet<string>;

  constructor() {
    super();
    this.elevation = "flat";
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

  #has(...slots: string[]): boolean {
    return slots.some((slot) => this._filledSlots.has(slot));
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part="header"
        class="region header"
        ?hidden=${!this.#has("header", "prefix", "title", "description", "value", "meta", "actions")}
      >
        <slot name="header" @slotchange=${this.#onSlotChange}>
          <span part="prefix" ?hidden=${!this.#has("prefix")}>
            <slot name="prefix" @slotchange=${this.#onSlotChange}></slot>
          </span>
          <span part="identity" ?hidden=${!this.#has("title", "description")}>
            <span part="title" ?hidden=${!this.#has("title")}>
              <slot name="title" @slotchange=${this.#onSlotChange}></slot>
            </span>
            <span part="description" ?hidden=${!this.#has("description")}>
              <slot name="description" @slotchange=${this.#onSlotChange}></slot>
            </span>
          </span>
          <span part="value" ?hidden=${!this.#has("value")}>
            <slot name="value" @slotchange=${this.#onSlotChange}></slot>
          </span>
          <span part="meta" ?hidden=${!this.#has("meta")}>
            <slot name="meta" @slotchange=${this.#onSlotChange}></slot>
          </span>
          <span part="actions" ?hidden=${!this.#has("actions")}>
            <slot name="actions" @slotchange=${this.#onSlotChange}></slot>
          </span>
        </slot>
      </div>

      <div part="content" class="region content">
        <slot name="content"><slot></slot></slot>
      </div>

      <div part="footer" class="region footer" ?hidden=${!this.#has("footer")}>
        <slot name="footer" @slotchange=${this.#onSlotChange}></slot>
      </div>
    `;
  }
}
