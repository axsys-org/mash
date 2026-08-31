import { html, type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";
import { MenuCollectionController } from "../internal/menu-collection.js";
import type { MenuDensity } from "../menu/menu.js";

/**
 * A context-triggered command menu.
 *
 * The trigger opens with the platform context-menu gesture and preserves the
 * normal menu-item selection contract. A catalogue can position the popup at
 * the pointer; its semantic command and keyboard behaviour are shared.
 *
 * @tag ui-context-menu
 * @summary Opens a command menu from a context-menu gesture.
 *
 * @example Project row context menu
 * <ui-context-menu label="Project actions">
 *   <span slot="trigger">Billing migration</span>
 *   <ui-menu-item value="copy-path">Copy path<ui-kbd slot="shortcut" command="project.copy-path" shortcut="Primary+Shift+C"></ui-kbd></ui-menu-item>
 * </ui-context-menu>
 *
 * @slot trigger - Surface that receives the context-menu gesture.
 * @slot - `ui-menu-item` commands.
 * @slot close - Optional control that dismisses the menu.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the menu.
 * @csspart positioner - The renderer-owned anchor-relative placement boundary.
 * @csspart popup - The semantic context menu surface.
 * @csspart material - The isolated visual material layer behind context-menu content.
 * @csspart actions - The authored context-menu commands.
 * @csspart close - The authored close action realization.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-context-menu-open-change - Emitted after user interaction requests a new open state and reports why.
 * @fires {CustomEvent<{ value: string }>} ui-context-menu-select - Emitted when a menu item is selected.
 *
 * @mashnode trigger trigger
 * @mashnode backdrop backdrop
 * @mashnode positioner positioner backdrop
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode material material popup
 * @mashnode actions actions popup
 * @mashnode close close popup
 * @mashrole slot default actions actions
 */
export class UIContextMenu extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    density: { type: String, reflect: true },
  };

  /** Menu surface and row density. */
  declare density: MenuDensity;

  protected readonly overlayRole = "menu";
  protected override readonly triggerAction = "contextmenu";
  protected override readonly authoredContentPart = "actions";
  readonly #collection = new MenuCollectionController(this);

  constructor() {
    super();
    this.density = "regular";
    this.addEventListener("ui-menu-item-select", this.#onItemSelect);
  }

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-context-menu-open-change", {
        bubbles: true,
        composed: true,
        detail: { open, reason },
      }),
    );
  }

  protected override renderAuthoredContent(): TemplateResult {
    return html`<div part="actions"><slot></slot></div>`;
  }

  protected override renderPopupMaterial(): TemplateResult {
    return html`<span part="material" aria-hidden="true"></span>`;
  }

  #onItemSelect = (event: Event): void => {
    const detail = (event as CustomEvent<{ value: string; checked?: boolean; kind?: string }>)
      .detail;
    this.dispatchEvent(
      new CustomEvent<typeof detail>("ui-context-menu-select", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
    this.requestOpenChange(false, "select");
  };

  protected override handleOverlayKeydown(event: KeyboardEvent): boolean {
    return this.#collection.handleKeydown(event);
  }

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
