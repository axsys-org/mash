import { describe, expect, it } from "vitest";

import { fixture, settled, shadow } from "../test-support/fixture.js";
import { UIPath } from "./path.js";
import "./register.js";

describe("ui-path", () => {
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

  it("renders cumulative ancestor links and a terminal breadcrumb segment", async () => {
    const el = await fixture<UIPath>(`
      <ui-path
        variant="breadcrumb"
        path="/interzone/projects/billing-migration"
        title="Billing migration"
        aria-label="Project path"
      ></ui-path>
    `);
    const root = shadow(el).querySelector('[part="root"]')!;
    const links = [...shadow(el).querySelectorAll<HTMLAnchorElement>('[part~="segment-link"]')];
    const current = shadow(el).querySelector<HTMLElement>('[part~="segment-current"]')!;

    expect(root.getAttribute("role")).toBe("navigation");
    expect(root.getAttribute("aria-label")).toBe("Project path");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/interzone",
      "/interzone/projects",
    ]);
    expect(current.textContent?.trim()).toBe("Billing migration");
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("lets an authored title slot override attribute fallbacks", async () => {
    const el = await fixture<UIPath>(`
      <ui-path title="Fallback" path="/foo/bar"><span slot="title">Authored title</span></ui-path>
    `);

    expect(
      shadow(el).querySelector<HTMLSlotElement>('slot[name="title"]')?.assignedElements()[0]
        ?.textContent,
    ).toBe("Authored title");
    expect(shadow(el).querySelector('[part="content"]')?.getAttribute("aria-label")).toBe(
      "Authored title",
    );
    expect(shadow(el).querySelector('[part="segments"]')).toBeNull();
  });

  it("supports small, current, and selected states", async () => {
    const el = await fixture<UIPath>(
      `<ui-path path="/foo/bar" size="small" current selected></ui-path>`,
    );

    expect(el.getAttribute("size")).toBe("small");
    expect(el.hasAttribute("current")).toBe(true);
    expect(el.hasAttribute("selected")).toBe(true);
    expect(el.matches(":state(current)")).toBe(true);
    expect(el.matches(":state(selected)")).toBe(true);
    expect(shadow(el).querySelector('[part="root"]')?.getAttribute("aria-current")).toBe("page");
    expect(shadow(el).querySelector('[part="root"]')?.getAttribute("aria-selected")).toBe("true");

    el.current = false;
    el.selected = false;
    await settled(el.parentElement!);
    expect(el.hasAttribute("current")).toBe(false);
    expect(el.hasAttribute("selected")).toBe(false);
    expect(el.matches(":state(current)")).toBe(false);
    expect(el.matches(":state(selected)")).toBe(false);
  });

  it("keeps the icon slot and documented parts available", async () => {
    const el = await fixture<UIPath>(
      `<ui-path path="/foo/bar"><span slot="icon">◆</span></ui-path>`,
    );
    const parts = [...shadow(el).querySelectorAll("[part]")].map((node) =>
      node.getAttribute("part"),
    );

    expect(parts).toEqual(
      expect.arrayContaining([
        "root",
        "icon",
        "content",
        "viewport",
        "segments",
        "separator",
        "segment",
      ]),
    );
    const iconSlot = shadow(el).querySelector('slot[name="icon"]') as HTMLSlotElement;
    expect(iconSlot.assignedElements()).toHaveLength(1);
  });

  it("exposes logical overflow edges as custom states", async () => {
    const el = await fixture<UIPath>(`<ui-path title="A very long project title"></ui-path>`);
    const viewport = shadow(el).querySelector<HTMLElement>('[part="viewport"]')!;
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 260 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    });

    viewport.scrollLeft = 0;
    viewport.dispatchEvent(new Event("scroll"));
    await settled(el.parentElement!);
    expect(el.matches(":state(overflowing)")).toBe(true);
    expect(el.matches(":state(overflow-start)")).toBe(false);
    expect(el.matches(":state(overflow-end)")).toBe(true);

    viewport.scrollLeft = 80;
    viewport.dispatchEvent(new Event("scroll"));
    await settled(el.parentElement!);
    expect(el.matches(":state(overflow-start)")).toBe(true);
    expect(el.matches(":state(overflow-end)")).toBe(true);

    viewport.scrollLeft = 160;
    viewport.dispatchEvent(new Event("scroll"));
    await settled(el.parentElement!);
    expect(el.matches(":state(overflow-start)")).toBe(true);
    expect(el.matches(":state(overflow-end)")).toBe(false);
  });
});
