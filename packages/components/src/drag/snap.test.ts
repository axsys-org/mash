import { describe, expect, it } from "vitest";

import { rectFromEdges } from "./geometry.js";
import { resolveDragSnap } from "./snap.js";

describe("drag snapping", () => {
  const base = rectFromEdges(0, 0, 20, 20);

  it("snaps independently to a typed grid", () => {
    const resolved = resolveDragSnap({ x: 26, y: 43 }, base, {
      targets: [{ kind: "grid", step: { x: 20, y: 10 } }],
      gravity: 10,
    });

    expect(resolved.position).toEqual({ x: 20, y: 40 });
    expect(resolved.snappedX).toBe(true);
    expect(resolved.snappedY).toBe(true);
  });

  it("supports point, line, and rectangle anchors", () => {
    const resolved = resolveDragSnap({ x: 83, y: 76 }, base, {
      gravity: 10,
      targets: [
        { kind: "line", axis: "x", value: 100, source: "right" },
        {
          kind: "rect",
          rect: rectFromEdges(0, 100, 200, 200),
          source: ["bottom"],
          target: ["top"],
        },
      ],
    });

    expect(resolved.position).toEqual({ x: 80, y: 80 });
    expect(resolved.targets).toHaveLength(2);
  });

  it("leaves positions alone outside attraction gravity", () => {
    const resolved = resolveDragSnap({ x: 1, y: 1 }, base, {
      targets: [{ kind: "point", point: { x: 100, y: 100 } }],
      gravity: 4,
    });
    expect(resolved.position).toEqual({ x: 1, y: 1 });
    expect(resolved.snappedX).toBe(false);
    expect(resolved.snappedY).toBe(false);
  });
});
