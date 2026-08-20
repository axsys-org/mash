import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

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
 * @slot - The link label. Falls back to `label`.
 * @slot prefix - Content before the label.
 * @slot suffix - Content after the label.
 *
 * @csspart control - The native anchor that owns focus and activation.
 * @csspart prefix - The realization of leading content.
 * @csspart label - The realization of the link label.
 * @csspart suffix - The realization of trailing content.
 * @cssstate disabled - Matches `:state(disabled)` while activation is unavailable.
 *
 * @fires {MouseEvent} click - Requests activation of the destination.
 *
 * @mashnode control control
 * @mashnode prefix prefix control
 * @mashnode label label control
 * @mashnode suffix suffix control
 * @mashnode path path control
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
    disabled: { type: Boolean, reflect: true },
  };

  /** The semantic navigation destination. */
  declare href: string;
  /** Accessible and visible fallback when no label content is authored. */
  declare label: string;
  /** Prevents pointer and keyboard activation. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.href = "";
    this.label = "";
    this.disabled = false;
    this.#internals = this.attachInternals();
    this.addEventListener("click", this.#guardDisabled, { capture: true });
  }

  static override styles = baseStyles;

  #guardDisabled = (event: MouseEvent): void => {
    if (!this.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("disabled")) return;
    if (this.disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  protected override render(): TemplateResult {
    return html`
      <a
        part="control"
        href=${this.disabled || !this.href ? nothing : this.href}
        aria-label=${this.label || nothing}
        aria-disabled=${this.disabled ? "true" : nothing}
        tabindex=${this.disabled ? -1 : nothing}
      >
        <span part="prefix"><slot name="prefix"></slot></span>
        <span part="label"><slot>${this.label}</slot></span>
        <span part="suffix"><slot name="suffix"></slot></span>
      </a>
    `;
  }
}
