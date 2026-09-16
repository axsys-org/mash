import { html, type PropertyValues, type TemplateResult } from "lit";
import { TooltipDescription } from "./description.js";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  type OverlayTriggerAction,
  UIAnchoredOverlay,
} from "../internal/overlay.js";

export type TooltipTrigger = "click" | "hover" | "manual";

/**
 * A non-interruptive label shown on hover or focus.
 *
 * Tooltips never receive focus and should not contain actions. Put the
 * described control in `slot="trigger"`, or use `anchorElement` with a manual
 * tooltip without moving the existing control. Both describe native controls
 * in their own tree scope. Use a popover for content that needs interaction.
 *
 * @tag ui-tooltip
 * @summary Shows short descriptive text on trigger hover or focus.
 *
 * @example Compact action
 * <ui-tooltip label="Create project">
 *   <ui-button slot="trigger" aria-label="Create project">+</ui-button>
 *   Create project
 * </ui-tooltip>
 *
 * @slot trigger - Control described by the tooltip.
 * @slot - Short non-interactive tooltip text.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The pointer-dismissal boundary behind the tooltip.
 * @csspart positioner - The renderer-owned anchor-relative placement boundary.
 * @csspart popup - The semantic tooltip surface.
 * @csspart description - The authored tooltip description.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate present - Matches while the popup is rendered, including exit motion.
 * @cssstate entering - Matches while the tooltip is entering.
 * @cssstate active - Matches after enter motion settles.
 * @cssstate exiting - Matches while the tooltip is exiting.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-tooltip-open-change - Emitted after hover or focus requests a new open state and reports why.
 *
 * @mashnode trigger trigger
 * @mashnode backdrop backdrop
 * @mashnode positioner positioner backdrop
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode description description popup
 * @mashnode present present popup
 * @mashnode entering entering popup
 * @mashnode active active popup
 * @mashnode exiting exiting popup
 * @mashnode reduced-motion reduced-motion popup
 * @mashrole slot default description description
 */
export class UITooltip extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    openDelay: { type: Number, attribute: "open-delay", reflect: true },
    closeDelay: { type: Number, attribute: "close-delay", reflect: true },
    trigger: { type: String, reflect: true },
    followCursor: { type: String, attribute: "follow-cursor", reflect: true },
    forceOpen: { attribute: false },
    _hasContent: { state: true },
  };

  /** Delay in milliseconds before a first tooltip appears. */
  declare openDelay: number;
  /** Grace period in milliseconds before the tooltip disappears. */
  declare closeDelay: number;
  /** Interaction that controls visibility; hover also includes keyboard focus. */
  declare trigger: TooltipTrigger;

  /** Track the pointer on one axis; the other stays attached to the trigger’s edge. */
  declare followCursor: "x" | "y" | undefined;
  /** True pins open, false suppresses interaction, undefined restores automatic behavior. */
  declare forceOpen: boolean | undefined;
  protected _hasContent = false;
  #point: { x: number; y: number } | null = null;
  #description = new TooltipDescription(this);

  /** External native or composite control described and positioned by this tooltip. */
  override get anchorElement(): HTMLElement | null {
    return super.anchorElement;
  }

  override set anchorElement(value: HTMLElement | null) {
    super.anchorElement = value;
    this.#description.sync();
  }

  protected readonly overlayRole = "tooltip";
  protected override readonly triggerAction = "hover";
  protected override readonly movesFocus = false;
  protected override readonly rendersClose = false;
  protected override readonly authoredContentPart = "description";

  constructor() {
    super();
    this.openDelay = 200;
    this.placement = "top";
    this.align = "center";
    this.offset = 8;
    this.closeDelay = 300;
    this.trigger = "hover";
    this.addEventListener("pointermove", (event) => {
      if (
        !this.followCursor ||
        event.pointerType === "touch" ||
        !this.eventIsWithinSlot(event, "trigger")
      )
        return;
      this.#point = { x: event.clientX, y: event.clientY };
      this.queuePosition();
    });
    this.addEventListener("focusin", () => {
      this.#point = null;
      this.queuePosition();
      this.#description.sync();
    });
  }

  protected override interactionTriggerAction(): OverlayTriggerAction {
    return this.forceOpen === undefined ? this.trigger : "manual";
  }

  protected override interactionDelay(open: boolean, reason: "hover" | "focus"): number {
    if (reason === "focus") return 0;
    const delay = open ? this.openDelay : this.closeDelay;
    return Number.isFinite(delay) ? Math.max(0, delay) : 0;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#description.connect();
  }

  override disconnectedCallback(): void {
    this.#point = null;
    this.#description.disconnect();
    this.ownerDocument.removeEventListener("keydown", this.#onEscape, true);
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("forceOpen") || changed.has("trigger") || changed.has("disabled"))
      this.cancelPendingInteraction();
    if (this.forceOpen !== undefined) this.open = this.forceOpen && !this.disabled;
    else if (changed.has("forceOpen")) this.open = false;
    super.willUpdate(changed);
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    queueMicrotask(() => this.#description.sync());
    if (this.open) this.ownerDocument.addEventListener("keydown", this.#onEscape, true);
    else {
      this.ownerDocument.removeEventListener("keydown", this.#onEscape, true);
      this.#point = null;
    }
  }

  #onEscape = (event: KeyboardEvent): void => {
    if (
      event.key !== "Escape" ||
      event.isComposing ||
      !this.open ||
      !this.closeOnEscape ||
      this.forceOpen !== undefined
    )
      return;
    // A passive description must not consume its owner's Escape (for example,
    // closing an inspector or cancelling an edit). It never owns focus.
    this.dismiss("escape");
  };

  protected override requestOpenChange(
    open: boolean,
    reason: OverlayChangeReason = "imperative",
  ): void {
    if (this.forceOpen !== undefined) return;
    super.requestOpenChange(open, reason, null, false);
  }

  protected override positionAnchorRect(): DOMRect | null {
    const anchor = this.positionAnchor()?.getBoundingClientRect();
    if (!anchor || !this.#point || !this.followCursor) return null;
    if (this.followCursor === "x")
      return new DOMRect(
        Math.max(anchor.left, Math.min(anchor.right, this.#point.x)),
        anchor.top,
        0,
        anchor.height,
      );
    return new DOMRect(
      anchor.left,
      Math.max(anchor.top, Math.min(anchor.bottom, this.#point.y)),
      anchor.width,
      0,
    );
  }

  protected override renderAuthoredContent(): TemplateResult {
    return html`<div part="description">
      <slot
        @slotchange=${(event: Event) => {
          this._hasContent = (event.target as HTMLSlotElement)
            .assignedNodes()
            .some(
              (node) =>
                !(node instanceof HTMLElement && node.hidden) &&
                (Boolean(node.textContent?.trim()) || node instanceof Element),
            );
        }}
      ></slot
      >${this._hasContent ? "" : this.label}
    </div>`;
  }

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-tooltip-open-change", {
        bubbles: true,
        composed: true,
        detail: { open, reason },
      }),
    );
  }

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
