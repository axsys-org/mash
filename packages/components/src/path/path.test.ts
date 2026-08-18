import { describe, expect, it } from "vitest";

import { fixture, settled, shadow } from "../test-support/fixture.js";
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

  it("uses a pretty title when supplied and keeps the raw path accessible", async () => {
    const el = await fixture<UIPath>(`<ui-path title="Foundry" path="/foo/bar/baz"></ui-path>`);
    const root = shadow(el).querySelector('[part="root"]')!;

    expect(shadow(el).querySelector('[part="title"]')?.textContent).toBe("Foundry");
    expect(shadow(el).querySelector('[part="segments"]')).toBeNull();
    expect(root.querySelector(".content")?.getAttribute("aria-label")).toBe("Foundry");
  });

  it("supports small, current, and selected states", async () => {
    const el = await fixture<UIPath>(
      `<ui-path path="/foo/bar" size="small" current selected></ui-path>`,
    );

    expect(el.getAttribute("size")).toBe("small");
    expect(el.hasAttribute("current")).toBe(true);
    expect(el.hasAttribute("selected")).toBe(true);
    expect(shadow(el).querySelector('[part="root"]')?.getAttribute("aria-current")).toBe("page");
    expect(shadow(el).querySelector('[part="root"]')?.getAttribute("aria-selected")).toBe("true");

    el.current = false;
    el.selected = false;
    await settled(el.parentElement!);
    expect(el.hasAttribute("current")).toBe(false);
    expect(el.hasAttribute("selected")).toBe(false);
  });

  it("keeps the icon slot and documented parts available", async () => {
    const el = await fixture<UIPath>(
      `<ui-path path="/foo/bar"><span slot="icon">◆</span></ui-path>`,
    );
    const parts = [...shadow(el).querySelectorAll("[part]")].map((node) =>
      node.getAttribute("part"),
    );

    expect(parts).toEqual(
      expect.arrayContaining(["root", "icon", "segments", "separator", "segment"]),
    );
    const iconSlot = shadow(el).querySelector('slot[name="icon"]') as HTMLSlotElement;
    expect(iconSlot.assignedElements()).toHaveLength(1);
  });
});
