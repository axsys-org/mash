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
  it("constructs a bounded two-axis window for half a million records", async () => {
    const list = await fixture<UIVirtualList>(`<ui-virtual-list overscan="1"></ui-virtual-list>`);
    const viewport = inShadow<HTMLElement>(list, `[part="viewport"]`);
    viewport.style.cssText = "height:120px;width:320px;overflow:auto";
    const render = vi.fn((index: number, column: number) => {
      const cell = document.createElement("span");
      cell.textContent = `${index}:${column}`;
      return cell;
    });
    list.source = { count: 500_000, size: 30, columns: 100, columnSize: 100, render };
    await settled(list);
    expect(list.querySelectorAll("ui-virtual-item").length).toBeLessThan(10);
    expect(render.mock.calls.length).toBeLessThan(100);
    expect(list.textContent).toContain("0:0");
    list.scrollToItem(250_000, "start");
    await settled(list);
    expect(list.visibleRange[0]).toBe(249_999);
    expect(list.textContent).toContain("250000:0");
    expect([...list.querySelectorAll("span")].some((cell) => cell.textContent === "0:0")).toBe(
      false,
    );
    viewport.scrollLeft = 9000;
    viewport.dispatchEvent(new Event("scroll"));
    await settled(list);
    expect(list.textContent).toContain("250000:90");
    expect(list.textContent).not.toContain("250000:0");
    const calls = render.mock.calls.length;
    viewport.dispatchEvent(new Event("scroll"));
    await settled(list);
    expect(render.mock.calls.length).toBe(calls);
    list.scrollToBottom();
    await settled(list);
    expect(list.textContent).toContain("499999:90");
    list.source = { count: 5, size: 30, render };
    await settled(list);
    expect(list.querySelectorAll("ui-virtual-item").length).toBeLessThanOrEqual(5);
    list.source = null;
    await settled(list);
    expect(list.querySelectorAll("ui-virtual-item").length).toBe(0);
  });

  it("refreshes authored size caches and preserves surviving row nodes", async () => {
    const list = await fixture<UIVirtualList>(
      `<ui-virtual-list overscan="0">${Array.from({ length: 20 }, (_, i) => `<ui-virtual-item size="40"><input value="${i}"></ui-virtual-item>`).join("")}</ui-virtual-list>`,
    );
    const viewport = inShadow<HTMLElement>(list, `[part="viewport"]`);
    viewport.style.cssText = "height:100px;overflow:auto";
    viewport.dispatchEvent(new Event("scroll"));
    await settled(list);
    const rows = itemsAt(list);
    rows[0]!.size = 100;
    await settled(list);
    list.scrollToItem(2, "start");
    await settled(list);
    expect(viewport.scrollTop).toBe(140);
    const input = rows[2]!.querySelector("input")!;
    input.value = "retained";
    list.scrollToBottom();
    list.scrollToItem(2, "start");
    await settled(list);
    expect(rows[2]!.querySelector("input")).toBe(input);
    expect(input.value).toBe("retained");
  });
});

function itemsAt(list: UIVirtualList): UIVirtualItem[] {
  return Array.from(list.querySelectorAll<UIVirtualItem>("ui-virtual-item"));
}
