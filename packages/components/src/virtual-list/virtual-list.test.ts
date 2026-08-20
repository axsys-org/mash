import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIVirtualItem, UIVirtualList } from "./virtual-list.js";
import "./register.js";

describe("ui-virtual-list", () => {
  it("composes an overscanned visible range and preserves total extent", async () => {
    const list = await fixture<UIVirtualList>(`
      <ui-virtual-list overscan="1">
        ${Array.from(
          { length: 8 },
          (_, index) =>
            `<ui-virtual-item index="${index}" size="40">Item ${index}</ui-virtual-item>`,
        ).join("")}
      </ui-virtual-list>
    `);
    const items = Array.from(list.querySelectorAll<UIVirtualItem>("ui-virtual-item"));
    const viewport = inShadow<HTMLElement>(list, `[part="viewport"]`);
    viewport.style.blockSize = "100px";
    viewport.style.overflow = "auto";
    viewport.dispatchEvent(new Event("scroll"));
    await settled(list);

    expect(items.filter((item) => item.visible).length).toBeGreaterThan(0);
    expect(items.filter((item) => item.visible).length).toBeLessThan(items.length);
    expect(inShadow(list, `[part="after"]`).getAttribute("style")).toContain("block-size:");
  });

  it("scrolls to an authored item and reports range changes", async () => {
    const list = await fixture<UIVirtualList>(`
      <ui-virtual-list overscan="0">
        ${Array.from(
          { length: 6 },
          (_, index) =>
            `<ui-virtual-item index="${index}" size="50">Item ${index}</ui-virtual-item>`,
        ).join("")}
      </ui-virtual-list>
    `);
    const viewport = inShadow<HTMLElement>(list, `[part="viewport"]`);
    viewport.style.blockSize = "100px";
    viewport.style.overflow = "auto";
    const onRange = vi.fn();
    list.addEventListener("ui-visible-range-change", onRange);

    list.scrollToItem(4, "start");
    await settled(list);

    expect(viewport.scrollTop).toBe(200);
    expect(onRange).toHaveBeenCalled();
    expect(list.visibleRange[0]).toBeGreaterThanOrEqual(0);
    const visible = itemsAt(list).find((item) => item.visible);
    expect(
      visible?.shadowRoot?.querySelector('[role="listitem"]')?.getAttribute("aria-setsize"),
    ).toBe("6");
  });

  it("defers item targeting until authored items arrive and scrolls to the end", async () => {
    const list = await fixture<UIVirtualList>(`<ui-virtual-list overscan="0"></ui-virtual-list>`);
    const viewport = inShadow<HTMLElement>(list, `[part="viewport"]`);
    viewport.style.blockSize = "100px";
    viewport.style.overflow = "auto";

    list.scrollToItem(3, "start");
    list.insertAdjacentHTML(
      "beforeend",
      Array.from(
        { length: 5 },
        (_, index) => `<ui-virtual-item size="50">Item ${index}</ui-virtual-item>`,
      ).join(""),
    );
    await settled(list);
    expect(viewport.scrollTop).toBe(150);

    list.scrollToBottom();
    await settled(list);
    expect(viewport.scrollTop).toBe(150);
  });
});

function itemsAt(list: UIVirtualList): UIVirtualItem[] {
  return Array.from(list.querySelectorAll<UIVirtualItem>("ui-virtual-item"));
}
