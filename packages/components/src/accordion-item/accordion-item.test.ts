import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import type { UIReveal } from "../reveal/reveal.js";
import type { UIAccordionItem } from "./accordion-item.js";
import "./register.js";

describe("ui-accordion-item", () => {
  it("uses an authored title slot and exposes disclosure states", async () => {
    const item = await fixture<UIAccordionItem>(`
      <ui-accordion-item title="Fallback" open disabled>
        <span slot="title">Authored title</span>
        Body
      </ui-accordion-item>
    `);
    const trigger = inShadow<HTMLButtonElement>(item, '[part="trigger"]');
    const content = inShadow<UIReveal>(item, '[part="content"]');

    expect(
      inShadow<HTMLSlotElement>(item, 'slot[name="title"]').assignedElements()[0]?.textContent,
    ).toBe("Authored title");
    expect(content.localName).toBe("ui-reveal");
    expect(content.open).toBe(true);
    expect(content.getAttribute("aria-labelledby")).toBe(trigger.id);
    expect(content.getAttribute("role")).toBe("region");
    expect(content.getAttribute("exportparts")).toContain("content:reveal-content");
    expect(item.matches(":state(open)")).toBe(true);
    expect(item.matches(":state(disabled)")).toBe(true);
  });

  it("realizes header, title adornment, and disclosure anatomy", async () => {
    const item = await fixture<UIAccordionItem>(`
      <ui-accordion-item title="Billing" heading-level="2">
        <span slot="prefix">◆</span><span slot="suffix">active</span>
      </ui-accordion-item>
    `);
    const header = inShadow<HTMLElement>(item, '[part="header"]');
    const parts = [...item.shadowRoot!.querySelectorAll<HTMLElement>("[part]")].map((node) =>
      node.getAttribute("part"),
    );

    expect(header.getAttribute("role")).toBe("heading");
    expect(header.getAttribute("aria-level")).toBe("2");
    expect(parts).toEqual(
      expect.arrayContaining(["header", "trigger", "prefix", "title", "suffix", "disclosure"]),
    );
  });
});
