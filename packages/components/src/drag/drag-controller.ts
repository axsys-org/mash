import { DragAutoScrollController, type DragAutoScrollOptions } from "./auto-scroll.js";
import {
  clampDragPosition,
  type DragAxis,
  type DragPoint,
  type DragRect,
  type DragRectInput,
  elementPaddingRect,
  pointsEqual,
  rectFromDomRect,
  rectFromEdges,
  resolveDragRect,
  subtractPoint,
  viewportRect,
} from "./geometry.js";
import { resolveDragSnap, type DragSnapOptions, type DragSnapTarget } from "./snap.js";

export type DragTarget = HTMLElement | SVGElement;
export type DragContainment =
  | "parent"
  | "viewport"
  | Element
  | Window
  | DragRect
  | DragRectInput
  | (() => Element | Window | DragRect | DragRectInput)
  | false;

export interface DragPositioner {
  read(target: DragTarget): DragPoint;
  write(target: DragTarget, position: DragPoint): void;
}

export interface DragControllerOptions {
  /** Pointer travel in CSS pixels before capture and drag-start. */
  threshold?: number;
  axis?: DragAxis;
  containment?: DragContainment;
  snap?: DragSnapOptions | false;
  autoScroll?: DragAutoScrollOptions | boolean;
  handle?: Element;
  position?: DragPoint;
  positioner?: DragPositioner;
  /** Emits positions without writing them. The owner must feed committed positions back through `position`. */
  controlled?: boolean;
  disabled?: boolean;
}

export interface DragEventDetail {
  controller: DragController;
  /** True when an end event aborts instead of committing a drop. */
  cancelled?: boolean;
  position: DragPoint;
  delta: DragPoint;
  pointer: DragPoint;
  pointerId: number;
  snapped: boolean;
  snappedX: boolean;
  snappedY: boolean;
  snapTargets: readonly DragSnapTarget[];
  autoScrolling: boolean;
}

const directPositions = new WeakMap<DragTarget, DragPoint>();
const leftTopPositions = new WeakMap<DragTarget, DragPoint>();

/** Safe default: writes only Mash-owned custom properties and never replaces `transform`. */
export const cssVariableDragPositioner: DragPositioner = {
  read(target) {
    return {
      x: Number.parseFloat(target.style.getPropertyValue("--ui-drag-x")) || 0,
      y: Number.parseFloat(target.style.getPropertyValue("--ui-drag-y")) || 0,
    };
  },
  write(target, position) {
    target.style.setProperty("--ui-drag-x", `${position.x}px`);
    target.style.setProperty("--ui-drag-y", `${position.y}px`);
  },
};

/** Opt-in writer for targets that dedicate the CSS `translate` property to dragging. */
export const cssTranslateDragPositioner: DragPositioner = {
  read(target) {
    return directPositions.get(target) ?? { x: 0, y: 0 };
  },
  write(target, position) {
    directPositions.set(target, { ...position });
    target.style.translate = `${position.x}px ${position.y}px`;
  },
};

/** Opt-in layout writer matching PlainDraggable's `leftTop` mode. */
export const leftTopDragPositioner: DragPositioner = {
  read(target) {
    return (
      leftTopPositions.get(target) ?? {
        x: Number.parseFloat(target.style.left) || 0,
        y: Number.parseFloat(target.style.top) || 0,
      }
    );
  },
  write(target, position) {
    leftTopPositions.set(target, { ...position });
    target.style.left = `${position.x}px`;
    target.style.top = `${position.y}px`;
  },
};

function isWindow(value: unknown, view: Window): value is Window {
  return value === view;
}

function isElement(value: unknown): value is Element {
  return (
    typeof value === "object" &&
    value !== null &&
    "getBoundingClientRect" in value &&
    typeof value.getBoundingClientRect === "function"
  );
}

function isResolvedRect(value: DragRect | DragRectInput): value is DragRect {
  return (
    typeof value.left === "number" &&
    typeof value.top === "number" &&
    typeof value.right === "number" &&
    typeof value.bottom === "number" &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
}

function nearestScrollable(target: DragTarget): HTMLElement | Window {
  const view = target.ownerDocument.defaultView;
  if (!view) throw new Error("Drag target must belong to a live document.");
  let candidate = target.parentElement;
  while (candidate) {
    const style = view.getComputedStyle(candidate);
    const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
    if (
      /(auto|scroll|overlay)/.test(overflow) &&
      (candidate.scrollWidth > candidate.clientWidth ||
        candidate.scrollHeight > candidate.clientHeight)
    ) {
      return candidate;
    }
    candidate = candidate.parentElement;
  }
  return view;
}

/**
 * Pointer-driven drag behavior with no import-time browser access or global listeners.
 *
 * The controller owns only transient interaction state. Product-specific drop,
 * sorting, persistence, and namespace behavior belongs to consumers.
 */
export class DragController {
  readonly target: DragTarget;
  #options: Required<Pick<DragControllerOptions, "axis" | "controlled" | "disabled">> &
    Omit<DragControllerOptions, "axis" | "controlled" | "disabled">;
  #handle: Element;
  #positioner: DragPositioner;
  #position: DragPoint;
  #pointerId: number | undefined;
  #startPointer: DragPoint = { x: 0, y: 0 };
  #lastPointer: DragPoint = { x: 0, y: 0 };
  #startPosition: DragPoint = { x: 0, y: 0 };
  #pointerOffset: DragPoint = { x: 0, y: 0 };
  #startBaseRect: DragRect | undefined;
  #started = false;
  #suppressClick = false;
  #moving = false;
  #snappedX = false;
  #snappedY = false;
  #autoScrolling = false;
  #autoScrollController: DragAutoScrollController | undefined;
  #destroyed = false;
  #ending = false;

  constructor(target: DragTarget, options: DragControllerOptions = {}) {
    const view = target.ownerDocument.defaultView;
    if (!view) throw new Error("Drag target must belong to a live document.");
    this.target = target;
    this.#options = {
      ...options,
      axis: options.axis ?? "both",
      controlled: options.controlled ?? false,
      disabled: options.disabled ?? false,
      containment: options.containment ?? "parent",
    };
    this.#positioner = options.positioner ?? cssVariableDragPositioner;
    this.#position = options.position ?? this.#positioner.read(target);
    this.#handle = options.handle ?? target;
    this.#attachHandle(this.#handle);
    if (!this.#options.controlled) this.#positioner.write(this.target, this.#position);
  }

  get position(): DragPoint {
    return { ...this.#position };
  }

  set position(value: DragPoint) {
    if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) return;
    this.#position = { x: value.x, y: value.y };
    if (!this.#options.controlled) this.#positioner.write(this.target, this.#position);
  }

  get dragging(): boolean {
    return this.#pointerId !== undefined;
  }

  get disabled(): boolean {
    return this.#options.disabled;
  }

  set disabled(value: boolean) {
    this.updateOptions({ disabled: value });
  }

  updateOptions(options: Partial<DragControllerOptions>): void {
    if (this.#destroyed) return;
    const previousHandle = this.#handle;
    const previousControlled = this.#options.controlled;
    this.#options = {
      ...this.#options,
      ...options,
      axis: options.axis ?? this.#options.axis,
      controlled: options.controlled ?? this.#options.controlled,
      disabled: options.disabled ?? this.#options.disabled,
    };
    if (options.positioner) this.#positioner = options.positioner;
    this.#handle = options.handle ?? this.#options.handle ?? this.target;
    if (this.#handle !== previousHandle) {
      this.#detachHandle(previousHandle);
      this.#attachHandle(this.#handle);
    }
    if (options.position) this.position = options.position;
    if (this.#options.disabled && this.dragging) this.cancel();
    if (options.autoScroll !== undefined) {
      this.#autoScrollController?.destroy();
      this.#autoScrollController = undefined;
    }
    if (previousControlled && !this.#options.controlled) {
      this.#positioner.write(this.target, this.#position);
    } else if (options.positioner && !this.#options.controlled) {
      this.#positioner.write(this.target, this.#position);
    }
  }

  /** Recalculates active containment and snap geometry after external layout changes. */
  refresh(): void {
    if (this.#started) this.#move(this.#lastPointer);
  }

  /** Abort the current gesture without committing a drop. */
  cancel(): void {
    this.#end(true);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.cancel();
    this.#detachHandle(this.#handle);
    this.#autoScrollController?.destroy();
    this.#autoScrollController = undefined;
    this.#destroyed = true;
  }

  #attachHandle(handle: Element): void {
    handle.addEventListener("pointerdown", this.#onPointerDown);
    handle.addEventListener("click", this.#onClick, true);
    handle.addEventListener("dragstart", this.#onNativeDrag);
    handle.addEventListener("lostpointercapture", this.#onLostPointerCapture);
  }

  #detachHandle(handle: Element): void {
    handle.removeEventListener("pointerdown", this.#onPointerDown);
    handle.removeEventListener("click", this.#onClick, true);
    handle.removeEventListener("dragstart", this.#onNativeDrag);
    handle.removeEventListener("lostpointercapture", this.#onLostPointerCapture);
  }

  #onPointerDown = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (
      this.#destroyed ||
      this.#options.disabled ||
      this.dragging ||
      pointer.button !== 0 ||
      !pointer.isPrimary
    ) {
      return;
    }
    const point = { x: pointer.clientX, y: pointer.clientY };
    const rect = rectFromDomRect(this.target.getBoundingClientRect());
    this.#pointerId = pointer.pointerId;
    this.#startPointer = point;
    this.#lastPointer = point;
    this.#startPosition = { ...this.#position };
    this.#suppressClick = false;
    this.#started = false;
    const doc = this.target.ownerDocument;
    doc.addEventListener("pointermove", this.#onPointerMove);
    doc.addEventListener("pointerup", this.#onPointerEnd);
    doc.addEventListener("pointercancel", this.#onPointerEnd);
    doc.addEventListener("keydown", this.#onKeydown, true);
    this.#pointerOffset = { x: rect.left - point.x, y: rect.top - point.y };
    this.#startBaseRect = rectFromEdges(
      rect.left - this.#position.x,
      rect.top - this.#position.y,
      rect.right - this.#position.x,
      rect.bottom - this.#position.y,
    );
    this.#moving = false;
    this.#snappedX = false;
    this.#snappedY = false;
    if (!(this.#options.threshold && this.#options.threshold > 0)) this.#begin(pointer);
  };

  #begin(pointer: PointerEvent): boolean {
    const pointerId = this.#pointerId;
    if (
      !this.#dispatch(
        "ui-drag-start",
        this.#detail(this.#startPointer, this.#position, false, false, []),
        true,
      )
    ) {
      this.#end(true);
      return false;
    }
    if (this.#destroyed || this.#pointerId !== pointerId || pointerId === undefined) return false;
    this.#started = true;
    pointer.preventDefault();
    if ("setPointerCapture" in this.#handle) {
      try {
        this.#handle.setPointerCapture(pointer.pointerId);
      } catch {
        // Synthetic pointer events and detached test fixtures may not support capture.
      }
    }
    return true;
  }

  #onPointerMove = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointer.pointerId !== this.#pointerId) return;
    if (!this.#started) {
      if (
        Math.hypot(pointer.clientX - this.#startPointer.x, pointer.clientY - this.#startPointer.y) <
        (this.#options.threshold ?? 0)
      )
        return;
      if (!this.#begin(pointer)) return;
    }
    pointer.preventDefault();
    this.#move({ x: pointer.clientX, y: pointer.clientY });
  };

  #onPointerEnd = (event: Event): void => {
    if ((event as PointerEvent).pointerId !== this.#pointerId) return;
    this.#end(event.type === "pointercancel");
  };

  #onLostPointerCapture = (event: Event): void => {
    if ((event as PointerEvent).pointerId === this.#pointerId && !this.#ending) this.#end(true);
  };

  #onClick = (event: Event): void => {
    if (!this.#suppressClick) return;
    this.#suppressClick = false;
    if ((event as MouseEvent).detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #onNativeDrag = (event: Event): void => {
    if (this.dragging) event.preventDefault();
  };
  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    if (this.#started) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.cancel();
  };

  #move(pointer: DragPoint): void {
    if (this.#pointerId === undefined || !this.#startBaseRect) return;
    this.#lastPointer = pointer;
    const baseRect = this.#baseRect();
    let candidate = this.#options.controlled
      ? {
          x: this.#startPosition.x + pointer.x - this.#startPointer.x,
          y: this.#startPosition.y + pointer.y - this.#startPointer.y,
        }
      : {
          x: pointer.x + this.#pointerOffset.x - baseRect.left,
          y: pointer.y + this.#pointerOffset.y - baseRect.top,
        };
    if (this.#options.axis === "x") candidate.y = this.#position.y;
    if (this.#options.axis === "y") candidate.x = this.#position.x;

    const containment = this.#containmentRect();
    candidate = clampDragPosition(
      candidate,
      this.#position,
      baseRect,
      containment,
      this.#options.axis,
    );
    const snap = resolveDragSnap(
      candidate,
      baseRect,
      this.#options.snap === false ? undefined : this.#options.snap,
    );
    candidate = clampDragPosition(
      snap.position,
      this.#position,
      baseRect,
      containment,
      this.#options.axis,
    );
    const snappedX = snap.snappedX && candidate.x === snap.position.x;
    const snappedY = snap.snappedY && candidate.y === snap.position.y;
    const proposal = this.#detail(pointer, candidate, snappedX, snappedY, snap.targets);
    if (!this.#dispatch("ui-drag", proposal, true)) return;

    const moved = !pointsEqual(candidate, this.#position);
    this.#position = candidate;
    this.#snappedX = snappedX;
    this.#snappedY = snappedY;
    if (!this.#options.controlled) this.#positioner.write(this.target, candidate);
    this.#autoScrolling = this.#updateAutoScroll(pointer);
    const committed = { ...proposal, autoScrolling: this.#autoScrolling };
    if (moved && !this.#moving) {
      this.#moving = true;
      this.#dispatch("ui-drag-move-start", committed);
    }
    if (moved) this.#dispatch("ui-drag-move", committed);
  }

  #baseRect(): DragRect {
    if (this.#options.controlled) return this.#startBaseRect!;
    const rect = rectFromDomRect(this.target.getBoundingClientRect());
    return rectFromEdges(
      rect.left - this.#position.x,
      rect.top - this.#position.y,
      rect.right - this.#position.x,
      rect.bottom - this.#position.y,
    );
  }

  #containmentRect(): DragRect {
    const view = this.target.ownerDocument.defaultView!;
    const viewport = viewportRect(view);
    let containment = this.#options.containment ?? "parent";
    if (typeof containment === "function") containment = containment();
    if (containment === false) {
      const limit = Number.MAX_SAFE_INTEGER;
      return rectFromEdges(-limit, -limit, limit, limit);
    }
    if (containment === "viewport" || isWindow(containment, view)) {
      return viewport;
    }
    if (containment === "parent") {
      const parent = this.target.parentElement;
      return parent ? elementPaddingRect(parent) : viewport;
    }
    if (isElement(containment)) return elementPaddingRect(containment);
    return isResolvedRect(containment) ? containment : resolveDragRect(containment, viewport);
  }

  #updateAutoScroll(pointer: DragPoint): boolean {
    const option = this.#options.autoScroll;
    if (!option) {
      this.#autoScrollController?.stop();
      return false;
    }
    if (!this.#autoScrollController) {
      const resolved = option === true ? { target: nearestScrollable(this.target) } : option;
      this.#autoScrollController = new DragAutoScrollController(resolved, () => {
        if (this.#started) this.#move(this.#lastPointer);
      });
    }
    return this.#autoScrollController.update(pointer);
  }

  #end(cancelled = false): void {
    if (this.#pointerId === undefined || this.#ending) return;
    this.#ending = true;
    const pointerId = this.#pointerId;
    const doc = this.target.ownerDocument;
    doc.removeEventListener("pointermove", this.#onPointerMove);
    doc.removeEventListener("pointerup", this.#onPointerEnd);
    doc.removeEventListener("pointercancel", this.#onPointerEnd);
    doc.removeEventListener("keydown", this.#onKeydown, true);
    this.#autoScrollController?.stop();
    this.#autoScrolling = false;
    if ("hasPointerCapture" in this.#handle && this.#handle.hasPointerCapture(pointerId)) {
      try {
        this.#handle.releasePointerCapture(pointerId);
      } catch {
        // The browser can release capture before pointercancel reaches the controller.
      }
    }
    if (this.#started) {
      this.#suppressClick = this.#moving;
      this.#dispatch("ui-drag-end", {
        ...this.#detail(this.#lastPointer, this.#position, this.#snappedX, this.#snappedY, []),
        cancelled,
      });
    }
    this.#started = false;
    this.#pointerId = undefined;
    this.#moving = false;
    this.#snappedX = false;
    this.#snappedY = false;
    this.#startBaseRect = undefined;
    this.#ending = false;
  }

  #detail(
    pointer: DragPoint,
    position: DragPoint,
    snappedX: boolean,
    snappedY: boolean,
    snapTargets: readonly DragSnapTarget[],
  ): DragEventDetail {
    return {
      controller: this,
      position: { ...position },
      delta: subtractPoint(position, this.#startPosition),
      pointer: { ...pointer },
      pointerId: this.#pointerId ?? -1,
      snapped: snappedX || snappedY,
      snappedX,
      snappedY,
      snapTargets,
      autoScrolling: this.#autoScrolling,
    };
  }

  #dispatch(name: string, detail: DragEventDetail, cancelable = false): boolean {
    const EventConstructor = this.target.ownerDocument.defaultView?.CustomEvent ?? CustomEvent;
    return this.target.dispatchEvent(
      new EventConstructor(name, {
        detail,
        bubbles: true,
        composed: true,
        cancelable,
      }),
    );
  }
}

export function createDraggable(
  target: DragTarget,
  options: DragControllerOptions = {},
): DragController {
  return new DragController(target, options);
}
