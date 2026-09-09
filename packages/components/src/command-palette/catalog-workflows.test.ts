import { expect, it, vi } from "vitest";
import { workflowExamples } from "../../../../apps/catalog/src/examples/workflows.js";
import { fixture, settled } from "../test-support/fixture.js";
import type { UICommand } from "./command-palette.js";
import type { UIInput } from "../input/input.js";
import type { UIDraggable } from "../draggable/draggable.js";
import "./register.js";
import "../input/register.js";
import "../button/register.js";
import "../select/register.js";
import "../option/register.js";
import "../stepper/register.js";
import "../form/register.js";
import "../field/register.js";
import "../fieldset/register.js";
import "../switch/register.js";
import "../draggable/register.js";
import "../motion/register.js";

async function example(tag: string, name: string) {
  const entry = workflowExamples[tag]!.find((item) => item.name === name)!;
  const root = await fixture<HTMLElement>(entry.code);
  new Function(entry.script!)();
  await settled(root);
  return root;
}
it("highlights a target without running it and keeps keyboard activation available", async () => {
  const command = await fixture<UICommand>(
    '<ui-command><ui-command-item value="first">First</ui-command-item><ui-command-item value="last">Last</ui-command-item><ui-command-item value="disabled" disabled>Unavailable</ui-command-item></ui-command>',
  );
  const select = vi.fn();
  command.addEventListener("ui-command-select", select);
  expect(command.highlight("last")).toBe(true);
  await settled(command);
  expect(command.querySelector('[value="last"]')!.hasAttribute("selected")).toBe(true);
  expect(select).not.toHaveBeenCalled();
  const search = command.shadowRoot!.querySelector<HTMLInputElement>('[part="search"]')!;
  expect(command.shadowRoot!.activeElement).toBe(search);
  search.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }),
  );
  expect(select).toHaveBeenCalledTimes(1);
  expect(select.mock.calls[0]![0].detail.value).toBe("last");
  expect(command.highlight("disabled")).toBe(false);
  command.query = "First";
  await settled(command);
  expect(command.highlight("last")).toBe(false);
});
it("loads more commands and targets the last available row", async () => {
  const root = await example("ui-command", "Load, search, and jump");
  const command = root.querySelector<UICommand>("ui-command")!;
  expect(command.querySelectorAll("ui-command-item")).toHaveLength(12);
  root.querySelector<HTMLElement>("#load-commands")!.click();
  await expect.poll(() => command.querySelectorAll("ui-command-item").length).toBe(24);
  root.querySelector<HTMLElement>("#last-command")!.click();
  await settled(root);
  expect(command.querySelector('[value="24"]')!.hasAttribute("selected")).toBe(true);
  command
    .shadowRoot!.querySelector<HTMLInputElement>('[part="search"]')!
    .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
  expect(root.querySelector("output")!.textContent).toBe("Opened Document 24");
});
it("moves stable selected rows between sections with keyboard-accessible actions", async () => {
  const root = await example("ui-command", "Reorder across sections");
  const row = root.querySelector<UIDraggable>('ui-draggable[data-id="0"]')!;
  root.querySelector<HTMLElement>("#move-command-section")!.click();
  await settled(root);
  expect(row.parentElement!.dataset.lane).toBe("Later");
  expect(root.querySelector('ui-draggable[data-id="0"]')).toBe(row);
  root.querySelector<HTMLElement>("#move-command-up")!.click();
  await settled(root);
  expect(row.nextElementSibling!.getAttribute("data-id")).toBe("3");
  expect(root.querySelector("output")!.textContent).toContain("Selected Design review");
});
it("moves a dragged row into its pointer destination and clears its translation", async () => {
  const root = await example("ui-command", "Reorder across sections");
  const row = root.querySelector<UIDraggable>('ui-draggable[data-id="0"]')!;
  const handle = row.querySelector<HTMLElement>('[slot="handle"]')!;
  vi.spyOn(handle, "setPointerCapture").mockImplementation(() => {});
  vi.spyOn(handle, "releasePointerCapture").mockImplementation(() => {});
  const start = handle.getBoundingClientRect(),
    target = root.querySelector<HTMLElement>('[data-lane="Later"]')!.getBoundingClientRect();
  const point = (node: Element | Document, type: string, x: number, y: number) =>
    node.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: x,
        clientY: y,
        isPrimary: true,
        pointerId: 7,
        pointerType: "mouse",
      }),
    );
  point(handle, "pointerdown", start.left + 2, start.top + 2);
  point(document, "pointermove", target.left + 10, target.bottom - 5);
  point(document, "pointerup", target.left + 10, target.bottom - 5);
  await settled(root);
  expect(row.parentElement!.dataset.lane).toBe("Later");
  expect(row.x).toBe(0);
  expect(row.y).toBe(0);
});
it("validates setup navigation and retains values when returning to prior steps", async () => {
  const root = await example("ui-stepper", "Validated setup");
  const name = root.querySelector<UIInput>("#setup-name")!;
  root.querySelector<HTMLElement>("#setup-next")!.click();
  await settled(root);
  expect(root.querySelector("ui-stepper")!.getAttribute("value")).toBe("details");
  name.value = "Studio";
  await settled(root);
  root.querySelector<HTMLElement>("#setup-next")!.click();
  await settled(root);
  expect(root.querySelector("ui-stepper")!.getAttribute("value")).toBe("access");
  root.querySelector<HTMLElement>("#setup-back")!.click();
  await settled(root);
  expect(name.value).toBe("Studio");
  root.querySelector<HTMLElement>("#setup-next")!.click();
  root.querySelector<HTMLElement>("#setup-next")!.click();
  root.querySelector<HTMLElement>("#setup-next")!.click();
  expect(root.querySelector("output")!.textContent).toBe("Created Studio · Team");
});
it("searches across settings pages and saves values from retained hidden sections", async () => {
  const root = await example("ui-form", "Searchable settings pages");
  const search = root.querySelector<UIInput>("#settings-search")!;
  search.control!.value = "digest";
  search.control!.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
  expect(root.querySelector<HTMLElement>('[data-settings-page="appearance"]')!.hidden).toBe(true);
  expect(root.querySelector<HTMLElement>('[data-settings-page="notifications"]')!.hidden).toBe(
    false,
  );
  root.querySelector<HTMLElement>('ui-button[type="submit"]')!.click();
  expect(root.querySelector("output")!.textContent).toBe(
    "Saved · System · reviews on · digest off",
  );
});
