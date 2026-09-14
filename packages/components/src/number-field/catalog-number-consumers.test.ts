import { describe, expect, it, vi } from "vitest";
import { selectionExamples } from "../../../../apps/catalog/src/examples/selection.js";
import { collectionExamples } from "../../../../apps/catalog/src/examples/collections.js";
import type { CatalogExample } from "../../../../apps/catalog/src/examples.js";
import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UINumberField } from "./number-field.js";
import type { UIVirtualList } from "../virtual-list/virtual-list.js";
import type { UISelect } from "../select/select.js";
import type { UIForm } from "../form/form.js";
import "./register.js";
import "../form/register.js";
import "../input/register.js";
import "../checkbox/register.js";
import "../button/register.js";
import "../select/register.js";
import "../option/register.js";
import "../virtual-list/register.js";
import "../toolbar/register.js";

async function example(entries: CatalogExample[], name: string) {
  const entry = entries.find((item) => item.name === name)!;
  const root = await fixture<HTMLElement>(entry.code);
  new Function(entry.script!)();
  await settled(root);
  return root;
}

async function edit(field: UINumberField, value: string, root: HTMLElement) {
  const input = inShadow<HTMLInputElement>(field, '[part="control"]');
  input.value = value;
  input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
}

describe("catalogue empty number ownership", () => {
  it("withholds an estimate while either operand is blank, then recalculates", async () => {
    const root = await example(
      selectionExamples["ui-number-field"]!,
      "Fractional, negative, and bounded",
    );
    const seats = root.querySelector<UINumberField>("#quantity")!;
    const hours = root.querySelector<UINumberField>("#hourly")!;
    const output = root.querySelector("output")!;
    await edit(seats, "", root);
    expect(output.textContent).toBe("Enter seats and hours to calculate the estimate.");
    await edit(seats, "4", root);
    expect(output.textContent).toBe("4 seats × 1.5 hours = $120.00");
    await edit(hours, "", root);
    expect(output.textContent).toBe("Enter seats and hours to calculate the estimate.");
    await edit(hours, "2", root);
    expect(output.textContent).toBe("4 seats × 2 hours = $160.00");
  });

  it("keeps the selected step while budget units are empty and recovers on stepping", async () => {
    const root = await example(selectionExamples["ui-number-field"]!, "Controlled step size");
    const field = root.querySelector<UINumberField>("#budget")!;
    await edit(field, "", root);
    const step = root.querySelector<UISelect>("#step-size")!;
    step.value = "25";
    step.dispatchEvent(new CustomEvent("ui-select-change", { bubbles: true }));
    await settled(root);
    expect(root.querySelector("output")!.textContent).toBe("Enter budget units · step 25");
    inShadow<HTMLButtonElement>(field, '[part="increment"]').click();
    await settled(root);
    expect(root.querySelector("output")!.textContent).toBe("25 units · step 25");
  });

  it("blocks booking submission after clearing seats and saves after correction", async () => {
    const root = await example(
      selectionExamples["ui-form"]!,
      "Mixed controls and conditional fields",
    );
    const form = root.querySelector<UIForm>("ui-form")!;
    const seats = root.querySelector<UINumberField>('[name="seats"]')!;
    const submit = vi.fn();
    form.addEventListener("ui-form-submit", submit);
    await edit(seats, "", root);
    form.requestSubmit();
    expect(submit).not.toHaveBeenCalled();
    expect(root.querySelector("output")!.textContent).toContain("Enter a seat count");
    await edit(seats, "6", root);
    form.requestSubmit();
    expect(submit).toHaveBeenCalledOnce();
    expect(root.querySelector("output")!.textContent).toContain("Design review · 6 seats");
  });

  it("rejects empty and fractional row targets without scrolling and accepts a corrected row", async () => {
    const root = await example(collectionExamples["ui-virtual-list"]!, "Large collection");
    const list = root.querySelector<UIVirtualList>("ui-virtual-list")!;
    const target = root.querySelector<UINumberField>("#target")!;
    const go = root.querySelector<HTMLElement>("#go")!;
    const scroll = vi.spyOn(list, "scrollToItem");
    await edit(target, "", root);
    go.click();
    expect(scroll).not.toHaveBeenCalled();
    expect(root.querySelector("output")!.textContent).toBe(
      "Enter a row from 1 to 5,000 to navigate.",
    );
    await edit(target, "1.5", root);
    go.click();
    expect(scroll).not.toHaveBeenCalled();
    await edit(target, "75", root);
    go.click();
    expect(scroll).toHaveBeenCalledWith(74, "center");
    await settled(root);
    expect(root.querySelector("output")!.textContent).toContain("mounted rows");
  });
});
