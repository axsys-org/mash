import { LitElement, css, html, nothing, type TemplateResult } from "lit";

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
 * @slot - `sh-limb` elements describing the record's fields.
 *
 * @csspart root - The card surface containing the record.
 * @csspart header - The identity region containing title, path, and kind.
 * @csspart title - The record title.
 * @csspart path - The canonical Shrine path.
 * @csspart kind - The UI badge that carries the record kind.
 * @csspart limbs - The composed limb region.
 */
export class ShrineMyth extends LitElement {
  static override properties = {
    kind: { type: String, reflect: true },
    title: { type: String, reflect: true },
    path: { type: String, reflect: true },
  };

  /** The record's stable kind, rendered with the shared UI badge. */
  declare kind: string;
  /** The human-readable record title. */
  declare title: string;
  /** The record's canonical Shrine path. */
  declare path: string;

  constructor() {
    super();
    this.kind = "";
    this.title = "";
    this.path = "";
  }

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      inline-size: min(100%, 60rem);
    }

    :host([hidden]) {
      display: none !important;
    }

    .header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: var(--space-container-gap);
    }

    .identity {
      display: grid;
      min-inline-size: 0;
      gap: var(--space-control-gap);
    }

    .title,
    .path {
      min-inline-size: 0;
      margin: 0;
    }

    .title {
      color: var(--color-text);
      font-family: var(--type-heading-font-family);
      font-size: var(--type-heading-font-size);
      font-weight: var(--type-heading-font-weight);
      line-height: var(--type-heading-line-height);
      overflow-wrap: anywhere;
    }

    .path {
      overflow-wrap: anywhere;
      color: var(--color-text-muted);
      font-family: var(--type-code-font-family);
      font-size: var(--type-code-font-size);
      font-weight: var(--type-code-font-weight);
      line-height: var(--type-code-line-height);
    }

    .kind {
      flex: 0 0 auto;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .limbs {
      display: grid;
      gap: var(--space-control-gap);
      margin-block-start: var(--space-stack);
    }

    @media (forced-colors: active) {
      .kind {
        border: var(--border-hairline) solid CanvasText;
      }
    }
  `;

  protected override render(): TemplateResult {
    return html`
      <ui-card part="root" elevation="flat">
        <div part="header" class="header">
          <div class="identity">
            ${this.title ? html`<h2 part="title" class="title">${this.title}</h2>` : nothing}
            ${this.path ? html`<p part="path" class="path">${this.path}</p>` : nothing}
          </div>
          ${this.kind ? html`<ui-badge part="kind" class="kind">${this.kind}</ui-badge>` : nothing}
        </div>
        <div part="limbs" class="limbs"><slot></slot></div>
      </ui-card>
    `;
  }
}
