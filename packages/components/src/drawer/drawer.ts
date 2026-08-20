import { type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIOverlay,
} from "../internal/overlay.js";

/** Side of the viewport on which a drawer enters. */
export type DrawerSide = "start" | "end" | "top" | "bottom";

/**
 * A modal off-canvas dialog with an explicit logical side.
 *
 * A recipe maps `side` to physical placement; the behaviour contract is the
 * same modal focus, dismissal, and state event as a dialog.
 *
 * @tag ui-drawer
 * @summary Opens a modal off-canvas dialog from a logical side.
 *
 * @example Activity drawer
 * <ui-drawer side="end" label="Activity">
 *   <ui-button slot="trigger">Open activity</ui-button>
 *   <p>Recent project activity.</p>
 * </ui-drawer>
 *
 * @slot trigger - Control that opens or closes the drawer.
 * @slot title - Visible drawer title; the `label` attribute is the fallback.
 * @slot description - Supporting drawer description.
 * @slot - Drawer content.
 * @slot actions - Authored drawer action group.
 * @slot close - Direct action control or action region that closes the drawer.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the drawer.
 * @csspart positioner - The renderer-owned drawer placement boundary.
 * @csspart popup - The semantic drawer surface.
 * @csspart title - The visible drawer title.
 * @csspart description - The supporting drawer description.
 * @csspart content - The authored drawer content.
 * @csspart actions - The authored drawer action group.
 * @csspart close - The authored close action realization.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-drawer-open-change - Emitted after user interaction requests a new open state and reports why.
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
 * @mashrole attribute label title title
 * @mashfallback slot title bindings attribute:label
 */
export class UIDrawer extends UIOverlay {
  static override properties = { ...UIOverlay.properties, side: { type: String, reflect: true } };

  /** Logical edge from which the drawer enters. */
  declare side: DrawerSide;

  protected readonly overlayRole = "dialog";
  protected override readonly modal = true;
  protected override readonly rendersTitle = true;
  protected override readonly rendersDescription = true;
  protected override readonly rendersActions = true;

  constructor() {
    super();
    this.side = "end";
  }

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-drawer-open-change", {
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
