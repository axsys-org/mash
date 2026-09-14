import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import { UICalendar } from "./calendar.js";
import "./register.js";

describe("ui-calendar", () => {
  it("renders an accessible six-week grid and selects a date", async () => {
    const calendar = await fixture<UICalendar>(`<ui-calendar month="2026-08"></ui-calendar>`);
    const onChange = vi.fn();
    calendar.addEventListener("ui-calendar-change", onChange);

    expect(calendar.shadowRoot?.querySelectorAll(`[part~="day"]`)).toHaveLength(42);
    inShadow<HTMLButtonElement>(calendar, `[data-date="2026-08-18"]`).click();
    await settled(calendar);

    expect(calendar.value).toBe("2026-08-18");
    expect(onChange).toHaveBeenCalledOnce();
    expect(calendar.matches(":state(selected)")).toBe(true);
  });

  it("completes ordered ranges and honors disabled bounds", async () => {
    const calendar = await fixture<UICalendar>(
      `<ui-calendar month="2026-08" mode="range" min="2026-08-10" max="2026-08-25"></ui-calendar>`,
    );

    inShadow<HTMLButtonElement>(calendar, `[data-date="2026-08-18"]`).click();
    inShadow<HTMLButtonElement>(calendar, `[data-date="2026-08-14"]`).click();
    await settled(calendar);

    expect(calendar.value).toBe("2026-08-14/2026-08-18");
    expect(inShadow<HTMLButtonElement>(calendar, `[data-date="2026-08-09"]`).disabled).toBe(true);
    expect(inShadow(calendar, `[data-date="2026-08-16"]`).getAttribute("part")).toContain(
      "in-range",
    );
  });

  it("honors renderer-neutral explicit disabled date values", async () => {
    const calendar = await fixture<UICalendar>(
      `<ui-calendar month="2026-08" disabled-values='["2026-08-18"]'></ui-calendar>`,
    );
    const disabled = inShadow<HTMLButtonElement>(calendar, `[data-date="2026-08-18"]`);

    expect(calendar.disabledValues).toEqual(["2026-08-18"]);
    expect(disabled.disabled).toBe(true);
    disabled.click();
    expect(calendar.value).toBe("");
  });

  it("switches through month and year views while preserving semantic controls", async () => {
    const calendar = await fixture<UICalendar>(`<ui-calendar month="2026-08"></ui-calendar>`);
    const views: string[] = [];
    calendar.addEventListener("ui-calendar-view-change", (event) => {
      views.push((event as CustomEvent<{ view: string }>).detail.view);
    });

    inShadow<HTMLButtonElement>(calendar, `[part="month-toggle"]`).click();
    await settled(calendar);
    expect(calendar.view).toBe("month");
    expect(calendar.shadowRoot?.querySelectorAll(`[part~="month-option"]`)).toHaveLength(12);

    inShadow<HTMLButtonElement>(calendar, `[part~="month-option"]:nth-child(12)`).click();
    await settled(calendar);
    expect(calendar.month).toBe("2026-12");
    expect(calendar.view).toBe("day");

    inShadow<HTMLButtonElement>(calendar, `[part="year-toggle"]`).click();
    await settled(calendar);
    expect(calendar.shadowRoot?.querySelectorAll(`[part~="year-option"]`)).toHaveLength(20);
    inShadow<HTMLButtonElement>(calendar, `[part~="year-option"]:nth-child(8)`).click();
    await settled(calendar);
    expect(calendar.month).toBe("2027-12");
    expect(views).toEqual(["month", "day", "year", "day"]);
  });

  it("realizes consecutive multi-month grids from the same selection state", async () => {
    const calendar = await fixture<UICalendar>(
      `<ui-calendar month="2026-08" months="2" value="2026-09-03"></ui-calendar>`,
    );

    expect(calendar.shadowRoot?.querySelectorAll(`[part="month-panel"]`)).toHaveLength(2);
    expect(calendar.shadowRoot?.querySelectorAll(`[part~="day"]`)).toHaveLength(84);
    expect(
      inShadow(calendar, `[data-month="2026-09"] [data-date="2026-09-03"]`).getAttribute("part"),
    ).toContain("selected");
  });

  it("applies date bounds to month/year choices and navigation pages", async () => {
    const calendar = await fixture<UICalendar>(
      `<ui-calendar month="2026-09" min="2026-09-08" max="2026-11-20"></ui-calendar>`,
    );
    expect(inShadow<HTMLButtonElement>(calendar, 'button[part="previous"]').disabled).toBe(true);
    inShadow<HTMLButtonElement>(calendar, '[part="month-toggle"]').click();
    await settled(calendar);
    const months = [
      ...calendar.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part~="month-option"]'),
    ];
    expect(months.filter((month) => !month.disabled)).toHaveLength(3);
    months[0]!.click();
    expect(calendar.month).toBe("2026-09");
    inShadow<HTMLButtonElement>(calendar, '[part="year-toggle"]').click();
    await settled(calendar);
    expect(
      [...calendar.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part~="year-option"]')]
        .filter((year) => !year.disabled)
        .map((year) => year.textContent!.trim()),
    ).toEqual(["2026"]);
    expect(inShadow<HTMLButtonElement>(calendar, 'button[part="previous"]').disabled).toBe(true);
    expect(inShadow<HTMLButtonElement>(calendar, 'button[part="next"]').disabled).toBe(true);
  });

  it("moves PageDown to the last valid day of a shorter month", async () => {
    const calendar = await fixture<UICalendar>(
      `<ui-calendar month="2026-01" value="2026-01-31"></ui-calendar>`,
    );
    const day = inShadow<HTMLButtonElement>(calendar, '[data-date="2026-01-31"]');
    day.focus();
    day.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    await settled(calendar);
    expect(calendar.month).toBe("2026-02");
    expect((calendar.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe("2026-02-28");
  });
});
