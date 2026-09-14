import { expect, test } from "@playwright/test";

test("date picker displays its controlled value and presets can be cleared", async ({ page }) => {
  await page.goto("/components/ui-date-picker");
  const frame = page.frameLocator('iframe[data-variant="Date picker"]');
  const picker = frame.locator("#due");
  await expect(picker.locator("[data-date-label]")).toHaveText("Sep 8, 2026");
  await picker.locator('[slot="trigger"]').click();
  await picker.getByRole("button", { name: "September 15", exact: true }).click();
  await expect(picker).not.toHaveAttribute("open");
  await expect(picker.locator("[data-date-label]")).toHaveText("Sep 15, 2026");
  await picker.locator('[slot="trigger"]').click();
  await picker.getByRole("button", { name: "Clear selection", exact: true }).click();
  await expect(picker.locator("[data-date-label]")).toHaveText("Choose due date");
  await expect(picker).toHaveAttribute("value", "");
});

test("empty range remains open between dates and completes across months", async ({ page }) => {
  await page.goto("/components/ui-date-picker?example=Empty%20range");
  const frame = page.frameLocator('iframe[data-variant="Empty range"]');
  const picker = frame.locator("#empty-range");
  await picker.locator('[slot="trigger"]').click();
  await picker.locator('[data-month="2026-09"] [data-date="2026-09-28"]').click();
  await expect(picker).toHaveAttribute("open", "");
  await expect(picker.locator("[data-date-label]")).toContainText("Choose end");
  await picker.locator('[data-month="2026-10"] [data-date="2026-10-03"]').click();
  await expect(picker).not.toHaveAttribute("open");
  await expect(picker).toHaveAttribute("value", "2026-09-28/2026-10-03");
});

test("booking rejects an overlong range and keeps the start editable", async ({ page }) => {
  await page.goto("/components/ui-date-picker?example=Maximum%20duration");
  const frame = page.frameLocator('iframe[data-variant="Maximum duration"]');
  const picker = frame.locator("#booking");
  await picker.locator('[slot="trigger"]').click();
  await picker.locator('[data-month="2026-09"] [data-date="2026-09-08"]').click();
  await picker.locator('[data-month="2026-09"] [data-date="2026-09-30"]').click();
  await expect(picker).toHaveAttribute("open", "");
  await expect(picker).toHaveAttribute("value", "2026-09-08");
  await expect(frame.locator("#booking-status")).toContainText("within fourteen days");
  await picker.locator('[data-month="2026-09"] [data-date="2026-09-15"]').click();
  await expect(picker).not.toHaveAttribute("open");
  await expect(frame.locator("#booking-status")).toHaveText("7 days selected");
});

test("recurring restrictions follow calendar navigation", async ({ page }) => {
  await page.goto("/components/ui-calendar?example=Recurring%20dates");
  const frame = page.frameLocator('iframe[data-variant="Recurring dates"]');
  const calendar = frame.locator('[data-rule="weekdays"]');
  await expect(calendar.locator('[data-date="2026-09-09"]')).toBeDisabled();
  await calendar.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(calendar.locator('[data-date="2026-10-04"]')).toBeDisabled();
  await calendar.locator('[data-date="2026-10-05"]').click();
  await expect(frame.locator("[data-date-result]")).toHaveText("2026-10-05");
});

test("RGB and opacity edits update the same committed color and reject invalid hex", async ({
  page,
}) => {
  await page.goto("/components/ui-color-picker?example=Formats");
  const frame = page.frameLocator('iframe[data-variant="Formats"]');
  const red = frame.getByRole("spinbutton", { name: "Red", exact: true });
  await red.fill("200");
  await red.press("Tab");
  await expect(frame.locator("#color")).toHaveAttribute("value", "#C865E880");
  const opacity = frame.getByRole("spinbutton", { name: "Opacity", exact: true });
  await opacity.fill("25");
  await opacity.press("Tab");
  await expect(frame.locator("#color")).toHaveAttribute("value", "#C865E840");
  const hex = frame.getByRole("textbox", { name: "HEX", exact: true });
  await hex.fill("invalid");
  await hex.press("Tab");
  await expect(hex).toHaveValue("#C865E840");
  for (const [label, value] of [
    ["Red", "200"],
    ["Opacity", "25"],
  ] as const) {
    const channel = frame.getByRole("spinbutton", { name: label, exact: true });
    await channel.fill("");
    await expect(channel).toHaveValue("");
    await expect(frame.locator("#color")).toHaveAttribute("value", "#C865E840");
    await expect(frame.locator("#format-hex + output")).toContainText("Color unchanged");
    await channel.press("Tab");
    await expect(channel).toHaveValue(value);
    await expect(frame.locator("#format-hex + output")).toContainText("Previous color restored");
  }
});

test("palette entries retain edits and adding/removing changes the exported values", async ({
  page,
}) => {
  await page.goto("/components/ui-color-picker?example=Palette%20builder");
  const frame = page.frameLocator('iframe[data-variant="Palette builder"]');
  const editor = frame.locator("#palette-editor");
  const hex = editor.getByRole("textbox", { name: "Hex color", exact: true });
  await hex.fill("#112233");
  await hex.press("Tab");
  await frame.locator("#saved-colors ui-color-swatch").nth(1).click();
  await expect(hex).toHaveValue("#36A376");
  await frame.locator("#saved-colors ui-color-swatch").first().click();
  await expect(hex).toHaveValue("#112233");
  await frame.getByRole("button", { name: "Add color", exact: true }).click();
  await expect(frame.locator("#saved-colors ui-color-swatch")).toHaveCount(4);
  await expect(frame.locator("#palette-code")).toContainText("--palette-4: #112233;");
  await frame.getByRole("button", { name: "Remove selected", exact: true }).click();
  await expect(frame.locator("#saved-colors ui-color-swatch")).toHaveCount(3);
});

test("format selection preserves color and opacity, and the fill trigger can be removed", async ({
  page,
}) => {
  await page.goto("/components/ui-color-picker?example=Color%20formats");
  const frame = page.frameLocator('iframe[data-variant="Color formats"]');
  const picker = frame.locator("#format-picker");
  const original = await picker.getAttribute("value");
  await frame.getByRole("combobox", { name: "Color format" }).click();
  const triggerBox = (await frame.getByRole("combobox", { name: "Color format" }).boundingBox())!;
  await expect
    .poll(async () => {
      const box = (await picker.locator('[part="popup"]').last().boundingBox())!;
      return Math.abs(box.x - triggerBox.x);
    })
    .toBeLessThan(8);
  await frame.getByRole("option", { name: "RGB", exact: true }).click();
  await expect(picker).toHaveAttribute("value", original!);
  const input = frame.getByRole("textbox", { name: "RGB color", exact: true });
  await input.fill("rgb(255 0 0 / 50%)");
  await input.press("Tab");
  await expect(picker).toHaveAttribute("value", "#FF000080");
  await input.fill("invalid");
  await input.press("Tab");
  await expect(picker).toHaveAttribute("value", "#FF000080");
  await expect(picker.locator('[part="error"]')).toContainText("Previous value restored");
  const plane = frame.getByRole("group", { name: "Saturation and brightness" });
  await plane.press("ArrowDown");
  await expect(picker).not.toHaveAttribute("value", "#FF000080");

  await page.goto("/components/ui-color-picker?example=Fill%20control");
  const fill = page.frameLocator('iframe[data-variant="Fill control"]');
  await fill.getByRole("button", { name: "Remove fill", exact: true }).click();
  await expect(fill.locator("#fill")).toHaveAttribute("value", "");
  await fill.locator('[slot="trigger"]').click();
  await fill.getByRole("combobox", { name: "Color format" }).click();
  await fill.getByRole("option", { name: "HSL", exact: true }).click();
  await expect(fill.locator("#fill")).toHaveAttribute("open", "");
  const color = fill.getByRole("textbox", { name: "HSL color", exact: true });
  await color.fill("hsl(120 100% 50%)");
  await color.press("Tab");
  await expect(fill.locator("[data-value]")).toHaveText("#00FF00");
});
