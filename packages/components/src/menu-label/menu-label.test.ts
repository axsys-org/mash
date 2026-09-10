import { describe, expect, it } from "vitest";

import { fixture, inShadow } from "../test-support/fixture.js";
import { UIMenuLabel } from "./menu-label.js";
import "./register.js";

describe("ui-menu-label", () => {
  it("exposes non-interactive prefix, label, and suffix lanes", async () => {
    const el = await fixture<UIMenuLabel>(`
      <ui-menu-label><span slot="prefix">P</span>Navigate<span slot="suffix">S</span></ui-menu-label>
    `);

    expect(el.getAttribute("role")).toBeNull();
    expect(el.matches(":defined")).toBe(true);
    for (const part of ["prefix", "label", "suffix"])
      expect(inShadow(el, `[part="${part}"]`)).toBeInstanceOf(HTMLElement);
  });
});
