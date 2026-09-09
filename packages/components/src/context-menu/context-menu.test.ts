import { expect, it } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIContextMenu } from "./context-menu.js";
import "./register.js";

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
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    await settled(menu);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  }
});
