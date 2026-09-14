import { type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIOverlay,
} from "../internal/overlay.js";

/**
 * A modal dialog with managed focus and a slotted trigger.
 *
 * Put the activator in `slot="trigger"`; arbitrary title, message, controls,
 * and form content belong in the default slot. The application may set `open`
 * directly, while user actions emit a portable state-change event.
 *
 * @tag ui-dialog
 * @summary Opens a modal, focus-contained dialog surface.
 *
 * @example Rename project
 * <ui-dialog label="Rename project">
 *   <ui-button slot="trigger">Rename</ui-button>
 *   <ui-field label="Name"><ui-input slot="control" name="name"></ui-input></ui-field>
 * </ui-dialog>
 *
 * @slot trigger - Control that opens or closes the dialog.
 * @slot title - Visible dialog title; the `label` attribute is the fallback.
 * @slot description - Supporting dialog description.
 * @slot - Dialog content.
 * @slot actions - Authored dialog action group.
 * @slot close - Direct action control or action region that closes the dialog after completion or cancellation.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the popup.
 * @csspart positioner - The renderer-owned popup placement boundary.
 * @csspart popup - The semantic dialog surface.
 * @csspart title - The visible dialog title.
 * @csspart description - The supporting dialog description.
 * @csspart content - The authored dialog content.
 * @csspart actions - The authored dialog action group.
 * @csspart close - The authored close action realization.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate present - Matches while the popup is rendered, including exit motion.
 * @cssstate entering - Matches while the popup is entering.
 * @cssstate active - Matches after enter motion settles.
 * @cssstate exiting - Matches while the popup is exiting.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-dialog-open-change - Emitted after user interaction requests a new open state and reports why.
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
 * @mashnode close close popup
 * @mashnode present present popup
 * @mashnode entering entering popup
 * @mashnode active active popup
 * @mashnode exiting exiting popup
 * @mashnode reduced-motion reduced-motion popup
 * @mashrole attribute label title title
 * @mashfallback slot title bindings attribute:label
 */
export class UIDialog extends UIOverlay {
  protected readonly overlayRole = "dialog";
  protected override readonly modal = true;
  protected override readonly rendersTitle = true;
  protected override readonly rendersDescription = true;
  protected override readonly rendersActions = true;

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-dialog-open-change", {
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
