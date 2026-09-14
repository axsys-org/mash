import type { DockPlacement } from "./layout.js";

/** Narrow body-edge intent; the tab strip remains exclusively a reorder target. */
export function dockEdgePlacement(
  point: { x: number; y: number },
  body: Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">,
): Exclude<DockPlacement, "center"> | null {
  if (point.x < body.left || point.x > body.right || point.y < body.top || point.y > body.bottom)
    return null;
  const distances = [
    { placement: "left" as const, distance: point.x - body.left, extent: body.width },
    { placement: "right" as const, distance: body.right - point.x, extent: body.width },
    { placement: "top" as const, distance: point.y - body.top, extent: body.height },
    { placement: "bottom" as const, distance: body.bottom - point.y, extent: body.height },
  ].sort((a, b) => a.distance - b.distance);
  const nearest = distances[0]!;
  return nearest.distance <= Math.min(28, nearest.extent / 5) ? nearest.placement : null;
}
