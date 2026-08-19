import { LitElement, css, html, type TemplateResult } from "lit";

/**
 * The value held by a Shrine limb.
 *
 * @tag sh-pail
 * @summary Renders a readable Shrine field value.
 *
 * @example Text value
 * <sh-pail text="active"></sh-pail>
 *
 * @slot - Optional rich value content. Overrides the `text` fallback.
 *
 * @csspart root - The visible field value.
 */
export class ShrinePail extends LitElement {
  static override properties = {
    text: { type: String, reflect: true },
  };

  /** The textual value used when no default-slot content is supplied. */
  declare text: string;

  constructor() {
    super();
    this.text = "";
  }

  static override styles = css`
    :host {
      display: block;
      min-inline-size: 0;
      color: var(--color-text);
      font-family: var(--type-body-font-family);
      font-size: var(--type-body-font-size);
      font-weight: var(--type-body-font-weight);
      line-height: var(--type-body-line-height);
      overflow-wrap: anywhere;
    }

    :host([hidden]) {
      display: none !important;
    }
  `;

  protected override render(): TemplateResult {
    return html`<span part="root"><slot>${this.text}</slot></span>`;
  }
}
