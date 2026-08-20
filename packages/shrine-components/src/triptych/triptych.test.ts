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

    const element = await fixture<ShrineTriptych>(`<sh-triptych>content</sh-triptych>`);
    expect(element).toBeInstanceOf(ShrineTriptych);
    expect(element.shadowRoot).not.toBeNull();
  });

  it("projects named content and preserves the default compatibility path", async () => {
    const element = await fixture<ShrineTriptych>(`
      <sh-triptych><p slot="content">named</p><p>fallback</p></sh-triptych>
    `);
    const slot = inShadow<HTMLSlotElement>(element, 'slot[name="content"]');

    expect(slot.assignedElements()[0]?.textContent).toBe("named");
    expect(customElements.get("ui-scroll-area")).toBeDefined();
    expect(inShadow(element, 'ui-scroll-area[part="main-body"]').shadowRoot).not.toBeNull();
  });

  it("gives every independently scrolling region a bounded viewport", async () => {
    const element = await fixture<ShrineTriptych>(`
      <sh-triptych>
        <p slot="sidebar">sidebar</p>
        <p slot="content">main</p>
        <p slot="inspector">inspector</p>
      </sh-triptych>
    `);

    const areas = [...element.shadowRoot!.querySelectorAll("ui-scroll-area")];
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
    const element = await fixture<ShrineTriptych>(`
      <sh-triptych style="block-size: 420px" inspector-open>
        <div slot="sidebar">Sidebar</div>
        <div slot="content">${rows}</div>
        <div slot="inspector">Inspector</div>
      </sh-triptych>
    `);
    const area = inShadow<HTMLElement>(element, 'ui-scroll-area[part="main-body"]');
    const viewport = inShadow<HTMLElement>(area, '[part="viewport"]');

    expect(area.clientHeight).toBeLessThanOrEqual(420);
    expect(viewport.clientHeight).toBeLessThanOrEqual(area.clientHeight);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
  });

  it("collapses optional chrome when its slots are empty", async () => {
    const element = await fixture<ShrineTriptych>(`<sh-triptych>content</sh-triptych>`);

    expect(inShadow(element, '[part="locator"]').hidden).toBe(true);
    expect(inShadow(element, '[part="navigate"]').hidden).toBe(true);
    expect(inShadow(element, '[part="inspector-locator"]').hidden).toBe(true);
  });
});
