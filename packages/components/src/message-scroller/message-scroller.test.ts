import { describe, expect, it, vi } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIMessageScroller } from "./message-scroller.js";
import "./register.js";

describe("message scroller", () => {
  it("mounts a bounded variable-height history and preserves the anchor across prepend", async () => {
    const scroller = await fixture<UIMessageScroller>(
      "<ui-message-scroller></ui-message-scroller>",
    );
    scroller.renderMessage = (item) => {
      const row = document.createElement("div");
      row.style.height = Number(item.index) % 2 ? "60px" : "100px";
      row.textContent = String(item.text);
      return row;
    };
    scroller.items = Array.from({ length: 10000 }, (_, index) => ({
      id: String(index),
      index,
      text: "Message " + index,
    }));
    await settled(scroller);
    const viewport = inShadow<HTMLElement>(scroller, '[part="viewport"]');
    await vi.waitFor(() =>
      expect(scroller.querySelector('[data-message-id="9999"]')).not.toBeNull(),
    );
    expect(scroller.querySelectorAll("[data-message-id]").length).toBeLessThan(30);
    expect(scroller.scrollToMessage("5000")).toBe(true);
    await vi.waitFor(() =>
      expect(scroller.querySelector('[data-message-id="5000"]')).not.toBeNull(),
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const row = scroller.querySelector<HTMLElement>('[data-message-id="5000"]')!;
    const before = row.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
    scroller.items = [{ id: "earlier", index: 0, text: "Earlier" }, ...scroller.items];
    await settled(scroller);
    await vi.waitFor(() =>
      expect(
        Math.abs(row.getBoundingClientRect().top - viewport.getBoundingClientRect().top - before),
      ).toBeLessThan(2),
    );
    expect(scroller.atEnd).toBe(false);
    scroller.scrollToLatest();
    await vi.waitFor(() =>
      expect(scroller.querySelector('[data-message-id="9999"]')).not.toBeNull(),
    );
    expect(scroller.scrollToMessage("missing")).toBe(false);
  });
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
  it("supports owner navigation with the built-in latest action hidden", async () => {
    const scroller = await fixture<UIMessageScroller>(
      `<ui-message-scroller hide-latest>${Array.from({ length: 12 }, (_, index) => `<div id="row-${index}" style="height:80px;flex:none">Message ${index}</div>`).join("")}</ui-message-scroller>`,
    );
    await settled(scroller);
    expect(scroller.scrollToMessage("row-0")).toBe(true);
    await settled(scroller);
    expect(scroller.atEnd).toBe(false);
    expect(inShadow<HTMLButtonElement>(scroller, '[part="latest"]').hidden).toBe(true);
    scroller.hideLatest = false;
    await settled(scroller);
    expect(inShadow<HTMLButtonElement>(scroller, '[part="latest"]').hidden).toBe(false);
    scroller.scrollToLatest();
    await settled(scroller);
    expect(scroller.atEnd).toBe(true);
    expect(inShadow<HTMLButtonElement>(scroller, '[part="latest"]').hidden).toBe(true);
  });
});
