import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIReveal, type RevealEventDetail } from "./reveal.js";
import "./register.js";

describe("ui-reveal", () => {
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
    expect(events[0]?.detail).toMatchObject({ axis: "block", open: true, state: "entering" });

    reveal.open = false;
    await settled(reveal.parentElement!);

    expect(root.hidden).toBe(false);
    expect(content.getAttribute("aria-hidden")).toBe("true");
    expect(reveal.matches(":state(exiting)")).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 180));

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
