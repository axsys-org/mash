import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { editorExamples } from "../../../../apps/catalog/src/examples/editor.js";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIEditor } from "./editor.js";
import "./register.js";
import "../input/register.js";
import "../button/register.js";
import "../switch/register.js";
import "../catalogue/mash.css";

async function example(name: string) {
  const entry = editorExamples["ui-editor"]!.find((item) => item.name === name)!;
  const root = await fixture<HTMLElement>(`<div data-mash-catalogue="mash">${entry.code}</div>`);
  new Function(entry.script!)();
  await settled(root);
  return root;
}

it("hides replacement controls in read-only mode and restores their draft", async () => {
  const root = await example("Source editor");
  root.querySelector<HTMLElement>("#find")!.click();
  await settled(root);
  const replacement = root.querySelector("#replacement")!;
  const nativeInput = inShadow<HTMLInputElement>(replacement, "input");
  nativeInput.value = "Morgan";
  nativeInput.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  const replacementRow = root.querySelector<HTMLElement>("#replace-controls")!;
  expect(getComputedStyle(replacementRow).display).toBe("flex");
  const readOnly = inShadow<HTMLInputElement>(root.querySelector("#read-only")!, "input");
  await userEvent.click(readOnly);
  await settled(root);
  expect(getComputedStyle(replacementRow).display).toBe("none");
  expect(nativeInput.getClientRects()).toHaveLength(0);
  expect(root.querySelector<UIEditor>("#source")!.control!.readOnly).toBe(true);
  await userEvent.click(readOnly);
  await settled(root);
  expect(getComputedStyle(replacementRow).display).toBe("flex");
  expect(nativeInput.getClientRects().length).toBeGreaterThan(0);
  expect(nativeInput.value).toBe("Morgan");
});

it("keeps the dedicated read-only replacement lane hidden with public layout styles", async () => {
  const root = await example("Read-only");
  root.querySelector<HTMLElement>("#find")!.click();
  await settled(root);
  expect(getComputedStyle(root.querySelector("#replace-controls")!).display).toBe("none");
});

it("lays out diagnostic actions below the source and selects their real range by pointer", async () => {
  const root = await example("Mapped diagnostics");
  const editor = root.querySelector<UIEditor>("#range-editor")!;
  editor.control!.focus();
  editor.control!.setSelectionRange(0, 0);
  await userEvent.keyboard("// draft{Enter}");
  await settled(root);
  const diagnostics = root.querySelector<HTMLElement>("#range-diagnostics")!;
  const action = inShadow<HTMLButtonElement>(diagnostics.querySelector("ui-button")!, "button");
  const sourceBounds = editor.control!.getBoundingClientRect();
  expect(diagnostics.getBoundingClientRect().top).toBeGreaterThanOrEqual(sourceBounds.bottom);
  expect(getComputedStyle(action).pointerEvents).toBe("auto");
  await userEvent.click(action);
  expect(editor.shadowRoot!.activeElement).toBe(editor.control);
  expect(editor.value.slice(editor.control!.selectionStart, editor.control!.selectionEnd)).toBe(
    "quantity",
  );
  await userEvent.click(
    inShadow<HTMLButtonElement>(root.querySelector("#apply-range-fix")!, "button"),
  );
  await settled(root);
  expect(editor.value).toContain("price * 2");
  expect(diagnostics.textContent).not.toContain("Quantity has no local value");
});
