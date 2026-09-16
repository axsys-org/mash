import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "@mash/ui/catalogue/mash.css";
import "../catalogue/mash.css";
import { fixture, inShadow } from "../test-support/fixture.js";
import { ShrineSidebar } from "./sidebar.js";
import "./register.js";

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
});

describe("sh-sidebar", () => {
  it("registers with optional empty regions hidden", async () => {
    const el = await fixture<ShrineSidebar>("<sh-sidebar>Content</sh-sidebar>");
    expect(el).toBeInstanceOf(ShrineSidebar);
    for (const part of ["locator", "search", "shortcuts", "collections", "views", "footer"]) {
      expect(getComputedStyle(inShadow(el, `[part=${part}]`)).display).toBe("none");
    }
  });

  it("projects controls without taking over their events or state", async () => {
    const el = await fixture<ShrineSidebar>(
      `<sh-sidebar><button slot="shortcuts">Run</button><div slot="locator">Current path</div><div slot="footer">Local</div></sh-sidebar>`,
    );
    const button = el.querySelector("button")!;
    let count = 0;
    button.addEventListener("click", () => count++);
    button.click();
    expect(count).toBe(1);
    expect(inShadow<HTMLSlotElement>(el, 'slot[name="shortcuts"]').assignedElements()).toEqual([
      button,
    ]);
    expect(inShadow(el, '[part="locator"]').hidden).toBe(false);
    el.querySelector('[slot="locator"]')!.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(inShadow(el, '[part="locator"]').hidden).toBe(true);
  });

  it("keeps long content in one bounded viewport with tools outside it", async () => {
    const el = await fixture<ShrineSidebar>(
      `<sh-sidebar label="Debug navigation" style="block-size:320px"><strong slot="locator">Context</strong>${"<p>Path</p>".repeat(80)}<button slot="footer">Tools</button></sh-sidebar>`,
    );
    const area = inShadow(el, 'ui-scroll-area[part="body"]');
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    expect(area.getAttribute("label")).toBe("Debug navigation");
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    expect(viewport.clientHeight).toBeLessThan(320);
    expect(inShadow(el, '[part="footer"]').getBoundingClientRect().bottom).toBeLessThanOrEqual(
      el.getBoundingClientRect().bottom + 1,
    );
  });

  it("exports the Mash scrollbar anatomy while retaining native viewport behavior", async () => {
    const el = await fixture<ShrineSidebar>(
      `<sh-sidebar style="block-size:160px">${"<p>Path</p>".repeat(30)}</sh-sidebar>`,
    );
    const area = inShadow(el, 'ui-scroll-area[part="body"]');
    const parts = area.getAttribute("exportparts")!.split(",");
    expect(area.getAttribute("mode")).toBe("scrolling");
    expect(area.getAttribute("size")).toBe("medium");
    for (const axis of ["block", "inline"]) {
      expect(parts).toContain(`${axis}-scrollbar:scrollbar`);
      for (const part of ["scrollbar", "track", "thumb"])
        expect(parts).toContain(`${axis}-${part}:${axis}-${part}`);
    }
    expect(parts).toContain("corner:scroll-corner");
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    expect(getComputedStyle(viewport).overflow).toBe("auto");
    // Merely exporting parts does not hide platform scrollbars: consumers must
    // opt into the custom recipe so an unstyled composition remains usable.
    expect(getComputedStyle(viewport).scrollbarWidth).not.toBe("none");
  });

  it("lets a consumer style activity through the exported scroll owner without copying behavior", async () => {
    const wrapper = await fixture<HTMLElement>(`
      <div>
        <style>
          sh-sidebar::part(body) { --fixture-scrollbar-opacity: 0; }
          sh-sidebar::part(body):state(visible) { --fixture-scrollbar-opacity: 1; }
          sh-sidebar::part(scrollbar) { opacity: var(--fixture-scrollbar-opacity); }
        </style>
        <sh-sidebar style="block-size:160px">${"<p>Path</p>".repeat(30)}</sh-sidebar>
      </div>
    `);
    const sidebar = wrapper.querySelector<ShrineSidebar>("sh-sidebar")!;
    const area = inShadow(sidebar, 'ui-scroll-area[part="body"]');
    const bar = inShadow<HTMLElement>(area, '[part="block-scrollbar"]');
    expect(getComputedStyle(bar).opacity).toBe("0");
    inShadow(area, '[part="root"]').dispatchEvent(new PointerEvent("pointerenter"));
    expect(getComputedStyle(bar).opacity).toBe("0");
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');
    viewport.scrollTop = 24;
    viewport.dispatchEvent(new Event("scroll"));
    expect(getComputedStyle(bar).opacity).toBe("1");
    inShadow(area, '[part="root"]').dispatchEvent(new PointerEvent("pointerleave"));
    expect(getComputedStyle(bar).opacity).toBe("1");
    await new Promise((resolve) => setTimeout(resolve, 2100));
    expect(getComputedStyle(bar).opacity).toBe("0");
  });
});
