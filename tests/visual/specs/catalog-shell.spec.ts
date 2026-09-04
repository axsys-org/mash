import { expect, test } from "@playwright/test";

test.describe("catalog shell", () => {
  test("filters desktop navigation and jumps between components", async ({ page }) => {
    await page.goto("/components/ui-input-group?example=Tailwind+anatomy+overrides");

    await expect(page.locator(".component-jump")).toHaveValue("ui-input-group");
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".sidebar-search")).toBeVisible();

    await page.locator(".sidebar-search").fill("toast");
    await expect(page.locator("[data-component-nav-item]:not([hidden]) .nav-item")).toHaveText([
      "ui-toast",
      "ui-toast-stack",
    ]);

    await page.locator(".component-jump").selectOption("ui-button");
    await expect(page).toHaveURL(/\/components\/ui-button/);
    await expect(page.locator(".component-title")).toHaveText("ui-button");
  });

  test("uses the masthead jump instead of the full sidebar on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/components/ui-input-group?example=Tailwind+anatomy+overrides");

    await expect(page.locator(".component-jump")).toBeVisible();
    await expect(page.locator(".component-jump")).toHaveValue("ui-input-group");
    await expect(page.locator(".sidebar")).toBeHidden();
    await expect(page.locator(".component-title")).toHaveText("ui-input-group");
    await expect(page.locator("iframe.stage-frame")).toBeVisible();
  });
});
