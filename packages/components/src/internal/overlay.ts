import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "./base-styles.js";

/** The user interaction that opens a portable overlay. */
export type OverlayTriggerAction = "click" | "hover" | "contextmenu";

/**
 * Shared non-visual interaction engine for Mash overlay families.
 *
 * Concrete elements decide role, modality, trigger action, and public event
 * names. This core owns only platform mechanics: trigger delegation, outside
 * dismissal, Escape, focus containment, initial focus, and focus return.
 * Keeping it private stops an application from depending on a web-only class
 * instead of the public renderer-neutral component contracts.
 */
export abstract class UIOverlay extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    open: { type: Boolean, reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Whether the overlay is visible. */
  declare open: boolean;
  /** Accessible title for the overlay surface. */
  declare label: string;
  /** Prevents trigger interaction. */
  declare disabled: boolean;

  protected abstract readonly overlayRole:
    "dialog" | "alertdialog" | "menu" | "tooltip" | "listbox";
  protected readonly modal: boolean = false;
  protected readonly triggerAction: OverlayTriggerAction = "click";
  protected readonly movesFocus: boolean = true;

  readonly #internals: ElementInternals;
  #returnFocus: HTMLElement | null = null;

  constructor() {
    super();
    this.open = false;
    this.label = "";
    this.disabled = false;
    this.#internals = this.attachInternals();
    this.addEventListener("click", this.#onHostClick);
    this.addEventListener("pointerover", this.#onPointerOver);
    this.addEventListener("pointerout", this.#onPointerOut);
    this.addEventListener("focusin", this.#onFocusIn);
    this.addEventListener("focusout", this.#onFocusOut);
    this.addEventListener("contextmenu", this.#onContextMenu);
  }

  static override styles = baseStyles;

  protected abstract emitOpenChange(open: boolean): void;

  /** Requests the public open state, then announces it through the concrete contract. */
  protected requestOpenChange(open: boolean): void {
    if (this.disabled || this.open === open) return;
    this.open = open;
    this.emitOpenChange(open);
  }

  protected overlayItems(): HTMLElement[] {
    const popup = this.renderRoot.querySelector<HTMLElement>("[part='popup']");
    if (!popup) return [];

    // The interactive content is authored in the light DOM, then projected
    // through slots. `popup.querySelectorAll()` cannot cross that slot boundary,
    // which used to leave a dialog with no focusable items at all. Start from
    // assigned content and include Mash controls whose hosts delegate focus.
    const nativeFocusable =
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const mashFocusable =
      "ui-button:not([disabled]):not([loading]), ui-input:not([disabled]), ui-number-field:not([disabled]), ui-otp-field:not([disabled]), ui-select:not([disabled]), ui-combobox:not([disabled]), ui-autocomplete:not([disabled]), ui-slider:not([disabled]), ui-switch:not([disabled]), ui-checkbox:not([disabled]), ui-radio:not([disabled]), ui-toggle:not([disabled]), ui-menu-item:not([disabled])";
    const selector = `${nativeFocusable}, ${mashFocusable}`;
    const slots = [
      ...popup.querySelectorAll<HTMLSlotElement>("slot:not([name]), slot[name='close']"),
    ];
    const seen = new Set<HTMLElement>();

    for (const slot of slots) {
      for (const assigned of slot.assignedElements({ flatten: true })) {
        if (assigned instanceof HTMLElement && assigned.matches(selector)) seen.add(assigned);
        for (const candidate of assigned.querySelectorAll<HTMLElement>(selector))
          seen.add(candidate);
      }
    }

    return [...seen];
  }

  /** Lets menus and listboxes extend the baseline Escape and focus contract. */
  protected handleOverlayKeydown(_event: KeyboardEvent): boolean {
    return false;
  }

  #triggerElements(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(":scope > [slot='trigger']")];
  }

  #eventIsWithinTrigger(event: Event): boolean {
    const path = event.composedPath();
    return this.#triggerElements().some((trigger) => path.includes(trigger));
  }

  #closeElements(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(":scope > [slot='close']")];
  }

  #eventIsWithinClose(event: Event): boolean {
    const path = event.composedPath();
    return this.#closeElements().some((control) => path.includes(control));
  }

  #rememberFocus(): void {
    const active = document.activeElement;
    this.#returnFocus =
      active instanceof HTMLElement ? active : (this.#triggerElements()[0] ?? null);
  }

  #focusFirst(): void {
    const popup = this.renderRoot.querySelector<HTMLElement>("[part='popup']");
    const target = this.overlayItems()[0] ?? popup;
    target?.focus();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("open")) {
      if (this.open) {
        this.#internals.states.add("open");
        if (this.movesFocus) {
          this.#rememberFocus();
          queueMicrotask(() => this.#focusFirst());
        }
      } else {
        this.#internals.states.delete("open");
        const previous = changed.get("open");
        if (this.movesFocus && previous === true) queueMicrotask(() => this.#returnFocus?.focus());
      }
    }
    if (changed.has("disabled")) {
      if (this.disabled) this.#internals.states.add("disabled");
      else this.#internals.states.delete("disabled");
    }
  }

  #onHostClick = (event: MouseEvent): void => {
    if (this.#eventIsWithinClose(event)) {
      event.preventDefault();
      this.requestOpenChange(false);
      return;
    }
    if (this.triggerAction === "click" && this.#eventIsWithinTrigger(event)) {
      event.preventDefault();
      this.requestOpenChange(!this.open);
    }
  };

  #onPointerOver = (event: PointerEvent): void => {
    if (this.triggerAction !== "hover" || !this.#eventIsWithinTrigger(event)) return;
    this.requestOpenChange(true);
  };

  #onFocusIn = (event: FocusEvent): void => {
    if (this.triggerAction !== "hover" || !this.#eventIsWithinTrigger(event)) return;
    this.requestOpenChange(true);
  };

  #onPointerOut = (event: PointerEvent): void => {
    if (this.triggerAction !== "hover" || !this.#eventIsWithinTrigger(event)) return;
    const related = event.relatedTarget;
    if (related instanceof Node && this.contains(related)) return;
    this.requestOpenChange(false);
  };

  #onFocusOut = (event: FocusEvent): void => {
    if (this.triggerAction !== "hover" || !this.#eventIsWithinTrigger(event)) return;
    const related = event.relatedTarget;
    if (related instanceof Node && this.contains(related)) return;
    this.requestOpenChange(false);
  };

  #onContextMenu = (event: MouseEvent): void => {
    if (this.triggerAction !== "contextmenu" || !this.#eventIsWithinTrigger(event)) return;
    event.preventDefault();
    this.requestOpenChange(true);
  };

  #onBackdropPointerDown = (event: PointerEvent): void => {
    if (!this.open || event.target !== event.currentTarget) return;
    this.requestOpenChange(false);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (this.handleOverlayKeydown(event)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.requestOpenChange(false);
      return;
    }
    if (!this.modal || event.key !== "Tab") return;
    const items = this.overlayItems();
    if (items.length === 0) return;
    const current = event
      .composedPath()
      .find((node) => node instanceof HTMLElement && items.includes(node as HTMLElement));
    const index = items.indexOf(current as HTMLElement);
    const target = event.shiftKey
      ? items[(index <= 0 ? items.length : index) - 1]
      : items[(index + 1) % items.length];
    if (index === -1 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
      event.preventDefault();
      target?.focus();
    }
  };

  /** Renders trigger, optional modal backdrop, and a focusable semantic popup. */
  protected renderOverlay(): TemplateResult {
    return html`
      <slot name="trigger"></slot>
      <div part="backdrop" ?hidden=${!this.open} @pointerdown=${this.#onBackdropPointerDown}>
        <div
          part="popup"
          role=${this.overlayRole}
          aria-label=${this.label || undefined}
          aria-modal=${this.modal ? "true" : undefined}
          tabindex="-1"
          @keydown=${this.#onKeydown}
        >
          <slot></slot>
          <slot name="close"></slot>
        </div>
      </div>
    `;
  }
}
