import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";

import {
  cssVariableDragPositioner,
  DragController,
  type DragAutoScrollOptions,
  type DragAxis,
  type DragContainment,
  type DragEventDetail,
  type DragSnapTarget,
} from "../drag/drag.js";
import { baseStyles } from "../internal/base-styles.js";

export type DraggableContainment = "parent" | "viewport" | "none";

/**
 * A headless, declarative movable surface backed by the typed Mash drag controller.
 *
 * The component owns pointer movement only. Sorting, dropping, persistence, and
 * product-specific commands remain the responsibility of the surrounding application.
 *
 * @tag ui-draggable
 * @summary Moves authored HTML with containment, snapping, handles, and edge auto-scroll.
 *
 * @example Movable project card
 * <div style="position: relative; min-height: 20rem; overflow: hidden;">
 *   <ui-draggable snap-step="16" containment="parent">
 *     <ui-toolbar slot="handle" label="Move project card">
 *       <ui-badge>Drag project</ui-badge>
 *     </ui-toolbar>
 *     <ui-card title="Billing migration" description="Interzone project" elevation="raised">
 *       Replace the legacy invoice flow before the next billing cycle.
 *     </ui-card>
 *   </ui-draggable>
 * </div>
 *
 * @example Constrained axes
 * <div style="position: relative; min-height: 16rem; overflow: hidden;">
 *   <ui-draggable axis="x" containment="parent" snap-step="24">
 *     <ui-badge slot="handle">Horizontal only</ui-badge>
 *     <ui-card title="Timeline handle">Movement remains on the inline axis.</ui-card>
 *   </ui-draggable>
 * </div>
 *
 * @slot - Content that moves with the host.
 * @slot handle - Optional dedicated drag handle; the whole host is the fallback handle.
 * @csspart root - The semantic movable surface.
 * @csspart handle - The authored handle binding.
 * @csspart content - The moving content binding.
 * @cssstate dragging - Matches `:state(dragging)` during an active pointer session.
 * @cssstate moving - Matches `:state(moving)` after the position first changes.
 * @cssstate snapped - Matches `:state(snapped)` while a snap target is active.
 * @cssstate auto-scrolling - Matches `:state(auto-scrolling)` while an edge scroll runs.
 *
 * @fires {CustomEvent<DragEventDetail>} ui-drag-start - Cancelable request to begin dragging.
 * @fires {CustomEvent<DragEventDetail>} ui-drag - Cancelable candidate position before movement.
 * @fires {CustomEvent<DragEventDetail>} ui-drag-move-start - First committed movement.
 * @fires {CustomEvent<DragEventDetail>} ui-drag-move - Reports each committed position.
 * @fires {CustomEvent<DragEventDetail>} ui-drag-end - Reports the final committed position.
 *
 * @mashnode root movable
 * @mashnode handle handle root
 * @mashnode content content root
 * @mashnode position position root
 * @mashnode axis axis root
 * @mashnode containment containment root
 * @mashnode dragging dragging root
 * @mashnode moving moving root
 * @mashnode snapped snapped root
 * @mashnode auto-scrolling auto-scrolling root
 * @mashnode drag-start drag-start root
 * @mashnode drag drag root
 * @mashnode drag-move-start drag-move-start root
 * @mashnode drag-move drag-move root
 * @mashnode drag-end drag-end root
 * @mashrole part root movable root
 * @mashrole slot handle handle handle
 * @mashrole slot default content content
 * @mashrole part handle handle handle
 * @mashrole part content content content
 * @mashrole event ui-drag-start drag-start drag-start
 * @mashrole event ui-drag drag drag
 * @mashrole event ui-drag-move-start drag-move-start drag-move-start
 * @mashrole event ui-drag-move drag-move drag-move
 * @mashrole event ui-drag-end drag-end drag-end
 */
export class UIDraggable extends LitElement {
  static override properties = {
    axis: { type: String, reflect: true },
    containment: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    controlled: { type: Boolean, reflect: true },
    autoScroll: { type: Boolean, attribute: "auto-scroll", reflect: true },
    snapStep: { type: Number, attribute: "snap-step", reflect: true },
    snapGravity: { type: Number, attribute: "snap-gravity", reflect: true },
    x: { type: Number, reflect: true },
    y: { type: Number, reflect: true },
    dragging: { type: Boolean, reflect: true },
    moving: { type: Boolean, reflect: true },
    snapped: { type: Boolean, reflect: true },
    autoScrolling: { type: Boolean, attribute: "auto-scrolling", reflect: true },
    containmentTarget: { attribute: false },
    snapTargets: { attribute: false },
    autoScrollOptions: { attribute: false },
  };

  /** Permitted movement axis. */
  declare axis: DragAxis;
  /** Declarative containment policy; `containmentTarget` can provide an element or rectangle. */
  declare containment: DraggableContainment;
  /** Prevents new drag sessions and ends an active one. */
  declare disabled: boolean;
  /** Emits candidate positions without committing them until the owner updates `x` and `y`. */
  declare controlled: boolean;
  /** Enables edge auto-scroll using the nearest scrollable ancestor. */
  declare autoScroll: boolean;
  /** Grid interval in CSS pixels; zero disables the declarative grid. */
  declare snapStep: number;
  /** Snap attraction distance in CSS pixels. */
  declare snapGravity: number;
  /** Current inline translation in CSS pixels. */
  declare x: number;
  /** Current block translation in CSS pixels. */
  declare y: number;
  /** True during an active pointer session. */
  declare dragging: boolean;
  /** True after an active pointer session first changes position. */
  declare moving: boolean;
  /** True while the current position is attached to a snap target. */
  declare snapped: boolean;
  /** True while edge auto-scroll is active. */
  declare autoScrolling: boolean;
  /** Imperative containment element, window, rectangle, or resolver. */
  declare containmentTarget: DragContainment | undefined;
  /** Additional typed point, line, grid, rectangle, or element snap targets. */
  declare snapTargets: readonly DragSnapTarget[];
  /** Full edge auto-scroll configuration; overrides the boolean convenience attribute. */
  declare autoScrollOptions: DragAutoScrollOptions | undefined;

  readonly #internals: ElementInternals;
  #controller: DragController | undefined;

  constructor() {
    super();
    this.axis = "both";
    this.containment = "parent";
    this.disabled = false;
    this.controlled = false;
    this.autoScroll = false;
    this.snapStep = 0;
    this.snapGravity = 20;
    this.x = 0;
    this.y = 0;
    this.dragging = false;
    this.moving = false;
    this.snapped = false;
    this.autoScrolling = false;
    this.containmentTarget = undefined;
    this.snapTargets = [];
    this.autoScrollOptions = undefined;
    this.#internals = this.attachInternals();
    this.addEventListener("ui-drag-start", this.#onDragStart as EventListener);
    this.addEventListener("ui-drag-move-start", this.#onMoveStart as EventListener);
    this.addEventListener("ui-drag-move", this.#onMove as EventListener);
    this.addEventListener("ui-drag-end", this.#onDragEnd as EventListener);
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        box-sizing: border-box;
        translate: var(--ui-drag-x, 0) var(--ui-drag-y, 0);
        touch-action: none;
      }

      :host([hidden]) {
        display: none !important;
      }

      [part="root"] {
        display: block;
      }
    `,
  ];

  /** The reusable imperative controller used by this declarative adapter. */
  get controller(): DragController | undefined {
    return this.#controller;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => this.#syncController());
  }

  override disconnectedCallback(): void {
    this.#controller?.destroy();
    this.#controller = undefined;
    super.disconnectedCallback();
  }

  /** Re-measures containment and snap geometry after an external layout change. */
  refresh(): void {
    this.#controller?.refresh();
  }

  /** Moves back to the authored origin. */
  resetPosition(): void {
    this.x = 0;
    this.y = 0;
  }

  #onDragStart = (event: CustomEvent<DragEventDetail>): void => {
    if (event.target !== this) return;
    queueMicrotask(() => {
      if (event.defaultPrevented || !this.#controller?.dragging) return;
      this.dragging = true;
      this.moving = false;
      this.#setState("dragging", true);
      this.#setState("moving", false);
    });
  };

  #onMoveStart = (event: CustomEvent<DragEventDetail>): void => {
    if (event.target !== this) return;
    this.moving = true;
    this.#setState("moving", true);
  };

  #onMove = (event: CustomEvent<DragEventDetail>): void => {
    if (event.target !== this) return;
    if (!this.controlled) {
      this.x = event.detail.position.x;
      this.y = event.detail.position.y;
    }
    this.snapped = event.detail.snapped;
    this.autoScrolling = event.detail.autoScrolling;
    this.#setState("snapped", this.snapped);
    this.#setState("auto-scrolling", this.autoScrolling);
  };

  #onDragEnd = (event: CustomEvent<DragEventDetail>): void => {
    if (event.target !== this) return;
    if (!this.controlled) {
      this.x = event.detail.position.x;
      this.y = event.detail.position.y;
    }
    this.dragging = false;
    this.moving = false;
    this.snapped = false;
    this.autoScrolling = false;
    this.#setState("dragging", false);
    this.#setState("moving", false);
    this.#setState("snapped", false);
    this.#setState("auto-scrolling", false);
  };

  #setState(name: string, enabled: boolean): void {
    if (enabled) this.#internals.states.add(name);
    else this.#internals.states.delete(name);
  }

  #resolvedContainment(): DragContainment {
    if (this.containmentTarget !== undefined) return this.containmentTarget;
    if (this.containment === "none") return false;
    return this.containment;
  }

  #resolvedSnapTargets(): readonly DragSnapTarget[] {
    if (!(this.snapStep > 0)) return this.snapTargets;
    return [{ kind: "grid", step: this.snapStep }, ...this.snapTargets];
  }

  #assignedHandle(): Element {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="handle"]');
    return slot?.assignedElements({ flatten: true })[0] ?? this;
  }

  #syncController(): void {
    if (!this.isConnected || !this.shadowRoot) return;
    const options = {
      axis: this.axis,
      containment: this.#resolvedContainment(),
      disabled: this.disabled,
      controlled: this.controlled,
      autoScroll: this.autoScrollOptions ?? this.autoScroll,
      snap: {
        targets: this.#resolvedSnapTargets(),
        gravity: this.snapGravity,
      },
      handle: this.#assignedHandle(),
      position: { x: this.x, y: this.y },
      positioner: cssVariableDragPositioner,
    } as const;
    if (!this.#controller) this.#controller = new DragController(this, options);
    else this.#controller.updateOptions(options);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if ((changed.has("x") || changed.has("y")) && this.controlled) {
      cssVariableDragPositioner.write(this, { x: this.x, y: this.y });
    }
    this.#syncController();
  }

  protected override render(): TemplateResult {
    return html`
      <div part="root" aria-disabled=${this.disabled ? "true" : "false"}>
        <slot name="handle" part="handle" @slotchange=${this.#syncController}></slot>
        <slot part="content"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    "ui-drag-start": CustomEvent<DragEventDetail>;
    "ui-drag": CustomEvent<DragEventDetail>;
    "ui-drag-move-start": CustomEvent<DragEventDetail>;
    "ui-drag-move": CustomEvent<DragEventDetail>;
    "ui-drag-end": CustomEvent<DragEventDetail>;
  }
}
