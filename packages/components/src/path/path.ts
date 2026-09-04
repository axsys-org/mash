import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import { InlineOverflowController } from "../internal/inline-overflow.js";

/** The physical context where a path preview appears. */
export type PathSize = "small" | "medium";
/** Whether the path is a compact preview or navigable breadcrumb trail. */
export type PathVariant = "preview" | "breadcrumb";

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
 * @csspart viewport - The logical inline-overflow viewport.
 * @csspart title - The pretty title, when supplied.
 * @csspart segments - The raw path segment group.
 * @csspart separator - The delimiter between path segments.
 * @csspart segment - An individual raw path segment.
 * @csspart segment-link - A navigable ancestor in the breadcrumb variant.
 * @csspart segment-current - The terminal breadcrumb segment.
 *
 * @cssstate current - Matches `:state(current)` when this is the current location.
 * @cssstate selected - Matches `:state(selected)` when this path is selected.
 * @cssstate overflowing - Matches `:state(overflowing)` when inline content is clipped.
 * @cssstate overflow-start - Matches `:state(overflow-start)` when content continues before the viewport.
 * @cssstate overflow-end - Matches `:state(overflow-end)` when content continues after the viewport.
 *
 * @example Default
 * <ui-path path="/foo/bar/baz"></ui-path>
 *
 * @example Path states
 * <div class="demo path-showcase">
 *   <ui-path path="/shrine/axiomatic/foundry" size="medium"></ui-path>
 *   <ui-path path="/shrine/axiomatic/foundry" size="small" current></ui-path>
 *   <ui-path path="/shrine/axiomatic/foundry" size="small">
 *     <span slot="icon" aria-hidden="true">◆</span>
 *     <span slot="title">Foundry</span>
 *   </ui-path>
 * </div>
 *
 * @example Breadcrumb navigation
 * <ui-path
 *   variant="breadcrumb"
 *   path="/interzone/projects/billing-migration"
 *   aria-label="Project path"
 * >
 *   <span slot="title">Billing migration</span>
 * </ui-path>
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
 * @mashaxis size type-preset
 * @mashnode current current root
 * @mashnode selected selected root
 * @mashnode variant variant root
 * @mashnode viewport viewport content
 * @mashnode overflow overflow content
 * @mashnode overflow-start overflow-start overflow
 * @mashnode overflow-end overflow-end overflow
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
    variant: { type: String, reflect: true },
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

  /** Rendering contract: a passive preview or navigable breadcrumb trail. */
  declare variant: PathVariant;

  /** Marks the path as the current location. */
  declare current: boolean;

  /** Marks the path as selected without requiring navigation semantics. */
  declare selected: boolean;

  declare private _authoredTitle: string;

  readonly #internals: ElementInternals;
  readonly #overflow: InlineOverflowController;

  constructor() {
    super();
    // Reactive fields declared with `declare` are not initialised by the class
    // body, so without this `this.path` is undefined on the first render.
    this.path = "";
    this.title = "";
    this.lede = "";
    this.size = "medium";
    this.variant = "preview";
    this.current = false;
    this.selected = false;
    this._authoredTitle = "";
    this.#internals = this.attachInternals();
    this.#overflow = new InlineOverflowController(this, this.#internals);
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
    this.#overflow.queue(this.variant === "preview" ? "start" : "end");
  };

  protected override firstUpdated(): void {
    this.#connectOverflow();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasUpdated) return;
    void this.updateComplete.then(() => {
      if (this.isConnected) this.#connectOverflow();
    });
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("current")) {
      if (this.current) this.#internals.states.add("current");
      else this.#internals.states.delete("current");
    }
    if (changed.has("selected")) {
      if (this.selected) this.#internals.states.add("selected");
      else this.#internals.states.delete("selected");
    }
    if (
      changed.has("path") ||
      changed.has("title") ||
      changed.has("lede") ||
      changed.has("variant")
    ) {
      this.#overflow.queue(this.effectiveTitle && this.variant === "preview" ? "start" : "end");
    }
  }

  override disconnectedCallback(): void {
    this.#overflow.disconnect();
    super.disconnectedCallback();
  }

  get #viewport(): HTMLElement {
    return this.renderRoot.querySelector<HTMLElement>('[part="viewport"]')!;
  }

  #connectOverflow(): void {
    this.#overflow.connect(this.#viewport);
    this.#overflow.queue(this.effectiveTitle && this.variant === "preview" ? "start" : "end");
  }

  protected override render(): TemplateResult {
    return html`
      <div
        part="root"
        class="root"
        role=${this.variant === "breadcrumb" ? "navigation" : nothing}
        aria-label=${
          this.variant === "breadcrumb"
            ? this.getAttribute("aria-label") || this.path || "Path"
            : nothing
        }
        aria-current=${this.variant === "preview" && this.current ? "page" : nothing}
        aria-selected=${this.selected ? "true" : nothing}
      >
        <span part="icon" class="icon"><slot name="icon"></slot></span>
        <span
          part="content"
          class="content"
          aria-label=${this.variant === "preview" ? this.accessibleLabel : nothing}
        >
          <span part="viewport" class="viewport">
            ${
              this.variant === "breadcrumb"
                ? this.renderBreadcrumb()
                : html`${this.renderTitle()} ${this.effectiveTitle ? nothing : this.renderRaw()}`
            }
          </span>
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
    const segments = this.pathSegments;

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

  private get pathSegments(): string[] {
    return this.path.split("/").filter(Boolean);
  }

  private destinationAt(index: number): string {
    const destination = this.pathSegments.slice(0, index + 1).join("/");
    return this.path.startsWith("/") ? `/${destination}` : destination;
  }

  private renderBreadcrumb(): TemplateResult {
    const segments = this.pathSegments;
    const absolute = this.path.startsWith("/");

    if (segments.length === 0) {
      return html`
        <span part="segments" class="segments">
          <span part="segment segment-current" aria-current="page">
            <slot name="title" @slotchange=${this.onTitleChange}>${this.displayTitle || "/"}</slot>
          </span>
        </span>
      `;
    }

    return html`
      <span part="segments" class="segments">
        ${
          absolute
            ? html`
                <a part="segment segment-link" href="/" aria-label="Root">/</a>
                <span part="separator" class="separator" aria-hidden="true">›</span>
              `
            : nothing
        }
        ${segments.map((segment, index) => {
          const terminal = index === segments.length - 1;
          return html`
            ${
              index > 0
                ? html`<span part="separator" class="separator" aria-hidden="true">›</span>`
                : nothing
            }
            ${
              terminal
                ? html`
                    <span part="segment segment-current" aria-current="page">
                      <slot name="title" @slotchange=${this.onTitleChange}
                        >${this.displayTitle || segment}</slot
                      >
                    </span>
                  `
                : html`<a part="segment segment-link" href=${this.destinationAt(index)}
                    >${segment}</a
                  >`
            }
          `;
        })}
      </span>
    `;
  }
}
