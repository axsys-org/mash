import { describe, expect, it } from "vitest";

import { fixture, inShadow, shadow } from "../test-support/fixture.js";
import { UIShimmer } from "./shimmer.js";
import "./register.js";

describe("ui-shimmer", () => {
  it("registers and projects meaningful text without progress semantics", async () => {
    expect(customElements.get("ui-shimmer")).toBe(UIShimmer);

    const shimmer = await fixture<UIShimmer>(`<ui-shimmer>Thinking...</ui-shimmer>`);
    const content = inShadow<HTMLElement>(shimmer, '[part="content"]');
    const slot = inShadow<HTMLSlotElement>(shimmer, "slot:not([name])");

    expect(shimmer).toBeInstanceOf(UIShimmer);
    expect(shimmer.shadowRoot).not.toBeNull();
    expect(content.getAttribute("role")).toBeNull();
    expect(shimmer.getAttribute("aria-busy")).toBeNull();
    expect(
      slot
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent)
        .join(""),
    ).toBe("Thinking...");
  });

  it("runs a decorative text sweep by default", async () => {
    const shimmer = await fixture<UIShimmer>(`<ui-shimmer>Generating...</ui-shimmer>`);
    const content = inShadow<HTMLElement>(shimmer, '[part="content"]');

    expect(getComputedStyle(content).animationName).toBe("ui-shimmer-sweep");
  });

  it("reflects direction and one-shot animation controls", async () => {
    const shimmer = await fixture<UIShimmer>(`<ui-shimmer reverse once>Uploading...</ui-shimmer>`);
    const content = inShadow<HTMLElement>(shimmer, '[part="content"]');
    const style = getComputedStyle(content);

    expect(shimmer.reverse).toBe(true);
    expect(shimmer.once).toBe(true);
    expect(style.animationDirection).toBe("reverse");
    expect(style.animationIterationCount).toBe("1");
  });

  it("exposes only root and content parts", async () => {
    const shimmer = await fixture<UIShimmer>(`<ui-shimmer>Indexing...</ui-shimmer>`);

    expect(
      [...shadow(shimmer).querySelectorAll("[part]")].map((part) => part.getAttribute("part")),
    ).toEqual(["root", "content"]);
  });
});
