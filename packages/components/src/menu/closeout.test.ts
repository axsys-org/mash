import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cdp, server, userEvent } from "vitest/browser";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIMenu } from "./menu.js";
import type { UIContextMenu } from "../context-menu/context-menu.js";
import "./register.js";
import "../context-menu/register.js";
import "../menu-item/register.js";
import "../catalogue/mash.css";

type Menu = UIMenu | UIContextMenu;
let legacyStyle: HTMLStyleElement;
const part = (menu: Element, name: string): HTMLElement =>
  menu.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`) ??
  inShadow<HTMLElement>(menu.shadowRoot!.querySelector("ui-scroll-area")!, `[part="${name}"]`);

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
  // An older progressively enhanced client can load this same-layer recipe
  // first. All of its child animations must be reset, not merely omitted.
  legacyStyle = document.createElement("style");
  legacyStyle.textContent = `@layer mash.catalogue {
    :where([data-mash-catalogue="mash"]) ui-menu:not([nested]):state(exiting)::part(popup),
    :where([data-mash-catalogue="mash"]) ui-context-menu:state(exiting)::part(popup) {
      --legacy-shell-rule: matched;
      animation: mash-menu-presence-closeout var(--duration-transient) var(--easing-control) both;
    }
    ${["header", "viewport", "footer"]
      .flatMap((name) => [
        `:where([data-mash-catalogue="mash"]) ui-menu:not([nested]):state(exiting)::part(${name})`,
        `:where([data-mash-catalogue="mash"]) ui-context-menu:state(exiting)::part(${name})`,
      ])
      .join(",")} {
      --legacy-region-rule: matched;
      animation: mash-menu-closeout var(--duration-transient) var(--easing-control) both;
    }
  }`;
  document.head.prepend(legacyStyle);
});
afterEach(() => {
  legacyStyle.remove();
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

async function openMenu(tag = "ui-menu"): Promise<Menu> {
  const menu =
    await fixture<Menu>(`<${tag} label="Paths" style="--duration-transient:1000ms;--easing-control:linear;--mash-material-display:block">
    <button slot="trigger">Paths</button><span slot="header">/app</span>
    <ui-menu-item value="card" href="#card">card</ui-menu-item><span slot="footer">Open all paths</span>
  </${tag}>`);
  menu.open = true;
  await settled(menu);
  await expect.poll(() => menu.matches(":state(active)")).toBe(true);
  return menu;
}

async function freezeExit(menu: Menu): Promise<Animation[]> {
  menu.open = false;
  await menu.updateComplete;
  const animations = [part(menu, "popup"), part(menu, "material")].map((element) => {
    const animation = element.getAnimations()[0];
    expect(animation).toBeDefined();
    animation!.pause();
    animation!.currentTime = 500;
    return animation!;
  });
  return animations;
}

async function finishExit(menu: Menu, animations: Animation[]): Promise<void> {
  animations.forEach((animation) => animation.finish());
  await expect.poll(() => menu.matches(":state(present)")).toBe(false);
  await settled(menu);
  expect(part(menu, "backdrop").hidden).toBe(true);
  expect(part(menu, "popup").getBoundingClientRect().height).toBe(0);
}

describe("shared menu closeout", () => {
  for (const tag of ["ui-menu", "ui-context-menu"]) {
    for (const theme of ["light", "dark"]) {
      it(`fades the ${tag} shell and sibling material once in ${theme}, overriding legacy child fades`, async () => {
        document.documentElement.dataset.theme = theme;
        const menu = await openMenu(tag);
        const item = menu.querySelector("ui-menu-item")!;
        const popup = part(menu, "popup");
        const material = part(menu, "material");
        expect(popup.parentElement).toBe(material.parentElement);
        expect(popup.contains(material)).toBe(false);
        const animations = await freezeExit(menu);
        expect(menu.matches(":state(present):state(exiting)")).toBe(true);
        expect(part(menu, "backdrop").inert).toBe(true);
        expect(popup.getBoundingClientRect().height).toBeGreaterThan(0);
        expect(getComputedStyle(popup).getPropertyValue("--legacy-shell-rule").trim()).toBe(
          "matched",
        );
        for (const element of [popup, material]) {
          expect(getComputedStyle(element).animationName).toBe("mash-menu-closeout");
          expect(Number(getComputedStyle(element).opacity)).toBeCloseTo(0.5, 2);
        }
        for (const name of ["header", "viewport", "footer"]) {
          const region = part(menu, name);
          expect(getComputedStyle(region).getPropertyValue("--legacy-region-rule").trim()).toBe(
            "matched",
          );
          expect(getComputedStyle(region).animationName).toBe("none");
          expect(getComputedStyle(region).opacity).toBe("1");
          expect(region.getAnimations()).toHaveLength(0);
        }
        expect(menu.querySelector("ui-menu-item")).toBe(item);
        expect(item.textContent).toBe("card");
        await finishExit(menu, animations);
        expect(menu.querySelector("ui-menu-item")).toBe(item);
      });
    }

    it.skipIf(server.browser !== "chromium")(
      `settles ${tag} immediately with actual reduced-motion media`,
      async () => {
        await cdp().send("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        try {
          expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
          const menu = await openMenu(tag);
          menu.open = false;
          await settled(menu);
          await expect.poll(() => menu.matches(":state(present)")).toBe(false);
          expect(menu.matches(":state(reduced-motion)")).toBe(true);
          expect(part(menu, "backdrop").hidden).toBe(true);
        } finally {
          await cdp().send("Emulation.setEmulatedMedia", { features: [] });
        }
      },
    );
  }

  it("keeps reopened menu content active when a prior exit is interrupted", async () => {
    const menu = await openMenu();
    const item = menu.querySelector("ui-menu-item");
    await freezeExit(menu);
    menu.open = true;
    await settled(menu);
    await expect.poll(() => menu.matches(":state(active):state(present)")).toBe(true);
    expect(menu.matches(":state(exiting)")).toBe(false);
    expect(part(menu, "backdrop").inert).toBe(false);
    expect(getComputedStyle(part(menu, "popup")).opacity).toBe("1");
    expect(menu.querySelector("ui-menu-item")).toBe(item);
  });

  it("leaves nested menus on their immediate no-fade close path", async () => {
    const menu = await fixture<UIMenu>(
      `<ui-menu nested open label="Nested"><ui-menu-item>Child</ui-menu-item></ui-menu>`,
    );
    menu.open = false;
    await menu.updateComplete;
    expect(getComputedStyle(part(menu, "popup")).animationName).toBe("none");
    expect(getComputedStyle(part(menu, "material")).animationName).toBe("none");
    for (const name of ["header", "viewport", "footer"])
      expect(getComputedStyle(part(menu, name)).animationName).toBe("none");
    await expect.poll(() => menu.matches(":state(present)")).toBe(false);
  });

  it("keeps keyboard dismissal and focus return while the outgoing surface is inert", async () => {
    const menu = await fixture<UIMenu>(
      `<ui-menu label="Paths" style="--duration-transient:1000ms"><button slot="trigger">Paths</button><ui-menu-item>card</ui-menu-item></ui-menu>`,
    );
    const trigger = menu.querySelector<HTMLButtonElement>("button")!;
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await settled(menu);
    const item = menu.querySelector("ui-menu-item")!;
    expect(item.shadowRoot!.activeElement).toBe(part(item, "control"));
    await userEvent.keyboard("{Escape}");
    await menu.updateComplete;
    expect(menu.open).toBe(false);
    expect(part(menu, "backdrop").inert).toBe(true);
    await expect.poll(() => document.activeElement).toBe(trigger);
    await finishExit(menu, part(menu, "popup").getAnimations());
  });
});
