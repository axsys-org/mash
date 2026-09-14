import { describe, expect, it } from "vitest";
import { dockEdgePlacement } from "./drag-target.js";

describe("dock edge intent", () => {
  const body = { left: 10, right: 610, top: 50, bottom: 450, width: 600, height: 400 };
  it("keeps the center and tab header free from split previews", () => {
    expect(dockEdgePlacement({ x: 300, y: 240 }, body)).toBeNull();
    expect(dockEdgePlacement({ x: 30, y: 30 }, body)).toBeNull();
    expect(dockEdgePlacement({ x: 100, y: 100 }, body)).toBeNull();
  });
  it("uses the closest narrow body edge and rejects points outside the workspace", () => {
    expect(dockEdgePlacement({ x: 20, y: 200 }, body)).toBe("left");
    expect(dockEdgePlacement({ x: 600, y: 200 }, body)).toBe("right");
    expect(dockEdgePlacement({ x: 300, y: 60 }, body)).toBe("top");
    expect(dockEdgePlacement({ x: 300, y: 440 }, body)).toBe("bottom");
    expect(dockEdgePlacement({ x: 15, y: 70 }, body)).toBe("left");
    expect(dockEdgePlacement({ x: 620, y: 200 }, body)).toBeNull();
  });
});
