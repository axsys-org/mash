import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { hasIcon, registerIcon, UIIcon, unregisterIcon } from "./icon.js";
import "./register.js";

describe("ui-icon", () => {
  it("realizes a semantic Carbon icon without exposing the source name", async () => {
    const icon = await fixture<UIIcon>(`<ui-icon name="action.search" label="Search"></ui-icon>`);
    const root = inShadow<HTMLElement>(icon, '[part="root"]');
    const source = inShadow<SVGElement>(icon, 'svg[part="source"]');

    expect(root.getAttribute("role")).toBe("img");
    expect(root.getAttribute("aria-label")).toBe("Search");
    expect(source.getAttribute("viewBox")).toBe("0 0 32 32");
    expect(icon.shadowRoot?.textContent).not.toContain("carbon");
  });

  it("is decorative without a label and lets authored layers replace its anatomy", async () => {
    const icon = await fixture<UIIcon>(`
      <ui-icon name="action.search">
        <svg slot="primary" data-custom></svg>
        <span slot="secondary">secondary</span>
        <span slot="badge">2</span>
      </ui-icon>
    `);

    expect(inShadow(icon, '[part="root"]').getAttribute("aria-hidden")).toBe("true");
    expect(
      inShadow<HTMLSlotElement>(icon, 'slot[name="primary"]').assignedElements()[0],
    ).toHaveAttribute("data-custom");
    expect(
      inShadow<HTMLSlotElement>(icon, 'slot[name="secondary"]').assignedElements(),
    ).toHaveLength(1);
    expect(inShadow<HTMLSlotElement>(icon, 'slot[name="badge"]').assignedElements()).toHaveLength(
      1,
    );
  });

  it("supports application-provided semantic sources without widening the component API", async () => {
    registerIcon(
      "product.billing",
      '<svg part="source" viewBox="0 0 16 16"><path data-billing d="M0 0h1v1z"/></svg>',
    );
    expect(hasIcon("product.billing")).toBe(true);

    const icon = await fixture<UIIcon>(`<ui-icon name="product.billing"></ui-icon>`);
    await settled(icon);
    expect(inShadow(icon, "[data-billing]")).toBeTruthy();
    expect(unregisterIcon("product.billing")).toBe(true);
  });
});
