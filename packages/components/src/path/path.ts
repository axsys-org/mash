import { LitElement, css, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The physical context where a path preview appears. */
export type PathSize = "small" | "medium";

/**
 * Render a Shrine path or its human-readable title.
 *
 * A medium path is a locator-style control that can fill its row. A small path
 * is an inline link or tree-item label. Use `title` when the path has a pretty
 * name; the raw path remains available as the accessible label and is used
 * automatically when no title is supplied.
 *
 * @tag ui-path
 * @summary Shows a Shrine path with title, state, and overflow handling.
 *
 * @slot icon - Optional leading icon or glyph.
 * @csspart root - The outermost element.
 * @csspart icon - The optional icon wrapper.
 * @csspart title - The pretty title, when supplied.
 * @csspart segments - The raw path segment group.
 * @csspart separator - A slash between raw path segments.
 * @csspart segment - An individual raw path segment.
 *
 * @example Default
 * <ui-path path="/foo/bar/baz"></ui-path>
 *
 * @example Path states
 * <div class="demo path-showcase">
 *   <ui-path path="/shrine/axiomatic/foundry" size="medium"></ui-path>
 *   <ui-path path="/shrine/axiomatic/foundry" size="small" current></ui-path>
 *   <ui-path title="Foundry" path="/shrine/axiomatic/foundry" size="small">
 *     <span slot="icon" aria-hidden="true">◆</span>
 *   </ui-path>
 * </div>
 */
export class UIPath extends LitElement {
  // Reactive properties go here, as a plain object — this system uses no
  // decorators. Declare the matching fields with `declare` and assign their
  // defaults in a constructor. Every attribute needs a JSDoc description, or
  // the manifest build fails.
  //
  static override properties = {
    path: { type: String },
    title: { type: String, reflect: true },
    lede: { type: String, reflect: true },
    size: { type: String, reflect: true },
    current: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
  };
  //
  /** Path to namespace */
  declare path: string;

  /** Pretty textual title. When omitted, the raw `path` is shown. */
  declare title: string;

  /** Legacy alias for the pretty textual label; use `title` for new code. */
  declare lede: string;

  /** Physical scale: medium for locators, small for inline links and trees. */
  declare size: PathSize;

  /** Marks the path as the current location. */
  declare current: boolean;

  /** Marks the path as selected without requiring navigation semantics. */
  declare selected: boolean;

  constructor() {
    super();
    // Reactive fields declared with `declare` are not initialised by the class
    // body, so without this `this.path` is undefined on the first render.
    this.path = "";
    this.title = "";
    this.lede = "";
    this.size = "medium";
    this.current = false;
    this.selected = false;
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline-flex;
        box-sizing: border-box;
        inline-size: 100%;
        max-inline-size: 100%;

        color: var(--color-text);
        font-family: var(--type-label-font-family);
        font-size: var(--type-label-font-size);
        font-weight: var(--type-label-font-weight);
        line-height: var(--type-label-line-height);
      }

      .root {
        display: inline-flex;
        align-items: center;
        inline-size: 100%;
        min-inline-size: 0;
        max-inline-size: 100%;
        gap: var(--space-control-gap);
        padding: var(--space-control-block) var(--space-control-inline);

        background: var(--color-surface);
        border: var(--border-hairline) solid var(--color-border);
        border-radius: var(--radius-control);

        color: inherit;
        transition:
          background-color var(--duration-control) var(--easing-control),
          border-color var(--duration-control) var(--easing-control),
          color var(--duration-control) var(--easing-control);
      }

      :host([size="small"]) .root {
        inline-size: max-content;
        padding: var(--space-control-block-small) var(--space-control-inline-small);
        background: transparent;
        border-color: transparent;

        font-family: var(--type-label-small-font-family);
        font-size: var(--type-label-small-font-size);
        font-weight: var(--type-label-small-font-weight);
        line-height: var(--type-label-small-line-height);
      }

      :host([size="small"]) {
        inline-size: max-content;
      }

      :host(:hover) .root {
        background: color-mix(in oklab, var(--color-action) 8%, var(--color-surface));
        border-color: var(--color-border-strong);
      }

      :host([size="small"]:hover) .root {
        border-color: transparent;
      }

      :host([current]) .root,
      :host([selected]) .root {
        background: color-mix(in oklab, var(--color-action) 12%, var(--color-surface));
        border-color: color-mix(in oklab, var(--color-action) 45%, var(--color-border-strong));
        color: var(--color-text);
      }

      :host([size="small"][current]) .root,
      :host([size="small"][selected]) .root {
        border-color: transparent;
      }

      .icon {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
      }

      .content {
        display: flex;
        min-inline-size: 0;
        flex: 1 1 auto;
        align-items: center;
        overflow: hidden;
      }

      .title {
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .segments {
        display: flex;
        min-inline-size: 0;
        flex: 1 1 auto;
        align-items: center;
        gap: var(--space-control-gap);

        overflow: hidden;
        font-family: var(--type-code-font-family);
        font-size: var(--type-code-font-size);
        font-weight: var(--type-code-font-weight);
        line-height: var(--type-code-line-height);
        white-space: nowrap;
      }

      .separator {
        flex: 0 0 auto;
        color: var(--color-text-muted);
      }

      .segment {
        min-inline-size: 0;
        overflow: hidden;
        flex: 0 1 auto;
        text-overflow: ellipsis;
      }

      @media (forced-colors: active) {
        :host(:hover) .root,
        :host([current]) .root,
        :host([selected]) .root {
          border-color: CanvasText;
        }
      }

      /* Style from semantic tokens only; private layout stays local to this
         component so consumers theme the system instead of this primitive. */
    `,
  ];

  private get displayTitle(): string {
    return this.title.trim() || this.lede.trim();
  }

  private get accessibleLabel(): string {
    return this.displayTitle || this.path;
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part="root"
        class="root"
        aria-current=${this.current ? "page" : nothing}
        aria-selected=${this.selected ? "true" : nothing}
      >
        <span part="icon" class="icon"><slot name="icon"></slot></span>
        <span class="content" aria-label=${this.accessibleLabel}>
          ${this.displayTitle ? this.renderTitle() : this.renderRaw()}
        </span>
      </div>
    `;
  }

  private renderTitle(): TemplateResult {
    return html`<span part="title" class="title">${this.displayTitle}</span>`;
  }

  private renderRaw(): TemplateResult {
    const segments = this.path.split("/").filter(Boolean);

    return html`
      <span part="segments" class="segments">
        ${segments.map(
          (segment) => html`
            <span part="separator" class="separator" aria-hidden="true">/</span>
            <span part="segment" class="segment"> ${segment} </span>
          `,
        )}
      </span>
    `;
  }
}
