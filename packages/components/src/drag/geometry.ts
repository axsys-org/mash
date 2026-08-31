export interface DragPoint {
  x: number;
  y: number;
}

export interface DragRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export type DragAxis = "both" | "x" | "y";
export type DragLength = number | `${number}%`;

export interface DragRectInput {
  x?: DragLength;
  y?: DragLength;
  left?: DragLength;
  top?: DragLength;
  right?: DragLength;
  bottom?: DragLength;
  width?: DragLength;
  height?: DragLength;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const percent = (value: string): number | undefined => {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))%$/.exec(value.trim());
  if (!match?.[1]) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed / 100 : undefined;
};

function resolveCoordinate(
  value: DragLength | undefined,
  origin: number,
  size: number,
): number | undefined {
  if (finite(value)) return value;
  if (typeof value !== "string") return undefined;
  const ratio = percent(value);
  return ratio === undefined ? undefined : origin + size * ratio;
}

function resolveSize(value: DragLength | undefined, size: number): number | undefined {
  if (finite(value)) return Math.max(0, value);
  if (typeof value !== "string") return undefined;
  const ratio = percent(value);
  return ratio === undefined ? undefined : Math.max(0, size * ratio);
}

export function rectFromDomRect(rect: DOMRectReadOnly): DragRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function rectFromEdges(left: number, top: number, right: number, bottom: number): DragRect {
  const normalizedRight = Math.max(left, right);
  const normalizedBottom = Math.max(top, bottom);
  return {
    left,
    top,
    right: normalizedRight,
    bottom: normalizedBottom,
    width: normalizedRight - left,
    height: normalizedBottom - top,
  };
}

/** Resolves numbers as viewport coordinates and percentages against a base rectangle. */
export function resolveDragRect(input: DragRectInput, base: DragRect): DragRect {
  const explicitWidth = resolveSize(input.width, base.width);
  const explicitHeight = resolveSize(input.height, base.height);
  let left = resolveCoordinate(input.left ?? input.x, base.left, base.width);
  let top = resolveCoordinate(input.top ?? input.y, base.top, base.height);
  let right = resolveCoordinate(input.right, base.left, base.width);
  let bottom = resolveCoordinate(input.bottom, base.top, base.height);

  if (left === undefined && right !== undefined && explicitWidth !== undefined) {
    left = right - explicitWidth;
  }
  if (top === undefined && bottom !== undefined && explicitHeight !== undefined) {
    top = bottom - explicitHeight;
  }
  left ??= base.left;
  top ??= base.top;
  right ??= explicitWidth === undefined ? base.right : left + explicitWidth;
  bottom ??= explicitHeight === undefined ? base.bottom : top + explicitHeight;

  if (explicitWidth !== undefined) right = left + explicitWidth;
  if (explicitHeight !== undefined) bottom = top + explicitHeight;
  return rectFromEdges(left, top, right, bottom);
}

export function translateDragRect(rect: DragRect, point: DragPoint): DragRect {
  return {
    left: rect.left + point.x,
    top: rect.top + point.y,
    right: rect.right + point.x,
    bottom: rect.bottom + point.y,
    width: rect.width,
    height: rect.height,
  };
}

export function subtractPoint(a: DragPoint, b: DragPoint): DragPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function pointsEqual(a: DragPoint, b: DragPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/** Clamps a translated base rectangle inside the given containment rectangle. */
export function clampDragPosition(
  candidate: DragPoint,
  current: DragPoint,
  baseRect: DragRect,
  containment: DragRect,
  axis: DragAxis = "both",
): DragPoint {
  const minimumX = containment.left - baseRect.left;
  const maximumX = containment.right - baseRect.right;
  const minimumY = containment.top - baseRect.top;
  const maximumY = containment.bottom - baseRect.bottom;
  const canMoveX = axis !== "y" && minimumX < maximumX;
  const canMoveY = axis !== "x" && minimumY < maximumY;

  return {
    x: canMoveX ? clamp(candidate.x, minimumX, maximumX) : current.x,
    y: canMoveY ? clamp(candidate.y, minimumY, maximumY) : current.y,
  };
}

export function viewportRect(view: Window): DragRect {
  return rectFromEdges(0, 0, view.innerWidth, view.innerHeight);
}

export function elementPaddingRect(element: Element): DragRect {
  const rect = rectFromDomRect(element.getBoundingClientRect());
  const view = element.ownerDocument.defaultView;
  if (!view) return rect;
  const style = view.getComputedStyle(element);
  const left = rect.left + (Number.parseFloat(style.borderLeftWidth) || 0);
  const top = rect.top + (Number.parseFloat(style.borderTopWidth) || 0);
  const right = rect.right - (Number.parseFloat(style.borderRightWidth) || 0);
  const bottom = rect.bottom - (Number.parseFloat(style.borderBottomWidth) || 0);
  return rectFromEdges(left, top, right, bottom);
}
