import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { UISpinner } from "./spinner.js";
import "./register.js";

describe("ui-spinner", () => {
  it("registers and exposes a labelled live loading status", async () => {
    expect(customElements.get("ui-spinner")).toBe(UISpinner);

    const spinner = await fixture<UISpinner>(
      `<ui-spinner label="Refreshing workspace"></ui-spinner>`,
    );
    const root = inShadow<HTMLElement>(spinner, '[part="root"]');

    expect(spinner).toBeInstanceOf(UISpinner);
    expect(spinner.size).toBe("medium");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-label")).toBe("Refreshing workspace");
    expect(
      [...shadow(spinner).querySelectorAll("[part]")].map((node) => node.getAttribute("part")),
    ).toEqual(expect.arrayContaining(["root", "indicator"]));
  });

  it("reflects scale changes", async () => {
    const spinner = await fixture<UISpinner>(`<ui-spinner></ui-spinner>`);
    spinner.size = "large";
    await settled(spinner.parentElement!);

    expect(spinner.getAttribute("size")).toBe("large");
  });
});
