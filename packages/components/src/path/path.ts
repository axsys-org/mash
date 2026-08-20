import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

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
 * @slot title - Authored pretty title; the `title` and legacy `lede` attributes are fallbacks.
 * @slot icon - Optional leading icon or glyph.
 * @csspart root - The outermost element.
 * @csspart icon - The optional icon wrapper.
 * @csspart content - The title or raw-path content region.
 * @csspart title - The pretty title, when supplied.
 * @csspart segments - The raw path segment group.
 * @csspart separator - A slash between raw path segments.
 * @csspart segment - An individual raw path segment.
 *
 * @cssstate current - Matches `:state(current)` when this is the current location.
 * @cssstate selected - Matches `:state(selected)` when this path is selected.
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
 *
 * @mashrole attribute lede title title
 * @mashnode root root
 * @mashnode icon icon root
 * @mashnode content content root
 * @mashnode title title content
 * @mashnode path path content
 * @mashnode segments segments path
 * @mashnode segment segment segments
 * @mashnode separator separator segments
 * @mashnode size size root
 * @mashnode current current root
 * @mashnode selected selected root
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
    _authoredTitle: { type: String, state: true },
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

  declare private _authoredTitle: string;

  readonly #internals: ElementInternals;

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
    this._authoredTitle = "";
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  private get displayTitle(): string {
    return this.title.trim() || this.lede.trim();
  }

  private get effectiveTitle(): string {
    return this._authoredTitle || this.displayTitle;
  }

  private get accessibleLabel(): string {
    return this.effectiveTitle || this.path;
  }

  private onTitleChange = (event: Event): void => {
    this._authoredTitle = (event.target as HTMLSlotElement)
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("current")) {
      if (this.current) this.#internals.states.add("current");
      else this.#internals.states.delete("current");
    }
    if (changed.has("selected")) {
      if (this.selected) this.#internals.states.add("selected");
      else this.#internals.states.delete("selected");
    }
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
        <span part="content" class="content" aria-label=${this.accessibleLabel}>
          ${this.renderTitle()} ${this.effectiveTitle ? nothing : this.renderRaw()}
        </span>
      </div>
    `;
  }

  private renderTitle(): TemplateResult {
    return html`<span part="title" class="title" ?hidden=${!this.effectiveTitle}
      ><slot name="title" @slotchange=${this.onTitleChange}>${this.displayTitle}</slot></span
    >`;
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
