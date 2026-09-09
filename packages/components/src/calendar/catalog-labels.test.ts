import { expect, it } from "vitest";
import { dateExamples } from "../../../../apps/catalog/src/examples/dates.js";
import { fixture, settled } from "../test-support/fixture.js";
import type { UICalendar } from "./calendar.js";
import "./register.js";

it("retains the authored month/year labels when each calendar returns to day view", async () => {
  const entry = dateExamples["ui-calendar"]!.find(
    (item) => item.name === "Month and year selection",
  )!;
  const root = await fixture<HTMLElement>(entry.code);
  const calendars = [...root.querySelectorAll<UICalendar>("ui-calendar")];
  expect(calendars.map((calendar) => calendar.label)).toEqual(["Choose month", "Choose year"]);
  for (const calendar of calendars) calendar.view = "day";
  await settled(root);
  expect(
    calendars[0]!.shadowRoot!.querySelector('[role="grid"]')!.getAttribute("aria-label"),
  ).toContain("Choose month");
  expect(
    calendars[1]!.shadowRoot!.querySelector('[role="grid"]')!.getAttribute("aria-label"),
  ).toContain("Choose year");
});

it("shows one multi-month heading row while preserving named grids and navigation", async () => {
  const calendar = await fixture<UICalendar>(
    '<ui-calendar label="Booking" month="2026-09" months="2"></ui-calendar>',
  );
  const root = calendar.shadowRoot!;
  expect(root.querySelectorAll('[part="title"]')).toHaveLength(1);
  expect(root.querySelector('[part="titles"]')!.textContent).toContain("September 2026");
  expect(root.querySelector('[part="titles"]')!.textContent).toContain("October 2026");
  expect(
    [...root.querySelectorAll('[role="grid"]')].map((grid) => grid.getAttribute("aria-label")),
  ).toEqual(["Booking: September 2026", "Booking: October 2026"]);
  root.querySelector<HTMLButtonElement>('button[aria-label="Next month"]')!.click();
  await settled(calendar);
  expect(calendar.month).toBe("2026-10");
  expect(root.querySelector('[part="titles"]')!.textContent).toContain("November 2026");
  root.querySelector<HTMLButtonElement>('button[aria-label="Previous month"]')!.click();
  await settled(calendar);
  expect(calendar.month).toBe("2026-09");

  calendar.months = 1;
  await settled(calendar);
  const month = root.querySelector<HTMLButtonElement>('[part="month-toggle"]')!;
  month.click();
  await settled(calendar);
  expect(month.getAttribute("aria-pressed")).toBe("true");
  expect(root.querySelector('[role="grid"][aria-label="Choose month"]')).not.toBeNull();
  const year = root.querySelector<HTMLButtonElement>('[part="year-toggle"]')!;
  year.click();
  await settled(calendar);
  expect(year.getAttribute("aria-pressed")).toBe("true");
  expect(root.querySelector('[role="grid"][aria-label="Choose year"]')).not.toBeNull();
});
