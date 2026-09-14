import { describe, expect, it, vi } from "vitest";

import { fixture, settled } from "../test-support/fixture.js";
import { UIDatePicker } from "./date-picker.js";
import type { UICalendar } from "../calendar/calendar.js";
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

  it("projects initial, changed and cleared values without emitting user changes", async () => {
    const picker = await fixture<UIDatePicker>(
      `<ui-date-picker value="2026-09-08"><button slot="trigger">Date</button><ui-calendar month="2026-08"></ui-calendar></ui-date-picker>`,
    );
    const calendar = picker.querySelector<UICalendar>("ui-calendar")!;
    const changed = vi.fn();
    picker.addEventListener("ui-date-picker-change", changed);
    expect(calendar.value).toBe("2026-09-08");
    expect(calendar.month).toBe("2026-09");
    picker.value = "2027-01-04";
    await settled(picker);
    expect(calendar.value).toBe("2027-01-04");
    expect(calendar.month).toBe("2027-01");
    picker.value = "";
    await settled(picker);
    expect(calendar.value).toBe("");
    expect(changed).not.toHaveBeenCalled();
  });

  it("keeps a partial range open and closes only after its second date", async () => {
    const picker = await fixture<UIDatePicker>(
      `<ui-date-picker open><button slot="trigger">Range</button><ui-calendar month="2026-09" mode="range" months="2"></ui-calendar></ui-date-picker>`,
    );
    const calendar = picker.querySelector<UICalendar>("ui-calendar")!;
    const values: string[] = [];
    picker.addEventListener("ui-date-picker-change", (event) =>
      values.push((event as CustomEvent).detail.value),
    );
    calendar
      .shadowRoot!.querySelector<HTMLButtonElement>(
        '[data-month="2026-09"] [data-date="2026-09-28"]',
      )!
      .click();
    await settled(picker);
    expect(picker.value).toBe("2026-09-28");
    expect(picker.open).toBe(true);
    calendar
      .shadowRoot!.querySelector<HTMLButtonElement>(
        '[data-month="2026-10"] [data-date="2026-10-03"]',
      )!
      .click();
    await settled(picker);
    expect(picker.value).toBe("2026-09-28/2026-10-03");
    expect(picker.open).toBe(false);
    expect(values).toEqual(["2026-09-28", "2026-09-28/2026-10-03"]);
  });

  it("synchronizes replacement calendars while keeping nested picker ownership isolated", async () => {
    const picker = await fixture<UIDatePicker>(
      `<ui-date-picker value="2026-09-08"><button slot="trigger">Outer</button><ui-calendar></ui-calendar><ui-date-picker value="2027-02-11"><button slot="trigger">Inner</button><ui-calendar month="2027-02"></ui-calendar></ui-date-picker></ui-date-picker>`,
    );
    const inner = picker.querySelector<UIDatePicker>("ui-date-picker")!;
    const innerCalendar = inner.querySelector<UICalendar>("ui-calendar")!;
    expect(innerCalendar.value).toBe("2027-02-11");
    innerCalendar.shadowRoot!.querySelector<HTMLButtonElement>('[data-date="2027-02-12"]')!.click();
    await settled(picker);
    expect(inner.value).toBe("2027-02-12");
    expect(picker.value).toBe("2026-09-08");
    const replacement = document.createElement("ui-calendar");
    picker.querySelector(":scope > ui-calendar")!.replaceWith(replacement);
    await settled(picker);
    expect(replacement.value).toBe("2026-09-08");
    expect(replacement.month).toBe("2026-09");
  });

  it("preserves a controlled correction made during a selection event", async () => {
    const picker = await fixture<UIDatePicker>(
      `<ui-date-picker open value="2026-09-08"><button slot="trigger">Date</button><ui-calendar month="2026-09"></ui-calendar></ui-date-picker>`,
    );
    const calendar = picker.querySelector<UICalendar>("ui-calendar")!;
    picker.addEventListener("ui-date-picker-change", () => {
      picker.value = "2026-09-10";
    });
    calendar.shadowRoot!.querySelector<HTMLButtonElement>('[data-date="2026-09-12"]')!.click();
    await settled(picker);
    expect(picker.value).toBe("2026-09-10");
    expect(calendar.value).toBe("2026-09-10");
  });
});

it("projects an initial value after inert markup upgrades its parent before calendars", async () => {
  const root = await fixture<HTMLElement>("<div></div>");
  const parsed = new DOMParser().parseFromString(
    '<ui-date-picker value="2000-09-08"><button slot="trigger">Birthday</button><ui-calendar month="2026-09"></ui-calendar></ui-date-picker>',
    "text/html",
  );
  const picker = parsed.body.firstElementChild as UIDatePicker;
  root.append(picker);
  await settled(root);
  const calendar = picker.querySelector<UICalendar>("ui-calendar")!;
  expect(calendar.value).toBe("2000-09-08");
  expect(calendar.month).toBe("2000-09");
  expect(
    calendar.shadowRoot!.querySelector('[data-date="2000-09-08"]')!.getAttribute("aria-selected"),
  ).toBe("true");
});
