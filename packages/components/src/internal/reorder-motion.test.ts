import { describe, expect, it } from "vitest";
import { fixture } from "../test-support/fixture.js";
import { ReorderMotionController } from "./reorder-motion.js";

describe("reorder motion", () => {
  it("honors zero-duration tokens and restores authored styles", async () => {
    const host = await fixture<HTMLElement>(
      '<div style="--duration-control:0ms"><div style="translate:3px 4px;transform:rotate(2deg)"></div></div>',
    );
    const target = host.firstElementChild as HTMLElement;
    const motion = new ReorderMotionController(host);
    motion.move(target, 40, 0);
    expect(target.getAnimations()).toHaveLength(0);
    expect(getComputedStyle(target).translate).toBe("40px");
    motion.destroy();
    expect(target.style.translate).toBe("3px 4px");
    expect(target.style.transform).toBe("rotate(2deg)");
  });

  it("keeps the active animation when a pointer repeats its destination", async () => {
    const host = await fixture<HTMLElement>('<div style="--duration-control:1s"><div></div></div>');
    const target = host.firstElementChild as HTMLElement;
    const motion = new ReorderMotionController(host);
    try {
      motion.move(target, 40, 0);
      const animation = target.getAnimations()[0];
      expect(animation).toBeDefined();
      motion.move(target, 40, 0);
      expect(target.getAnimations()[0]).toBe(animation);
    } finally {
      motion.destroy();
    }
    expect(target.getAnimations()).toHaveLength(0);
    expect(target.style.translate).toBe("");
  });
});
