import { expect, it } from "vitest";
import { menuExtensionExamples } from "../../../../apps/catalog/src/examples/menu-extensions.js";
import { workflowExamples } from "../../../../apps/catalog/src/examples/workflows.js";
import { fixture, settled } from "../test-support/fixture.js";
import type { CatalogExample } from "../../../../apps/catalog/src/examples.js";
import type { UIInput } from "../input/input.js";
import type { UIMenu } from "./menu.js";
import type { UIContextMenu } from "../context-menu/context-menu.js";
import "./register.js";
import "../menu-item/register.js";
import "../menu-label/register.js";
import "../context-menu/register.js";
import "../menubar/register.js";
import "../button/register.js";
import "../input/register.js";
import "../textarea/register.js";
import "../gesture-binding/register.js";
async function example(entries: Record<string, CatalogExample[]>, tag: string, name: string) {
  const entry = entries[tag]!.find((item) => item.name === name)!;
  const root = await fixture<HTMLElement>(entry.code);
  new Function(entry.script!)();
  await settled(root);
  return root;
}
async function choose(root: HTMLElement, selector: string) {
  root
    .querySelector(selector)!
    .shadowRoot!.querySelector<HTMLButtonElement>('[part="control"]')!
    .click();
  await settled(root);
}
it("keeps format selection separate from a running primary export", async () => {
  const root = await example(menuExtensionExamples, "ui-button", "Split action");
  await choose(root, 'ui-menu-item[value="json"]');
  expect(root.querySelector<HTMLPreElement>("pre")!.hidden).toBe(true);
  root.querySelector<HTMLElement>("#export-default")!.click();
  await settled(root);
  expect(root.querySelector("#export-format-trigger")!.hasAttribute("disabled")).toBe(true);
  await expect.poll(() => root.querySelector<HTMLPreElement>("pre")!.hidden).toBe(false);
  expect(JSON.parse(root.querySelector("pre")!.textContent!)).toEqual({
    title: "Project brief",
    status: "draft",
  });
  expect(root.querySelector("output")!.textContent).toBe("Export ready · json");
});
it("runs the same save command through a scoped key binding and a menu row", async () => {
  const root = await example(menuExtensionExamples, "ui-menu", "Scoped shortcuts");
  const input = root.querySelector<UIInput>("ui-input")!;
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  input.control!.focus();
  input.control!.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "s",
      code: "KeyS",
      metaKey: mac,
      ctrlKey: !mac,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  input.control!.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: "s",
      code: "KeyS",
      metaKey: mac,
      ctrlKey: !mac,
      bubbles: true,
      composed: true,
    }),
  );
  await settled(root);
  expect(root.querySelector("output")!.textContent).toBe("Saved Release notes · version 1");
  await choose(root, 'ui-menu-item[value="save"]');
  expect(root.querySelector("output")!.textContent).toBe("Saved Release notes · version 2");
});
it("changes custom checked rows and their visible content", async () => {
  const root = await example(menuExtensionExamples, "ui-menu", "Rich checked rows");
  await choose(root, 'ui-menu-item[value="metadata"]');
  expect(root.querySelector<HTMLElement>("#reading-metadata")!.hidden).toBe(false);
  await choose(root, 'ui-menu-item[value="summary"]');
  expect(root.querySelector<HTMLElement>("#reading-summary")!.hidden).toBe(true);
  expect(root.querySelector("output")!.textContent).toBe("Summary hidden · metadata visible");
});
it("opens all four submenu levels and updates only the originating context target", async () => {
  const root = await example(
    workflowExamples,
    "ui-context-menu",
    "Independent targets and deep folders",
  );
  const context = root.querySelector<UIContextMenu>("ui-context-menu")!;
  context.open = true;
  await settled(root);
  let parent: Element = context;
  for (let depth = 0; depth < 4; depth++) {
    const branch = parent.querySelector(':scope > ui-menu-item:has(> ui-menu[slot="submenu"])')!;
    const control = branch.shadowRoot!.querySelector<HTMLButtonElement>('[part="control"]')!;
    control.focus();
    control.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    await settled(root);
    const submenu = branch.querySelector<UIMenu>(":scope > ui-menu")!;
    expect(submenu.open).toBe(true);
    parent = submenu;
  }
  await choose(root, 'ui-context-menu:first-child ui-menu-item[value="design"]');
  const destinations = [...root.querySelectorAll(".folder-destination")].map(
    (item) => item.textContent,
  );
  expect(destinations).toEqual(["Workspace / Projects / Active / Design review", "Inbox"]);
  expect(root.querySelector("output")!.textContent).toContain("Proposal");
});
it("saves and restores the authored document through application menu actions", async () => {
  const root = await example(workflowExamples, "ui-menubar", "Working document menu");
  const title = root.querySelector<UIInput>("#menu-title")!;
  title.value = "Edited title";
  await choose(root, 'ui-menu-item[value="save"]');
  title.value = "Unsaved edit";
  await choose(root, 'ui-menu-item[value="restore"]');
  expect(title.value).toBe("Edited title");
  expect(root.querySelector("output")!.textContent).toBe("Restored saved version");
});
