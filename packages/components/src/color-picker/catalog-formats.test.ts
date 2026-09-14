import { describe, expect, it, vi } from "vitest";
import { colorExamples } from "../../../../apps/catalog/src/examples/colors.js";
import { fixture, settled } from "../test-support/fixture.js";
import type { UIColorPicker } from "./color-picker.js";
import type { UINumberField } from "../number-field/number-field.js";
import "./register.js";
import "../number-field/register.js";
import "../input/register.js";
import "../button/register.js";
import "../card/register.js";

async function formats() {
  const entry = colorExamples["ui-color-picker"]!.find((item) => item.name === "Formats")!;
  const root = await fixture<HTMLElement>(entry.code);
  new Function(entry.script!)();
  await settled(root);
  return root;
}

describe("color format editing", () => {
  for (const name of ["red", "green", "blue", "opacity", "hue", "saturation", "lightness"]) {
    it(`keeps a blank ${name} edit visible without committing and restores it on blur`, async () => {
      const root = await formats();
      const picker = root.querySelector<UIColorPicker>("#color")!;
      const field = root.querySelector<UINumberField>(`[data-channel="${name}"]`)!;
      const control = field.shadowRoot!.querySelector<HTMLInputElement>("input")!;
      const original = field.value;
      const commit = vi.spyOn(picker, "commitColor");
      const feedback = root.querySelector("#format-hex")!.nextElementSibling!;
      control.value = "";
      control.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
      await settled(root);
      expect(Number.isNaN(field.value)).toBe(true);
      expect(control.value).toBe("");
      expect(control.validity.valueMissing).toBe(true);
      expect(picker.value).toBe("#7965E880");
      expect(commit).not.toHaveBeenCalled();
      expect(feedback.textContent).toContain("Color unchanged");
      control.dispatchEvent(new Event("change", { bubbles: true }));
      await settled(root);
      expect(field.value).toBe(original);
      expect(control.value).toBe(String(original));
      expect(control.validity.valid).toBe(true);
      expect(feedback.textContent).toContain("Previous color restored");
      expect(picker.value).toBe("#7965E880");
    });
  }

  it("prevents HSL conversion when a required channel is nonfinite and resumes after correction", async () => {
    const root = await formats();
    const picker = root.querySelector<UIColorPicker>("#color")!;
    const opacity = root.querySelector<UINumberField>('[data-channel="opacity"]')!;
    const hue = root.querySelector<UINumberField>('[data-channel="hue"]')!;
    const commit = vi.spyOn(picker, "commitColor");
    opacity.value = Number.POSITIVE_INFINITY;
    hue.value = 120;
    hue.dispatchEvent(new CustomEvent("ui-number-field-input", { bubbles: true }));
    await settled(root);
    expect(commit).not.toHaveBeenCalled();
    expect(picker.value).toBe("#7965E880");
    opacity.dispatchEvent(new CustomEvent("ui-number-field-change", { bubbles: true }));
    await settled(root);
    expect(opacity.value).toBe(50);
    const red = root.querySelector<UINumberField>('[data-channel="red"]')!;
    const control = red.shadowRoot!.querySelector<HTMLInputElement>("input")!;
    control.value = "42";
    control.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    await settled(root);
    expect(picker.value).toBe("#2A65E880");
    expect(root.querySelector("#color-value")!.textContent).toBe("#2A65E880");
  });
});
