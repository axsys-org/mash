import { describe, expect, it, vi } from "vitest";

import { fixture, settled } from "../test-support/fixture.js";
import { UIDatePicker } from "./date-picker.js";
import "./register.js";

describe("ui-date-picker", () => {
  it("composes the calendar and propagates its selected value", async () => {
    const picker = await fixture<UIDatePicker>(`
      <ui-date-picker label="Due date" open>
        <button slot="trigger">Choose date</button>
        <ui-calendar month="2026-08"></ui-calendar>
      </ui-date-picker>
    `);
    const onChange = vi.fn();
    picker.addEventListener("ui-date-picker-change", onChange);
    picker
      .querySelector("ui-calendar")
      ?.shadowRoot?.querySelector<HTMLButtonElement>(`[data-date="2026-08-18"]`)
      ?.click();
    await settled(picker);

    expect(picker.value).toBe("2026-08-18");
    expect(picker.open).toBe(false);
    expect(onChange).toHaveBeenCalledOnce();
  });
});
