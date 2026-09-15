import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIMenu } from "../menu/menu.js";
import type { UIContextMenu } from "../context-menu/context-menu.js";
import type { UIMenuItem } from "./menu-item.js";
import "./register.js";
import "../menu/register.js";
import "../context-menu/register.js";
import "../icon/register.js";
import "../catalogue/mash.css";

type Menu = UIMenu | UIContextMenu;
const control = (item: Element) => inShadow<HTMLElement>(item, '[part="control"]');
const coarse = () => matchMedia("(pointer: coarse)").matches;
function dimension(host: HTMLElement, token: string): number {
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;display:block;block-size:var(${token})`;
  host.append(probe);
  const pixels = probe.getBoundingClientRect().height;
  probe.remove();
  return pixels;
}
let legacyStyle: HTMLStyleElement;

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
  legacyStyle = document.createElement("style");
  legacyStyle.textContent = `@layer mash.catalogue {
    :where([data-mash-catalogue="mash"]) ui-menu-item::part(control) {
      --legacy-menu-target: matched;
      block-size: var(--_mash-menu-row-size);
      min-block-size: 0;
    }
    :where([data-mash-catalogue="mash"]) ui-menu-item.mash-menu-rich::part(control) {
      --legacy-rich-target: matched;
      min-block-size: var(--_mash-menu-row-size);
    }
  }`;
  document.head.prepend(legacyStyle);
});

afterEach(() => {
  legacyStyle.remove();
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
});

async function openMenu(
  tag = "ui-menu",
  attrs = "",
  items = '<ui-menu-item value="app" href="#app">Applications</ui-menu-item>',
) {
  const menu = await fixture<Menu>(`<${tag} label="Roots" ${attrs}>
    <button slot="trigger">Roots</button>${items}
  </${tag}>`);
  menu.open = true;
  await settled(menu);
  await expect.poll(() => menu.matches(":state(active)")).toBe(true);
  return menu;
}

describe("menu navigation contract", () => {
  for (const tag of ["ui-menu", "ui-context-menu"]) {
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      it(`preserves ${modifier} native links without selecting or closing ${tag}`, async () => {
        const menu = await openMenu(tag);
        const item = menu.querySelector<UIMenuItem>("ui-menu-item")!;
        const anchor = control(item);
        const select = vi.fn();
        menu.addEventListener("ui-menu-item-select", select);
        const observed: boolean[] = [];
        item.addEventListener("click", (event) => {
          observed.push(event.defaultPrevented);
          // Observe the complete component path before preventing real test navigation.
          event.preventDefault();
        });
        anchor.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            composed: true,
            cancelable: true,
            [modifier]: true,
          }),
        );
        await settled(menu);
        expect(observed).toEqual([false]);
        expect(select).not.toHaveBeenCalled();
        expect(menu.open).toBe(true);
        expect(anchor.getAttribute("href")).toBe("#app");
      });
    }

    it(`leaves middle-click native and suppresses disabled activation in ${tag}`, async () => {
      const menu = await openMenu(tag);
      const item = menu.querySelector<UIMenuItem>("ui-menu-item")!;
      const anchor = control(item);
      const select = vi.fn();
      menu.addEventListener("ui-menu-item-select", select);
      const observed: boolean[] = [];
      item.addEventListener("auxclick", (event) => {
        observed.push(event.defaultPrevented);
        event.preventDefault();
      });
      const aux = () =>
        anchor.dispatchEvent(
          new MouseEvent("auxclick", {
            button: 1,
            bubbles: true,
            composed: true,
            cancelable: true,
          }),
        );
      aux();
      expect(observed).toEqual([false]);
      expect(select).not.toHaveBeenCalled();
      expect(menu.open).toBe(true);
      item.disabled = true;
      await settled(item);
      expect(control(item)).toBe(anchor);
      expect(anchor.hasAttribute("href")).toBe(false);
      expect(anchor.getAttribute("aria-disabled")).toBe("true");
      aux();
      expect(observed).toEqual([false, true]);
      const click = new MouseEvent("click", {
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      anchor.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
      expect(select).not.toHaveBeenCalled();
      expect(menu.open).toBe(true);
      item.disabled = false;
      await settled(item);
      expect(anchor.getAttribute("href")).toBe("#app");
    });

    it(`keeps primary activation cancellable by an SPA without losing ${tag} selection`, async () => {
      const menu = await openMenu(
        tag,
        "",
        '<ui-menu-item value="app" href="/debug/app?care=x#fields" target="_blank">Applications</ui-menu-item>',
      );
      const item = menu.querySelector<UIMenuItem>("ui-menu-item")!;
      const anchor = control(item) as HTMLAnchorElement;
      const select = vi.fn();
      menu.addEventListener("ui-menu-item-select", select);
      let defaultBeforeConsumer = true;
      item.addEventListener("click", (event) => {
        defaultBeforeConsumer = event.defaultPrevented;
        expect(event.composedPath()).toContain(anchor);
        event.preventDefault();
      });
      expect(anchor.getAttribute("href")).toBe("/debug/app?care=x#fields");
      expect(anchor.target).toBe("_blank");
      expect(anchor.rel).toBe("noopener noreferrer");
      await userEvent.click(anchor);
      expect(defaultBeforeConsumer).toBe(false);
      expect(select).toHaveBeenCalledOnce();
      expect(select.mock.calls[0]![0].detail).toEqual({
        value: "app",
        kind: "action",
        checked: false,
      });
      expect(menu.open).toBe(false);
    });

    it(`activates href leaves exactly once with Enter or Space in ${tag}`, async () => {
      const menu = await openMenu(tag);
      const item = menu.querySelector<UIMenuItem>("ui-menu-item")!;
      const select = vi.fn();
      const clicks = vi.fn((event: Event) => event.preventDefault());
      menu.addEventListener("ui-menu-item-select", select);
      item.addEventListener("click", clicks);
      for (const key of ["{Enter}", " "]) {
        menu.open = true;
        await settled(menu);
        item.focus();
        select.mockClear();
        clicks.mockClear();
        await userEvent.keyboard(key);
        expect(select).toHaveBeenCalledOnce();
        expect(clicks).toHaveBeenCalledOnce();
        expect(menu.open).toBe(false);
      }
      menu.open = true;
      await settled(menu);
      select.mockClear();
      control(item).dispatchEvent(
        new KeyboardEvent("keydown", {
          key: " ",
          repeat: true,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
      expect(select).not.toHaveBeenCalled();
      expect(menu.open).toBe(true);
      item.disabled = true;
      await settled(item);
      item.focus();
      await userEvent.keyboard(" ");
      expect(select).not.toHaveBeenCalled();
      expect(menu.open).toBe(true);
    });
  }

  it("keeps Arrow/End/Home/Enter menu navigation and disabled discoverability", async () => {
    const menu = await openMenu(
      "ui-menu",
      "density=compact",
      `
      <ui-menu-item value="app" href="#app">Applications</ui-menu-item>
      <ui-menu-item value="boot" href="#boot" disabled>Boot</ui-menu-item>
      <ui-menu-item value="root" href="#root">Namespace root</ui-menu-item>`,
    );
    const [first, disabled, last] = [...menu.querySelectorAll<UIMenuItem>("ui-menu-item")] as [
      UIMenuItem,
      UIMenuItem,
      UIMenuItem,
    ];
    const select = vi.fn();
    menu.addEventListener("ui-menu-item-select", select);
    menu.addEventListener("click", (event) => event.preventDefault());
    first.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(disabled.shadowRoot!.activeElement).toBe(control(disabled));
    await userEvent.keyboard("{Enter}");
    expect(select).not.toHaveBeenCalled();
    expect(menu.open).toBe(true);
    await userEvent.keyboard("{End}");
    expect(last.shadowRoot!.activeElement).toBe(control(last));
    await userEvent.keyboard("{Home}");
    expect(first.shadowRoot!.activeElement).toBe(control(first));
    expect(control(first).matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(control(first)).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    await userEvent.keyboard("{Enter}");
    expect(select).toHaveBeenCalledOnce();
    expect(menu.open).toBe(false);
  });

  it("keeps href limited to action leaves, with checkbox and submenu semantics intact", async () => {
    const root = await fixture(`<div>
      <ui-menu-item href="#ignored" kind="checkbox">Show metadata</ui-menu-item>
      <ui-menu-item href="#ignored">Share<ui-menu slot="submenu"><ui-menu-item>Copy</ui-menu-item></ui-menu></ui-menu-item>
    </div>`);
    const [checkbox, branch] = [...root.querySelectorAll<UIMenuItem>(":scope > ui-menu-item")] as [
      UIMenuItem,
      UIMenuItem,
    ];
    await settled(root);
    expect(control(checkbox).tagName).toBe("BUTTON");
    expect(control(checkbox).getAttribute("role")).toBe("menuitemcheckbox");
    control(checkbox).click();
    await settled(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(control(branch).tagName).toBe("BUTTON");
    expect(control(branch).getAttribute("aria-haspopup")).toBe("menu");
    expect(control(branch).hasAttribute("href")).toBe(false);
  });
});

describe("shared native menu target recipe", () => {
  for (const theme of ["light", "dark"]) {
    for (const density of ["regular", "compact", "mini"]) {
      it(`keeps ${density} rows compact or touchable in ${theme}, overriding legacy row minima`, async () => {
        document.documentElement.dataset.theme = theme;
        const menu = await openMenu(
          "ui-menu",
          `density="${density}" sizing="fixed"`,
          `
          <ui-menu-item href="#app"><ui-icon slot="prefix" name="object.folder" size="small"></ui-icon>Applications</ui-menu-item>
          <ui-menu-item value="refresh">Refresh</ui-menu-item>
          <ui-menu-item href="#rich" class="mash-menu-rich"><span>Long namespace reference that remains complete and wraps inside a rich navigation item</span></ui-menu-item>`,
        );
        const items = [...menu.querySelectorAll<UIMenuItem>("ui-menu-item")];
        const popup = inShadow(menu, '[part="popup"]');
        const popupBox = popup.getBoundingClientRect();
        const boxes = items.map((item) => control(item).getBoundingClientRect());
        const row = dimension(menu, "--_mash-menu-row-size");
        expect(row).toBeGreaterThan(0);
        expect(dimension(menu, "--layout-dimension-control-touch")).toBe(44);
        for (const [index, item] of items.entries()) {
          const native = control(item);
          const box = boxes[index]!;
          expect(getComputedStyle(native).getPropertyValue("--legacy-menu-target").trim()).toBe(
            "matched",
          );
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(coarse() ? 44 : row);
          if (index < 2) expect(box.height).toBe(coarse() ? Math.max(44, row) : row);
          expect(item.getBoundingClientRect().height).toBe(box.height);
          expect(box.left).toBeGreaterThanOrEqual(popupBox.left);
          expect(box.right).toBeLessThanOrEqual(popupBox.right);
          if (index > 0) expect(box.top).toBeGreaterThanOrEqual(boxes[index - 1]!.bottom);
        }
        expect(
          getComputedStyle(control(items[2]!)).getPropertyValue("--legacy-rich-target").trim(),
        ).toBe("matched");
        expect(items[2]!.textContent).toBe(
          "Long namespace reference that remains complete and wraps inside a rich navigation item",
        );
        const viewport = inShadow(
          menu.shadowRoot!.querySelector("ui-scroll-area")!,
          '[part="viewport"]',
        );
        expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
        if (density === "mini") {
          await page.screenshot({
            path: `test-results/menu-targets-${theme}-${coarse() ? "coarse" : "fine"}.png`,
            element: popup,
          });
        }
        let clicked: EventTarget | undefined;
        items[0]!.addEventListener("click", (event) => {
          clicked = event.composedPath()[0];
          event.preventDefault();
        });
        await userEvent.click(control(items[0]!), {
          position: { x: boxes[0]!.width - 2, y: boxes[0]!.height - 2 },
        });
        expect(clicked).toBe(control(items[0]!));
      });
    }
  }
});
