import { type DragPoint, type DragRect, rectFromDomRect, translateDragRect } from "./geometry.js";

export type DragSnapAnchor = "left" | "center-x" | "right" | "top" | "center-y" | "bottom";

interface DragSnapTargetBase {
  /** Maximum distance in CSS pixels at which this target attracts the draggable. */
  gravity?: number;
}

export interface DragGridSnapTarget extends DragSnapTargetBase {
  kind: "grid";
  step: number | DragPoint;
  origin?: Partial<DragPoint>;
}

export interface DragPointSnapTarget extends DragSnapTargetBase {
  kind: "point";
  point: DragPoint;
  anchor?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
}

export interface DragLineSnapTarget extends DragSnapTargetBase {
  kind: "line";
  axis: "x" | "y";
  value: number;
  source?: DragSnapAnchor;
}

export interface DragRectSnapTarget extends DragSnapTargetBase {
  kind: "rect";
  rect: DragRect;
  source?: readonly DragSnapAnchor[];
  target?: readonly DragSnapAnchor[];
}

export interface DragElementSnapTarget extends DragSnapTargetBase {
  kind: "element";
  element: Element;
  source?: readonly DragSnapAnchor[];
  target?: readonly DragSnapAnchor[];
}

export type DragSnapTarget =
  | DragGridSnapTarget
  | DragPointSnapTarget
  | DragLineSnapTarget
  | DragRectSnapTarget
  | DragElementSnapTarget;

export interface DragSnapOptions {
  targets: readonly DragSnapTarget[];
  /** Default attraction distance in CSS pixels. */
  gravity?: number;
}

export interface DragSnapResult {
  position: DragPoint;
  snappedX: boolean;
  snappedY: boolean;
  targets: readonly DragSnapTarget[];
}

interface Candidate {
  correction: number;
  target: DragSnapTarget;
}

const DEFAULT_GRAVITY = 20;
const DEFAULT_RECT_ANCHORS = [
  "left",
  "right",
  "top",
  "bottom",
] as const satisfies readonly DragSnapAnchor[];

function anchorAxis(anchor: DragSnapAnchor): "x" | "y" {
  return anchor === "left" || anchor === "center-x" || anchor === "right" ? "x" : "y";
}

function anchorValue(rect: DragRect, anchor: DragSnapAnchor): number {
  switch (anchor) {
    case "left":
      return rect.left;
    case "center-x":
      return rect.left + rect.width / 2;
    case "right":
      return rect.right;
    case "top":
      return rect.top;
    case "center-y":
      return rect.top + rect.height / 2;
    case "bottom":
      return rect.bottom;
  }
}

function pointAnchorValues(
  rect: DragRect,
  anchor: NonNullable<DragPointSnapTarget["anchor"]>,
): DragPoint {
  switch (anchor) {
    case "top-left":
      return { x: rect.left, y: rect.top };
    case "top-right":
      return { x: rect.right, y: rect.top };
    case "bottom-left":
      return { x: rect.left, y: rect.bottom };
    case "bottom-right":
      return { x: rect.right, y: rect.bottom };
    case "center":
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
}

function gravityFor(target: DragSnapTarget, options: DragSnapOptions): number {
  const gravity = target.gravity ?? options.gravity ?? DEFAULT_GRAVITY;
  return Math.max(0, gravity);
}

function consider(
  current: Candidate | undefined,
  correction: number,
  target: DragSnapTarget,
  gravity: number,
): Candidate | undefined {
  if (Math.abs(correction) > gravity) return current;
  if (!current || Math.abs(correction) < Math.abs(current.correction))
    return { correction, target };
  return current;
}

function targetRect(target: DragRectSnapTarget | DragElementSnapTarget): DragRect {
  return target.kind === "rect"
    ? target.rect
    : rectFromDomRect(target.element.getBoundingClientRect());
}

/** Resolves the nearest independent X and Y snap corrections. */
export function resolveDragSnap(
  position: DragPoint,
  baseRect: DragRect,
  options: DragSnapOptions | undefined,
): DragSnapResult {
  if (!options?.targets.length) {
    return { position, snappedX: false, snappedY: false, targets: [] };
  }

  const moving = translateDragRect(baseRect, position);
  let xCandidate: Candidate | undefined;
  let yCandidate: Candidate | undefined;

  for (const target of options.targets) {
    const gravity = gravityFor(target, options);
    if (target.kind === "grid") {
      const step =
        typeof target.step === "number" ? { x: target.step, y: target.step } : target.step;
      const origin = { x: target.origin?.x ?? 0, y: target.origin?.y ?? 0 };
      if (step.x > 0) {
        const snapped = origin.x + Math.round((position.x - origin.x) / step.x) * step.x;
        xCandidate = consider(xCandidate, snapped - position.x, target, gravity);
      }
      if (step.y > 0) {
        const snapped = origin.y + Math.round((position.y - origin.y) / step.y) * step.y;
        yCandidate = consider(yCandidate, snapped - position.y, target, gravity);
      }
      continue;
    }

    if (target.kind === "point") {
      const source = pointAnchorValues(moving, target.anchor ?? "top-left");
      xCandidate = consider(xCandidate, target.point.x - source.x, target, gravity);
      yCandidate = consider(yCandidate, target.point.y - source.y, target, gravity);
      continue;
    }

    if (target.kind === "line") {
      const source = target.source ?? (target.axis === "x" ? "left" : "top");
      if (anchorAxis(source) !== target.axis) continue;
      const correction = target.value - anchorValue(moving, source);
      if (target.axis === "x") xCandidate = consider(xCandidate, correction, target, gravity);
      else yCandidate = consider(yCandidate, correction, target, gravity);
      continue;
    }

    const destination = targetRect(target);
    const sourceAnchors = target.source ?? DEFAULT_RECT_ANCHORS;
    const targetAnchors = target.target ?? DEFAULT_RECT_ANCHORS;
    for (const sourceAnchor of sourceAnchors) {
      for (const targetAnchor of targetAnchors) {
        const axis = anchorAxis(sourceAnchor);
        if (axis !== anchorAxis(targetAnchor)) continue;
        const correction =
          anchorValue(destination, targetAnchor) - anchorValue(moving, sourceAnchor);
        if (axis === "x") xCandidate = consider(xCandidate, correction, target, gravity);
        else yCandidate = consider(yCandidate, correction, target, gravity);
      }
    }
  }

  const matchedTargets = new Set<DragSnapTarget>();
  if (xCandidate) matchedTargets.add(xCandidate.target);
  if (yCandidate) matchedTargets.add(yCandidate.target);
  return {
    position: {
      x: position.x + (xCandidate?.correction ?? 0),
      y: position.y + (yCandidate?.correction ?? 0),
    },
    snappedX: Boolean(xCandidate),
    snappedY: Boolean(yCandidate),
    targets: [...matchedTargets],
  };
}
