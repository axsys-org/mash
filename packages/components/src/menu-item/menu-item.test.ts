import { expect, it, vi } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIMenuItem } from "./menu-item.js";
import "./register.js";

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
