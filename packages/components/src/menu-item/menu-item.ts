import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UIMenu } from "../menu/menu.js";

/** Accessible action semantics exposed by a menu item. */
export type MenuItemKind = "action" | "checkbox" | "radio";
/** Optional visual meaning interpreted by a catalogue recipe. */
export type MenuItemTone = "neutral" | "critical";

export interface MenuItemSubmenuChangeDetail {
  open: boolean;
}

export interface MenuItemSelectDetail {
  value: string;
  checked: boolean;
  kind: MenuItemKind;
}

const submenuHoverIntentInitialDelay = 48;
const submenuHoverIntentResampleDelay = 24;
const submenuHoverIntentStableDistance = 3;
const submenuHoverIntentDirectionBias = 1.2;

interface SubmenuHoverIntent {
  entryX: number;
  entryY: number;
  x: number;
  y: number;
}

/**
 * A selectable command or submenu branch inside `ui-menu` or `ui-context-menu`.
 *
 * The default slot remains the label fallback. Stable semantic lanes keep a
 * checkmark, leading symbol, overflowing label, shortcut, and submenu chevron
 * aligned without making any of those visual choices part of the behaviour.
 *
 * @tag ui-menu-item
 * @summary A selectable menu command or submenu branch.
 *
 * @example Archive
 * <ui-menu-item value="archive" tone="critical">Archive project</ui-menu-item>
 *
 * @example Nested command
 * <ui-menu-item value="share">
 *   Share
 *   <ui-icon slot="prefix" name="action.launch" label=""></ui-icon>
 *   <ui-icon slot="chevron" name="navigation.disclosure" label=""></ui-icon>
 *   <ui-menu slot="submenu" label="Share with">
 *     <ui-menu-item value="email">Email</ui-menu-item>
 *     <ui-menu-item value="messages">Messages</ui-menu-item>
 *   </ui-menu>
 * </ui-menu-item>
 *
 * @slot - Visible command label.
 * @slot selection - Optional checked or selected indicator.
 * @slot prefix - Optional leading symbol.
 * @slot shortcut - Optional keyboard shortcut description.
 * @slot chevron - Optional submenu disclosure glyph.
 * @slot submenu - Optional nested `ui-menu` branch.
 *
 * @csspart root - The complete item and nested-menu boundary.
 * @csspart control - The native menuitem button.
 * @csspart selection - The fixed selection-indicator lane.
 * @csspart prefix - The fixed leading-symbol lane.
 * @csspart label - The label region.
 * @csspart label-viewport - The clipped label viewport.
 * @csspart label-content - The authored label content.
 * @csspart shortcut - The trailing keyboard-shortcut lane.
 * @csspart chevron - The submenu disclosure lane.
 * @csspart submenu - The authored nested-menu realization.
 * @csspart safe-triangle - The pointer-safe corridor between a branch and submenu.
 *
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate checked - Matches `:state(checked)` for checked checkbox/radio items.
 * @cssstate has-selection - Matches when a selection lane is visible.
 * @cssstate has-prefix - Matches when leading content is authored.
 * @cssstate has-shortcut - Matches when a shortcut is authored.
 * @cssstate has-submenu - Matches when a nested menu is authored.
 * @cssstate submenu-open - Matches while the nested menu is visible.
 *
 * @fires {CustomEvent<MenuItemSelectDetail>} ui-menu-item-select - Emitted when a leaf command is activated, after checkbox/radio state is updated.
 * @fires {CustomEvent<MenuItemSubmenuChangeDetail>} ui-menu-item-submenu-change - Emitted when a submenu branch opens or closes.
 *
 * @mashnode root item
 * @mashnode control control root
 * @mashnode selection selection control
 * @mashnode prefix prefix control
 * @mashnode label label control
 * @mashnode label-viewport viewport label
 * @mashnode label-content content label-viewport
 * @mashnode shortcut shortcut control
 * @mashnode chevron chevron control
 * @mashnode safe-triangle safe-area root
 * @mashnode submenu submenu root
 * @mashnode kind kind control
 * @mashnode checked checked control
 * @mashnode disabled disabled control
 * @mashrole slot default label label
 * @mashrole slot selection selection selection
 * @mashrole slot prefix prefix prefix
 * @mashrole slot shortcut shortcut shortcut
 * @mashrole slot chevron chevron chevron
 * @mashrole slot submenu submenu submenu
 */
export class UIMenuItem extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    value: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    checked: { type: Boolean, reflect: true },
    kind: { type: String, reflect: true },
    tone: { type: String, reflect: true },
    _hasSelection: { type: Boolean, state: true },
    _hasPrefix: { type: Boolean, state: true },
    _hasShortcut: { type: Boolean, state: true },
    _hasSubmenu: { type: Boolean, state: true },
  };

  /** Stable command value for the containing menu. */
  declare value: string;
  /** Prevents command activation while retaining menu focus semantics. */
  declare disabled: boolean;
  /** Current checked state for checkbox and radio menu items. */
  declare checked: boolean;
  /** Accessible action semantics. */
  declare kind: MenuItemKind;
  /** Optional visual meaning interpreted by the active catalogue. */
  declare tone: MenuItemTone;
  declare _hasSelection: boolean;
  declare _hasPrefix: boolean;
  declare _hasShortcut: boolean;
  declare _hasSubmenu: boolean;

  readonly #internals: ElementInternals;
  #submenu: UIMenu | null = null;
  #hoverIntent: SubmenuHoverIntent | null = null;
  #openTimer: number | undefined;
  #closeTimer: number | undefined;

  constructor() {
    super();
    this.value = "";
    this.disabled = false;
    this.checked = false;
    this.kind = "action";
    this.tone = "neutral";
    this._hasSelection = false;
    this._hasPrefix = false;
    this._hasShortcut = false;
    this._hasSubmenu = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get hasSubmenu(): boolean {
    return this._hasSubmenu;
  }

  get submenuOpen(): boolean {
    return Boolean(this.#submenu?.open);
  }

  /** Normalized authored label used by menu typeahead. */
  get textValue(): string {
    return this.#authoredLabel();
  }

  override disconnectedCallback(): void {
    this.#clearTimers();
    this.#setSubmenu(null);
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("disabled")) this.#setState("disabled", this.disabled);
    if (changed.has("checked")) this.#setState("checked", this.checked);
    if (changed.has("checked") || changed.has("_hasSelection")) {
      this.#setState("has-selection", this.checked || this._hasSelection);
    }
    if (changed.has("_hasPrefix")) this.#setState("has-prefix", this._hasPrefix);
    if (changed.has("_hasShortcut")) this.#setState("has-shortcut", this._hasShortcut);
    if (changed.has("_hasSubmenu")) this.#setState("has-submenu", this._hasSubmenu);
  }

  /** Opens an authored submenu through its public overlay contract. */
  showSubmenu(focusFirst = false): void {
    if (this.disabled || !this.#submenu) return;
    this.#clearTimers();
    this.#submenu.show(focusFirst ? "keyboard" : "hover");
    if (focusFirst) {
      void this.#submenu.updateComplete.then(() => {
        const first = this.#submenu?.querySelector<HTMLElement>(":scope > ui-menu-item");
        first?.focus();
      });
    }
  }

  /** Dismisses the authored submenu and optionally restores focus to its branch. */
  dismissSubmenu(restoreFocus = false): void {
    this.#clearTimers();
    this.#submenu?.dismiss("keyboard");
    if (restoreFocus) this.focus();
  }

  #setState(name: string, active: boolean): void {
    if (active) this.#internals.states.add(name);
    else this.#internals.states.delete(name);
  }

  #clearTimers(): void {
    this.#clearOpenTimer();
    if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
  }

  #clearOpenTimer(): void {
    if (this.#openTimer !== undefined) window.clearTimeout(this.#openTimer);
    this.#openTimer = undefined;
    this.#hoverIntent = null;
  }

  #trackHoverIntent(event: PointerEvent): void {
    if (!this.#hoverIntent) {
      this.#hoverIntent = {
        entryX: event.clientX,
        entryY: event.clientY,
        x: event.clientX,
        y: event.clientY,
      };
      return;
    }
    this.#hoverIntent.x = event.clientX;
    this.#hoverIntent.y = event.clientY;
  }

  #hoverIntentDelay(elapsed: number, maximumDelay: number): number {
    if (elapsed === 0) return Math.min(submenuHoverIntentInitialDelay, maximumDelay);
    return Math.min(submenuHoverIntentResampleDelay, Math.max(0, maximumDelay - elapsed));
  }

  #hoverIntentReady(elapsed: number, maximumDelay: number): boolean {
    if (elapsed >= maximumDelay) return true;
    if (!this.#hoverIntent || !this.#submenu) return true;

    const dx = this.#hoverIntent.x - this.#hoverIntent.entryX;
    const dy = this.#hoverIntent.y - this.#hoverIntent.entryY;
    if (Math.hypot(dx, dy) <= submenuHoverIntentStableDistance) return true;

    const horizontal = Math.abs(dx);
    const vertical = Math.abs(dy);
    const movingTowardSubmenu =
      this.#submenu.placement === "left"
        ? dx < 0 && horizontal >= vertical * submenuHoverIntentDirectionBias
        : dx > 0 && horizontal >= vertical * submenuHoverIntentDirectionBias;
    return movingTowardSubmenu;
  }

  #queueHoverIntentOpen(elapsed: number, maximumDelay: number): void {
    const delay = this.#hoverIntentDelay(elapsed, maximumDelay);
    this.#openTimer = window.setTimeout(() => {
      this.#openTimer = undefined;
      const nextElapsed = elapsed + delay;
      if (this.#hoverIntentReady(nextElapsed, maximumDelay)) {
        this.showSubmenu();
        return;
      }
      this.#queueHoverIntentOpen(nextElapsed, maximumDelay);
    }, delay);
  }

  #scheduleOpen(event: PointerEvent): void {
    if (!this.#submenu || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
    if (this.#submenu.open || this.#openTimer !== undefined) return;
    const maximumDelay = Math.max(0, this.#submenu.submenuOpenDelay);
    if (maximumDelay === 0) {
      this.showSubmenu();
      return;
    }
    this.#trackHoverIntent(event);
    this.#queueHoverIntentOpen(0, maximumDelay);
  }

  #scheduleClose(): void {
    this.#clearOpenTimer();
    if (!this.#submenu?.open) return;
    if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
    this.#closeTimer = window.setTimeout(
      () => {
        this.#closeTimer = undefined;
        this.#submenu?.dismiss("hover");
      },
      Math.max(0, this.#submenu.submenuCloseDelay),
    );
  }

  #onNamedSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const hasContent = slot.assignedNodes({ flatten: true }).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
      return true;
    });
    if (slot.name === "selection") this._hasSelection = hasContent;
    if (slot.name === "prefix") this._hasPrefix = hasContent;
    if (slot.name === "shortcut") this._hasShortcut = hasContent;
    if (slot.name === "submenu") {
      const submenu = slot
        .assignedElements({ flatten: true })
        .find((element): element is UIMenu => element.localName === "ui-menu");
      this.#setSubmenu(submenu ?? null);
    }
  };

  #setSubmenu(submenu: UIMenu | null): void {
    if (this.#submenu === submenu) return;
    if (this.#submenu) {
      this.#submenu.removeEventListener("ui-menu-open-change", this.#onSubmenuOpenChange);
      this.#submenu.removeEventListener("pointerenter", this.#cancelClose);
      this.#submenu.removeEventListener("pointerleave", this.#onSubmenuPointerLeave);
      this.#submenu.anchorElement = null;
      this.#submenu.removeAttribute("nested");
    }
    this.#submenu = submenu;
    this._hasSubmenu = Boolean(submenu);
    if (!submenu) {
      this.#setState("submenu-open", false);
      return;
    }
    submenu.anchorElement = this.renderRoot.querySelector<HTMLElement>("[part~='control']");
    submenu.setAttribute("nested", "");
    submenu.placement = "right";
    submenu.align = "start";
    submenu.offset = 0;
    if (!submenu.label) submenu.label = this.#authoredLabel();
    submenu.addEventListener("ui-menu-open-change", this.#onSubmenuOpenChange);
    submenu.addEventListener("pointerenter", this.#cancelClose);
    submenu.addEventListener("pointerleave", this.#onSubmenuPointerLeave);
    this.#setState("submenu-open", submenu.open);
    this.requestUpdate();
  }

  #authoredLabel(): string {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>("slot:not([name])");
    return (
      slot
        ?.assignedNodes({ flatten: true })
        .map((node) => node.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() ?? ""
    );
  }

  #onSubmenuOpenChange = (event: Event): void => {
    if (event.target !== this.#submenu) return;
    const { open } = (event as CustomEvent<{ open: boolean }>).detail;
    this.#setState("submenu-open", open);
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<MenuItemSubmenuChangeDetail>("ui-menu-item-submenu-change", {
        bubbles: true,
        composed: true,
        detail: { open },
      }),
    );
  };

  #cancelClose = (): void => {
    if (this.#closeTimer !== undefined) window.clearTimeout(this.#closeTimer);
    this.#closeTimer = undefined;
  };

  #onSubmenuPointerLeave = (event: PointerEvent): void => {
    const related = event.relatedTarget;
    if (related instanceof Node && this.contains(related)) return;
    this.#scheduleClose();
  };

  #onPointerEnter = (event: PointerEvent): void => this.#scheduleOpen(event);

  #onPointerLeave = (): void => this.#scheduleClose();

  #onPointerMove = (event: PointerEvent): void => {
    if (this.#openTimer !== undefined && event.pointerType !== "touch")
      this.#trackHoverIntent(event);
    if (!this.#submenu?.open || event.pointerType === "touch") return;
    const snapshot = this.#submenu.positionSnapshot;
    const safe = this.renderRoot.querySelector<HTMLElement>("[part~='safe-triangle']");
    if (!snapshot || !safe) return;
    const rect = snapshot.popup;
    const side = snapshot.placement === "left" ? "left" : "right";
    const safeLeft = side === "right" ? event.clientX - 2 : rect.right;
    const safeRight = side === "right" ? rect.left : event.clientX + 2;
    const width = Math.max(0, safeRight - safeLeft);
    if (width === 0 || rect.height === 0) return;
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    safe.style.setProperty("--_mash-safe-top", `${rect.top}px`);
    safe.style.setProperty("--_mash-safe-left", `${safeLeft}px`);
    safe.style.setProperty("--_mash-safe-width", `${width}px`);
    safe.style.setProperty("--_mash-safe-height", `${rect.height}px`);
    safe.style.setProperty("--_mash-safe-y", `${y}%`);
    this.dataset.submenuSide = side;
  };

  #select = (): void => {
    if (this.disabled) return;
    if (this.#submenu) {
      this.showSubmenu(true);
      return;
    }

    if (this.kind === "checkbox") {
      this.checked = !this.checked;
    } else if (this.kind === "radio") {
      for (const sibling of this.parentElement?.querySelectorAll<UIMenuItem>(
        ":scope > ui-menu-item[kind='radio']",
      ) ?? []) {
        sibling.checked = sibling === this;
      }
    }

    this.dispatchEvent(
      new CustomEvent<MenuItemSelectDetail>("ui-menu-item-select", {
        bubbles: true,
        composed: true,
        detail: { value: this.value, checked: this.checked, kind: this.kind },
      }),
    );
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (!this.#submenu) return;
    if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      this.showSubmenu(true);
    } else if (event.key === "ArrowLeft" && this.#submenu.open) {
      event.preventDefault();
      event.stopPropagation();
      this.dismissSubmenu(true);
    }
  };

  protected override render(): TemplateResult {
    const role =
      this.kind === "checkbox"
        ? "menuitemcheckbox"
        : this.kind === "radio"
          ? "menuitemradio"
          : "menuitem";
    return html`
      <span part="root">
        <button
          part="control"
          type="button"
          role=${role}
          tabindex="-1"
          aria-disabled=${this.disabled ? "true" : undefined}
          aria-checked=${this.kind === "action" ? undefined : String(this.checked)}
          aria-haspopup=${this._hasSubmenu ? "menu" : undefined}
          aria-expanded=${this._hasSubmenu ? String(this.submenuOpen) : undefined}
          @click=${this.#select}
          @keydown=${this.#onKeydown}
          @pointerenter=${this.#onPointerEnter}
          @pointerleave=${this.#onPointerLeave}
          @pointermove=${this.#onPointerMove}
        >
          <span part="selection" aria-hidden="true">
            <slot name="selection" @slotchange=${this.#onNamedSlotChange}
              >${this.checked ? "✓" : nothing}</slot
            >
          </span>
          <span part="prefix" aria-hidden="true">
            <slot name="prefix" @slotchange=${this.#onNamedSlotChange}></slot>
          </span>
          <span part="label">
            <span part="label-viewport">
              <span part="label-content"><slot></slot></span>
            </span>
          </span>
          <span part="shortcut" ?hidden=${!this._hasShortcut}>
            <slot name="shortcut" @slotchange=${this.#onNamedSlotChange}></slot>
          </span>
          <span part="chevron" ?hidden=${!this._hasSubmenu} aria-hidden="true">
            <slot name="chevron">›</slot>
          </span>
        </button>
        <span part="submenu">
          <slot name="submenu" @slotchange=${this.#onNamedSlotChange}></slot>
        </span>
        <span
          part="safe-triangle"
          aria-hidden="true"
          @pointerenter=${this.#cancelClose}
          @pointerleave=${this.#onPointerLeave}
        ></span>
      </span>
    `;
  }
}
