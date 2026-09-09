import { expect, test } from "@playwright/test";

test("shows every variant directly with searchable component navigation", async ({ page }) => {
  await page.goto("/components/ui-tabs");
  await expect(page.locator(".showcase-section")).toHaveCount(6);
  await expect(page.getByRole("button", { name: "example", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Variants", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Find component" }).fill("toast");
  await expect(page.locator(".component-sidebar nav a:not([hidden])")).toHaveText([
    "Toast",
    "Toast Stack",
  ]);
  await page.getByRole("link", { name: "Toast", exact: true }).click();
  await expect(page).toHaveURL(/components\/ui-toast/);
  await expect(page.getByRole("heading", { name: "Toast", exact: true })).toBeVisible();
});

test("theme changes preserve live input and update every mounted variant", async ({ page }) => {
  await page.goto("/components/ui-message-scroller?theme=light");
  const stage = page.frameLocator('iframe[data-variant="Live conversation"]');
  await stage.getByRole("textbox", { name: "Message", exact: true }).fill("Keep my draft");
  await page.getByRole("button", { name: "Switch color theme" }).click();
  await expect(stage.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(stage.getByRole("textbox", { name: "Message", exact: true })).toHaveValue(
    "Keep my draft",
  );
});

for (const width of [390, 768, 1100])
  test(`showcase fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/components/ui-avatar");
    await expect(page.getByRole("heading", { name: "Avatar", exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    await expect(page.locator(".variant-frame").first()).toBeVisible();
  });
