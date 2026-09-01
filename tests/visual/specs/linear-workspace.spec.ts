import { expect, test } from "@playwright/test";

const workspaceUrl = "/components/ui-table?example=Issue+tracker+workspace";

test.beforeEach(async ({ page }) => {
  await page.goto(workspaceUrl);
  await expect(
    page.frameLocator("iframe.stage-frame").locator("[data-linear-workspace]"),
  ).toBeVisible();
});

test("nested filters remain catalog-owned, removable, and URL durable", async ({ page }) => {
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.locator("#linear-filter-trigger button").click();
  await expect(frame.locator("[data-linear-query-builder]")).toBeVisible();

  await frame
    .locator(
      '[data-linear-query-group][data-linear-query-path=""] [data-linear-query-add-group] button',
    )
    .click();
  await expect(frame.locator("[data-linear-query-group]")).toHaveCount(2);
  await expect(frame.locator("[data-linear-filter-chips] ui-chip")).toHaveCount(1);
  await expect(frame.locator("[data-linear-visible-count]")).toHaveText("1 issue");

  await expect.poll(() => new URL(page.url()).searchParams.get("state-linear")).not.toBeNull();
  await page.reload();
  await expect(frame.locator("[data-linear-filter-chips] ui-chip")).toHaveCount(1);
  await expect(frame.locator("[data-linear-visible-count]")).toHaveText("1 issue");

  await frame.locator("[data-linear-filter-chips] ui-chip [slot=remove] button").click();
  await expect(frame.locator("[data-linear-filter-chips] ui-chip")).toHaveCount(0);
  await expect(frame.locator("[data-linear-visible-count]")).toHaveText("5 issues");
});

test("saved filters drive the same issue set in list and board views", async ({ page }) => {
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.locator("[data-linear-view-preset] [slot=trigger] button").click();
  await frame
    .locator('[data-linear-view-preset] ui-menu-item[value="release-risk"] button')
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(frame.locator("[data-linear-visible-count]")).toHaveText("2 issues");

  await frame.locator('[data-linear-view-toggle] ui-toggle[value="board"] button').click();
  await expect(frame.locator("[data-linear-board-view]")).toBeVisible();
  await expect(frame.locator("[data-linear-board-card]:visible")).toHaveCount(2);
  await expect(frame.locator("[data-linear-filter-chips] ui-chip")).toHaveCount(4);
});

test("keyboard commands and data states preserve an accessible workflow", async ({ page }) => {
  const frame = page.frameLocator("iframe.stage-frame");
  const search = frame.locator(".example-linear-filters [data-linear-search]");
  await search.focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+Shift+f" : "Control+Shift+f");
  await expect(frame.locator("[data-linear-query-builder]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(frame.locator("[data-linear-query-panel]")).toBeHidden();

  await frame.locator(".example-linear-main").focus();
  await page.keyboard.press("j");
  const highlighted = frame.locator('[data-linear-list-row][data-linear-highlighted="true"]');
  await expect(highlighted).toHaveCount(1);
  await expect
    .poll(() => highlighted.evaluate((node) => node.ownerDocument.activeElement === node))
    .toBe(true);

  await frame.locator("[data-linear-demo-state] [slot=trigger] button").click();
  await frame.locator('[data-linear-demo-state] ui-menu-item[value="loading"] button').click();
  await expect(frame.locator("[data-linear-loading]")).toBeVisible();
  await expect(frame.locator("[data-linear-workspace]")).toHaveAttribute("aria-busy", "true");

  await frame.locator("[data-linear-demo-state] [slot=trigger] button").click();
  await frame.locator('[data-linear-demo-state] ui-menu-item[value="error"] button').click();
  await expect(frame.locator("[data-linear-error]")).toBeVisible();
  await frame.locator("[data-linear-retry] button").click();
  await expect(frame.locator("[data-linear-loading]")).toBeVisible();
  await expect(frame.locator("[data-linear-list-view]")).toBeVisible({ timeout: 2_000 });
});

test("the query recipe remains contained at compact widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.locator("#linear-filter-trigger button").click();
  await expect(frame.locator("[data-linear-query-panel]")).toBeVisible();

  const geometry = await frame.locator("[data-linear-query-panel]").evaluate((panel) => {
    const documentElement = panel.ownerDocument.documentElement;
    const bounds = panel.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      viewport: documentElement.clientWidth,
      overflowInline: documentElement.scrollWidth - documentElement.clientWidth,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(-2);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 2);
  expect(geometry.overflowInline).toBeLessThanOrEqual(2);
});
