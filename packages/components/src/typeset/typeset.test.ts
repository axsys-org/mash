import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UITypeset } from "./typeset.js";
import "./register.js";

describe("ui-typeset", () => {
  it("reflects semantic preset and tone fallbacks", async () => {
    const el = await fixture<UITypeset>(`<ui-typeset>content</ui-typeset>`);

    expect(el.preset).toBe("body");
    expect(el.tone).toBe("primary");
    expect(el.flow).toBe("inline");
    expect(el.getAttribute("preset")).toBe("body");
    expect(el.getAttribute("tone")).toBe("primary");
    expect(el.getAttribute("flow")).toBe("inline");
    expect(inShadow(el, '[part="content"]')).toBeInstanceOf(HTMLElement);
  });

  it("switches the internal content boundary to block flow when rendering prose", async () => {
    const el = await fixture<UITypeset>(`
      <ui-typeset flow="block">
        <h2>Release readiness</h2>
        <p>Rendered markdown remains authored semantic HTML.</p>
      </ui-typeset>
    `);

    expect(el.flow).toBe("block");
    expect(inShadow(el, '[part="root"]').localName).toBe("div");
    expect(inShadow(el, '[part="content"]').localName).toBe("div");
  });
});
