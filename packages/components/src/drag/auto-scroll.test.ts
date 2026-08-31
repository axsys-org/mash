import { describe, expect, it, vi } from "vitest";

import { fixture } from "../test-support/fixture.js";
import { DragAutoScrollController } from "./auto-scroll.js";

describe("DragAutoScrollController", () => {
  it("scrolls a local overflow target near its edge and stops cleanly", async () => {
    const scroller = await fixture<HTMLElement>(`
      <div style="width:100px;height:100px;overflow:auto">
        <div style="width:500px;height:500px"></div>
      </div>
    `);
    const onScroll = vi.fn();
    const controller = new DragAutoScrollController(
      { target: scroller, speed: 1000, sensitivity: 40 },
      onScroll,
    );
    const rect = scroller.getBoundingClientRect();

    expect(controller.update({ x: rect.right - 1, y: rect.bottom - 1 })).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 80));
    controller.stop();

    expect(scroller.scrollLeft).toBeGreaterThan(0);
    expect(scroller.scrollTop).toBeGreaterThan(0);
    expect(onScroll).toHaveBeenCalled();
    const stoppedAt = { x: scroller.scrollLeft, y: scroller.scrollTop };
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect({ x: scroller.scrollLeft, y: scroller.scrollTop }).toEqual(stoppedAt);
  });

  it("does not start away from an edge", async () => {
    const scroller = await fixture<HTMLElement>(`
      <div style="width:200px;height:200px;overflow:auto">
        <div style="width:500px;height:500px"></div>
      </div>
    `);
    const controller = new DragAutoScrollController(
      { target: scroller, speed: 1000, sensitivity: 40 },
      vi.fn(),
    );
    const rect = scroller.getBoundingClientRect();

    expect(
      controller.update({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }),
    ).toBe(false);
    controller.destroy();
  });
});
