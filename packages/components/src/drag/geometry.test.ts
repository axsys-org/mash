import { describe, expect, it } from "vitest";

import {
  clampDragPosition,
  rectFromEdges,
  resolveDragRect,
  translateDragRect,
} from "./geometry.js";

describe("drag geometry", () => {
  const viewport = rectFromEdges(10, 20, 1010, 820);

  it("resolves percentage rectangles against an explicit base", () => {
    expect(
      resolveDragRect({ left: "10%", top: "25%", width: "50%", height: 200 }, viewport),
    ).toEqual({
      left: 110,
      top: 220,
      right: 610,
      bottom: 420,
      width: 500,
      height: 200,
    });
  });

  it("clamps a translated rectangle and freezes disabled axes", () => {
    const base = rectFromEdges(20, 20, 120, 70);
    const containment = rectFromEdges(0, 0, 300, 200);

    expect(clampDragPosition({ x: 500, y: -100 }, { x: 0, y: 0 }, base, containment)).toEqual({
      x: 180,
      y: -20,
    });
    expect(clampDragPosition({ x: 90, y: 90 }, { x: 4, y: 8 }, base, containment, "x")).toEqual({
      x: 90,
      y: 8,
    });
  });

  it("translates rectangles without losing their dimensions", () => {
    expect(translateDragRect(rectFromEdges(1, 2, 11, 22), { x: 4, y: -2 })).toEqual({
      left: 5,
      top: 0,
      right: 15,
      bottom: 20,
      width: 10,
      height: 20,
    });
  });
});
