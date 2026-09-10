import { afterEach, describe, expect, it } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UISidebar } from "./sidebar.js";
import type { UIDrawer } from "../drawer/drawer.js";
import "./register.js";
import "../catalogue/mash.css";

const mount = async (attributes = "") => {
  document.documentElement.dataset.mashCatalogue = "mash";
  return fixture<UISidebar>(
    `<ui-sidebar persist="false" mobile-breakpoint="0" style="width:800px;height:400px" ${attributes}><button slot="header" id="first-nav">Workspace</button><nav slot="navigation"><button id="nav-item">Document</button><input aria-label="Search" value="Preserved"></nav><button slot="footer">Account</button><input aria-label="Draft" value="Keep this draft"></ui-sidebar>`,
  );
};
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
  document.cookie = "mash-sidebar-test=; Path=/; Max-Age=0";
});

describe("sidebar composition", () => {
  it("keeps controlled requests and cancellation separate from the desktop preference", async () => {
    const sidebar = await mount('open="true"');
    const requests: boolean[] = [];
    sidebar.addEventListener("ui-sidebar-open-change", (event) =>
      requests.push((event as CustomEvent).detail.open),
    );
    sidebar.hide();
    await settled(sidebar);
    expect(requests).toEqual([false]);
    expect(sidebar.expanded).toBe(true);
    sidebar.open = false;
    await settled(sidebar);
    expect(sidebar.expanded).toBe(false);
    sidebar.open = undefined;
    await settled(sidebar);
    expect(sidebar.expanded).toBe(true);
    sidebar.addEventListener("ui-sidebar-open-change", (event) => event.preventDefault(), {
      once: true,
    });
    sidebar.hide();
    await settled(sidebar);
    expect(sidebar.expanded).toBe(true);
  });
  it("preserves authored nodes and desktop state through peek and mobile reprojection", async () => {
    const sidebar = await mount('default-open="false" peek="click"');
    const input = sidebar.querySelector('input[aria-label="Search"]');
    sidebar.showPeek();
    await settled(sidebar);
    expect(sidebar.peeking).toBe(true);
    expect(sidebar.expanded).toBe(false);
    sidebar.mobileBreakpoint = 10000;
    await expect.poll(() => sidebar.mobile).toBe(true);
    expect(sidebar.peeking).toBe(false);
    sidebar.show();
    await settled(sidebar);
    expect(sidebar.mobileOpen).toBe(true);
    expect(sidebar.expanded).toBe(false);
    sidebar.mobileBreakpoint = 0;
    await expect.poll(() => sidebar.mobile).toBe(false);
    expect(sidebar.mobileOpen).toBe(false);
    expect(sidebar.querySelector('input[aria-label="Search"]')).toBe(input);
    expect((input as HTMLInputElement).value).toBe("Preserved");
  });
  it("restores only persisted desktop state and leaves transient peeks out of storage", async () => {
    const sidebar = await mount('storage-key="mash-sidebar-test" peek="click"');
    sidebar.persist = true;
    sidebar.hide();
    await settled(sidebar);
    expect(document.cookie).toContain("mash-sidebar-test=false");
    sidebar.showPeek();
    await settled(sidebar);
    expect(document.cookie).toContain("mash-sidebar-test=false");
    const restored = await fixture<UISidebar>(
      '<ui-sidebar storage-key="mash-sidebar-test" mobile-breakpoint="0"></ui-sidebar>',
    );
    expect(restored.expanded).toBe(false);
  });
  it("the composed drawer traps focus across reprojected header navigation and footer slots", async () => {
    const sidebar = await mount();
    sidebar.mobileBreakpoint = 10000;
    await expect.poll(() => sidebar.mobile).toBe(true);
    sidebar.show();
    await settled(sidebar);
    const drawer = inShadow<UIDrawer>(sidebar, "ui-drawer");
    await settled(drawer);
    const first = sidebar.querySelector<HTMLButtonElement>("#first-nav")!,
      close = inShadow<HTMLButtonElement>(sidebar, 'button[slot="close"]');
    close.focus();
    close.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, composed: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    expect(sidebar.shadowRoot!.activeElement).toBe(close);
  });
  it("bare-key gestures ignore editing and bind only to the innermost sidebar", async () => {
    const outer = await mount();
    const inner = document.createElement("ui-sidebar");
    inner.persist = false;
    inner.mobileBreakpoint = 0;
    inner.innerHTML = "<button>Inner command</button>";
    outer.append(inner);
    await settled(outer);
    const press = (node: Element) => {
      for (const type of ["keydown", "keyup"])
        node.dispatchEvent(
          new KeyboardEvent(type, { key: "[", bubbles: true, composed: true, cancelable: true }),
        );
    };
    press(outer.querySelector("input")!);
    expect(outer.expanded).toBe(true);
    press(inner.querySelector("button")!);
    await settled(outer);
    expect(inner.expanded).toBe(false);
    expect(outer.expanded).toBe(true);
  });
});
