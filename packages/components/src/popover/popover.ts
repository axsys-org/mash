import { type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";

/**
 * A non-modal disclosure surface anchored to a slotted trigger.
 *
 * Popovers support interactive content without trapping focus. Dismissal by
 * Escape or an outside backdrop interaction remains consistent with dialogs.
 *
 * @tag ui-popover
 * @summary Opens a non-modal interactive disclosure surface.
 *
 * @example Project actions
 * <ui-popover label="Project actions">
 *   <ui-button slot="trigger" variant="secondary">Actions</ui-button>
 *   <ui-button variant="quiet">Duplicate</ui-button>
 * </ui-popover>
 *
 * @slot trigger - Control that opens or closes the popover.
 * @slot title - Optional visible popover title; the `label` attribute is the fallback.
 * @slot description - Supporting popover description.
 * @slot - Popover content.
 * @slot actions - Authored popover action group.
 * @slot close - Direct action control or action region that closes the popover.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the popup.
 * @csspart positioner - The renderer-owned anchor-relative placement boundary.
 * @csspart popup - The semantic popover surface.
 * @csspart title - The visible popover title.
 * @csspart description - The supporting popover description.
 * @csspart content - The authored popover content.
 * @csspart actions - The authored popover action group.
 * @csspart close - The authored close action realization.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-popover-open-change - Emitted after user interaction requests a new open state and reports why.
 *
 * @mashnode root root
 * @mashnode trigger trigger root
 * @mashnode backdrop backdrop root
 * @mashnode positioner positioner backdrop
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode title title popup
 * @mashnode description description popup
 * @mashnode content content popup
 * @mashnode actions actions popup
 * @mashnode close close popup
 * @mashrole attribute label title title
 * @mashfallback slot title bindings attribute:label
 */
export class UIPopover extends UIAnchoredOverlay {
  protected readonly overlayRole = "dialog";
  protected override readonly rendersTitle = true;
  protected override readonly rendersDescription = true;
  protected override readonly rendersActions = true;

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-popover-open-change", {
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
