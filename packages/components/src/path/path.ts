import { LitElement, css, html, type TemplateResult } from "lit";

/**
 * Render a shrine path
 *
 * @tag ui-path
 * @summary TODO: one line describing what it does.
 *
 * @csspart root - The outermost element.
 * @example Default
 * <ui-path path="/foo/bar/baz"></ui-path>
 */
export class UIPath extends LitElement {
  // Reactive properties go here, as a plain object — this system uses no
  // decorators. Declare the matching fields with `declare` and assign their
  // defaults in a constructor. Every attribute needs a JSDoc description, or
  // the manifest build fails.
  //
  static override properties = {
    path: { type: String },
    lede: { type: String }
  };
  //
  /** Path to namespace */
  declare path: string;

  /** optional pretty title */
  declare lede?: string;

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
    }

    :host([hidden]) {
      display: none !important;
    }

    .segments {
      display: flex;
      gap: var(--space-control-gap);
      justify-contents: center;
      font-family: var(--type-code-font-family);
      font-size: var(--type-code-font-size);
      font-weight: var(--type-code-font-weight);
      line-height: var(--type-code-line-height);
    }

    /* Style from the semantic tokens (--color-*, --space-*, --radius-*).
       Never reference --ref-* primitives, and keep anything you compute in a
       private --_* variable rather than exposing it. */
  `;

  private isRaw() {
    return !(this.lede?.length);
  }

  protected override render(): TemplateResult {
    return html`<div part="root">
    ${
      this.isRaw() ? this.renderRaw() : this.renderLede()
    }</div>`;
  }

  private renderLede(): TemplateResult {
    return html`<div class="lede">${this.lede!}</div>`;
  }

  private renderRaw(): TemplateResult {
    const segments = this.path.split('/').filter(Boolean);

    return html`
      <div class="segments">
              ${segments.map(
          (segment, i) => html`
            <span part="separator">/</span>
            <span part="segment">
              ${segment}
            </span>
          `,
        )}
      </div>

    `
  }
}
