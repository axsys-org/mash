import { describe, expect, it } from "vitest";

import { fixture, inShadow, shadow } from "../test-support/fixture.js";
import { UISkeleton } from "./skeleton.js";
import "./register.js";

describe("ui-skeleton", () => {
  it("registers as an inert placeholder shape", async () => {
    expect(customElements.get("ui-skeleton")).toBe(UISkeleton);

    const skeleton = await fixture<UISkeleton>(`<ui-skeleton></ui-skeleton>`);
    const root = inShadow<HTMLElement>(skeleton, '[part="root"]');

    expect(skeleton).toBeInstanceOf(UISkeleton);
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.getAttribute("role")).toBeNull();
    expect(shadow(skeleton).querySelector("slot")).toBeNull();
  });

  it("keeps product visuals out of the definition module", async () => {
    await fixture<UISkeleton>(`<ui-skeleton></ui-skeleton>`);

    expect(UISkeleton.styles.map((style) => style.cssText).join("\n")).not.toContain("background");
    expect(UISkeleton.styles.map((style) => style.cssText).join("\n")).not.toContain("animation");
  });
});
