import { describe, expect, it, vi } from "vitest";

import { fixture, inShadow, settled } from "../test-support/fixture.js";
import type { UIIntlFormatter } from "./intl-formatter.js";
import "./register.js";

describe("ui-intl-formatter", () => {
  it("formats localized currency with native Intl", async () => {
    const formatter = await fixture<UIIntlFormatter>(`
      <ui-intl-formatter kind="currency" value="12840.5" currency="USD" locale="en-US" maximum-fraction-digits="2"></ui-intl-formatter>
    `);

    expect(inShadow(formatter, '[part="output"]').textContent).toBe(
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        currencyDisplay: "symbol",
        useGrouping: true,
        maximumFractionDigits: 2,
      }).format(12840.5),
    );
    expect(formatter.matches(":state(invalid)")).toBe(false);
  });

  it("uses semantic time output for localized dates", async () => {
    const formatter = await fixture<UIIntlFormatter>(`
      <ui-intl-formatter kind="date" value="2026-08-20T12:00:00Z" locale="en-US" date-style="full" time-zone="UTC"></ui-intl-formatter>
    `);
    const output = inShadow<HTMLTimeElement>(formatter, "time");

    expect(output.dateTime).toBe("2026-08-20T12:00:00Z");
    expect(output.textContent).toBe(
      new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" }).format(
        new Date("2026-08-20T12:00:00Z"),
      ),
    );
  });

  it("exposes invalid state, fallback anatomy, and a granular error event", async () => {
    const formatter = document.createElement("ui-intl-formatter") as UIIntlFormatter;
    const listener = vi.fn();
    formatter.addEventListener("ui-intl-formatter-error", listener);
    formatter.kind = "date";
    formatter.value = "not-a-date";
    formatter.innerHTML = '<span slot="fallback">Unknown date</span>';
    document.body.append(formatter);
    await settled(formatter);

    expect(formatter.matches(":state(invalid)")).toBe(true);
    expect(
      inShadow<HTMLSlotElement>(formatter, 'slot[name="fallback"]').assignedElements()[0]
        ?.textContent,
    ).toContain("Unknown date");
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0].detail).toMatchObject({
      kind: "date",
      value: "not-a-date",
    });
    formatter.remove();
  });
});
