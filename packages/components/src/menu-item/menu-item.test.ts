import { expect, it, vi } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIMenuItem } from "./menu-item.js";
import "./register.js";
import "../menu/register.js";
import type { UIMenu } from "../menu/menu.js";

it("uses a native link for navigation and prevents disabled navigation", async () => {
  const item = await fixture<UIMenuItem>(
    '<ui-menu-item href="#docs" target="_blank">Documentation</ui-menu-item>',
  );
  const anchor = inShadow<HTMLAnchorElement>(item, "a");
  expect(anchor.getAttribute("href")).toBe("#docs");
  expect(anchor.getAttribute("role")).toBe("menuitem");
  expect(anchor.rel).toBe("noopener noreferrer");
  const select = vi.fn();
  item.addEventListener("ui-menu-item-select", select);
  item.disabled = true;
  await settled(item);
  const click = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true });
  anchor.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(anchor.hasAttribute("href")).toBe(false);
  expect(select).not.toHaveBeenCalled();
});

it.each([false, true])(
  "keeps a focused submenu open after pointer departure (shadow: %s)",
  async (withinShadow) => {
    const host = await fixture<HTMLElement>("<div></div>");
    const root = withinShadow ? host.attachShadow({ mode: "open" }) : host;
    root.innerHTML = `<ui-menu label="Actions">
    <button slot="trigger">Actions</button>
    <ui-menu-item>Export<ui-menu slot="submenu" label="Format" submenu-close-delay="0">
      <ui-menu-item value="json">JSON</ui-menu-item>
    </ui-menu></ui-menu-item>
  </ui-menu>`;
    await settled(root);
    const menu = root.querySelector<UIMenu>("ui-menu")!;
    menu.show();
    await settled(menu);
    const branch = menu.querySelector<UIMenuItem>(":scope > ui-menu-item")!;
    const submenu = branch.querySelector<UIMenu>("ui-menu")!;
    branch.showSubmenu(true);
    await settled(menu);
    const control = inShadow<HTMLButtonElement>(branch, "button");
    control.dispatchEvent(new PointerEvent("pointerleave"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(submenu.open).toBe(true);
    expect(withinShadow ? (root as ShadowRoot).activeElement : document.activeElement).toBe(
      submenu.querySelector("ui-menu-item"),
    );
    control.focus();
    expect(withinShadow ? (root as ShadowRoot).activeElement : document.activeElement).toBe(branch);
    expect(branch.shadowRoot?.activeElement).toBe(control);
    control.dispatchEvent(new PointerEvent("pointerleave"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(submenu.open).toBe(false);
  },
);
