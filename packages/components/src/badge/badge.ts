import { LitElement, html, nothing, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** The semantic meaning carried by a badge. */
export type BadgeTone = "accent" | "neutral" | "positive" | "warning" | "critical";

/** The physical scale of a badge. */
export type BadgeSize = "inherit" | "default" | "compact" | "small" | "medium" | "large";

/** Visual content model for the indicator. */
export type BadgeVariant = "label" | "count" | "dot" | "icon";

/** Logical corner used when the badge annotates a target. */
export type BadgePosition = "top-start" | "top-end" | "bottom-start" | "bottom-end";

/**
 * A compact semantic status label or target annotation.
 *
 * Badges communicate stable state such as a category, count or workflow
 * outcome. They can also annotate an authored target with a count, dot, or
 * symbolic layer. They are not action controls: use `ui-button` when pressing
 * the element should do something.
 *
 * @tag ui-badge
 * @summary Labels compact status or annotates a target with count, dot, or icon state.
 *
 * @example Semantic status
 * <div class="demo button-showcase-row">
 *   <ui-badge>Default</ui-badge>
 *   <ui-badge tone="positive">Ready</ui-badge>
 *   <ui-badge tone="warning">Needs review</ui-badge>
 *   <ui-badge tone="critical">Blocked</ui-badge>
 * </div>
 *
 * @example Target indicator
 * <ui-badge variant="count" count="12" max="9" size="small" label="12 unread updates">
 *   <ui-icon slot="target" name="status.warning" label=""></ui-icon>
 * </ui-badge>
 *
 * @slot - The concise status text for the default label variant.
 * @slot target - Optional element the badge annotates.
 * @slot icon - Optional symbolic content for `variant="icon"`.
 *
 * @csspart root - The visible badge container.
 * @csspart target - The annotated target, when supplied.
 * @csspart indicator - The compact badge indicator.
 * @csspart value - The authored or generated status value.
 * @csspart icon - The authored symbolic indicator content.
 *
 * @cssstate anchored - Matches while target content is present.
 * @cssstate empty - Matches when `variant="count"` has no positive count to display.
 *
 * @mashnode root root
 * @mashnode target target root
 * @mashnode indicator indicator root
 * @mashnode value value indicator
 * @mashnode icon icon indicator
 * @mashnode tone tone indicator
 * @mashnode variant variant indicator
 * @mashnode count count indicator
 * @mashnode max max indicator
 * @mashnode position position indicator
 * @mashnode size size root
 * @mashaxis size indicator-size
 * @mashnode anchored anchored root
 * @mashnode empty empty indicator
 * @mashrole slot default value value
 * @mashrole slot target target target
 * @mashrole slot icon icon icon
 */
export class UIBadge extends LitElement {
  static override properties = {
    tone: { type: String, reflect: true },
    size: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    count: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    position: { type: String, reflect: true },
    label: { type: String, reflect: true },
    _hasTarget: { type: Boolean, state: true },
    _hasIcon: { type: Boolean, state: true },
  };

  /** Semantic meaning. */
  declare tone: BadgeTone;
  /** Physical scale. */
  declare size: BadgeSize;
  /** Indicator content model. */
  declare variant: BadgeVariant;
  /** Numeric value displayed by the count variant. Counts at or below zero hide the indicator. */
  declare count: number;
  /** Maximum count displayed before a trailing plus sign is added. */
  declare max: number;
  /** Logical corner used when a target is present. */
  declare position: BadgePosition;
  /** Accessible description for icon-only, dot, and anchored count badges. */
  declare label: string;
  declare private _hasTarget: boolean;
  declare private _hasIcon: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.tone = "accent";
    this.size = "medium";
    this.variant = "label";
    this.count = 0;
    this.max = 99;
    this.position = "top-end";
    this.label = "";
    this._hasTarget = false;
    this._hasIcon = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(): void {
    this.#setState("anchored", this._hasTarget);
    this.#setState("empty", this.#indicatorHidden());
  }

  #setState(state: "anchored" | "empty", present: boolean): void {
    if (present) this.#internals.states.add(state);
    else this.#internals.states.delete(state);
  }

  #onTargetSlotChange = (event: Event): void => {
    this._hasTarget = this.#slotHasContent(event.currentTarget as HTMLSlotElement);
  };

  #onIconSlotChange = (event: Event): void => {
    this._hasIcon = this.#slotHasContent(event.currentTarget as HTMLSlotElement);
  };

  #slotHasContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes({ flatten: true })
      .some((node) => node.nodeType !== Node.TEXT_NODE || (node.textContent ?? "").trim() !== "");
  }

  #indicatorHidden(): boolean {
    return this.variant === "count" && this.count <= 0;
  }

  #countText(): string {
    const maximum = Math.max(1, Math.trunc(this.max) || 99);
    const count = Math.max(0, Math.trunc(this.count) || 0);
    return count > maximum ? `${maximum}+` : String(count);
  }

  #indicatorContent(): TemplateResult | typeof nothing {
    if (this.variant === "dot") return nothing;
    if (this.variant === "icon") {
      return html`<span part="icon"
        ><slot name="icon" @slotchange=${this.#onIconSlotChange}></slot
      ></span>`;
    }
    if (this.variant === "count") return html`<span part="value">${this.#countText()}</span>`;
    return html`<span part="value"><slot></slot></span>`;
  }

  protected override render(): TemplateResult {
    const labelled = this.label.trim().length > 0;
    return html`
      <span
        part="root"
        aria-label=${labelled ? this.label : nothing}
        aria-hidden=${
          !labelled && (this.variant === "dot" || this.variant === "icon") ? "true" : nothing
        }
      >
        <span part="target" ?hidden=${!this._hasTarget}
          ><slot name="target" @slotchange=${this.#onTargetSlotChange}></slot
        ></span>
        <span part="indicator" ?hidden=${this.#indicatorHidden()}>
          ${this.#indicatorContent()}
        </span>
      </span>
    `;
  }
}
