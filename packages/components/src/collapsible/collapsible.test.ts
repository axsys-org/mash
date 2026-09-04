import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIReveal } from "../reveal/reveal.js";
import type { UICollapsible } from "./collapsible.js";
import "./register.js";

describe("ui-collapsible", () => {
  it("uses reveal for measured disclosure presence without losing trigger semantics", async () => {
    const collapsible = await fixture<UICollapsible>(`
      <ui-collapsible>
        <span slot="trigger">Advanced</span>
        <p>Details</p>
      </ui-collapsible>
    `);
    const trigger = inShadow<HTMLButtonElement>(collapsible, "button");
    const content = inShadow<UIReveal>(collapsible, '[part="content"]');

    expect(content.localName).toBe("ui-reveal");
    expect(content.id).toBe(trigger.getAttribute("aria-controls"));
    expect(content.open).toBe(false);
    expect(content.getAttribute("aria-hidden")).toBe("true");
    expect(content.getAttribute("exportparts")).toContain("content:reveal-content");

    trigger.click();
    await settled(collapsible.parentElement!);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(collapsible.open).toBe(true);
    expect(collapsible.matches(":state(open)")).toBe(true);
    expect(content.open).toBe(true);
    expect(content.hasAttribute("aria-hidden")).toBe(false);
  });
});
