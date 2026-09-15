import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIMenu } from "./menu.js";
import type { UIContextMenu } from "../context-menu/context-menu.js";
import type { UIMenuItem } from "../menu-item/menu-item.js";
import "./register.js";
import "../context-menu/register.js";
import "../menu-item/register.js";
import "../button/register.js";
import "../catalogue/mash.css";

type Menu = UIMenu | UIContextMenu;
const part = (element: Element, name: string) => inShadow<HTMLElement>(element, `[part="${name}"]`);

beforeEach(() => {
  document.documentElement.dataset.mashCatalogue = "mash";
});
afterEach(() => {
  delete document.documentElement.dataset.mashCatalogue;
});

async function pointerOpen(menu: Menu, trigger: HTMLElement): Promise<void> {
  if (menu.localName === "ui-context-menu") {
    trigger.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        composed: true,
        cancelable: true,
        button: 2,
      }),
    );
  } else {
    await userEvent.click(trigger.shadowRoot ? part(trigger, "control") : trigger);
  }
  await settled(menu);
  expect(menu.open).toBe(true);
}

describe("menu dismissal focus", () => {
  for (const tag of ["ui-menu", "ui-context-menu"]) {
    for (const triggerTag of ["button", "ui-button"]) {
      it(`returns pointer-open ${tag} to its ${triggerTag} invoker on Escape`, async () => {
        const menu = await fixture<Menu>(`<${tag} label="Roots">
          <${triggerTag} slot="trigger">Roots</${triggerTag}>
          <ui-menu-item href="#app">Applications</ui-menu-item>
        </${tag}>`);
        const trigger = menu.querySelector<HTMLElement>('[slot="trigger"]')!;
        await pointerOpen(menu, trigger);
        await userEvent.keyboard("{Escape}");
        await settled(menu);
        expect(menu.open).toBe(false);
        expect(part(menu, "backdrop").inert).toBe(true);
        await expect.poll(() => document.activeElement).toBe(trigger);
        if (trigger.shadowRoot)
          expect(trigger.shadowRoot.activeElement).toBe(part(trigger, "control"));
        await expect.poll(() => menu.matches(":state(present)")).toBe(false);
        expect(document.activeElement).toBe(trigger);
      });
    }

    it(`does not steal focus after pointer-open ${tag} is dismissed outside`, async () => {
      const root =
        await fixture<HTMLElement>(`<div><input aria-label="Outside destination"><${tag} label="Roots">
        <button slot="trigger">Roots</button><ui-menu-item href="#app">Applications</ui-menu-item>
      </${tag}></div>`);
      const menu = root.querySelector<Menu>(tag)!;
      const trigger = menu.querySelector<HTMLElement>('[slot="trigger"]')!;
      const outside = root.querySelector<HTMLInputElement>("input")!;
      await pointerOpen(menu, trigger);
      // An outside action can transfer focus before the overlay's queued
      // render/exit work runs. That destination must survive both phases.
      outside.focus();
      part(menu, "backdrop").dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, composed: true }),
      );
      await settled(menu);
      expect(menu.open).toBe(false);
      expect(document.activeElement).toBe(outside);
      await expect.poll(() => menu.matches(":state(present)")).toBe(false);
      expect(document.activeElement).toBe(outside);
    });
  }

  it("returns a pointer-open nested menu to its branch, then the root to its trigger", async () => {
    const menu =
      await fixture<UIMenu>(`<ui-menu label="Actions"><button slot="trigger">Actions</button>
      <ui-menu-item>Share<ui-menu slot="submenu" label="Share"><ui-menu-item href="#copy">Copy link</ui-menu-item></ui-menu></ui-menu-item>
    </ui-menu>`);
    const trigger = menu.querySelector<HTMLButtonElement>('[slot="trigger"]')!;
    const branch = menu.querySelector<UIMenuItem>("ui-menu-item")!;
    const nested = branch.querySelector<UIMenu>("ui-menu")!;
    await pointerOpen(menu, trigger);
    await userEvent.click(part(branch, "control"));
    await settled(nested);
    expect(nested.open).toBe(true);
    await userEvent.keyboard("{Escape}");
    await settled(menu);
    expect(nested.open).toBe(false);
    expect(menu.open).toBe(true);
    expect(branch.shadowRoot!.activeElement).toBe(part(branch, "control"));
    await userEvent.keyboard("{Escape}");
    await settled(menu);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("preserves a remembered keyboard invoker ahead of the positioning anchor", async () => {
    const root = await fixture<HTMLElement>(`<div><button id="invoker">Open actions</button>
      <ui-menu label="Actions"><button slot="trigger">Other anchor</button><ui-menu-item>Copy</ui-menu-item></ui-menu>
    </div>`);
    const invoker = root.querySelector<HTMLButtonElement>("#invoker")!;
    const menu = root.querySelector<UIMenu>("ui-menu")!;
    invoker.focus();
    menu.show("keyboard");
    await settled(menu);
    await userEvent.keyboard("{Escape}");
    await settled(menu);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(invoker);
  });

  it("does not enable Escape focus return when Escape dismissal is disabled", async () => {
    const menu = await fixture<UIMenu>(
      `<ui-menu label="Actions"><button slot="trigger">Actions</button><ui-menu-item>Copy</ui-menu-item></ui-menu>`,
    );
    menu.closeOnEscape = false;
    const trigger = menu.querySelector<HTMLButtonElement>('[slot="trigger"]')!;
    await pointerOpen(menu, trigger);
    await userEvent.keyboard("{Escape}");
    await settled(menu);
    expect(menu.open).toBe(true);
    expect(document.activeElement).not.toBe(trigger);
  });
});
