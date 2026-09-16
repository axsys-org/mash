import { describe, expect, it } from "vitest";
import { cdp, server } from "vitest/browser";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UIReveal, type RevealAxis, type RevealEventDetail } from "./reveal.js";
import "./register.js";

const contentOf = (reveal: UIReveal) => inShadow<HTMLElement>(reveal, '[part="content"]');
const dimension = (axis: RevealAxis) => (axis === "block" ? "blockSize" : "inlineSize");

// Registered after updateComplete, so this observes the first lifecycle frame
// and its settlement microtask, not a guessed duration or a timeout fallback.
async function firstLifecycleFrame(reveal: UIReveal): Promise<void> {
  await reveal.updateComplete;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await reveal.updateComplete;
}

function endings(reveal: UIReveal): RevealEventDetail[] {
  const events: RevealEventDetail[] = [];
  reveal.addEventListener("mash-reveal-end", (event) => events.push(event.detail));
  return events;
}

async function finish(reveal: UIReveal, animation: Animation): Promise<void> {
  animation.finish();
  await animation.finished;
  await firstLifecycleFrame(reveal);
}

describe("ui-reveal no-op lifecycle", () => {
  for (const axis of ["block", "inline"] as const) {
    it(`settles an initially open hidden ${axis} reveal on its first lifecycle frame`, async () => {
      const parent = await fixture<HTMLElement>("<div hidden></div>");
      const reveal = document.createElement("ui-reveal") as UIReveal;
      reveal.axis = axis;
      reveal.open = true;
      reveal.style.setProperty("--duration-surface", "60s");
      reveal.innerHTML = '<div style="width:80px;height:96px">Authored content</div>';
      const events = endings(reveal);
      parent.append(reveal);
      await reveal.updateComplete;
      const content = contentOf(reveal);
      expect(content.style[dimension(axis)]).toBe("0px");
      expect(content.getAnimations()).toHaveLength(0);
      expect(reveal.matches(":state(entering)")).toBe(true);

      await firstLifecycleFrame(reveal);

      expect(reveal.matches(":state(active):state(present)")).toBe(true);
      expect(reveal.matches(":state(entering)")).toBe(false);
      expect(content.style[dimension(axis)]).toBe("auto");
      expect(events).toMatchObject([
        {
          axis,
          open: true,
          state: "entering",
          interrupted: false,
          reducedMotion: false,
        },
      ]);
      parent.hidden = false;
      const bounds = content.getBoundingClientRect();
      expect(axis === "block" ? bounds.height : bounds.width).toBe(axis === "block" ? 96 : 80);
    });

    it(`settles empty ${axis} entry and exit without waiting for declared motion`, async () => {
      const reveal = await fixture<UIReveal>(
        `<ui-reveal axis="${axis}" style="--duration-surface:60s"></ui-reveal>`,
      );
      const events = endings(reveal);
      reveal.open = true;
      await reveal.updateComplete;
      expect(contentOf(reveal).getAnimations()).toHaveLength(0);
      await firstLifecycleFrame(reveal);
      expect(reveal.matches(":state(active)")).toBe(true);
      expect(contentOf(reveal).style[dimension(axis)]).toBe("auto");

      reveal.open = false;
      await reveal.updateComplete;
      expect(contentOf(reveal).getAnimations()).toHaveLength(0);
      await firstLifecycleFrame(reveal);
      expect(reveal.matches(":state(present)")).toBe(false);
      expect(inShadow<HTMLElement>(reveal, '[part="root"]').hidden).toBe(true);
      expect(events).toMatchObject([
        { axis, open: true, state: "entering", interrupted: false },
        { axis, open: false, state: "exiting", interrupted: false },
      ]);
    });

    it(`retains real delayed and running ${axis} transitions until they finish`, async () => {
      const reveal = await fixture<UIReveal>(
        `<ui-reveal axis="${axis}" style="--duration-surface:10s;--easing-surface:linear"><div style="width:80px;height:80px">Content</div></ui-reveal>`,
      );
      const content = contentOf(reveal);
      content.style.transitionDelay = "4s";
      const events = endings(reveal);
      reveal.open = true;
      await reveal.updateComplete;
      const entry = content.getAnimations()[0]!;
      expect(entry).toBeDefined();
      entry.pause();
      entry.currentTime = 2000;
      await firstLifecycleFrame(reveal);
      expect(reveal.matches(":state(entering):state(present)")).toBe(true);
      expect(events).toHaveLength(0);
      expect(entry.effect?.getTiming().delay).toBe(4000);
      expect(entry.effect?.getComputedTiming().progress).toBe(0);

      entry.currentTime = 9000;
      expect(entry.effect?.getComputedTiming().progress).toBe(0.5);
      const bounds = content.getBoundingClientRect();
      expect(axis === "block" ? bounds.height : bounds.width).toBeCloseTo(40, 0);
      expect(reveal.matches(":state(active)")).toBe(false);
      await finish(reveal, entry);
      expect(reveal.matches(":state(active)")).toBe(true);
      expect(content.style[dimension(axis)]).toBe("auto");

      reveal.open = false;
      await reveal.updateComplete;
      const exit = content.getAnimations()[0]!;
      expect(exit).toBeDefined();
      exit.pause();
      exit.currentTime = 9000;
      await firstLifecycleFrame(reveal);
      expect(reveal.matches(":state(exiting):state(present)")).toBe(true);
      expect(inShadow<HTMLElement>(reveal, '[part="root"]').hidden).toBe(false);
      expect(events).toHaveLength(1);
      await finish(reveal, exit);
      expect(reveal.matches(":state(present)")).toBe(false);
      expect(events).toMatchObject([
        { open: true, interrupted: false },
        { open: false, interrupted: false },
      ]);
    });
  }

  it("does not let a superseded no-op entry settle a later real transition", async () => {
    const reveal = await fixture<UIReveal>(
      '<ui-reveal style="--duration-surface:10s;--easing-surface:linear"></ui-reveal>',
    );
    const events = endings(reveal);
    reveal.open = true;
    await reveal.updateComplete;
    reveal.open = false;
    await reveal.updateComplete;
    reveal.innerHTML = '<div style="height:80px">Later content</div>';
    reveal.open = true;
    await reveal.updateComplete;
    const entry = contentOf(reveal).getAnimations()[0]!;
    expect(entry).toBeDefined();
    entry.pause();
    entry.currentTime = 5000;
    await firstLifecycleFrame(reveal);
    expect(reveal.matches(":state(entering)")).toBe(true);
    expect(events).toMatchObject([
      { open: true, interrupted: true },
      { open: false, interrupted: true },
    ]);
    await finish(reveal, entry);
    expect(reveal.matches(":state(active)")).toBe(true);
    expect(events.at(-1)).toMatchObject({ open: true, interrupted: false });
  });

  it.skipIf(server.browser !== "chromium")("honors actual reduced-motion media", async () => {
    await cdp().send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    try {
      expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
      const reveal = await fixture<UIReveal>(
        '<ui-reveal style="--duration-surface:60s"><div style="height:80px">Content</div></ui-reveal>',
      );
      const events = endings(reveal);
      reveal.open = true;
      await firstLifecycleFrame(reveal);
      expect(reveal.matches(":state(active):state(reduced-motion)")).toBe(true);
      expect(contentOf(reveal).getAnimations()).toHaveLength(0);
      reveal.open = false;
      await firstLifecycleFrame(reveal);
      expect(reveal.matches(":state(present)")).toBe(false);
      expect(events).toMatchObject([
        { open: true, reducedMotion: true, interrupted: false },
        { open: false, reducedMotion: true, interrupted: false },
      ]);
    } finally {
      await cdp().send("Emulation.setEmulatedMedia", { features: [] });
    }
  });
});
