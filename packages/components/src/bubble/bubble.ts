import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type BubbleAlignment = "unset" | "start" | "end";
export type BubbleReactionAlignment = "start" | "end";
export type BubbleReactionSide = "top" | "bottom";
export type BubbleVariant =
  | "filled"
  | "primary"
  | "secondary"
  | "muted"
  | "tinted"
  | "outline"
  | "ghost"
  | "destructive"
  | "critical";

function hasAssignedSlotContent(slot: HTMLSlotElement): boolean {
  return slot
    .assignedNodes({ flatten: true })
    .some((node) => node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").trim().length > 0);
}

/**
 * A presentational conversation bubble.
 *
 * `ui-bubble` owns alignment, maximum content width, visual variant, and the
 * optional reaction region. It does not own message data, collapse state, or
 * action behavior; compose those with existing controls.
 *
 * @tag ui-bubble
 * @summary Aligns and styles a conversation message surface.
 *
 * @example Incoming message
 * <ui-bubble alignment="start" variant="secondary">Can you review this draft?</ui-bubble>
 *
 * @example Reactions
 * <ui-bubble alignment="end">
 *   Approved. I left one note on the invoice sample.
 *   <ui-button slot="reactions" size="xsmall" variant="ghost">Like 2</ui-button>
 * </ui-bubble>
 *
 * @slot - Convenience content rendered inside the bubble surface.
 * @slot content - Replaces the convenience content with authored surface layout.
 * @slot reactions - Optional reaction controls or feedback anchored to the bubble edge.
 *
 * @csspart root - The aligned bubble boundary.
 * @csspart content - The visible message surface.
 * @csspart reactions - The optional reaction region.
 *
 * @mashnode root bubble
 * @mashnode content content root
 * @mashnode reactions reactions root
 * @mashnode alignment alignment root
 * @mashnode variant variant content
 * @mashnode reaction-side reaction-side reactions
 * @mashnode reaction-alignment reaction-alignment reactions
 * @mashrole slot default content content
 * @mashrole slot content content content
 * @mashrole slot reactions reactions reactions
 */
export class UIBubble extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    alignment: { type: String, reflect: true },
    reactionSide: { type: String, attribute: "reaction-side", reflect: true },
    reactionAlignment: { type: String, attribute: "reaction-alignment", reflect: true },
    _hasReactions: { state: true },
  };

  /** Visual treatment for the content surface. */
  declare variant: BubbleVariant;
  /** Edge alignment within a conversation row. */
  declare alignment: BubbleAlignment;
  /** Edge on which the reaction region is anchored. */
  declare reactionSide: BubbleReactionSide;
  /** Inline alignment of the reaction region along the bubble edge. */
  declare reactionAlignment: BubbleReactionAlignment;

  protected _hasReactions = false;

  constructor() {
    super();
    this.variant = "filled";
    this.alignment = "unset";
    this.reactionSide = "bottom";
    this.reactionAlignment = "end";
  }

  static override styles = baseStyles;

  #onReactionsSlotChange = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const next = hasAssignedSlotContent(slot);
    if (next !== this._hasReactions) this._hasReactions = next;
  };

  protected override render(): TemplateResult {
    return html`
      <div part="root">
        <div part="content">
          <slot name="content"><slot></slot></slot>
        </div>
        <div part="reactions" ?hidden=${!this._hasReactions}>
          <slot name="reactions" @slotchange=${this.#onReactionsSlotChange}></slot>
        </div>
      </div>
    `;
  }
}

/**
 * A vertical stack of consecutive bubbles from one speaker or turn.
 *
 * @tag ui-bubble-group
 * @summary Groups consecutive conversation bubbles.
 *
 * @example Grouped turn
 * <ui-bubble-group>
 *   <ui-bubble alignment="start" variant="secondary">First message.</ui-bubble>
 *   <ui-bubble alignment="start" variant="secondary">Follow-up context.</ui-bubble>
 * </ui-bubble-group>
 *
 * @slot - Consecutive `ui-bubble` children.
 *
 * @csspart root - The bubble stack boundary.
 *
 * @mashnode root group
 * @mashrole slot default root root
 */
export class UIBubbleGroup extends LitElement {
  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<div part="root"><slot></slot></div>`;
  }
}
