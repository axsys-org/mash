import { describe, expect, it, vi } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UICommand, UICommandItem } from "./command-palette.js";
import "./register.js";

describe("command palette", () => {
  it("searches keywords, skips disabled actions, and activates the keyboard choice", async () => {
    const command = await fixture<UICommand>(
      '<ui-command><ui-command-item value="new" keywords="create">New file</ui-command-item><ui-command-item value="delete" disabled>Delete</ui-command-item><ui-command-item value="settings">Settings</ui-command-item></ui-command>',
    );
    await settled(command);
    const select = vi.fn();
    command.addEventListener("ui-command-select", select);
    const search = inShadow<HTMLInputElement>(command, "input");
    search.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }),
    );
    search.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }),
    );
    expect(select.mock.calls[0]![0].detail.value).toBe("settings");
    command.query = "create";
    await settled(command);
    const items = [...command.querySelectorAll<UICommandItem>("ui-command-item")];
    expect(items.map((item) => item.hidden)).toEqual([false, true, true]);
    expect(search.ariaActiveDescendantElement).toBe(items[0]);
    command.query = "no match";
    await settled(command);
    expect(inShadow<HTMLElement>(command, '[part="empty"]').hidden).toBe(false);
  });
});
