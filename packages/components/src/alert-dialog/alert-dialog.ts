import { type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIOverlay,
} from "../internal/overlay.js";

/**
 * A modal dialog for an interruptive acknowledgement or confirmation.
 *
 * Unlike a visual warning card, this component moves focus and uses
 * `alertdialog` semantics. Use ordinary `ui-dialog` for non-urgent editing or
 * inspection flows.
 *
 * @tag ui-alert-dialog
 * @summary Opens a focus-contained alert dialog requiring acknowledgement.
 *
 * @example Delete record
 * <ui-alert-dialog label="Delete this record?">
 *   <ui-button slot="trigger" tone="critical">Delete</ui-button>
 *   <p slot="description">This cannot be undone.</p>
 *   <ui-button slot="cancel" variant="secondary">Cancel</ui-button>
 *   <ui-button slot="confirm" tone="critical">Delete record</ui-button>
 * </ui-alert-dialog>
 *
 * @slot trigger - Control that opens or closes the alert dialog.
 * @slot title - Visible alert-dialog title; the `label` attribute is the fallback.
 * @slot description - Supporting consequence or warning description.
 * @slot - Alert-dialog content.
 * @slot cancel - Action that declines the operation and closes the alert dialog.
 * @slot confirm - Action that accepts the operation and closes the alert dialog.
 * @slot close - Direct action control or action region that closes the alert dialog after acknowledgement.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the popup.
 * @csspart positioner - The renderer-owned popup placement boundary.
 * @csspart popup - The semantic alert dialog surface.
 * @csspart title - The visible alert-dialog title.
 * @csspart description - The supporting consequence or warning description.
 * @csspart content - The authored alert-dialog content.
 * @csspart actions - The grouped declining and accepting actions.
 * @csspart cancel - The declining action realization.
 * @csspart confirm - The accepting action realization.
 * @csspart close - The authored close action realization.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-alert-dialog-open-change - Emitted after user interaction requests a new open state and reports why.
 * @fires {CustomEvent<void>} ui-alert-dialog-cancel - Emitted when the authored cancel action is activated.
 * @fires {CustomEvent<void>} ui-alert-dialog-confirm - Emitted when the authored confirm action is activated.
 *
 * @mashnode root root
 * @mashnode trigger trigger root
 * @mashnode backdrop backdrop root
 * @mashnode positioner positioner backdrop
 * @mashnode popup popup positioner
 * @mashnode title title popup
 * @mashnode description description popup
 * @mashnode content content popup
 * @mashnode actions actions popup
 * @mashnode cancel cancel actions
 * @mashnode confirm confirm actions
 * @mashnode close close popup
 * @mashrole attribute label title title
 * @mashfallback slot title bindings attribute:label
 */
export class UIAlertDialog extends UIOverlay {
  protected readonly overlayRole = "alertdialog";
  protected override readonly modal = true;
  protected override readonly rendersTitle = true;
  protected override readonly rendersDescription = true;
  protected override readonly rendersCancel = true;
  protected override readonly rendersConfirm = true;

  constructor() {
    super();
    this.closeOnOutside = false;
  }

  protected override handleOverlayClick(event: MouseEvent): boolean {
    const action = this.eventIsWithinSlot(event, "confirm")
      ? "confirm"
      : this.eventIsWithinSlot(event, "cancel")
        ? "cancel"
        : null;
    if (!action) return false;

    this.dispatchEvent(
      action === "confirm"
        ? new CustomEvent<void>("ui-alert-dialog-confirm", { bubbles: true, composed: true })
        : new CustomEvent<void>("ui-alert-dialog-cancel", { bubbles: true, composed: true }),
    );
    this.requestOpenChange(false, action);
    return true;
  }

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-alert-dialog-open-change", {
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
