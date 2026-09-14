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

it("groups suggested data once, preserves rows, and returns to authored content", async () => {
  const menu = await fixture<UICommand>(
    '<ui-command><ui-command-item value="authored">Authored</ui-command-item></ui-command>',
  );
  menu.items = [
    { value: "new", label: "New file", group: "Actions" },
    { value: "notes", label: "Team notes", group: "Pages", keywords: ["meeting"] },
  ];
  menu.suggestions = ["notes", "missing", "notes"];
  await settled(menu);
  const row = menu.querySelector('[value="notes"]')!;
  expect(menu.querySelector('[aria-label="Suggestions"]')!.contains(row)).toBe(true);
  expect(menu.querySelectorAll('[value="notes"]')).toHaveLength(1);
  menu.query = "meeting";
  await settled(menu);
  expect(menu.querySelector('[value="notes"]')).toBe(row);
  expect(menu.querySelector('[aria-label="Pages"]')!.contains(row)).toBe(true);
  expect(menu.querySelector('[aria-label="Suggestions"]')).toBeNull();
  menu.items = undefined;
  menu.query = "";
  await settled(menu);
  expect(menu.querySelectorAll("ui-command-item")).toHaveLength(1);
  expect(menu.querySelector("ui-command-item")!.getAttribute("value")).toBe("authored");
});

it("filters original data with custom rendering and executes callbacks before the selection event", async () => {
  const menu = await fixture<UICommand>("<ui-command></ui-command>");
  const calls: string[] = [];
  const available = {
    value: "one",
    label: "One",
    keywords: ["team"],
    onSelect: () => calls.push("item"),
  };
  menu.items = [available, { value: "two", label: "Two", disabled: true }];
  menu.renderItem = (item) => `Custom ${item.label}`;
  menu.filter = (item, query) => !query || ("label" in item && item === available);
  menu.addEventListener("ui-command-select", (event) => {
    expect((event as CustomEvent).detail.item).toBe(available);
    calls.push("root");
  });
  menu.query = "team";
  await settled(menu);
  expect(menu.querySelector("ui-command-item")!.textContent).toBe("Custom One");
  const search = inShadow<HTMLInputElement>(menu, "input");
  search.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }),
  );
  expect(calls).toEqual(["item", "root"]);
  menu.query = "";
  await settled(menu);
  menu.querySelector<UICommandItem>('[value="two"]')!.click();
  expect(calls).toHaveLength(2);
});

it("emits user query changes and lets the containing dialog handle Escape when configured", async () => {
  const menu = await fixture<UICommand>("<ui-command></ui-command>");
  const changes = vi.fn();
  menu.addEventListener("ui-command-query-change", changes);
  const search = inShadow<HTMLInputElement>(menu, "input");
  search.value = "notes";
  search.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  await settled(menu);
  expect(changes.mock.calls[0]![0].detail.query).toBe("notes");
  menu.escapeClears = false;
  const escape = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  search.dispatchEvent(escape);
  expect(escape.defaultPrevented).toBe(false);
  expect(menu.query).toBe("notes");
  menu.escapeClears = true;
  search.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
  );
  expect(changes.mock.calls[1]![0].detail.query).toBe("");
});

it("resumes highlight motion after disconnecting with a pending frame", async () => {
  const host = await fixture<HTMLElement>(
    '<div><ui-command><ui-command-item value="one" style="display:block;height:30px">One</ui-command-item><ui-command-item value="two" style="display:block;height:30px">Two</ui-command-item></ui-command></div>',
  );
  const menu = host.querySelector<UICommand>("ui-command")!;
  menu.highlight("one");
  menu.remove();
  host.append(menu);
  menu.highlight("two");
  await settled(menu);
  await new Promise(requestAnimationFrame);
  const highlight = inShadow<HTMLElement>(menu, '[part="highlight"]');
  expect(highlight.hidden).toBe(false);
  expect(highlight.style.translate).toMatch(/30px$/);
});
