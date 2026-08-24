import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The link's visual role in surrounding content. */
export type LinkVariant = "standalone" | "inline" | "quiet";

/**
 * An unstyled navigation action.
 *
 * `href` is semantic destination data. The Web realization uses a native
 * anchor; other renderers can bind the same `path` node to their own routing
 * or application-open strategy.
 *
 * @tag ui-link
 * @summary Activates a semantic navigation destination.
 *
 * @example Project destination
 * <ui-link href="/rec/project/billing-migration">
 *   <span slot="prefix" aria-hidden="true">↗</span>
 *   Billing migration
 * </ui-link>
 *
 * @example Inline prose
 * <p>
 *   Review the <ui-link variant="inline" href="/docs/migrations">migration guide</ui-link>
 *   before changing the billing workflow.
 * </p>
 *
 * @example Quiet current navigation
 * <nav aria-label="Workspace">
 *   <ui-link variant="quiet" href="/issues" current>Issues</ui-link>
 *   <ui-link variant="quiet" href="/projects">Projects</ui-link>
 * </nav>
 *
 * @slot - The link label. Falls back to `label`.
 * @slot prefix - Content before the label.
 * @slot suffix - Content after the label.
 *
 * @csspart control - The native anchor that owns focus and activation.
 * @csspart prefix - The realization of leading content.
 * @csspart label - The realization of the link label.
 * @csspart suffix - The realization of trailing content.
 * @cssstate disabled - Matches `:state(disabled)` while activation is unavailable.
 * @cssstate current - Matches `:state(current)` when this is the current page destination.
 *
 * @fires {MouseEvent} click - Requests activation of the destination.
 *
 * @mashnode control control
 * @mashnode prefix prefix control
 * @mashnode label label control
 * @mashnode suffix suffix control
 * @mashnode path path control
 * @mashnode variant variant control
 * @mashnode current current control
 * @mashnode disabled disabled control
 * @mashnode activate activate control
 * @mashrole attribute href path path
 * @mashrole slot default label label
 * @mashfallback slot default bindings attribute:label
 */
export class UILink extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    href: { type: String, reflect: true },
    label: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    current: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _hasPrefix: { type: Boolean, state: true },
    _hasSuffix: { type: Boolean, state: true },
  };

  /** The semantic navigation destination. */
  declare href: string;
  /** Accessible and visible fallback when no label content is authored. */
  declare label: string;
  /** Presentation role: separate action, prose link, or low-emphasis navigation. */
  declare variant: LinkVariant;
  /** Marks this destination as the current page. */
  declare current: boolean;
  /** Prevents pointer and keyboard activation. */
  declare disabled: boolean;
  declare private _hasPrefix: boolean;
  declare private _hasSuffix: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.href = "";
    this.label = "";
    this.variant = "standalone";
    this.current = false;
    this.disabled = false;
    this._hasPrefix = false;
    this._hasSuffix = false;
    this.#internals = this.attachInternals();
    this.addEventListener("click", this.#guardDisabled, { capture: true });
  }

  static override styles = baseStyles;

  #guardDisabled = (event: MouseEvent): void => {
    if (!this.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const hasContent = slot.assignedNodes({ flatten: true }).length > 0;
    if (slot.name === "prefix") this._hasPrefix = hasContent;
    else if (slot.name === "suffix") this._hasSuffix = hasContent;
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("disabled")) {
      if (this.disabled) this.#internals.states.add("disabled");
      else this.#internals.states.delete("disabled");
    }
    if (changed.has("current")) {
      if (this.current) this.#internals.states.add("current");
      else this.#internals.states.delete("current");
    }
  }

  protected override render(): TemplateResult {
    return html`
      <a
        part="control"
        href=${this.disabled || !this.href ? nothing : this.href}
        aria-label=${this.label || nothing}
        aria-current=${this.current ? "page" : nothing}
        aria-disabled=${this.disabled ? "true" : nothing}
        tabindex=${this.disabled ? -1 : nothing}
      >
        <span part="prefix" ?hidden=${!this._hasPrefix}>
          <slot name="prefix" @slotchange=${this.#onSlotChange}></slot>
        </span>
        <span part="label"><slot>${this.label}</slot></span>
        <span part="suffix" ?hidden=${!this._hasSuffix}>
          <slot name="suffix" @slotchange=${this.#onSlotChange}></slot>
        </span>
      </a>
    `;
  }
}
