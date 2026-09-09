import { describe, expect, it, vi } from "vitest";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UICommand, UICommandItem } from "./command-palette.js";
import "./register.js";
import "../dialog/register.js";
import type { UIDialog } from "../dialog/dialog.js";

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

describe("command composition", () => {
  it("filters each word, hides empty groups, and restores their contents on clear", async () => {
    const command = await fixture<UICommand>(
      `<ui-command><section role="group" aria-label="Files"><strong>Files</strong><ui-command-item value="notes" keywords="team">Meeting notes<span slot="description">Design review</span></ui-command-item></section><section role="group" aria-label="Actions"><strong>Actions</strong><ui-command-item value="new">New document</ui-command-item></section></ui-command>`,
    );
    command.query = "review team";
    await settled(command);
    const groups = [...command.querySelectorAll<HTMLElement>('[role="group"]')];
    expect(groups.map((group) => group.hidden)).toEqual([false, true]);
    command.query = "no match";
    await settled(command);
    expect(groups.every((group) => group.hidden)).toBe(true);
    command.focus();
    const search = inShadow<HTMLInputElement>(command, "input");
    expect(command.shadowRoot!.activeElement).toBe(search);
    search.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
    );
    await settled(command);
    expect(groups.map((group) => group.hidden)).toEqual([false, false]);
  });

  it("keeps pointer and keyboard selection aligned and does not run during composition", async () => {
    const command = await fixture<UICommand>(
      `<ui-command><ui-command-item value="first">First</ui-command-item><ui-command-item value="second">Second</ui-command-item><ui-command-item value="disabled" disabled>Disabled</ui-command-item></ui-command>`,
    );
    const items = [...command.querySelectorAll<UICommandItem>("ui-command-item")];
    const select = vi.fn();
    command.addEventListener("ui-command-select", select);
    items[1]!.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true }));
    await settled(command);
    const search = inShadow<HTMLInputElement>(command, "input");
    search.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
        composed: true,
      }),
    );
    expect(select).not.toHaveBeenCalled();
    search.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }),
    );
    expect(select.mock.calls[0]![0].detail.value).toBe("second");
    items[0]!.click();
    await settled(command);
    expect(search.ariaActiveDescendantElement).toBe(items[0]);
    items[2]!.click();
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("leaves authored empty-state buttons' keys alone", async () => {
    const command = await fixture<UICommand>(
      `<ui-command><ui-command-item value="one">One</ui-command-item><button slot="empty">Clear search</button></ui-command>`,
    );
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    command.query = "missing";
    await settled(command);
    command.querySelector("button")!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

it("focuses a composed command search first when opening a modal", async () => {
  const dialog = await fixture<UIDialog>(
    `<ui-dialog label="Commands"><button slot="trigger">Open</button><ui-command><ui-command-item value="new">New document</ui-command-item><button slot="empty">Clear search</button></ui-command><button slot="actions">Cancel</button></ui-dialog>`,
  );
  dialog.querySelector<HTMLButtonElement>('button[slot="trigger"]')!.click();
  await settled(dialog);
  const command = dialog.querySelector<UICommand>("ui-command")!;
  expect(command.shadowRoot!.activeElement).toBe(inShadow(command, "input"));
});

it("keeps modal Tab navigation inside the command when its empty-state action is hidden", async () => {
  const dialog = await fixture<UIDialog>(
    `<ui-dialog label="Commands"><button slot="trigger">Open</button><ui-command><ui-command-item value="new">New document</ui-command-item><button slot="empty">Clear search</button></ui-command></ui-dialog>`,
  );
  dialog.querySelector<HTMLButtonElement>('button[slot="trigger"]')!.click();
  await settled(dialog);
  const command = dialog.querySelector<UICommand>("ui-command")!;
  const search = inShadow<HTMLInputElement>(command, "input");
  for (const shiftKey of [false, true]) {
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    search.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(command.shadowRoot!.activeElement).toBe(search);
  }
});

it("reveals highlighted commands inside the list without moving its containing workspace", async () => {
  const workspace = await fixture<HTMLElement>(
    `<div style="height:160px;overflow:auto"><div style="height:120px">Workspace header</div><ui-command>${Array.from({ length: 30 }, (_, index) => `<ui-command-item style="display:block;height:30px" value="${index}">Command ${index}</ui-command-item>`).join("")}</ui-command><div style="height:300px"></div></div>`,
  );
  const command = workspace.querySelector<UICommand>("ui-command")!;
  const list = inShadow<HTMLElement>(command, '[part="list"]');
  list.style.maxHeight = "80px";
  list.style.overflow = "auto";
  await settled(command);
  workspace.scrollTop = 10;
  expect(command.highlight("29")).toBe(true);
  await settled(command);
  expect(list.scrollTop).toBeGreaterThan(0);
  expect(workspace.scrollTop).toBe(10);
  const row = command.querySelector('ui-command-item[value="29"]')!.getBoundingClientRect();
  expect(row.bottom).toBeLessThanOrEqual(list.getBoundingClientRect().bottom + 1);
});
