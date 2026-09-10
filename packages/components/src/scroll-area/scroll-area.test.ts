import { afterEach, describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIScrollArea } from "./scroll-area.js";
import "./register.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("ui-scroll-area", () => {
  it("registers a labelled native viewport", async () => {
    const area = await fixture<UIScrollArea>(
      `<ui-scroll-area label="Project activity">Activity</ui-scroll-area>`,
    );
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');

    expect(customElements.get("ui-scroll-area")).toBe(UIScrollArea);
    expect(viewport.getAttribute("role")).toBe("region");
    expect(viewport.getAttribute("aria-label")).toBe("Project activity");
  });

  it("bounds long content and keeps it reachable through the viewport", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="block-size: 120px">
        <div style="block-size: 480px">Long content</div>
      </ui-scroll-area>
    `);
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    await settled(area.parentElement!);

    expect(viewport.clientHeight).toBeLessThanOrEqual(120);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    expect(area.matches(":state(scrollable-block)")).toBe(true);
  });

  it("keeps native viewport behavior without a catalogue stylesheet", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="inline-size: 160px; block-size: 90px">
        <div style="inline-size: 420px; block-size: 260px">Standalone content</div>
      </ui-scroll-area>
    `);
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    await settled(area.parentElement!);

    expect(getComputedStyle(viewport).overflow).toBe("auto");
    expect(viewport.clientWidth).toBeLessThanOrEqual(160);
    expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth);
    expect(viewport.clientHeight).toBeLessThanOrEqual(90);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
  });

  it("constrains axes and updates scrollbar controls when orientation changes", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area orientation="horizontal" snap="proximity" style="inline-size: 160px; block-size: 100px">
        <div style="inline-size: 480px; block-size: 400px">Large surface</div>
      </ui-scroll-area>
    `);
    const viewport = area.viewportElement;
    await settled(area.parentElement!);
    expect(getComputedStyle(viewport).overflowY).toBe("hidden");
    expect(getComputedStyle(viewport).scrollSnapType).toBe("x");
    expect(inShadow<HTMLElement>(area, '[part="block-scrollbar"]').hidden).toBe(true);
    expect(inShadow<HTMLElement>(area, '[part="inline-scrollbar"]').hidden).toBe(false);
    area.orientation = "vertical";
    await settled(area.parentElement!);
    expect(getComputedStyle(viewport).overflowX).toBe("hidden");
    expect(inShadow<HTMLElement>(area, '[part="block-scrollbar"]').hidden).toBe(false);
    expect(inShadow<HTMLElement>(area, '[part="inline-scrollbar"]').hidden).toBe(true);
  });

  it("reports logical scroll coordinates", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="block-size: 100px">
        <div style="block-size: 400px">Long content</div>
      </ui-scroll-area>
    `);
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    const listener = vi.fn();
    area.addEventListener("ui-scroll-area-scroll", listener);

    viewport.scrollTop = 24;
    viewport.dispatchEvent(new Event("scroll"));

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0]![0] as CustomEvent).detail).toMatchObject({ block: 24 });
  });

  it("reconnects scroll bookkeeping without duplicating listeners", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="block-size: 100px">
        <div style="block-size: 80px">Short content</div>
      </ui-scroll-area>
    `);
    const container = area.parentElement!;
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    const listener = vi.fn();
    area.addEventListener("ui-scroll-area-scroll", listener);

    expect(area.matches(":state(scrollable-block)")).toBe(false);
    area.remove();
    area.innerHTML = `<div style="block-size: 320px">Long content</div>`;
    container.append(area);
    await settled(container);

    expect(area.matches(":state(scrollable-block)")).toBe(true);
    viewport.scrollTop = 16;
    viewport.dispatchEvent(new Event("scroll"));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("exposes logical scrollbar anatomy and keeps it synchronized with the native viewport", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="inline-size: 160px; block-size: 100px">
        <div style="inline-size: 480px; block-size: 400px">Large surface</div>
      </ui-scroll-area>
    `);
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    const blockScrollbar = inShadow<HTMLElement>(area, '[part="block-scrollbar"]');
    const inlineScrollbar = inShadow<HTMLElement>(area, '[part="inline-scrollbar"]');
    const blockThumb = inShadow<HTMLElement>(area, '[part="block-thumb"]');
    const blockDetents = inShadow<HTMLElement>(area, '[part="block-detents"]');
    const inlineDetents = inShadow<HTMLElement>(area, '[part="inline-detents"]');
    await settled(area.parentElement!);

    expect(blockScrollbar.hidden).toBe(false);
    expect(inlineScrollbar.hidden).toBe(false);
    expect(blockScrollbar.getAttribute("role")).toBe("scrollbar");
    expect(blockScrollbar.getAttribute("aria-controls")).toBe(viewport.id);
    expect(blockThumb.style.blockSize).not.toBe("");
    expect(blockDetents).toBeInstanceOf(HTMLElement);
    expect(inlineDetents).toBeInstanceOf(HTMLElement);

    blockScrollbar.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(viewport.scrollTop).toBe(viewport.scrollHeight - viewport.clientHeight);
    expect(area.matches(":state(at-block-end)")).toBe(true);
  });

  it("supports always, hover, and scrolling visibility modes without embedding presentation", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="block-size: 100px" idle-delay="20">
        <div style="block-size: 400px">Long content</div>
      </ui-scroll-area>
    `);
    const root = inShadow<HTMLElement>(area, '[part="root"]');
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    await settled(area.parentElement!);

    expect(area.mode).toBe("scrolling");
    expect(area.matches(":state(visible)")).toBe(false);
    vi.useFakeTimers();
    viewport.dispatchEvent(new Event("scroll"));
    expect(area.matches(":state(visible)")).toBe(true);
    root.dispatchEvent(new PointerEvent("pointerleave"));
    await vi.advanceTimersByTimeAsync(area.idleDelay + 1);
    expect(area.matches(":state(visible)")).toBe(false);
    vi.useRealTimers();

    area.mode = "hover";
    await settled(area.parentElement!);
    root.dispatchEvent(new PointerEvent("pointerenter"));
    expect(area.matches(":state(visible)")).toBe(true);
    root.dispatchEvent(new PointerEvent("pointerleave"));
    expect(area.matches(":state(visible)")).toBe(false);

    area.mode = "always";
    await settled(area.parentElement!);
    root.dispatchEvent(new PointerEvent("pointerleave"));
    expect(area.matches(":state(visible)")).toBe(true);
    expect(area.hasAttribute("data-scroll-visible")).toBe(true);
  });

  it("exposes semantic sizes, stable gutters, and native snap policy", async () => {
    const defaultArea = await fixture<UIScrollArea>(`
      <ui-scroll-area>Content</ui-scroll-area>
    `);
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area size="large" gutter="stable" snap="proximity">
        Content
      </ui-scroll-area>
    `);

    expect(defaultArea.gutter).toBe("none");
    expect(defaultArea.getAttribute("gutter")).toBe("none");
    expect(area.size).toBe("large");
    expect(area.gutter).toBe("stable");
    expect(area.snap).toBe("proximity");
    expect(area.getAttribute("size")).toBe("large");
    expect(area.getAttribute("gutter")).toBe("stable");
  });

  it("positions authored detents and scrolls to semantic targets", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="block-size: 100px" idle-delay="20">
        <div>
          <section data-scroll-id="alpha" style="block-size: 120px">Alpha</section>
          <section data-scroll-id="beta" style="block-size: 120px">Beta</section>
          <section data-scroll-id="gamma" style="block-size: 120px">Gamma</section>
        </div>
        <button type="button" slot="block-detents" data-scroll-target="beta">B</button>
        <button type="button" slot="block-detents" data-scroll-detent="100">End</button>
      </ui-scroll-area>
    `);
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    const beta = area.querySelector<HTMLElement>('[data-scroll-target="beta"]')!;
    const listener = vi.fn();
    area.addEventListener("ui-scroll-area-target", listener);
    await settled(area.parentElement!);

    expect(beta.style.getPropertyValue("--ui-scroll-detent-position")).not.toBe("");
    expect(area.scrollToTarget("beta")).toBe(true);
    expect(viewport.scrollTop).toBeGreaterThan(0);
    expect(listener).toHaveBeenCalledOnce();

    area.querySelector<HTMLButtonElement>('[data-scroll-detent="100"]')!.click();
    expect(viewport.scrollTop).toBe(viewport.scrollHeight - viewport.clientHeight);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("uses the same target contract for inline-axis detents", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="inline-size: 160px; block-size: 100px">
        <div style="display: flex; inline-size: 480px">
          <section style="flex: 0 0 160px">Alpha</section>
          <section style="flex: 0 0 160px">Beta</section>
          <section data-scroll-id="gamma" style="flex: 0 0 160px">Gamma</section>
        </div>
        <button type="button" slot="inline-detents" data-scroll-target="gamma">G</button>
      </ui-scroll-area>
    `);
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    await settled(area.parentElement!);

    area.querySelector<HTMLButtonElement>('[data-scroll-target="gamma"]')!.click();
    expect(viewport.scrollLeft).toBeGreaterThan(0);
    expect(area.querySelector("[data-scroll-detent-current]")?.textContent).toBe("G");
  });

  it("publishes idle and active interaction states", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="block-size: 100px" idle-delay="20">
        <div style="block-size: 400px">Long content</div>
      </ui-scroll-area>
    `);
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    await settled(area.parentElement!);

    expect(area.matches(":state(idle)")).toBe(true);
    expect(area.matches(":state(active)")).toBe(false);
    vi.useFakeTimers();
    viewport.dispatchEvent(new Event("scroll"));
    expect(area.matches(":state(active)")).toBe(true);
    expect(area.matches(":state(idle)")).toBe(false);
    await vi.advanceTimersByTimeAsync(area.idleDelay + 1);
    expect(area.matches(":state(active)")).toBe(false);
    expect(area.matches(":state(idle)")).toBe(true);
  });

  it("falls back to the default idle delay when an authored value is invalid", async () => {
    const area = await fixture<UIScrollArea>(`
      <ui-scroll-area style="block-size: 100px" idle-delay="nope">
        <div style="block-size: 400px">Long content</div>
      </ui-scroll-area>
    `);
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    await settled(area.parentElement!);

    expect(Number.isNaN(area.idleDelay)).toBe(true);
    vi.useFakeTimers();
    viewport.dispatchEvent(new Event("scroll"));
    expect(area.matches(":state(active)")).toBe(true);
    await vi.advanceTimersByTimeAsync(2001);
    expect(area.matches(":state(active)")).toBe(false);
  });
});
