import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import {
  AnchoredPositionController,
  type AnchoredAlign,
  type AnchoredPlacement,
  type AnchoredPositionConfig,
  type AnchoredPositionSnapshot,
} from "./anchored-position.js";
import { baseStyles } from "./base-styles.js";
import {
  PresenceLifecycleController,
  type PresenceLifecycleContext,
  type PresenceLifecycleEventDetail,
  type PresenceState,
} from "./presence-lifecycle.js";

/** The user interaction that opens a portable overlay. */
export type OverlayTriggerAction = "click" | "contextmenu" | "hover" | "manual";
/** Preferred physical side of an anchored overlay. */
export type OverlaySide = AnchoredPlacement;
/** Alignment of an anchored overlay along its selected side. */
export type OverlayAlign = AnchoredAlign;
/** Portable reason for a requested overlay state transition. */
export type OverlayChangeReason =
  | "trigger"
  | "outside"
  | "escape"
  | "close"
  | "cancel"
  | "confirm"
  | "select"
  | "clear"
  | "keyboard"
  | "input"
  | "hover"
  | "focus"
  | "contextmenu"
  | "imperative";

/** Renderer-neutral payload shared by every Mash overlay open-change event. */
export interface OverlayOpenChangeDetail {
  open: boolean;
  reason: OverlayChangeReason;
}

export type OverlayPresenceEventDetail = PresenceLifecycleEventDetail;

type OverlayInitialFocus = "first" | "popup" | "none";

let overlayId = 0;

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
    closeOnEscape: { type: Boolean, attribute: "close-on-escape", reflect: true },
    closeOnOutside: { type: Boolean, attribute: "close-on-outside", reflect: true },
    overlayPresent: { state: true },
  };

  /** Whether the overlay is visible. */
  declare open: boolean;
  /** Accessible title for the overlay surface. */
  declare label: string;
  /** Prevents trigger interaction. */
  declare disabled: boolean;
  /** Whether Escape requests dismissal while the overlay is open. */
  declare closeOnEscape: boolean;
  /** Whether an interaction outside the popup requests dismissal. */
  declare closeOnOutside: boolean;
  /** Internal render-presence; public state remains the `open` contract. */
  declare protected overlayPresent: boolean;

  protected abstract readonly overlayRole:
    "dialog" | "alertdialog" | "menu" | "tooltip" | "listbox";
  protected readonly modal: boolean = false;
  protected readonly triggerAction: OverlayTriggerAction = "click";
  protected readonly movesFocus: boolean = true;
  protected readonly pointerOpenFocus: OverlayInitialFocus = "first";
  protected readonly authoredContentPart: "content" | "actions" | "description" = "content";
  protected readonly rendersTitle: boolean = false;
  protected readonly rendersDescription: boolean = false;
  protected readonly rendersActions: boolean = false;
  protected readonly rendersCancel: boolean = false;
  protected readonly rendersConfirm: boolean = false;
  protected readonly rendersClose: boolean = true;

  protected readonly overlayInternals: ElementInternals;
  readonly #titleId = `mash-overlay-title-${++overlayId}`;
  readonly #descriptionId = `mash-overlay-description-${overlayId}`;
  #returnFocus: HTMLElement | null = null;
  #openReason: OverlayChangeReason | null = null;
  #initialFocus: OverlayInitialFocus | null = null;
  #movedFocusForOpen = false;
  #returnFocusForOpen = false;
  #contextPoint: { x: number; y: number } | null = null;
  #interactionTimer: number | undefined;
  readonly #presence: PresenceLifecycleController<"entering" | "exiting">;
  readonly #positioner = new AnchoredPositionController(this, {
    anchor: () => this.positionAnchor(),
    popup: () => this.renderRoot.querySelector<HTMLElement>("[part='popup']"),
    positioner: () => this.renderRoot.querySelector<HTMLElement>("[part='positioner']"),
    config: () => this.positioningConfig(),
    point: () => this.#contextPoint,
    anchorRect: () => this.positionAnchorRect(),
  });

  constructor() {
    super();
    this.open = false;
    this.label = "";
    this.disabled = false;
    this.closeOnEscape = true;
    this.closeOnOutside = true;
    this.overlayPresent = false;
    this.overlayInternals = this.attachInternals();
    this.#presence = new PresenceLifecycleController(this, {
      target: () => this.renderRoot.querySelector<HTMLElement>("[part='popup']"),
      present: () => this.overlayPresent,
      setPresent: (present) => {
        this.overlayPresent = present;
      },
      setState: (state, present) => this.#setPresenceState(state, present),
      onStart: (context) => this.#emitPresenceEvent("mash-presence-start", context),
      onFinish: (context) => this.#emitPresenceEvent("mash-presence-end", context),
      onSettle: (phase) => {
        if (phase === "absent") this.#positioner.stop();
        // Entry scaling changes the measured popup bounds without a resize event.
        // Resolve the final geometry before the next pointer move can reposition it.
        else this.#positioner.sync();
      },
    });
    this.addEventListener("click", this.#onHostClick);
    this.addEventListener("keydown", this.#onContextTriggerKeydown);
    this.addEventListener("pointerover", this.#onPointerOver);
    this.addEventListener("pointerout", this.#onPointerOut);
    this.addEventListener("focusin", this.#onFocusIn);
    this.addEventListener("focusout", this.#onFocusOut);
    this.addEventListener("contextmenu", this.#onContextMenu);
  }

  static override styles = [
    baseStyles,
    css`
      /* These elements make authored slots addressable without inserting a
         layout policy. A catalogue can opt a semantic part into grid, flex, or
         block layout; without one, projection behaves like the former bare
         slots. */
      [part="trigger"],
      [part="content"],
      [part="actions"],
      [part="description"],
      [part="header"],
      [part="footer"],
      [part="title"],
      [part="positioner"],
      [part="cancel"],
      [part="confirm"],
      [part="close"] {
        display: contents;
      }

      [part="popup"] {
        outline: none;
      }
    `,
  ];

  protected abstract emitOpenChange(open: boolean, reason: OverlayChangeReason): void;

  /** Anchored subclasses opt into the shared collision-aware positioning engine. */
  protected positioningConfig(): AnchoredPositionConfig | null {
    return null;
  }

  /**
   * The element against which an anchored overlay is positioned.
   *
   * Trigger-owned overlays use their authored trigger. Composite controls can
   * override this without teaching the positioning engine about menu items,
   * combobox controls, or any other concrete component family.
   */
  protected positionAnchor(): HTMLElement | null {
    return this.#triggerElements()[0] ?? null;
  }

  /** Optional virtual bounds resolved by the shared anchored positioning controller. */
  protected positionAnchorRect(): DOMRect | null {
    return null;
  }

  /** Re-measures an open anchored overlay after its external anchor changes. */
  protected queuePosition(): void {
    this.#positioner.queue();
  }

  protected overlayPositionSnapshot(): AnchoredPositionSnapshot | null {
    return this.#positioner.snapshot;
  }

  /** Allows non-modal composites to close while native Tab navigation continues. */
  protected releaseFocusReturn(): void {
    this.#movedFocusForOpen = false;
    this.#returnFocusForOpen = false;
    this.#returnFocus = null;
  }

  /** Lets concrete overlays handle semantic action slots before generic dismissal. */
  protected handleOverlayClick(_event: MouseEvent): boolean {
    return false;
  }

  /** Lets hover/focus surfaces delay pointer-driven state transitions. */
  protected interactionDelay(_open: boolean, _reason: "hover" | "focus"): number {
    return 0;
  }

  /** Lets a concrete overlay select a public trigger mode at runtime. */
  protected interactionTriggerAction(): OverlayTriggerAction {
    return this.triggerAction;
  }

  /** Requests the public open state, then announces it through the concrete contract. */
  protected requestOpenChange(
    open: boolean,
    reason: OverlayChangeReason = "imperative",
    initialFocus: OverlayInitialFocus | null = null,
    returnFocus = true,
  ): void {
    if ((this.disabled && open) || this.open === open) return;
    if (open) {
      this.#openReason = reason;
      this.#initialFocus = initialFocus;
      this.#returnFocusForOpen = returnFocus;
    }
    this.open = open;
    this.emitOpenChange(open, reason);
  }

  /** Opens the surface through the same portable state-change contract as a trigger. */
  show(reason: OverlayChangeReason = "imperative"): void {
    this.requestOpenChange(true, reason);
  }

  /** Dismisses the surface through the same portable state-change contract as Escape. */
  dismiss(reason: OverlayChangeReason = "imperative"): void {
    this.requestOpenChange(false, reason);
  }

  /** Toggles the surface imperatively while retaining a reason in the emitted event. */
  toggle(reason: OverlayChangeReason = "imperative"): void {
    this.requestOpenChange(!this.open, reason);
  }

  #scheduleInteractionChange(open: boolean, reason: "hover" | "focus"): void {
    if (this.#interactionTimer !== undefined) window.clearTimeout(this.#interactionTimer);
    const delay = Math.max(0, this.interactionDelay(open, reason));
    if (delay === 0) {
      this.requestOpenChange(open, reason);
      return;
    }
    this.#interactionTimer = window.setTimeout(() => {
      this.#interactionTimer = undefined;
      this.requestOpenChange(open, reason);
    }, delay);
  }

  /** Cancels delayed hover/focus work when an owner changes interaction policy. */
  protected cancelPendingInteraction(): void {
    this.#cancelInteractionChange();
  }

  #cancelInteractionChange(): void {
    if (this.#interactionTimer === undefined) return;
    window.clearTimeout(this.#interactionTimer);
    this.#interactionTimer = undefined;
  }

  override disconnectedCallback(): void {
    this.#cancelInteractionChange();
    this.#presence.destroy();
    this.#positioner.stop();
    super.disconnectedCallback();
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
      "ui-button:not([disabled]):not([loading]), ui-input:not([disabled]), ui-textarea:not([disabled]), ui-command, ui-number-field:not([disabled]), ui-otp-field:not([disabled]), ui-select:not([disabled]), ui-combobox:not([disabled]), ui-autocomplete:not([disabled]), ui-slider:not([disabled]), ui-switch:not([disabled]), ui-checkbox:not([disabled]), ui-radio:not([disabled]), ui-toggle:not([disabled]), ui-menu-item:not([disabled])";
    const selector = `${nativeFocusable}, ${mashFocusable}`;
    const slots = [
      ...popup.querySelectorAll<HTMLSlotElement>(
        "slot:not([name]), slot[name='actions'], slot[name='cancel'], slot[name='confirm'], slot[name='close']",
      ),
    ];
    const seen = new Set<HTMLElement>();

    // Walk the rendered slot graph, including reprojected navigation and scroll
    // regions. A focus-delegating Mash control is one stop, not its host plus input.
    const visit = (element: Element): void => {
      if (element instanceof HTMLSlotElement) {
        const assigned = element.assignedElements({ flatten: true });
        for (const child of assigned.length ? assigned : element.children) visit(child);
      } else {
        if (element instanceof HTMLElement && element.matches(selector)) seen.add(element);
        if (element.matches(mashFocusable)) return;
        for (const child of element.shadowRoot?.children ?? element.children) visit(child);
      }
    };
    for (const slot of slots) {
      for (const assigned of slot.assignedElements({ flatten: true })) visit(assigned);
    }

    // Follow rendered visibility through slots as well as DOM ancestors. A hidden
    // empty-state action must not create an unreachable end of the modal tab loop.
    return [...seen].filter((item) => item.checkVisibility({ visibilityProperty: true }));
  }

  /** Lets menus and listboxes extend the baseline Escape and focus contract. */
  protected handleOverlayKeydown(_event: KeyboardEvent): boolean {
    return false;
  }

  /** Lets a specialized overlay expose richer authored anatomy inside its popup. */
  protected renderAuthoredContent(): TemplateResult {
    return html`<div part=${this.authoredContentPart}><slot></slot></div>`;
  }

  /** Lets a specialized overlay isolate a visual material plane from popup content. */
  protected renderPopupMaterial(): TemplateResult {
    return html`${nothing}`;
  }

  #triggerElements(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(":scope > [slot='trigger']")];
  }

  #eventIsWithinTrigger(event: Event): boolean {
    const path = event.composedPath();
    return this.#triggerElements().some((trigger) => path.includes(trigger));
  }

  protected eventIsWithinSlot(event: Event, name: string): boolean {
    const path = event.composedPath();
    return [...this.querySelectorAll<HTMLElement>(`:scope > [slot='${name}']`)].some((element) =>
      path.includes(element),
    );
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

  #focusPopup(): void {
    this.renderRoot.querySelector<HTMLElement>("[part='popup']")?.focus();
  }

  #clearPointerCloseFocus(): void {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    const triggers = this.#triggerElements();
    const shouldBlur =
      active === this || triggers.some((trigger) => active === trigger || trigger.contains(active));
    if (!shouldBlur) return;
    const delegated = active.shadowRoot?.activeElement;
    if (delegated instanceof HTMLElement) delegated.blur();
    active.blur();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("open") && this.open) this.overlayPresent = true;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("open")) {
      if (this.open) {
        this.#positioner.start();
        const initialFocus =
          this.#initialFocus ?? (this.#openReason === "hover" ? "none" : "first");
        const shouldMoveFocus =
          this.movesFocus && this.#openReason !== null && initialFocus !== "none";
        this.#movedFocusForOpen = shouldMoveFocus;
        if (shouldMoveFocus) {
          if (this.#returnFocusForOpen) this.#rememberFocus();
          else this.#returnFocus = null;
          queueMicrotask(() => {
            if (initialFocus === "popup") this.#focusPopup();
            else this.#focusFirst();
          });
        } else {
          this.#returnFocus = null;
        }
        this.#openReason = null;
        this.#initialFocus = null;
        this.#presence.enter("entering");
      } else {
        const previous = changed.get("open");
        if (this.#movedFocusForOpen && this.#returnFocusForOpen && previous === true)
          queueMicrotask(() => this.#returnFocus?.focus());
        else if (this.#movedFocusForOpen && !this.#returnFocusForOpen && previous === true) {
          queueMicrotask(() => this.#clearPointerCloseFocus());
          requestAnimationFrame(() => this.#clearPointerCloseFocus());
        }
        this.#movedFocusForOpen = false;
        this.#returnFocusForOpen = false;
        this.#presence.exit("exiting", previous === true);
      }
    }
    if (changed.has("disabled")) {
      if (this.disabled) this.overlayInternals.states.add("disabled");
      else this.overlayInternals.states.delete("disabled");
    }
    if (this.open && this.positioningConfig() && changed.size > 0) {
      this.#positioner.queue();
    }
  }

  #setPresenceState(state: PresenceState, present: boolean): void {
    if (present) this.overlayInternals.states.add(state);
    else this.overlayInternals.states.delete(state);
  }

  #emitPresenceEvent(
    type: "mash-presence-start" | "mash-presence-end",
    context: PresenceLifecycleContext<"entering" | "exiting">,
  ): void {
    const eventInit: CustomEventInit<OverlayPresenceEventDetail> = {
      bubbles: true,
      composed: true,
      detail: {
        open: context.open,
        phase: context.phase,
        reducedMotion: context.reducedMotion,
        interrupted: context.interrupted,
      },
    };
    if (type === "mash-presence-start") {
      this.dispatchEvent(
        new CustomEvent<OverlayPresenceEventDetail>("mash-presence-start", eventInit),
      );
      return;
    }
    this.dispatchEvent(new CustomEvent<OverlayPresenceEventDetail>("mash-presence-end", eventInit));
  }

  #onHostClick = (event: MouseEvent): void => {
    if (this.handleOverlayClick(event)) return;
    if (this.#eventIsWithinClose(event)) {
      event.preventDefault();
      this.requestOpenChange(false, "close");
      return;
    }
    if (this.interactionTriggerAction() === "click" && this.#eventIsWithinTrigger(event)) {
      event.preventDefault();
      const isPointerActivation = event.detail > 0;
      this.requestOpenChange(
        !this.open,
        "trigger",
        isPointerActivation ? this.pointerOpenFocus : "first",
        this.modal || !isPointerActivation,
      );
    }
  };

  #onPointerOver = (event: PointerEvent): void => {
    if (this.interactionTriggerAction() !== "hover") return;
    if (this.#eventIsWithinTrigger(event)) this.#scheduleInteractionChange(true, "hover");
    else if (this.open) this.#cancelInteractionChange();
  };

  #onFocusIn = (event: FocusEvent): void => {
    if (this.interactionTriggerAction() !== "hover" || !this.#eventIsWithinTrigger(event)) return;
    this.#scheduleInteractionChange(true, "focus");
  };

  #onPointerOut = (event: PointerEvent): void => {
    if (this.interactionTriggerAction() !== "hover") return;
    const related = event.relatedTarget;
    if (related instanceof Node && this.contains(related)) return;
    this.#scheduleInteractionChange(false, "hover");
  };

  #onFocusOut = (event: FocusEvent): void => {
    if (this.interactionTriggerAction() !== "hover" || !this.#eventIsWithinTrigger(event)) return;
    const related = event.relatedTarget;
    if (related instanceof Node && this.contains(related)) return;
    this.#scheduleInteractionChange(false, "focus");
  };

  #onContextTriggerKeydown = (event: KeyboardEvent): void => {
    if (
      this.interactionTriggerAction() !== "contextmenu" ||
      !this.#eventIsWithinTrigger(event) ||
      !(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    this.#contextPoint = null;
    this.requestOpenChange(true, "keyboard", "first");
  };

  #onContextMenu = (event: MouseEvent): void => {
    if (this.interactionTriggerAction() !== "contextmenu" || !this.#eventIsWithinTrigger(event))
      return;
    event.preventDefault();
    this.#contextPoint = { x: event.clientX, y: event.clientY };
    this.requestOpenChange(true, "contextmenu", null, false);
  };

  #onBackdropPointerDown = (event: PointerEvent): void => {
    const popup = this.renderRoot.querySelector<HTMLElement>("[part='popup']");
    if (!this.open || (popup && event.composedPath().includes(popup))) return;
    if (this.closeOnOutside) this.requestOpenChange(false, "outside");
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (this.handleOverlayKeydown(event)) return;
    if (event.key === "Escape" && this.closeOnEscape) {
      event.preventDefault();
      event.stopPropagation();
      this.requestOpenChange(false, "escape");
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
      <div part="trigger"><slot name="trigger"></slot></div>
      <div
        part="backdrop"
        ?hidden=${!this.overlayPresent}
        .inert=${!this.open}
        @pointerdown=${this.#onBackdropPointerDown}
      >
        <div part="positioner">
          ${this.renderPopupMaterial()}
          <div
            part="popup"
            role=${this.overlayRole}
            aria-label=${this.rendersTitle ? undefined : this.label || undefined}
            aria-labelledby=${this.rendersTitle ? this.#titleId : undefined}
            aria-describedby=${this.rendersDescription ? this.#descriptionId : undefined}
            aria-modal=${this.modal ? "true" : undefined}
            tabindex="-1"
            @keydown=${this.#onKeydown}
          >
            ${
              this.rendersTitle
                ? html`<div id=${this.#titleId} part="title">
                    <slot name="title">${this.label}</slot>
                  </div>`
                : nothing
            }
            ${
              this.rendersDescription
                ? html`<div id=${this.#descriptionId} part="description">
                    <slot name="description"></slot>
                  </div>`
                : nothing
            }
            ${this.renderAuthoredContent()}
            ${
              this.rendersActions || this.rendersCancel || this.rendersConfirm
                ? html`<div part="actions">
                    ${this.rendersActions ? html`<slot name="actions"></slot>` : nothing}
                    ${
                      this.rendersCancel
                        ? html`<div part="cancel"><slot name="cancel"></slot></div>`
                        : nothing
                    }
                    ${
                      this.rendersConfirm
                        ? html`<div part="confirm"><slot name="confirm"></slot></div>`
                        : nothing
                    }
                  </div>`
                : nothing
            }
            ${
              this.rendersClose ? html`<div part="close"><slot name="close"></slot></div>` : nothing
            }
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    "mash-presence-start": CustomEvent<OverlayPresenceEventDetail>;
    "mash-presence-end": CustomEvent<OverlayPresenceEventDetail>;
  }
}

/**
 * Shared unstyled side-positioning contract for trigger-relative overlays.
 *
 * Modal dialogs and drawers intentionally do not inherit these attributes:
 * their renderer or catalogue owns viewport placement. Popovers, menus,
 * tooltips, previews, and pickers share the exact same portable positioning
 * vocabulary and collision behavior.
 */
export abstract class UIAnchoredOverlay extends UIOverlay {
  static override properties = {
    ...UIOverlay.properties,
    placement: { type: String, reflect: true },
    align: { type: String, reflect: true },
    offset: { type: Number, reflect: true },
    collisionPadding: { type: Number, attribute: "collision-padding", reflect: true },
  };

  /** Preferred side of the popup before collision handling. */
  declare placement: OverlaySide;
  /** Alignment of the popup along its selected side. */
  declare align: OverlayAlign;
  /** Gap in CSS pixels between the popup and its trigger. */
  declare offset: number;
  /** Minimum viewport-edge clearance in CSS pixels. */
  declare collisionPadding: number;

  #anchorElement: HTMLElement | null = null;

  constructor() {
    super();
    this.placement = "bottom";
    this.align = "start";
    this.offset = 4;
    this.collisionPadding = 4;
  }

  protected override positioningConfig(): AnchoredPositionConfig {
    return {
      placement: this.placement,
      align: this.align,
      offset: this.offset,
      collisionPadding: this.collisionPadding,
    };
  }

  /**
   * Optional Web realization anchor for composite-owned overlays such as a
   * submenu. It is deliberately a property rather than an attribute: the
   * portable contract remains placement/alignment while the renderer supplies
   * the concrete element handle.
   */
  get anchorElement(): HTMLElement | null {
    return this.#anchorElement;
  }

  set anchorElement(value: HTMLElement | null) {
    if (this.#anchorElement === value) return;
    this.#anchorElement = value;
    this.queuePosition();
  }

  /** Read-only Web geometry for composite pointer corridors such as submenus. */
  get positionSnapshot(): AnchoredPositionSnapshot | null {
    return this.overlayPositionSnapshot();
  }

  protected override positionAnchor(): HTMLElement | null {
    return this.#anchorElement ?? super.positionAnchor();
  }
}
