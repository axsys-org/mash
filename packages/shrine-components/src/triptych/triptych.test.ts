import { afterEach, beforeEach, describe, expect, it } from "vitest";

import "@mash/ui/catalogue/mash.css";
import { fixture, inShadow } from "../test-support/fixture.js";
import "../catalogue/mash.css";
import { ShrineTriptych } from "./triptych.js";
import "./register.js";

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
});

describe("sh-triptych", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("sh-triptych")).toBe(ShrineTriptych);

    const el = await fixture<ShrineTriptych>(`<sh-triptych>content</sh-triptych>`);
    expect(el).toBeInstanceOf(ShrineTriptych);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its named content slot and preserves the default compatibility path", async () => {
    const el = await fixture<ShrineTriptych>(`
      <sh-triptych><p slot="content">named</p><p>fallback</p></sh-triptych>
    `);
    const slot = inShadow<HTMLSlotElement>(el, 'slot[name="content"]');

    expect(slot.assignedElements()[0]?.textContent).toBe("named");
    expect(customElements.get("ui-scroll-area")).toBeDefined();
    expect(inShadow(el, 'ui-scroll-area[part="main-body"]').shadowRoot).not.toBeNull();
  });

  it("gives every independently scrolling region a Mash viewport", async () => {
    const el = await fixture<ShrineTriptych>(`
      <sh-triptych>
        <p slot="sidebar">sidebar</p>
        <p slot="content">main</p>
        <p slot="inspector">inspector</p>
      </sh-triptych>
    `);

    const areas = [...el.shadowRoot!.querySelectorAll("ui-scroll-area")];
    expect(areas.map((area) => area.getAttribute("part"))).toEqual([
      "sidebar-body",
      "main-body",
      "inspector-body",
    ]);
    for (const area of areas) {
      expect(inShadow(area, '[part="viewport"]').getAttribute("role")).toBe("region");
    }
  });

  it("bounds long main content inside the allocated workspace viewport", async () => {
    const rows = Array.from({ length: 80 }, (_, index) => `<p>Row ${index}</p>`).join("");
    const el = await fixture<ShrineTriptych>(`
      <sh-triptych style="block-size: 420px" inspector-open>
        <div slot="sidebar">Sidebar</div>
        <div slot="content">${rows}</div>
        <div slot="inspector">Inspector</div>
      </sh-triptych>
    `);
    const area = inShadow<HTMLElement>(el, 'ui-scroll-area[part="main-body"]');
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');

    expect(area.clientHeight).toBeLessThanOrEqual(420);
    expect(viewport.clientHeight).toBeLessThanOrEqual(area.clientHeight);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
  });

  it("collapses optional chrome when its slots are empty", async () => {
    const el = await fixture<ShrineTriptych>(`<sh-triptych>content</sh-triptych>`);

    expect(inShadow(el, '[part="locator"]').hidden).toBe(true);
    expect(inShadow(el, '[part="navigate"]').hidden).toBe(true);
    expect(inShadow(el, '[part="inspector-locator"]').hidden).toBe(true);
  });
});
