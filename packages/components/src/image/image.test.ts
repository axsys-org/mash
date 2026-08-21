import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIImage } from "./image.js";
import "./register.js";

describe("ui-image", () => {
  it("forwards native image loading data and authored responsive sources", async () => {
    const image = await fixture<UIImage>(`
      <ui-image src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20id%3D%22primary%22%2F%3E" alt="Project preview" width="1280" height="720">
        <source slot="source" media="(min-width: 0px)" srcset="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20id%3D%22wide%22%2F%3E">
        <span slot="placeholder">Loading</span>
      </ui-image>
    `);
    image.id = "image-state-visibility";
    const partRecipe = document.createElement("style");
    partRecipe.textContent =
      "#image-state-visibility::part(placeholder), #image-state-visibility::part(error) { display: grid; }";
    document.head.append(partRecipe);
    const native = inShadow<HTMLImageElement>(image, "img");
    const sourceSlot = inShadow<HTMLSlotElement>(image, 'slot[name="source"]');
    if (!native.complete) {
      await new Promise<void>((resolve) =>
        native.addEventListener("load", () => resolve(), { once: true }),
      );
    }

    expect(native.getAttribute("src")).toContain("primary");
    expect(native.alt).toBe("Project preview");
    expect(native.width).toBe(1280);
    expect(native.height).toBe(720);
    expect(sourceSlot.assignedElements()[0]?.localName).toBe("source");
    expect(sourceSlot.part.contains("source")).toBe(true);
    expect(sourceSlot.part.contains("sources")).toBe(true);
    expect(native.currentSrc).toContain("wide");
    expect(image.matches(":state(loaded)")).toBe(true);
    expect(getComputedStyle(inShadow<HTMLElement>(image, '[part="error"]')).display).toBe("none");
    partRecipe.remove();
  });

  it("recovers through fallback-src before exposing the terminal error slot", async () => {
    const image = await fixture<UIImage>(`
      <ui-image src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E" fallback-src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201%201%22%2F%3E" alt="Project preview">
        <span slot="error">Unavailable</span>
      </ui-image>
    `);
    const listener = vi.fn();
    image.addEventListener("ui-image-error", listener);
    let native = inShadow<HTMLImageElement>(image, "img");

    native.dispatchEvent(new Event("error"));
    await settled(image.parentElement!);

    expect(listener.mock.calls[0]?.[0].detail).toEqual({
      src: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E",
      fallback: false,
      recoverable: true,
    });
    expect(image.matches(":state(fallback)")).toBe(true);
    expect(image.matches(":state(error)")).toBe(false);
    native = inShadow<HTMLImageElement>(image, "img");
    expect(native.getAttribute("src")).toContain("viewBox");

    native.dispatchEvent(new Event("error"));
    await settled(image.parentElement!);

    expect(image.matches(":state(error)")).toBe(true);
    expect(inShadow<HTMLElement>(image, '[part="error"]').hidden).toBe(false);
  });

  it("reports successful intrinsic image metadata", async () => {
    const source =
      "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201%201%22%2F%3E";
    const image = await fixture<UIImage>(`<ui-image src="${source}" alt="Project"></ui-image>`);
    const listener = vi.fn();
    image.addEventListener("ui-image-load", listener);
    const native = inShadow<HTMLImageElement>(image, "img");

    native.dispatchEvent(new Event("load"));
    await settled(image.parentElement!);

    expect(image.matches(":state(loaded)")).toBe(true);
    expect(listener.mock.calls[0]?.[0].detail).toMatchObject({
      src: source,
      fallback: false,
    });
  });
});
