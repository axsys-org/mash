import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UIColorPicker, UIColorSwatch, normalizeHexColor, parseColor } from "./color-picker.js";
import "./register.js";
import "../input/register.js";
import "../slider/register.js";

describe("ui-color-picker", () => {
  it("normalizes supported hex widths", () => {
    expect(normalizeHexColor("#fff")).toBe("#FFFFFF");
    expect(normalizeHexColor("f008")).toBe("#FF000088");
    expect(normalizeHexColor("#ff000080")).toBe("#FF000080");
    expect(normalizeHexColor("#nope")).toBeNull();
  });

  it("converts four formats without losing alpha and rejects invalid values", () => {
    for (const value of ["#6B97FF80", "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF"]) {
      const parsed = parseColor(value)!;
      for (const format of ["hex", "rgb", "hsl", "oklch"] as const)
        expect(parseColor(parsed[format])?.hex).toBe(value);
    }
    expect(parseColor("rgb(100% 0% 0% / 50%)")?.hex).toBe("#FF000080");
    expect(parseColor("hsl(0.5turn 100% 50%)")?.hex).toBe("#00FFFF");
    expect(parseColor("oklch(62.7955% 0.25768 29.234)")?.hex).toBe("#FF0000");
    for (const invalid of ["rgb(no 0 0)", "oklch(NaN 1 0)", "hsl(1 2)", "not a color"])
      expect(parseColor(invalid)).toBeNull();
  });

  it("formats owner values and emits parsed detail while preserving canonical hex", async () => {
    const picker = await fixture<UIColorPicker>(
      `<ui-color-picker inline format="oklch" value="rgb(107 151 255 / 50%)"></ui-color-picker>`,
    );
    expect(picker.value).toBe("#6B97FF80");
    expect(picker.formattedValue).toMatch(/^oklch/);
    const change = vi.fn();
    picker.addEventListener("ui-color-change", change);
    picker.commitColor("hsl(120 100% 50% / 25%)", false);
    expect(change.mock.calls[0]![0].detail).toMatchObject({
      value: "#00FF0040",
      parsed: { hex: "#00FF0040" },
    });
    expect(picker.commitColor("invalid", false)).toBe(false);
    expect(picker.value).toBe("#00FF0040");
  });

  it("commits sampled colors, preserves cancellation and aborts sampling on disconnect", async () => {
    let signal: AbortSignal | undefined;
    const open = vi.fn(async (options: { signal: AbortSignal }) => {
      signal = options.signal;
      return { sRGBHex: "#123456" };
    });
    vi.stubGlobal(
      "EyeDropper",
      class {
        open = open;
      },
    );
    try {
      const picker = await fixture<UIColorPicker>(
        `<ui-color-picker inline value="#FFFFFF"></ui-color-picker>`,
      );
      const sample = inShadow<HTMLElement>(picker, 'ui-button[aria-label="Pick screen color"]');
      sample.click();
      await settled(picker);
      expect(picker.value).toBe("#123456");
      open.mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"));
      sample.click();
      await settled(picker);
      expect(picker.value).toBe("#123456");
      expect(inShadow(picker, '[part="error"]').hidden).toBe(true);
      open.mockImplementationOnce((options) => {
        signal = options.signal;
        return new Promise((_resolve, reject) =>
          signal!.addEventListener(
            "abort",
            () => reject(new DOMException("Cancelled", "AbortError")),
            { once: true },
          ),
        );
      });
      sample.click();
      picker.remove();
      expect(signal!.aborted).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps preview separate and commits authored swatches", async () => {
    const picker = await fixture<UIColorPicker>(`
      <ui-color-picker value="#0A84FF" open>
        <button slot="trigger">Choose color</button>
        <ui-color-swatch value="#30d158">Green</ui-color-swatch>
      </ui-color-picker>
    `);
    const swatch = picker.querySelector<UIColorSwatch>("ui-color-swatch")!;
    const onChange = vi.fn();
    picker.addEventListener("ui-color-change", onChange);

    inShadow(swatch, "button").dispatchEvent(new PointerEvent("pointerenter"));
    await settled(picker);
    expect(picker.preview).toBe("#30D158");
    expect(picker.value).toBe("#0A84FF");
    expect(picker.matches(":state(previewing)")).toBe(true);

    inShadow<HTMLButtonElement>(swatch, "button").click();
    await settled(picker);
    expect(picker.value).toBe("#30D158");
    expect(picker.open).toBe(false);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("coordinates authored HSLA and hex controls through semantic slots", async () => {
    const picker = await fixture<UIColorPicker>(`
      <ui-color-picker value="#FF0000" open>
        <button slot="trigger">Choose color</button>
        <ui-color-swatch slot="preview" disabled></ui-color-swatch>
        <ui-color-swatch value="#FF0000">Red</ui-color-swatch>
        <ui-slider slot="hue" min="0" max="360" value="0"></ui-slider>
        <ui-slider slot="saturation" min="0" max="100" value="100"></ui-slider>
        <ui-slider slot="lightness" min="0" max="100" value="50"></ui-slider>
        <ui-slider slot="alpha" min="0" max="100" value="100"></ui-slider>
        <ui-input slot="hex" label="Hex color"></ui-input>
      </ui-color-picker>
    `);
    const hue = picker.querySelector<HTMLElement & { value: number }>(`[slot="hue"]`)!;
    const hex = picker.querySelector<HTMLElement & { value: string }>(`[slot="hex"]`)!;

    for (const part of [
      "preview",
      "palette",
      "controls",
      "hue",
      "saturation",
      "lightness",
      "alpha",
      "hex",
    ]) {
      expect(inShadow(picker, `[part="${part}"]`)).toBeInstanceOf(HTMLElement);
    }
    expect(hex.value).toBe("#FF0000");

    hue.dispatchEvent(
      new CustomEvent("ui-slider-input", {
        detail: { value: 120, values: [120] },
        bubbles: true,
        composed: true,
      }),
    );
    await settled(picker);
    expect(picker.preview).toBe("#00FF00");
    expect(picker.value).toBe("#FF0000");

    hue.dispatchEvent(
      new CustomEvent("ui-slider-change", {
        detail: { value: 120, values: [120] },
        bubbles: true,
        composed: true,
      }),
    );
    await settled(picker);
    expect(picker.value).toBe("#00FF00");
    expect(picker.open).toBe(true);

    hex.value = "#0000FF";
    hex.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }),
    );
    await settled(picker);
    expect(picker.value).toBe("#0000FF");
    expect(picker.open).toBe(false);
  });

  it("coordinates an authored clear action without owning its presentation", async () => {
    const picker = await fixture<UIColorPicker>(`
      <ui-color-picker value="#0A84FF" open>
        <button slot="trigger">Choose color</button><button slot="clear">Clear</button>
      </ui-color-picker>
    `);
    const changes: string[] = [];
    picker.addEventListener("ui-color-change", (event) => {
      changes.push((event as CustomEvent<{ value: string }>).detail.value);
    });

    picker.querySelector<HTMLButtonElement>(`[slot="clear"]`)!.click();
    await settled(picker);

    expect(picker.value).toBe("");
    expect(picker.open).toBe(true);
    expect(changes).toEqual([""]);
    expect(inShadow(picker, `[part="clear"]`)).toBeInstanceOf(HTMLElement);
  });

  it("restores committed channels after preview and projects a new owner color", async () => {
    const picker = await fixture<UIColorPicker>(
      `<ui-color-picker inline value="#FF000080"></ui-color-picker>`,
    );
    picker.previewColor("#00FF00");
    await settled(picker);
    expect(picker.hue).toBe(120);
    picker.previewColor(null);
    await settled(picker);
    expect(picker.hue).toBe(0);
    expect(picker.alpha).toBeCloseTo(50.196, 2);
    picker.commitColor("#00FF00", false);
    await settled(picker);
    picker.value = "#0000FF40";
    await settled(picker);
    expect(picker.preview).toBe("");
    expect(picker.hue).toBe(240);
    expect(inShadow<HTMLInputElement>(picker, '[part="hex-input"]').value).toBe("#0000FF40");
  });

  it("uses the shared overlay lifecycle when opening from the trigger", async () => {
    const picker = await fixture<UIColorPicker>(
      `<ui-color-picker value="#7965E8"><button slot="trigger">Choose</button></ui-color-picker>`,
    );
    picker.querySelector<HTMLButtonElement>('button[slot="trigger"]')!.click();
    await settled(picker);
    expect(picker.open).toBe(true);
    expect(picker.matches(":state(present)")).toBe(true);
    expect(inShadow<HTMLElement>(picker, '[part="backdrop"]').hidden).toBe(false);
  });

  it("prevents authored controls from editing a disabled inline picker", async () => {
    const picker = await fixture<UIColorPicker>(
      `<ui-color-picker inline disabled value="#7965E8"><ui-color-swatch value="#00FF00">Green</ui-color-swatch><button slot="clear">Clear</button></ui-color-picker>`,
    );
    const changed = vi.fn();
    picker.addEventListener("ui-color-change", changed);
    inShadow<HTMLButtonElement>(picker.querySelector("ui-color-swatch")!, "button").click();
    picker.querySelector<HTMLButtonElement>('button[slot="clear"]')!.click();
    await settled(picker);
    expect(picker.value).toBe("#7965E8");
    expect(changed).not.toHaveBeenCalled();
  });
});
