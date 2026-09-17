import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { hasIcon, registerIcon, UIIcon, unregisterIcon } from "./icon.js";
import "./register.js";

describe("ui-icon", () => {
  it("realizes a semantic Lucide icon without exposing the source name", async () => {
    const icon = await fixture<UIIcon>(`<ui-icon name="action.search" label="Search"></ui-icon>`);
    const root = inShadow<HTMLElement>(icon, '[part="root"]');
    const source = inShadow<SVGElement>(icon, 'svg[part="source"]');

    expect(root.getAttribute("role")).toBe("img");
    expect(root.getAttribute("aria-label")).toBe("Search");
    expect(source.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(source.getAttribute("fill")).toBe("none");
    expect(source.getAttribute("stroke")).toBe("currentColor");
    expect(source.getAttribute("stroke-width")).toBe("2");
    expect(icon.shadowRoot?.textContent).not.toContain("lucide");
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

  it("distinguishes a link action from a connection action", async () => {
    const link = await fixture<UIIcon>(`<ui-icon name="action.link" label="Copy link"></ui-icon>`);
    const connect = await fixture<UIIcon>(
      `<ui-icon name="action.connect" label="Connect"></ui-icon>`,
    );

    expect(hasIcon("action.link")).toBe(true);
    expect(inShadow(link, 'svg[part="source"]').innerHTML).not.toBe(
      inShadow(connect, 'svg[part="source"]').innerHTML,
    );
    expect(inShadow(link, '[part="root"]').getAttribute("aria-label")).toBe("Copy link");
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
