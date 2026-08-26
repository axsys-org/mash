import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIMotion, type MotionEventDetail } from "./motion.js";
import "./register.js";

describe("ui-motion", () => {
  it("projects arbitrary content through stable scene lanes", async () => {
    const motion = await fixture<UIMotion>(`
      <ui-motion target="overlay">
        <ui-card>content</ui-card>
        <span slot="underlay">underlay</span>
        <ui-separator slot="overlay"></ui-separator>
        <ui-spinner slot="indicator"></ui-spinner>
      </ui-motion>
    `);

    expect(
      inShadow<HTMLSlotElement>(motion, "slot:not([name])").assignedElements()[0]?.localName,
    ).toBe("ui-card");
    expect(
      inShadow<HTMLSlotElement>(motion, 'slot[name="underlay"]').assignedElements(),
    ).toHaveLength(1);
    expect(
      inShadow<HTMLSlotElement>(motion, 'slot[name="overlay"]').assignedElements()[0]?.localName,
    ).toBe("ui-separator");
    expect(inShadow(motion, '[part="overlay"]').classList.contains("motion-target")).toBe(true);
  });

  it("emits portable lifecycle events for non-icon content", async () => {
    const motion = await fixture<UIMotion>(`
      <ui-motion
        motion="fade"
        style="--duration-control: 1ms; --easing-control: linear; --motion-opacity-muted: .5"
      ><span>Arbitrary content</span></ui-motion>
    `);
    const events: Array<{ name: string; detail: MotionEventDetail }> = [];
    motion.addEventListener("mash-motion-start", (event) =>
      events.push({ name: event.type, detail: event.detail }),
    );
    motion.addEventListener("mash-motion-end", (event) =>
      events.push({ name: event.type, detail: event.detail }),
    );

    motion.state = "active";
    await settled(motion);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(events[0]?.name).toBe("mash-motion-start");
    expect(events[0]?.detail).toMatchObject({
      motion: "fade",
      state: "active",
      previousState: "idle",
      target: "content",
    });
    expect(events.some((event) => event.name === "mash-motion-end")).toBe(true);
  });

  it("interrupts an in-flight loading lifecycle when state changes", async () => {
    const motion = await fixture<UIMotion>(`
      <ui-motion
        motion="spin"
        style="--duration-surface: 10ms; --easing-control: linear; --motion-rotation-full: 1"
      ><span>Loading</span></ui-motion>
    `);
    const endings: MotionEventDetail[] = [];
    motion.addEventListener("mash-motion-end", (event) => endings.push(event.detail));

    motion.state = "loading";
    await settled(motion);
    motion.state = "idle";
    await settled(motion);

    expect(endings.some((detail) => detail.state === "loading" && detail.interrupted)).toBe(true);
  });
});
