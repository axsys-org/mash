import { expect, test } from "@playwright/test";

test("catalogue chrome and stage are realized by semantic utilities", async ({ page }) => {
  await page.goto("/components/ui-tree?theme=dark");

  const dark = page.locator(".segment", { hasText: "dark" });
  await expect(dark).toBeVisible();
  await expect(dark).toHaveClass(/bg-action/);
  await expect(dark).not.toHaveClass(/bg-transparent/);

  const colors = await dark.evaluate((node) => {
    const styles = getComputedStyle(node);
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement("span");
    probe.style.backgroundColor = root.getPropertyValue("--color-action").trim();
    document.body.append(probe);
    const semantic = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return {
      actual: styles.backgroundColor,
      semantic,
    };
  });
  expect(colors.actual).toBe(colors.semantic);

  const stageBody = page.frameLocator("iframe.stage-frame").locator("body");
  await expect(stageBody).toHaveClass(/bg-canvas/);
  await expect(stageBody).toHaveClass(/type-body/);

  const legacyStylesheets = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => /(?:catalog|stage)\.css(?:$|\?)/.test(name)),
  );
  expect(legacyStylesheets).toEqual([]);

  await page.goto("/components/ui-card?example=Message+bubble+pattern");
  const outgoingBubble = page
    .frameLocator("iframe.stage-frame")
    .locator('.example-message-bubble[data-from="me"]');
  await expect(outgoingBubble).toBeVisible();
  await expect(outgoingBubble).toHaveCSS("align-self", "flex-end");
});
