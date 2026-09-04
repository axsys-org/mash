import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** Semantic text styles supplied by the active Mash catalogue. */
export type TypesetPreset =
  | "caption2"
  | "caption1"
  | "footnote"
  | "subheadline"
  | "callout"
  | "body"
  | "headline"
  | "title3"
  | "title2"
  | "title1"
  | "large-title"
  | "label"
  | "label-small"
  | "label-large"
  | "heading"
  | "code";

/** Semantic foreground roles supplied by the active Mash catalogue. */
export type TypesetTone = "primary" | "secondary" | "tertiary" | "disabled" | "accent" | "critical";

/** Rendering mode for the authored content boundary. */
export type TypesetFlow = "inline" | "block";

/**
 * Pronounces authored text through a catalogue's semantic type and label tokens.
 *
 * `ui-typeset` does not choose document hierarchy. Authors retain headings,
 * paragraphs, links, and other semantic HTML in the default slot; this element
 * only supplies a portable visual text role that can be restyled through parts.
 *
 * @tag ui-typeset
 * @summary Applies a semantic typography and foreground role to authored text.
 *
 * @example Dynamic headline
 * <ui-typeset preset="headline">Billing migration</ui-typeset>
 *
 * @example Rendered markdown
 * <ui-typeset flow="block" preset="body">
 *   <h2>Release readiness</h2>
 *   <p>Rendered markdown keeps semantic HTML and inherits Mash rhythm.</p>
 *   <pre><code>release.status = "review"</code></pre>
 * </ui-typeset>
 *
 * @slot - Authored text or semantic content.
 *
 * @csspart root - The complete typeset boundary.
 * @csspart content - The authored text realization.
 *
 * @mashnode root typeset
 * @mashnode content content root
 * @mashnode preset preset content
 * @mashnode tone tone content
 * @mashnode flow flow root
 * @mashrole slot default content content
 */
export class UITypeset extends LitElement {
  static override properties = {
    preset: { type: String, reflect: true },
    tone: { type: String, reflect: true },
    flow: { type: String, reflect: true },
  };

  /** Semantic type-token group used to pronounce the content. */
  declare preset: TypesetPreset;
  /** Semantic foreground tier used to pronounce the content. */
  declare tone: TypesetTone;
  /** Whether the boundary is inline text or block rendered prose. */
  declare flow: TypesetFlow;

  constructor() {
    super();
    this.preset = "body";
    this.tone = "primary";
    this.flow = "inline";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    if (this.flow === "block") {
      return html`<div part="root">
        <div part="content"><slot></slot></div>
      </div>`;
    }

    return html`<span part="root"
      ><span part="content"><slot></slot></span
    ></span>`;
  }
}
