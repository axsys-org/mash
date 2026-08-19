import { type TemplateResult } from "lit";

import { UIOverlay } from "../internal/overlay.js";

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
 * @slot - Drawer content.
 * @slot close - Direct action control or action region that closes the drawer.
 *
 * @csspart backdrop - The dismissal boundary behind the drawer.
 * @csspart popup - The semantic drawer surface.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<{ open: boolean }>} ui-drawer-open-change - Emitted after user interaction requests a new open state.
 */
export class UIDrawer extends UIOverlay {
  static override properties = { ...UIOverlay.properties, side: { type: String, reflect: true } };

  /** Logical edge from which the drawer enters. */
  declare side: DrawerSide;

  protected readonly overlayRole = "dialog";
  protected override readonly modal = true;

  constructor() {
    super();
    this.side = "end";
  }

  protected override emitOpenChange(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>("ui-drawer-open-change", {
        bubbles: true,
        composed: true,
        detail: { open },
      }),
    );
  }

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
