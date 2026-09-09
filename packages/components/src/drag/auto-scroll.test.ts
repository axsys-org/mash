import { describe, expect, it, vi } from "vitest";

import { fixture } from "../test-support/fixture.js";
import { DragAutoScrollController } from "./auto-scroll.js";

describe("DragAutoScrollController", () => {
  it("reaches both physical edges of an RTL strip using negative native coordinates", async () => {
    const scroller = await fixture<HTMLElement>(`
      <div style="direction:rtl;width:100px;height:100px;overflow:auto">
        <div style="width:500px;height:50px"></div>
      </div>
    `);
    const controller = new DragAutoScrollController(
      { target: scroller, speed: 10000, sensitivity: 12 },
      vi.fn(),
    );
    const rect = scroller.getBoundingClientRect();
    try {
      expect(scroller.scrollLeft).toBe(0);
      controller.update({ x: rect.left + 1, y: rect.top + rect.height / 2 });
      await vi.waitFor(() => expect(scroller.scrollLeft).toBe(-400));
      controller.update({ x: rect.right - 1, y: rect.top + rect.height / 2 });
      await vi.waitFor(() => expect(scroller.scrollLeft).toBe(0));
    } finally {
      controller.destroy();
    }
  });

  it.each(["ltr", "rtl"])(
    "preserves explicit horizontal bounds for %s elements",
    async (direction) => {
      const scroller = await fixture<HTMLElement>(`
      <div style="direction:${direction};width:100px;height:100px;overflow:auto">
        <div style="width:500px;height:50px"></div>
      </div>
    `);
      const minX = direction === "rtl" ? -30 : 10;
      const maxX = direction === "rtl" ? -10 : 30;
      const controller = new DragAutoScrollController(
        { target: scroller, speed: 10000, sensitivity: 12, minX, maxX },
        vi.fn(),
      );
      const rect = scroller.getBoundingClientRect();
      try {
        controller.update({ x: rect.left + 1, y: rect.top + rect.height / 2 });
        await vi.waitFor(() => expect(scroller.scrollLeft).toBe(minX));
        controller.update({ x: rect.right - 1, y: rect.top + rect.height / 2 });
        await vi.waitFor(() => expect(scroller.scrollLeft).toBe(maxX));
      } finally {
        controller.destroy();
      }
    },
  );

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
