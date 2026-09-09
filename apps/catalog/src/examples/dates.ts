import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const output = `<output data-date-result aria-live="polite"></output>`;
const calendar = (attributes = "", label = "Choose date") =>
  `<ui-calendar month="2026-09" label="${label}" ${attributes}></ui-calendar>`;
const calendarOwner = `const calendars = [...document.querySelectorAll("ui-calendar")];
const result = document.querySelector("[data-date-result]");
function report(event) { if (result) result.textContent = event ? (event.detail.value || "No date selected") : (calendars[0].value || "Choose a date"); }
calendars.forEach(calendar => calendar.addEventListener("ui-calendar-change", report));
document.querySelector("[data-clear]")?.addEventListener("click", () => { calendars.forEach(calendar => calendar.value = ""); report(); });
document.querySelector("[data-reset]")?.addEventListener("click", () => { calendars.forEach(calendar => { calendar.month = "2026-09"; calendar.value = "2026-09-08"; calendar.view = "day"; }); report(); });
report();`;

// Recompute unavailable dates when navigation reveals another month, including
// the outside-month days drawn in the six-week grids.
const restrictionsOwner = `function restrict(calendar, blocked) {
  const update = () => {
    const [year, month] = calendar.month.split("-").map(Number);
    const first = new Date(Date.UTC(year, month - 1, -6));
    const last = new Date(Date.UTC(year, month - 1 + calendar.months, 8));
    const dates = [];
    for (let day = first; day <= last; day = new Date(day.valueOf() + 86400000)) if (blocked(day)) dates.push(day.toISOString().slice(0, 10));
    calendar.disabledValues = dates;
  };
  calendar.addEventListener("ui-calendar-month-change", update); update();
}
document.querySelectorAll('[data-rule="weekdays"]').forEach(calendar => restrict(calendar, day => [0, 3, 6].includes(day.getUTCDay())));
document.querySelectorAll('[data-rule="weekends"]').forEach(calendar => restrict(calendar, day => [0, 6].includes(day.getUTCDay())));
document.querySelectorAll('[data-rule="first-five"]').forEach(calendar => restrict(calendar, day => day.getUTCDate() <= 5));
document.querySelectorAll('[data-rule="holidays"]').forEach(calendar => restrict(calendar, day => ["01-01", "07-04", "12-25"].includes(day.toISOString().slice(5, 10))));`;

function calendarExample(
  name: string,
  markup: string,
  description: string,
  script = "",
): CatalogExample {
  return { ...sample(name, markup + output, description), script: calendarOwner + "\n" + script };
}

const picker = (
  id: string,
  label: string,
  attributes = "",
  calendarAttributes = "",
  actions = "",
) =>
  `<div class="mash-stack"><ui-date-picker id="${id}" label="${label}" ${attributes}><ui-button slot="trigger" outline><span data-date-label>${label}</span></ui-button><div class="mash-stack">${calendar(calendarAttributes)}${actions}<ui-button data-picker-clear size="small" variant="ghost">Clear selection</ui-button></div></ui-date-picker><output data-picker-result="${id}" aria-live="polite"></output></div>`;

const pickerOwner = `const pickers = [...document.querySelectorAll("ui-date-picker")];
const formatDate = (value, format) => new Intl.DateTimeFormat("en", {timeZone: "UTC", ...(format === "long" ? {dateStyle: "long"} : {month: "short", day: "numeric", year: "numeric"})}).format(new Date(value + "T00:00:00Z"));
function renderPicker(picker) {
  const range = picker.querySelector("ui-calendar").mode === "range";
  const dates = picker.value.split("/").filter(Boolean);
  const label = dates.length ? dates.map(value => picker.dataset.format === "iso" ? value : formatDate(value, picker.dataset.format)).join(" – ") + (range && dates.length === 1 ? " – Choose end" : "") : picker.label;
  picker.querySelector("[data-date-label]").textContent = label;
  document.querySelector('[data-picker-result="' + picker.id + '"]').textContent = picker.value || "No selection";
}
for (const picker of pickers) {
  picker.addEventListener("ui-date-picker-change", () => renderPicker(picker));
  picker.querySelector("[data-picker-clear]").addEventListener("click", () => { picker.value = ""; renderPicker(picker); });
  picker.querySelectorAll("[data-preset]").forEach(button => button.addEventListener("click", () => { picker.value = button.dataset.preset; picker.open = false; renderPicker(picker); }));
  renderPicker(picker);
}`;
const presets = (range = false) =>
  `<div class="mash-row mash-wrap">${(range
    ? [
        ["This week", "2026-09-07/2026-09-13"],
        ["Next week", "2026-09-14/2026-09-20"],
        ["This month", "2026-09-01/2026-09-30"],
      ]
    : [
        ["September 8", "2026-09-08"],
        ["September 15", "2026-09-15"],
        ["September 30", "2026-09-30"],
      ]
  )
    .map(
      ([label, value]) =>
        `<ui-button data-preset="${value}" size="small" variant="ghost">${label}</ui-button>`,
    )
    .join("")}</div>`;

function pickerExample(
  name: string,
  markup: string,
  description: string,
  script = "",
): CatalogExample {
  return { ...sample(name, markup, description), script: pickerOwner + "\n" + script };
}

export const dateExamples: Record<string, CatalogExample[]> = {
  "ui-calendar": [
    calendarExample(
      "Calendar",
      `${calendar('value="2026-09-08"')}<div class="mash-row"><ui-button data-clear size="small" variant="ghost">Clear</ui-button><ui-button data-reset size="small" outline>Reset</ui-button></div>`,
      "Choose a day with the pointer or keyboard. Clear removes selection; reset returns to the initial month.",
    ),
    calendarExample(
      "Date range",
      calendar('months="2" mode="range" value="2026-09-08/2026-09-16"'),
      "Choose a start, then an end across either month. Choosing an earlier end orders the range automatically.",
    ),
    calendarExample(
      "Multiple months",
      calendar('months="3" value="2026-09-08"'),
      "Three consecutive months share one selected date and navigation header.",
    ),
    calendarExample(
      "Month and year selection",
      `<div class="mash-row mash-wrap">${calendar('view="month"', "Choose month")}${calendar('view="year"', "Choose year")}</div>`,
      "Choose the month or year directly; year arrows move through twenty-year pages.",
    ),
    calendarExample(
      "Restrictions",
      `<div class="mash-row mash-wrap"><div class="mash-stack"><strong>Available interval</strong>${calendar('id="availability" min="2026-09-08" max="2026-09-25"')}</div><div class="mash-stack"><strong>Closed September 10–16</strong>${calendar('disabled-values=\'["2026-09-10","2026-09-11","2026-09-12","2026-09-13","2026-09-14","2026-09-15","2026-09-16"]\'')}</div></div>`,
      "Bounds constrain navigation and date selection. Specific closures can sit inside the available interval.",
      `document.querySelector("#availability").disabledValues = ["2026-09-12", "2026-09-13", "2026-09-19", "2026-09-20"];`,
    ),
    calendarExample(
      "Recurring dates",
      `<div class="mash-row mash-wrap"><div class="mash-stack"><strong>Unavailable Sun / Wed / Sat</strong>${calendar('data-rule="weekdays"')}</div><div class="mash-stack"><strong>First five days unavailable</strong>${calendar('data-rule="first-five"')}</div></div>`,
      "Navigate to another month: recurring restrictions are recomputed from the owner's date rules.",
      restrictionsOwner,
    ),
    calendarExample(
      "Sizes",
      `<div class="mash-row mash-wrap">${["small", "medium", "large"].map((size) => `<div class="mash-stack" data-mash-size="${size}"><strong>${size}</strong>${calendar('value="2026-09-08"')}</div>`).join("")}</div>`,
      "Calendar controls follow the same inherited size context as buttons and inputs.",
    ),
    calendarExample(
      "Quarterly view",
      `${calendar('months="3" mode="range"')}<div class="mash-row"><ui-button id="quarter" size="small" outline>Select quarter</ui-button><ui-button data-clear size="small" variant="ghost">Clear</ui-button></div>`,
      "A reporting-period owner can select the full visible quarter without a separate date model.",
      `document.querySelector("#quarter").addEventListener("click", () => { const c = calendars[0]; const [year, month] = c.month.split("-").map(Number); const start = new Date(Date.UTC(year, Math.floor((month - 1) / 3) * 3, 1)); const end = new Date(Date.UTC(year, start.getUTCMonth() + 3, 0)); c.month = start.toISOString().slice(0, 7); c.value = start.toISOString().slice(0, 10) + "/" + end.toISOString().slice(0, 10); report(); });`,
    ),
    calendarExample(
      "Availability",
      `<div class="mash-row mash-wrap"><ui-card><strong slot="title">Business days</strong>${calendar('data-rule="weekends" first-day="1" min="2026-09-08"')}</ui-card><ui-card><strong slot="title">Holiday calendar</strong><ui-calendar month="2026-12" data-rule="holidays" label="Holiday calendar"></ui-calendar></ui-card></div>`,
      "Compose business-day rules, Monday-first weeks and recurring holidays with ordinary cards.",
      restrictionsOwner,
    ),
  ],
  "ui-date-picker": [
    pickerExample(
      "Date picker",
      picker("due", "Choose due date", 'value="2026-09-08"', "", presets()),
      "The trigger displays the selected date. Choose a preset or clear the selection; reopening retains the calendar value.",
    ),
    pickerExample(
      "Date range",
      picker(
        "range",
        "Choose dates",
        'value="2026-09-08/2026-09-16"',
        'months="2" mode="range"',
        presets(true),
      ),
      "The popup stays open after the start date and closes when the end date completes the range.",
    ),
    pickerExample(
      "Empty range",
      picker("empty-range", "Select a date range", "", 'months="2" mode="range"', presets(true)),
      "Range mode is explicit even before a date is selected. Clear returns to that empty range state.",
    ),
    pickerExample(
      "Restrictions",
      `<div class="mash-row mash-wrap">${picker("business", "Business day", "", 'data-rule="weekends"')}${picker("interval", "September 8–25", "", 'min="2026-09-08" max="2026-09-25"')}${picker("custom", "After the fifth", "", 'data-rule="first-five"')}</div>`,
      "Weekends, allowed intervals and custom recurring dates use the same calendar contracts inside a popup.",
      restrictionsOwner,
    ),
    pickerExample(
      "Year range",
      picker(
        "birthday",
        "Select birthday",
        'value="2000-09-08"',
        'min="1927-01-01" max="2026-12-31"',
      ),
      "Use the year heading to move across decades. Years and months outside the birthday interval remain unavailable.",
    ),
    pickerExample(
      "Sizes and states",
      `<div class="mash-row mash-wrap">${["small", "medium", "large"].map((size) => `<div data-mash-size="${size}">${picker("date-" + size, "Choose date", 'value="2026-09-08"')}</div>`).join("")}${picker("disabled-date", "Managed date", 'disabled value="2026-09-08"')}</div>`,
      "Trigger and calendar inherit one size context. The managed picker stays disabled.",
    ),
    pickerExample(
      "Formats",
      `<div class="mash-row mash-wrap">${picker("readable", "Choose date", 'data-format="long" value="2026-09-08"')}${picker("iso", "Choose date", 'data-format="iso" value="2026-09-08"')}</div>`,
      "Display formatting belongs to the trigger; both formats preserve the same ISO value.",
    ),
    pickerExample(
      "Custom trigger",
      picker("plain", "Schedule", 'value="2026-09-08"')
        .replace('slot="trigger" outline', 'slot="trigger" variant="ghost"')
        .replace(
          "<span data-date-label>",
          '<ui-icon name="action.add" label=""></ui-icon><span data-date-label>',
        ),
      "A quiet action can open the same picker without changing selection or focus behavior.",
    ),
    pickerExample(
      "Maximum duration",
      picker("booking", "Book up to 14 days", "", 'mode="range" months="2"') +
        '<output id="booking-status" aria-live="polite">Choose a start and an end, up to fourteen days apart.</output>',
      "The owner validates the interval. An overlong selection keeps the start and leaves the popup open for another end date.",
      `const booking = document.querySelector("#booking"); booking.addEventListener("ui-date-picker-change", event => { const {start, end} = event.detail; if (!end) return; const days = (Date.parse(end) - Date.parse(start)) / 86400000; if (days > 14) { booking.value = start; document.querySelector("#booking-status").textContent = "Choose an end within fourteen days of " + start; } else document.querySelector("#booking-status").textContent = days + " days selected"; renderPicker(booking); });`,
    ),
    pickerExample(
      "Reporting periods",
      picker(
        "reporting",
        "Choose reporting period",
        'data-format="iso"',
        'mode="range" months="3"',
        '<div class="mash-row mash-wrap">' +
          [1, 2, 3, 4]
            .map((quarter) => {
              const start = new Date(Date.UTC(2026, (quarter - 1) * 3, 1))
                .toISOString()
                .slice(0, 10);
              const end = new Date(Date.UTC(2026, quarter * 3, 0)).toISOString().slice(0, 10);
              return `<ui-button data-preset="${start}/${end}" size="small" variant="ghost">Q${quarter}</ui-button>`;
            })
            .join("") +
          "</div>",
      ),
      "Quarter presets set a complete range and reveal its start month. Reopen to adjust either endpoint.",
    ),
  ],
};
