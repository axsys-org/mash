import { expect, it } from "vitest";
import { controlStateExamples } from "../../../../apps/catalog/src/examples/control-states.js";
import { fixture, settled } from "../test-support/fixture.js";
import type { UIInput } from "./input.js";
import type { UISlider } from "../slider/slider.js";
import "./register.js";
import "../input-group/register.js";
import "../button/register.js";
import "../field/register.js";
import "../form/register.js";
import "../slider/register.js";
async function example(tag: string, name: string) {
  const entry = controlStateExamples[tag]!.find((item) => item.name === name)!;
  const root = await fixture<HTMLElement>(entry.code);
  new Function(entry.script!)();
  await settled(root);
  return root;
}
it("filters on input and restores results with Escape", async () => {
  const root = await example("ui-input", "Search and clear");
  const input = root.querySelector<UIInput>("ui-input")!;
  input.control!.value = "design";
  input.control!.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
  expect(root.querySelector("#search-count")!.textContent).toBe("1 documents");
  input.control!.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
  await settled(root);
  expect(input.value).toBe("");
  expect(root.querySelector("#search-count")!.textContent).toBe("4 documents");
});
it("reveals passwords without losing the selected range", async () => {
  const root = await example("ui-input", "Password visibility");
  const input = root.querySelector<UIInput>("ui-input")!;
  input.control!.focus();
  input.control!.setSelectionRange(2, 7);
  root.querySelector<HTMLElement>("ui-button")!.click();
  await settled(root);
  expect(input.type).toBe("text");
  expect(input.control!.selectionStart).toBe(2);
  expect(input.control!.selectionEnd).toBe(7);
  expect(input.shadowRoot!.activeElement).toBe(input.control);
});
it("validates edits and submits the corrected address", async () => {
  const root = await example("ui-input", "Live validation and submit");
  const input = root.querySelector<UIInput>("ui-input")!;
  const type = async (value: string) => {
    input.control!.value = value;
    input.control!.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    await settled(root);
  };
  await type("Wrong Address");
  expect(root.querySelector("ui-field")!.hasAttribute("invalid")).toBe(true);
  await type("design-team");
  expect(root.querySelector("ui-field")!.hasAttribute("invalid")).toBe(false);
  root.querySelector<HTMLElement>('ui-button[type="submit"]')!.click();
  expect(root.querySelector("output")!.textContent).toBe("Reserved design-team.example");
});
it("filters range results as either native thumb moves", async () => {
  const root = await example("ui-slider", "Range filter");
  const slider = root.querySelector<UISlider>("ui-slider")!;
  const start = slider.shadowRoot!.querySelector<HTMLInputElement>('[part="start-control"]')!;
  start.value = "100";
  start.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
  expect(root.querySelector("#price-matches")!.textContent).toBe("Team · $100/month");
  expect(root.querySelector("output")!.textContent).toBe("1 plans in range");
});
