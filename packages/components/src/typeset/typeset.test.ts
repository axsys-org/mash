import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UITypeset } from "./typeset.js";
import "./register.js";

describe("ui-typeset", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("ui-typeset")).toBe(UITypeset);

    const el = await fixture<UITypeset>(`<ui-typeset>content</ui-typeset>`);
    expect(el).toBeInstanceOf(UITypeset);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("projects its default slot", async () => {
    const el = await fixture<UITypeset>(`<ui-typeset>content</ui-typeset>`);
    // `slot:not([name])` rather than `slot` — a component with named slots may
    // well render one of those first.
    const slot = inShadow<HTMLSlotElement>(el, "slot:not([name])");

    expect(
      slot
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent?.trim())
        .join(""),
    ).toBe("content");
  });

  it("reflects semantic preset and tone fallbacks", async () => {
    const el = await fixture<UITypeset>(`<ui-typeset>content</ui-typeset>`);

    expect(el.preset).toBe("body");
    expect(el.tone).toBe("primary");
    expect(el.getAttribute("preset")).toBe("body");
    expect(el.getAttribute("tone")).toBe("primary");
    expect(inShadow(el, '[part="content"]')).toBeInstanceOf(HTMLElement);
  });
});
