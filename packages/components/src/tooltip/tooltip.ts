import { type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";

/**
 * A non-interruptive label shown on hover or focus.
 *
 * Tooltips never receive focus and should not contain actions. Put the
 * described control in `slot="trigger"`; use a popover for content that
 * needs keyboard interaction.
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
 * @mashrole slot default description description
 */
export class UITooltip extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    openDelay: { type: Number, attribute: "open-delay", reflect: true },
    closeDelay: { type: Number, attribute: "close-delay", reflect: true },
  };

  /** Delay in milliseconds before a first tooltip appears. */
  declare openDelay: number;
  /** Grace period in milliseconds before the tooltip disappears. */
  declare closeDelay: number;

  protected readonly overlayRole = "tooltip";
  protected override readonly triggerAction = "hover";
  protected override readonly movesFocus = false;
  protected override readonly rendersClose = false;
  protected override readonly authoredContentPart = "description";

  constructor() {
    super();
    this.openDelay = 500;
    this.closeDelay = 300;
  }

  protected override interactionDelay(open: boolean): number {
    return open ? this.openDelay : this.closeDelay;
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
