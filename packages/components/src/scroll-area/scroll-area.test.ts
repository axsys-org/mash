import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import "../catalogue/mash.css";
import { UIScrollArea } from "./scroll-area.js";
import "./register.js";

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});

afterEach(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.mashCatalogue;
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
    await settled(area.parentElement!);

    expect(blockScrollbar.hidden).toBe(false);
    expect(inlineScrollbar.hidden).toBe(false);
    expect(blockScrollbar.getAttribute("role")).toBe("scrollbar");
    expect(blockScrollbar.getAttribute("aria-controls")).toBe(viewport.id);
    expect(blockThumb.style.blockSize).not.toBe("");

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
  });
});
