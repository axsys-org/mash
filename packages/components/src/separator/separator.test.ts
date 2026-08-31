import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UISeparator } from "./separator.js";
import "./register.js";

describe("ui-separator", () => {
  it("registers with horizontal semantics by default", async () => {
    expect(customElements.get("ui-separator")).toBe(UISeparator);

    const separator = await fixture<UISeparator>(`<ui-separator></ui-separator>`);
    const root = inShadow<HTMLElement>(separator, '[part="root"]');

    expect(separator).toBeInstanceOf(UISeparator);
    expect(separator.orientation).toBe("horizontal");
    expect(root.getAttribute("role")).toBe("separator");
    expect(root.getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("reflects and announces vertical orientation", async () => {
    const separator = await fixture<UISeparator>(`<ui-separator></ui-separator>`);
    separator.orientation = "vertical";
    await settled(separator.parentElement!);

    expect(separator.getAttribute("orientation")).toBe("vertical");
    expect(inShadow(separator, '[part="root"]').getAttribute("aria-orientation")).toBe("vertical");
  });

  it("binds an authored prefix marker without changing separator semantics", async () => {
    const separator = await fixture<UISeparator>(`
      <ui-separator><span slot="prefix">marker</span></ui-separator>
    `);
    const prefix = inShadow<HTMLSlotElement>(separator, 'slot[name="prefix"]');

    expect(prefix.assignedElements()).toHaveLength(1);
    expect(inShadow(separator, '[part="root"]').getAttribute("role")).toBe("separator");
  });
});
