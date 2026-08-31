import { html, type PropertyValues, type TemplateResult } from "lit";

import {
  type OverlayChangeReason,
  type OverlayOpenChangeDetail,
  UIAnchoredOverlay,
} from "../internal/overlay.js";
import { MenuCollectionController } from "../internal/menu-collection.js";
import type { UIMenuItem } from "../menu-item/menu-item.js";

/** The Apple-aligned row and surface density of a menu. */
export type MenuDensity = "regular" | "compact" | "mini";

/**
 * A triggerable menu of command items with Arrow-key navigation.
 *
 * Use `ui-menu-item` values for commands. The menu emits selection but does
 * not embed routing, mutation, or application-specific close policy.
 *
 * @tag ui-menu
 * @summary Opens an Arrow-key navigable command menu.
 *
 * @example Project actions
 * <ui-menu label="Project actions">
 *   <ui-button slot="trigger" variant="secondary">Actions</ui-button>
 *   <ui-menu-item value="rename">Rename<ui-kbd slot="shortcut" command="project.rename" shortcut="Primary+R"></ui-kbd></ui-menu-item>
 *   <ui-menu-item value="archive">Archive</ui-menu-item>
 * </ui-menu>
 *
 * @slot trigger - Control that opens or closes the menu.
 * @slot - `ui-menu-item` commands.
 * @slot close - Optional control that dismisses the menu.
 *
 * @csspart trigger - The authored trigger realization.
 * @csspart backdrop - The dismissal boundary behind the menu.
 * @csspart positioner - The renderer-owned anchor-relative placement boundary.
 * @csspart popup - The semantic menu surface.
 * @csspart material - The isolated visual material layer behind menu content.
 * @csspart actions - The authored menu commands.
 * @csspart close - The authored close action realization.
 *
 * @cssstate open - Matches `:state(open)` while visible.
 * @cssstate disabled - Matches `:state(disabled)` while the trigger is unavailable.
 * @cssstate nested - Matches when a menu item owns this menu as a submenu.
 *
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-menu-open-change - Emitted after user interaction requests a new open state and reports why.
 * @fires {CustomEvent<{ value: string }>} ui-menu-select - Emitted when a menu item is selected.
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
 * @mashnode density density popup
 * @mashnode nested nested popup
 * @mashrole slot default actions actions
 */
export class UIMenu extends UIAnchoredOverlay {
  static override properties = {
    ...UIAnchoredOverlay.properties,
    density: { type: String, reflect: true },
    nested: { type: Boolean, reflect: true },
    submenuOpenDelay: { type: Number, attribute: "submenu-open-delay", reflect: true },
    submenuCloseDelay: { type: Number, attribute: "submenu-close-delay", reflect: true },
  };

  /** Menu surface and row density. */
  declare density: MenuDensity;
  /** Whether a parent menu item owns this menu as a submenu. */
  declare nested: boolean;
  /** Fine-pointer delay before a hovered submenu opens. */
  declare submenuOpenDelay: number;
  /** Pointer-corridor grace period before a submenu closes. */
  declare submenuCloseDelay: number;

  readonly #collection = new MenuCollectionController(this);

  protected readonly overlayRole = "menu";
  protected override readonly authoredContentPart = "actions";

  constructor() {
    super();
    this.density = "regular";
    this.nested = false;
    this.submenuOpenDelay = 80;
    this.submenuCloseDelay = 280;
    this.addEventListener("ui-menu-item-select", this.#onItemSelect);
    this.addEventListener("ui-menu-item-submenu-change", this.#onSubmenuChange);
    this.addEventListener("pointerover", this.#onPointerOver);
  }

  protected override emitOpenChange(open: boolean, reason: OverlayChangeReason): void {
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-menu-open-change", {
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

  #parentItem(): UIMenuItem | null {
    return this.parentElement?.localName === "ui-menu-item"
      ? (this.parentElement as UIMenuItem)
      : null;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!changed.has("open") && !changed.has("disabled")) return;
    for (const trigger of this.querySelectorAll<HTMLElement>(":scope > [slot='trigger']")) {
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", String(this.open));
      if ("selected" in trigger)
        (trigger as HTMLElement & { selected: boolean }).selected = this.open;
    }
  }

  protected override handleOverlayKeydown(event: KeyboardEvent): boolean {
    return this.#collection.handleKeydown(event, {
      nested: this.nested,
      parentItem: () => this.#parentItem(),
      dismissNested: () => this.requestOpenChange(false, "keyboard"),
    });
  }

  #onItemSelect = (event: Event): void => {
    const item = event.target as UIMenuItem;
    const detail = (event as CustomEvent<{ value: string; checked?: boolean; kind?: string }>)
      .detail;
    if (item.closest("ui-menu") === this) {
      this.dispatchEvent(
        new CustomEvent<typeof detail>("ui-menu-select", {
          bubbles: true,
          composed: true,
          detail,
        }),
      );
    }
    this.requestOpenChange(false, "select");
  };

  #onSubmenuChange = (event: Event): void => {
    const item = event.target as UIMenuItem;
    const { open } = (event as CustomEvent<{ open: boolean }>).detail;
    if (!open || item.parentElement !== this) return;
    this.#collection.dismissSiblingSubmenus(item);
  };

  #onPointerOver = (event: PointerEvent): void => {
    const item = this.#collection.itemFromEvent(event) as UIMenuItem | undefined;
    if (!item || item.parentElement !== this || item.hasSubmenu) return;
    this.#collection.dismissSiblingSubmenus(item);
  };

  protected override render(): TemplateResult {
    return this.renderOverlay();
  }
}
