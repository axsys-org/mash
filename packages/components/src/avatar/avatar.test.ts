import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled, shadow } from "../test-support/fixture.js";
import { UIAvatar } from "./avatar.js";
import "./register.js";

describe("ui-avatar", () => {
  it("registers, upgrades and applies documented defaults", async () => {
    expect(customElements.get("ui-avatar")).toBe(UIAvatar);

    const avatar = await fixture<UIAvatar>(`<ui-avatar>AX</ui-avatar>`);
    expect(avatar).toBeInstanceOf(UIAvatar);
    expect(avatar.size).toBe("medium");
    expect(avatar.src).toBe("");
    expect(
      [...shadow(avatar).querySelectorAll("[part]")].map((node) => node.getAttribute("part")),
    ).toEqual(expect.arrayContaining(["root", "image", "fallback"]));
  });

  it("uses the fallback when an image is absent", async () => {
    const avatar = await fixture<UIAvatar>(`<ui-avatar>AX</ui-avatar>`);
    const image = inShadow<HTMLImageElement>(avatar, "img");

    expect(image.hidden).toBe(true);
    const fallbackSlot = inShadow<HTMLSlotElement>(avatar, '[part="fallback"] slot');
    expect(fallbackSlot.assignedNodes().map((node) => node.textContent?.trim())).toContain("AX");
  });

  it("uses the fallback after an image fails", async () => {
    const avatar = await fixture<UIAvatar>(
      `<ui-avatar src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E">AX</ui-avatar>`,
    );
    const image = inShadow<HTMLImageElement>(avatar, "img");

    expect(image.hidden).toBe(false);
    image.dispatchEvent(new Event("error"));
    await settled(avatar.parentElement!);

    expect(image.hidden).toBe(true);
    const fallbackSlot = inShadow<HTMLSlotElement>(avatar, '[part="fallback"] slot');
    expect(fallbackSlot.assignedNodes().map((node) => node.textContent?.trim())).toContain("AX");
  });

  it("reflects the selected scale", async () => {
    const avatar = await fixture<UIAvatar>(`<ui-avatar>AX</ui-avatar>`);
    avatar.size = "large";
    await settled(avatar.parentElement!);

    expect(avatar.getAttribute("size")).toBe("large");
  });
});
