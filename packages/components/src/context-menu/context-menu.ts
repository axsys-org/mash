import { html, type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";
import { MenuCollectionController } from "../internal/menu-collection.js";
import type { MenuDensity, MenuSizing } from "../menu/menu.js";

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
 * @slot header - Persistent non-command content shown before the scrollable command viewport.
 * @slot - `ui-menu-item` commands.
 * @slot footer - Persistent non-command content shown after the scrollable command viewport.
 * @slot close - Optional control that dismisses the menu.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the menu.
 * @csspart positioner - The renderer-owned anchor-relative placement boundary.
 * @csspart popup - The semantic context menu surface.
 * @csspart material - The isolated visual material layer behind context-menu content.
 * @csspart header - The authored persistent content before the command viewport.
 * @csspart viewport - The natively scrollable command viewport.
 * @csspart actions - The authored context-menu commands.
 * @csspart footer - The authored persistent content after the command viewport.
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
 * @mashnode header header popup
 * @mashnode viewport viewport popup
 * @mashnode actions actions viewport
 * @mashnode footer footer popup
 * @mashnode close close popup
 * @mashnode density density popup
 * @mashnode sizing sizing popup
 * @mashnode present present popup
 * @mashnode entering entering popup
 * @mashnode active active popup
 * @mashnode exiting exiting popup
 * @mashnode reduced-motion reduced-motion popup
 * @mashrole slot header header header
 * @mashrole slot default actions actions
 * @mashrole slot footer footer footer
 */
export class UIContextMenu extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    density: { type: String, reflect: true },
    sizing: { type: String, reflect: true },
  };

  /** Menu surface and row density. */
  declare density: MenuDensity;
  /** Whether the popup fits content, holds its density width, or stretches within the catalogue bound. */
  declare sizing: MenuSizing;

  protected readonly overlayRole = "menu";
  protected override readonly triggerAction = "contextmenu";
  protected override readonly authoredContentPart = "actions";
  readonly #collection = new MenuCollectionController(this);

  constructor() {
    super();
    this.density = "regular";
    this.sizing = "content";
    this.addEventListener("ui-menu-item-select", this.#onItemSelect);
  }

  override disconnectedCallback(): void {
    this.#collection.destroy();
    super.disconnectedCallback();
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
    return html`
      <div part="header" role="presentation"><slot name="header"></slot></div>
      <div part="viewport">
        <div part="actions"><slot></slot></div>
      </div>
      <div part="footer" role="presentation"><slot name="footer"></slot></div>
    `;
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
    if (event.key === "Tab") {
      this.releaseFocusReturn();
      this.requestOpenChange(false, "keyboard");
      return true;
    }
    return this.#collection.handleKeydown(event);
  }

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
