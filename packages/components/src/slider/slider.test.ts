import { describe, expect, it } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UISlider } from "./slider.js";
import "./register.js";

describe("ui-slider", () => {
  it("uses an authored label for the native range", async () => {
    const slider = await fixture<UISlider>(`
      <ui-slider label="Fallback"><span slot="label">Volume level</span></ui-slider>
    `);

    expect(
      inShadow<HTMLSlotElement>(slider, 'slot[name="label"]').assignedElements()[0]?.textContent,
    ).toBe("Volume level");
    expect(inShadow<HTMLInputElement>(slider, '[part="control"]').ariaLabel).toBe("Volume level");
  });

  it("uses two semantic thumbs and repeated form values for a range", async () => {
    const form = await fixture<HTMLFormElement>(`
      <form>
        <ui-slider name="price" values="[12,45]" min="0" max="100" label="Price range"></ui-slider>
      </form>
    `);
    const slider = form.querySelector<UISlider>("ui-slider")!;
    const start = inShadow<HTMLInputElement>(slider, '[part="start-control"]');
    const end = inShadow<HTMLInputElement>(slider, '[part~="end-control"]');

    expect(slider.matches(":state(range)")).toBe(true);
    expect(start.getAttribute("aria-label")).toBe("Price range minimum");
    expect(end.getAttribute("aria-label")).toBe("Price range maximum");
    expect(inShadow(slider, '[part="start-thumb"]')).toBeInstanceOf(HTMLElement);
    expect([...new FormData(form).getAll("price")]).toEqual(["12", "45"]);

    start.value = "80";
    start.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(form);

    expect(slider.values).toEqual([45, 45]);
    expect([...new FormData(form).getAll("price")]).toEqual(["45", "45"]);
  });

  it("maps logarithmic and vertical positions without changing semantic values", async () => {
    const slider = await fixture<UISlider>(`
      <ui-slider value="1" min="0.25" max="4" step="0.05" scale="logarithmic" orientation="vertical" reversed label="Playback speed"></ui-slider>
    `);
    const input = inShadow<HTMLInputElement>(slider, '[part="control"]');
    const indicator = inShadow<HTMLElement>(slider, '[part="indicator"]');

    expect(Number(input.value)).toBeCloseTo(5000, 5);
    expect(input.getAttribute("aria-valuenow")).toBe("1");
    expect(indicator.style.insetBlockStart).not.toBe("");
    expect(indicator.style.blockSize).not.toBe("");

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await settled(slider.parentElement!);
    expect(slider.value).toBe(1.05);
  });

  it("keeps readonly sliders focusable and restores attempted native changes", async () => {
    const slider = await fixture<UISlider>(`
      <ui-slider value="40" readonly label="Locked volume"></ui-slider>
    `);
    const input = inShadow<HTMLInputElement>(slider, '[part="control"]');

    expect(input.disabled).toBe(false);
    expect(input.getAttribute("aria-readonly")).toBe("true");
    expect(slider.matches(":state(readonly)")).toBe(true);

    input.value = "80";
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    await settled(slider.parentElement!);

    expect(slider.value).toBe(40);
    expect(input.value).toBe("40");
  });

  it("exposes authored ticks and current value anatomy", async () => {
    const slider = await fixture<UISlider>(`
      <ui-slider value="25" label="Progress">
        <span slot="ticks">0 25 50 75 100</span>
        <strong slot="value">25 percent</strong>
      </ui-slider>
    `);

    expect(
      inShadow<HTMLSlotElement>(slider, 'slot[name="ticks"]').assignedElements()[0]?.textContent,
    ).toContain("25");
    expect(
      inShadow<HTMLSlotElement>(slider, 'slot[name="value"]').assignedElements()[0]?.textContent,
    ).toBe("25 percent");
    expect(inShadow(slider, '[part~="thumb-value"]')).toBeInstanceOf(HTMLElement);
  });
});
