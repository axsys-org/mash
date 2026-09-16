import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIMenu } from "./menu.js";
import type { UIContextMenu } from "../context-menu/context-menu.js";
import "./register.js";
import "../context-menu/register.js";
import "../icon/register.js";
import "../catalogue/mash.css";

afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute("dir");
});

const part = (host: Element, name: string): HTMLElement =>
  host.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`) ??
  inShadow<HTMLElement>(host.shadowRoot!.querySelector("ui-scroll-area")!, `[part~="${name}"]`);

for (const tag of ["ui-menu", "ui-context-menu"]) {
  for (const density of ["regular", "compact", "mini"]) {
    it(`fits ${tag} commands until viewport overflow (${density})`, async () => {
      document.documentElement.dataset.mashCatalogue = "mash";
      document.documentElement.dataset.theme = density === "mini" ? "dark" : "light";
      document.documentElement.dir = tag === "ui-context-menu" ? "rtl" : "ltr";
      const root = await fixture<HTMLElement>(`<div style="padding:32px">
        <${tag} sizing="content" density="${density}" label="Path actions">
          <button slot="trigger">Path actions</button>
          <ui-menu-item value="path"><ui-icon slot="prefix" name="action.duplicate"></ui-icon><span>Copy path</span></ui-menu-item>
          <ui-menu-item value="link"><ui-icon slot="prefix" name="action.connect"></ui-icon><span>Copy link</span></ui-menu-item>
        </${tag}>
      </div>`);
      const menu = root.querySelector<UIMenu | UIContextMenu>(tag)!;
      menu.show("keyboard");
      await settled(root);
      await expect.poll(() => menu.matches(":state(active)")).toBe(true);
      const popup = part(menu, "popup"),
        viewport = part(menu, "viewport");
      const shortWidth = popup.getBoundingClientRect().width;
      expect(shortWidth).toBeLessThan(150);
      expect(shortWidth).toBeGreaterThan(70);
      expect(popup.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
      expect(popup.getBoundingClientRect().right).toBeLessThanOrEqual(innerWidth);
      expect(getComputedStyle(popup).minInlineSize).toBe("0px");
      expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.clientHeight + 1);
      await page.screenshot({ path: `test-results/menu-fit-${tag}-${density}.png` });

      const label = menu.querySelector("ui-menu-item > span")!;
      label.textContent = "Copy the canonical namespace path to the clipboard";
      await settled(root);
      expect(popup.getBoundingClientRect().width).toBeGreaterThan(shortWidth + 80);
      expect(label.getBoundingClientRect().width).toBeLessThan(viewport.clientWidth);
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);

      label.textContent = "very-long-namespace-path/".repeat(100);
      await settled(root);
      // Intrinsic content resize is observed and positioned on the next frame.
      await expect.poll(() => popup.getBoundingClientRect().right).toBeLessThanOrEqual(innerWidth);
      expect(popup.getBoundingClientRect().width).toBeLessThanOrEqual(innerWidth - 16);
      expect(popup.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
      expect(popup.getBoundingClientRect().right).toBeLessThanOrEqual(innerWidth);
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
      for (let index = 0; index < 40; index++) {
        const item = document.createElement("ui-menu-item");
        item.textContent = `Command ${index}`;
        menu.append(item);
      }
      await settled(root);
      expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
      expect(popup.getBoundingClientRect().height).toBeLessThanOrEqual(innerHeight);
      part(menu.querySelector("ui-menu-item")!, "control").focus();
      await userEvent.keyboard("{End}");
      await expect.poll(() => viewport.scrollTop).toBeGreaterThan(0);
      const last = part(
        menu.querySelector("ui-menu-item:last-child")!,
        "control",
      ).getBoundingClientRect();
      expect(last.bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1);
    });
  }
}
