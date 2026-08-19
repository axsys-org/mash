import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { UIProgress } from "./progress.js";
import "./register.js";

describe("ui-progress", () => {
  it("registers and exposes an accessible bounded progressbar", async () => {
    expect(customElements.get("ui-progress")).toBe(UIProgress);

    const progress = await fixture<UIProgress>(
      `<ui-progress value="64" label="Uploading"></ui-progress>`,
    );
    const root = inShadow<HTMLElement>(progress, '[part="root"]');

    expect(progress).toBeInstanceOf(UIProgress);
    expect(root.getAttribute("role")).toBe("progressbar");
    expect(root.getAttribute("aria-label")).toBe("Uploading");
    expect(root.getAttribute("aria-valuenow")).toBe("64");
    expect(
      [...shadow(progress).querySelectorAll("[part]")].map((node) => node.getAttribute("part")),
    ).toEqual(expect.arrayContaining(["root", "track", "indicator"]));
  });

  it("normalizes invalid and out-of-range values for assistive technology and display", async () => {
    const progress = await fixture<UIProgress>(`<ui-progress value="240" max="120"></ui-progress>`);
    const root = inShadow<HTMLElement>(progress, '[part="root"]');
    const indicator = inShadow<HTMLElement>(progress, '[part="indicator"]');

    expect(root.getAttribute("aria-valuenow")).toBe("120");
    expect(indicator.style.inlineSize).toBe("100%");

    progress.max = 0;
    progress.value = -1;
    await settled(progress.parentElement!);

    expect(root.getAttribute("aria-valuemax")).toBe("1");
    expect(root.getAttribute("aria-valuenow")).toBe("0");
    expect(indicator.style.inlineSize).toBe("0%");
  });
});
