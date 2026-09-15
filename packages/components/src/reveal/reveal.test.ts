import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIReveal, type RevealEventDetail } from "./reveal.js";
import "./register.js";

describe("ui-reveal", () => {
  it("renders an initially open disclosure after its hidden ancestor is shown", async () => {
    const parent = await fixture<HTMLElement>(
      `<div hidden><ui-reveal open style="--duration-surface: 1ms"><div style="height: 80px">Hidden parent content</div></ui-reveal></div>`,
    );
    const reveal = parent.querySelector<UIReveal>("ui-reveal")!;
    await expect.poll(() => reveal.matches(":state(active)")).toBe(true);
    parent.hidden = false;
    await settled(parent);
    expect(inShadow<HTMLElement>(reveal, '[part="content"]').getBoundingClientRect().height).toBe(
      80,
    );
  });

  it("settles a reveal that is moved while entering beneath a hidden ancestor", async () => {
    const parent = await fixture<HTMLElement>(
      `<div hidden><div id="first"></div><div id="second"></div></div>`,
    );
    const reveal = document.createElement("ui-reveal") as UIReveal;
    reveal.open = true;
    reveal.style.setProperty("--duration-surface", "120ms");
    const body = document.createElement("div");
    body.style.height = "80px";
    body.textContent = "Moved content";
    reveal.append(body);
    parent.querySelector("#first")!.append(reveal);
    await settled(parent);
    parent.querySelector("#second")!.append(reveal);
    parent.hidden = false;
    await settled(parent);
    await expect.poll(() => reveal.matches(":state(active)")).toBe(true);
    expect(inShadow<HTMLElement>(reveal, '[part="content"]').getBoundingClientRect().height).toBe(
      80,
    );
  });

  it("does not replay an already settled entry when moved", async () => {
    const parent = await fixture<HTMLElement>(
      `<div><div id="first"><ui-reveal open style="--duration-surface: 1ms"><div style="height: 48px">Content</div></ui-reveal></div><div id="second"></div></div>`,
    );
    const reveal = parent.querySelector<UIReveal>("ui-reveal")!;
    await expect.poll(() => reveal.matches(":state(active)")).toBe(true);
    let starts = 0;
    reveal.addEventListener("mash-reveal-start", () => starts++);
    parent.querySelector("#second")!.append(reveal);
    await settled(parent);
    expect(starts).toBe(0);
    expect(reveal.matches(":state(active)")).toBe(true);
    expect(inShadow<HTMLElement>(reveal, '[part="content"]').getBoundingClientRect().height).toBe(
      48,
    );
  });

  it("removes stale exit presence when a closing disclosure reconnects", async () => {
    const parent = await fixture<HTMLElement>(
      `<div><div id="first"><ui-reveal open style="--duration-surface: 120ms"><div style="height: 48px">Content</div></ui-reveal></div><div id="second"></div></div>`,
    );
    const reveal = parent.querySelector<UIReveal>("ui-reveal")!;
    await expect.poll(() => reveal.matches(":state(active)")).toBe(true);
    reveal.open = false;
    await settled(parent);
    expect(reveal.matches(":state(exiting)")).toBe(true);
    parent.querySelector("#second")!.append(reveal);
    await settled(parent);
    expect(reveal.matches(":state(present)")).toBe(false);
    expect(reveal.matches(":state(exiting)")).toBe(false);
    expect(inShadow<HTMLElement>(reveal, '[part="root"]').hidden).toBe(true);
  });

  it("registers and exposes measured disclosure anatomy", async () => {
    expect(customElements.get("ui-reveal")).toBe(UIReveal);

    const reveal = await fixture<UIReveal>(`<ui-reveal>Measured content</ui-reveal>`);

    expect(reveal).toBeInstanceOf(UIReveal);
    expect(inShadow(reveal, '[part="root"]')).toBeInstanceOf(HTMLElement);
    expect(inShadow(reveal, '[part="content"]')).toBeInstanceOf(HTMLElement);
    expect(inShadow(reveal, '[part="measure"]')).toBeInstanceOf(HTMLElement);
    expect(inShadow<HTMLElement>(reveal, '[part="root"]').hidden).toBe(true);
    expect(reveal.matches(":state(present)")).toBe(false);
  });

  it("keeps content mounted for exit animation and then removes presence", async () => {
    const reveal = await fixture<UIReveal>(`
      <ui-reveal style="--duration-surface: 120ms; --easing-surface: linear">
        <div style="block-size: 40px">Panel</div>
      </ui-reveal>
    `);
    const root = inShadow<HTMLElement>(reveal, '[part="root"]');
    const content = inShadow<HTMLElement>(reveal, '[part="content"]');
    const events: Array<{ name: string; detail: RevealEventDetail }> = [];
    reveal.addEventListener("mash-reveal-start", (event) =>
      events.push({ name: event.type, detail: event.detail }),
    );
    reveal.addEventListener("mash-reveal-end", (event) =>
      events.push({ name: event.type, detail: event.detail }),
    );

    reveal.open = true;
    await settled(reveal.parentElement!);

    expect(root.hidden).toBe(false);
    expect(reveal.matches(":state(open)")).toBe(true);
    expect(reveal.matches(":state(present)")).toBe(true);
    expect(content.getAttribute("aria-hidden")).toBeNull();
    expect(events[0]?.name).toBe("mash-reveal-start");
    expect(events[0]?.detail).toMatchObject({
      axis: "block",
      open: true,
      state: "entering",
    });

    // Establish a real expanded size before closing. Reversing at the first
    // zero-sized frame is a no-op, not an exit animation to preserve.
    // A busy browser may have naturally completed the short entry already.
    const entry = content.getAnimations()[0];
    if (entry) {
      entry.finish();
      await entry.finished;
    }
    await settled(reveal.parentElement!);
    expect(reveal.matches(":state(active)")).toBe(true);
    expect(content.getBoundingClientRect().height).toBe(40);

    reveal.open = false;
    await reveal.updateComplete;
    const exit = content.getAnimations()[0]!;
    expect(exit).toBeDefined();
    exit.pause();
    exit.currentTime = 60;
    await settled(reveal.parentElement!);

    expect(root.hidden).toBe(false);
    expect(content.getAttribute("aria-hidden")).toBe("true");
    expect(reveal.matches(":state(exiting)")).toBe(true);

    exit.finish();
    await exit.finished;
    await settled(reveal.parentElement!);

    expect(root.hidden).toBe(true);
    expect(reveal.matches(":state(present)")).toBe(false);
    expect(events.some((event) => event.name === "mash-reveal-end")).toBe(true);
  });

  it("supports inline-axis measurement without changing the content contract", async () => {
    const reveal = await fixture<UIReveal>(`
      <ui-reveal axis="inline" open style="--duration-surface: 1ms; --easing-surface: linear">
        <span style="display: inline-block; inline-size: 80px">Inline panel</span>
      </ui-reveal>
    `);
    const content = inShadow<HTMLElement>(reveal, '[part="content"]');

    expect(reveal.axis).toBe("inline");
    expect(reveal.matches(":state(open)")).toBe(true);
    expect(content.style.inlineSize).not.toBe("0px");
  });
});
