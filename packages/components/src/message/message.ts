import { LitElement, css, html, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";
import { hideEmptySlot } from "../internal/slot-visibility.js";
/**
 * Aligns sender identity, content, and actions within a conversation.
 * @example Basic
 * <ui-message><span slot="header">Alex · 10:24</span><ui-bubble variant="secondary">Ready to review.</ui-bubble></ui-message>
 * @tag ui-message
 * @summary Aligns sender identity, content, and actions within a conversation.
 * @slot  - Message content, including bubbles and attachments.
 * @slot avatar - Sender avatar.
 * @slot header - Sender name and timestamp.
 * @slot footer - Delivery state, reactions, and actions.
 * @csspart content - Authored message body.
 * @mashnode content content root
 * @csspart root - The root region.
 * @mashnode root root
 * @csspart avatar - The avatar region.
 * @mashnode avatar avatar root
 * @csspart header - The header region.
 * @mashnode header header root
 * @csspart footer - The footer region.
 * @mashnode footer footer root
 */
export class UIMessage extends LitElement {
  static override properties = {
    alignment: { type: String, reflect: true },
    inset: { type: String, reflect: true },
  };
  /** Leading or trailing edge of the conversation. */
  declare alignment: "start" | "end";
  /** Inset metadata to align with a bubble surface. */
  declare inset: "auto" | "none" | "bubble";
  constructor() {
    super();
    this.alignment = "start";
    this.inset = "auto";
  }
  static override styles = [
    baseStyles,
    css`
      .stack {
        min-inline-size: 0;
        display: contents;
      }
    `,
  ];
  protected emptySlot = hideEmptySlot;

  protected override render(): TemplateResult {
    return html`<article part="root">
      <div part="avatar"><slot name="avatar" @slotchange=${this.emptySlot}></slot></div>
      <div class="stack">
        <div part="header"><slot name="header" @slotchange=${this.emptySlot}></slot></div>
        <div part="content"><slot></slot></div>
        <div part="footer"><slot name="footer" @slotchange=${this.emptySlot}></slot></div>
      </div>
    </article>`;
  }
}
