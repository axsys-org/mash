import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIMotion, type MotionEventDetail } from "./motion.js";
import "./register.js";

const nextPaint = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

describe("ui-motion", () => {
  it("tracks enabled hover items and removes state when the scene disconnects", async () => {
    const scene = await fixture<UIMotion>(
      `<ui-motion style="display:block;position:relative;width:240px"><span slot="underlay"></span><button data-hover-item style="display:block;width:200px;height:40px">First</button><button data-hover-item disabled style="display:block;width:200px;height:40px">Disabled</button><button data-hover-item style="display:block;width:200px;height:40px">Last</button></ui-motion>`,
    );
    const highlight = scene.querySelector<HTMLElement>("span")!;
    scene.trackHover({ highlight });
    const last = scene.querySelectorAll<HTMLElement>("button")[2]!;
    last.focus();
    await nextPaint();
    expect(last.hasAttribute("data-hover-active")).toBe(true);
    expect(scene.getAttribute("data-hover-index")).toBe("2");
    const rect = last.getBoundingClientRect();
    scene.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: rect.x + 10,
        clientY: rect.y + 10,
        pointerType: "mouse",
      }),
    );
    await nextPaint();
    expect(highlight.style.translate).not.toBe("");
    scene.remove();
    expect(last.hasAttribute("data-hover-active")).toBe(false);
    expect(highlight.hasAttribute("data-hover-visible")).toBe(false);
  });

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

  it("keeps empty higher scene lanes transparent to content interaction", async () => {
    const motion = await fixture<UIMotion>(`
      <ui-motion style="--duration-surface: 1ms; --easing-spring-gentle: linear; --motion-distance-medium: 1px">
        <button type="button">Edit filters</button>
      </ui-motion>
    `);
    const button = motion.querySelector("button")!;
    const bounds = button.getBoundingClientRect();
    const hit = document.elementFromPoint(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );

    expect(hit).toBe(button);
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

  it("only asks for compositor preparation during an active lifecycle", async () => {
    const motion = await fixture<UIMotion>(`
      <ui-motion
        motion="scale"
        style="--duration-control: 120ms; --easing-spring-snappy: linear; --motion-scale-pressed: .92"
      ><span>Prepare briefly</span></ui-motion>
    `);
    const target = inShadow<HTMLElement>(motion, '[part="content"]');

    expect(getComputedStyle(target).willChange).toBe("auto");

    motion.state = "active";
    await settled(motion);

    expect(getComputedStyle(target).willChange).toContain("scale");

    await new Promise((resolve) => setTimeout(resolve, 160));

    expect(getComputedStyle(target).willChange).toBe("auto");
  });

  it("replays the current keyframe state through a painted idle reset", async () => {
    const motion = await fixture<UIMotion>(`
      <ui-motion
        motion="slide-block"
        state="entering"
        style="--duration-surface: 240ms; --easing-spring-gentle: linear"
      ><span>Replay me</span></ui-motion>
    `);
    const target = inShadow<HTMLElement>(motion, '[part="content"]');
    await new Promise((resolve) => setTimeout(resolve, 280));

    const starts: MotionEventDetail[] = [];
    motion.addEventListener("mash-motion-start", (event) => starts.push(event.detail));

    await motion.play("entering");
    await nextPaint();

    expect(starts.map((detail) => detail.state)).toEqual(["entering"]);
    expect(target.getAnimations().some((animation) => animation.playState === "running")).toBe(
      true,
    );
  });

  it("replays the current transition state through a painted idle reset", async () => {
    const motion = await fixture<UIMotion>(`
      <ui-motion
        motion="scale"
        state="active"
        style="--duration-control: 240ms; --easing-spring-snappy: linear; --motion-scale-pressed: .92"
      ><span>Replay me</span></ui-motion>
    `);
    const target = inShadow<HTMLElement>(motion, '[part="content"]');
    await new Promise((resolve) => setTimeout(resolve, 280));

    const starts: MotionEventDetail[] = [];
    motion.addEventListener("mash-motion-start", (event) => starts.push(event.detail));

    await motion.play("active");
    await nextPaint();

    expect(starts.map((detail) => detail.state)).toEqual(["active"]);
    expect(target.getAnimations().some((animation) => animation.playState === "running")).toBe(
      true,
    );
  });
});
