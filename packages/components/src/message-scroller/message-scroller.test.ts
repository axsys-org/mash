import { describe, expect, it, vi } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIMessageScroller } from "./message-scroller.js";
import "./register.js";

describe("message scroller", () => {
  it("follows arrivals at the end and preserves the reading anchor when history is prepended", async () => {
    const scroller = await fixture<UIMessageScroller>(
      `<ui-message-scroller>${Array.from({ length: 8 }, (_, i) => `<div style="height:100px; flex:none">Message ${i}</div>`).join("")}</ui-message-scroller>`,
    );
    await settled(scroller);
    const viewport = inShadow<HTMLElement>(scroller, '[part="viewport"]');
    await vi.waitFor(() => expect(viewport.scrollTop).toBeGreaterThan(300));
    viewport.scrollTop = 120;
    viewport.dispatchEvent(new Event("scroll"));
    expect(scroller.atEnd).toBe(false);
    const earlier = document.createElement("div");
    earlier.style.height = "100px";
    earlier.style.flex = "none";
    earlier.textContent = "Earlier";
    scroller.prepend(earlier);
    await vi.waitFor(() => expect(viewport.scrollTop).toBe(220));
    scroller.append(earlier.cloneNode(true));
    await settled(scroller);
    expect(viewport.scrollTop).toBe(220);
    scroller.scrollToLatest();
    expect(scroller.atEnd).toBe(true);
  });
});
