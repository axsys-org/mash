import { expect, it } from "vitest";
import { navigationOverlayExamples } from "../../../../apps/catalog/src/examples/navigation-overlays.js";
import { fixture, settled } from "../test-support/fixture.js";
import type { UIInput } from "../input/input.js";
import type { UISelect } from "../select/select.js";
import type { UIPagination } from "../pagination/pagination.js";
import type { UIDialog } from "./dialog.js";
import "./register.js";
import "../alert-dialog/register.js";
import "../input/register.js";
import "../button/register.js";
import "../checkbox/register.js";
import "../switch/register.js";
import "../select/register.js";
import "../option/register.js";
import "../pagination/register.js";
import "../table/register.js";
import "../menu/register.js";
import "../menu-item/register.js";
import "../context-menu/register.js";
async function example(tag: string, name: string) {
  const entry = navigationOverlayExamples[tag]!.find((item) => item.name === name)!;
  const root = await fixture<HTMLElement>(entry.code);
  new Function(entry.script!)();
  await settled(root);
  return root;
}
it("retains filtered reviewer selections and applies them from the dialog", async () => {
  const root = await example("ui-dialog", "Scrollable selection dialog");
  const dialog = root.querySelector<UIDialog>("ui-dialog")!;
  dialog.show();
  await settled(root);
  root.querySelector("ui-checkbox")!.shadowRoot!.querySelector<HTMLInputElement>("input")!.click();
  const search = root.querySelector<UIInput>("ui-input")!;
  search.control!.value = "Reviewer 18";
  search.control!.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
  expect(root.querySelector<HTMLElement>('[data-person="Reviewer 1"]')!.hidden).toBe(true);
  root.querySelector<HTMLElement>("#apply-reviewers")!.click();
  await settled(root);
  expect(root.querySelector("output")!.textContent).toBe("Reviewers: Reviewer 1");
  expect(dialog.open).toBe(false);
});
it("reports imperative open and preserves a named return target", async () => {
  const root = await example("ui-dialog", "Compact content and open reasons");
  root.querySelector<HTMLElement>("#show-compact-dialog")!.click();
  await settled(root);
  expect(root.querySelector("output")!.textContent).toBe("Opened · imperative");
  root.querySelector<HTMLElement>('ui-button[slot="close"]')!.click();
  await settled(root);
  expect(root.querySelector("output")!.textContent).toContain("Closed");
  await expect.poll(() => document.activeElement?.id).toBe("note-return-target");
});
it("renders honest empty and one-page pagination boundaries", async () => {
  const root = await example("ui-pagination", "Compact and result boundaries");
  const data = root.querySelector<UISelect>("#page-dataset")!,
    pages = root.querySelector<UIPagination>("ui-pagination")!;
  pages.requestPage(2);
  await settled(root);
  expect(root.querySelector("output")!.textContent).toBe("6–10 of 42 results");
  data.value = "0";
  data.dispatchEvent(new CustomEvent("ui-select-change", { bubbles: true }));
  await settled(root);
  expect(pages.disabled).toBe(true);
  expect(root.querySelector("#compact-page-label")!.textContent).toBe("0 results");
  expect(root.querySelector("#compact-page-rows")!.children).toHaveLength(0);
  data.value = "3";
  data.dispatchEvent(new CustomEvent("ui-select-change", { bubbles: true }));
  await settled(root);
  expect(pages.normalizedTotalPages).toBe(1);
  expect(pages.shadowRoot!.querySelector<HTMLButtonElement>('button[part="next"]')!.disabled).toBe(
    true,
  );
  expect(root.querySelector("output")!.textContent).toBe("1–3 of 3 results");
});
it("switches workspace and page content and clears the actual unread badge", async () => {
  const root = await example("ui-navigation-menu", "Workspace navigation and context");
  root.querySelector<HTMLElement>('.workspace-page[data-page="Projects"]')!.click();
  await settled(root);
  expect(root.querySelector("#workspace-page-title")!.textContent).toBe("Personal / Projects");
  root
    .querySelector('ui-menu-item[value="Studio"]')!
    .shadowRoot!.querySelector<HTMLButtonElement>('[part="control"]')!
    .click();
  await settled(root);
  expect(root.querySelector("#workspace-page-title")!.textContent).toBe("Studio / Projects");
  root.querySelector<HTMLElement>("#clear-unread")!.click();
  expect(root.querySelector<HTMLElement>("#inbox-unread")!.hidden).toBe(true);
  root.querySelector<HTMLElement>('.workspace-page[data-page="Inbox"]')!.click();
  expect(root.querySelector("#workspace-page-content")!.textContent).toBe("You are up to date.");
});
