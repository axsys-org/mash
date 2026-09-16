import { expect, it } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIContextMenu } from "./context-menu.js";
import "./register.js";
import "../catalogue/mash.css";

it("opens from portable keyboard gestures and returns focus to its trigger", async () => {
  const menu = await fixture<UIContextMenu>(`<ui-context-menu label="Document actions">
    <div slot="trigger" tabindex="0">Document</div>
    <ui-menu-item value="rename">Rename</ui-menu-item>
  </ui-context-menu>`);
  const trigger = menu.querySelector<HTMLElement>('[slot="trigger"]')!;
  const item = menu.querySelector("ui-menu-item")!;
  for (const key of ["F10", "ContextMenu"]) {
    trigger.focus();
    const event = new KeyboardEvent("keydown", {
      key,
      shiftKey: key === "F10",
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    trigger.dispatchEvent(event);
    await settled(menu);
    expect(event.defaultPrevented).toBe(true);
    expect(menu.open).toBe(true);
    expect(document.activeElement).toBe(item);
    inShadow<HTMLButtonElement>(item, "button").dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        composed: true,
      }),
    );
    await settled(menu);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  }
});

it("opens a delegated pointer menu without moving its invoker and returns there on Escape", async () => {
  const root =
    await fixture(`<div><button id="external">External path</button><button id="other">Other action</button>
    <ui-context-menu label="Path actions" density="compact"><ui-menu-item value="copy">Copy path</ui-menu-item></ui-context-menu></div>`);
  const menu = root.querySelector<UIContextMenu>("ui-context-menu")!;
  const invoker = root.querySelector<HTMLButtonElement>("#external")!;
  const other = root.querySelector<HTMLButtonElement>("#other")!;
  other.focus();
  menu.showAt({ x: 160, y: 120 }, invoker);
  await settled(root);
  expect(menu.open).toBe(true);
  expect(invoker.parentElement).toBe(root);
  expect(menu.anchorElement).toBe(invoker);
  expect(menu.positionSnapshot?.left).toBe(160);
  expect(menu.positionSnapshot?.top).toBe(120 + menu.offset);
  const item = menu.querySelector("ui-menu-item")!;
  expect(document.activeElement).toBe(item);
  inShadow<HTMLButtonElement>(item, "button").dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  await settled(root);
  expect(menu.open).toBe(false);
  expect(document.activeElement).toBe(invoker);
});

it("retargets pointer geometry and clears it for a subsequent keyboard opening", async () => {
  const root =
    await fixture(`<div><button id="first">First</button><button id="second">Second</button>
    <ui-context-menu label="Path actions"><ui-menu-item value="copy">Copy path</ui-menu-item></ui-context-menu></div>`);
  const menu = root.querySelector<UIContextMenu>("ui-context-menu")!;
  const first = root.querySelector<HTMLButtonElement>("#first")!,
    second = root.querySelector<HTMLButtonElement>("#second")!;
  menu.showAt({ x: 160, y: 120 }, first);
  await settled(root);
  menu.showAt({ x: 240, y: 200 }, second);
  await settled(root);
  expect(menu.anchorElement).toBe(second);
  expect(menu.positionSnapshot?.left).toBe(240);
  expect(menu.positionSnapshot?.top).toBe(200 + menu.offset);
  second.focus();
  menu.dismiss("outside");
  await settled(root);
  expect(document.activeElement).toBe(second);
  menu.show("keyboard");
  await settled(root);
  expect(menu.positionSnapshot?.left).toBe(Math.round(second.getBoundingClientRect().left));
  expect(menu.positionSnapshot?.top).toBe(
    Math.round(second.getBoundingClientRect().bottom + menu.offset),
  );
  menu.dismiss("escape");
  await settled(root);
  expect(document.activeElement).toBe(second);
});

it("does not steal outside focus, and rejects malformed points or detached invokers", async () => {
  const root =
    await fixture(`<div><button id="external">External</button><button id="other">Other</button>
    <ui-context-menu><ui-menu-item value="copy">Copy</ui-menu-item></ui-context-menu></div>`);
  const menu = root.querySelector<UIContextMenu>("ui-context-menu")!;
  const invoker = root.querySelector<HTMLButtonElement>("#external")!,
    other = root.querySelector<HTMLButtonElement>("#other")!;
  expect(() => menu.showAt({ x: NaN, y: 0 }, invoker)).toThrow(TypeError);
  expect(() => menu.showAt({ x: 0, y: Infinity }, invoker)).toThrow(TypeError);
  expect(() => menu.showAt({ x: 0, y: 0 }, document.createElement("button"))).toThrow(TypeError);
  expect(menu.open).toBe(false);
  menu.disabled = true;
  menu.showAt({ x: 160, y: 120 }, invoker);
  await settled(root);
  expect(menu.open).toBe(false);
  menu.disabled = false;
  menu.showAt({ x: 160, y: 120 }, invoker);
  await settled(root);
  other.focus();
  menu.dismiss("outside");
  await settled(root);
  expect(menu.open).toBe(false);
  expect(document.activeElement).toBe(other);
});
