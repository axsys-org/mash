import { describe, expect, it } from "vitest";

import { fixture, shadow } from "../test-support/fixture.js";
import { UIPath } from "./path.js";
import "./register.js";

describe("ui-path", () => {
  it("registers and upgrades", async () => {
    expect(customElements.get("ui-path")).toBe(UIPath);

    const el = await fixture<UIPath>(`<ui-path>content</ui-path>`);
    expect(el).toBeInstanceOf(UIPath);
    expect(el.shadowRoot).not.toBeNull();
  });

  it("renders the path as segments", async () => {
    const el = await fixture<UIPath>(`<ui-path path="/foo/bar/baz"></ui-path>`);
    const segments = [...shadow(el).querySelectorAll('[part="segment"]')].map((segment) =>
      segment.textContent?.trim(),
    );

    expect(segments).toEqual(["foo", "bar", "baz"]);
  });
});
