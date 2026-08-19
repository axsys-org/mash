import { LitElement, css, html, type TemplateResult } from "lit";

/**
 * The named label of a Shrine limb.
 *
 * @tag sh-slot
 * @summary Renders a concise, code-style Shrine field label.
 *
 * @example Field label
 * <sh-slot title="status"></sh-slot>
 *
 * @slot - Optional rich label content. Overrides the `title` fallback.
 *
 * @csspart root - The visible field label.
 */
export class ShrineSlot extends LitElement {
  static override properties = {
    title: { type: String, reflect: true },
  };

  /** The concise field name used when no default-slot content is supplied. */
  declare title: string;

  constructor() {
    super();
    this.title = "";
  }

  static override styles = css`
    :host {
      display: block;
      min-inline-size: 0;
      color: var(--color-text-muted);
      font-family: var(--type-code-font-family);
      font-size: var(--type-code-font-size);
      font-weight: var(--type-code-font-weight);
      line-height: var(--type-code-line-height);
      overflow-wrap: anywhere;
    }

    :host([hidden]) {
      display: none !important;
    }
  `;

  protected override render(): TemplateResult {
    return html`<span part="root"><slot>${this.title}</slot></span>`;
  }
}
