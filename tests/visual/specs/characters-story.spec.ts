import { expect, test } from "@playwright/test";

test("character modes retain selection, insert at the caret, and persist favorites", async ({
  page,
}) => {
  await page.goto("/stories/characters");
  const picker = page.locator(".characters-window");
  const text = page.getByRole("textbox", { name: "Your text", exact: true });
  await expect(page.locator(".characters-nav-panel")).toBeHidden();
  await text.fill("Hello there");
  await text.evaluate((node) => {
    const input = node as HTMLTextAreaElement;
    input.setSelectionRange(6, 11);
    input.dispatchEvent(new Event("select"));
  });
  await page.getByRole("button", { name: "Grinning face", exact: true }).click();
  await expect(text).toHaveValue("Hello 😀");
  await page.getByRole("button", { name: "Expand character picker", exact: true }).click();
  await expect(page.locator(".characters-detail h2")).toHaveText("Grinning face");
  await page.getByRole("searchbox", { name: "Search characters", exact: true }).fill("thumbs up");
  await page.getByRole("button", { name: "Thumbs up", exact: true }).click();
  await page.getByRole("button", { name: "Medium dark skin tone", exact: true }).click();
  await page.getByRole("button", { name: "Insert character", exact: true }).click();
  await expect(text).toHaveValue("Hello 😀👍🏾");
  await picker.locator("[data-action=favorite]").click();
  await expect(picker.locator("[data-action=favorite]")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Collapse character picker", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search characters", exact: true })).toHaveValue(
    "thumbs up",
  );
  await page.reload();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator(".characters-grid button")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Thumbs up", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Recent", exact: true }).click();
  await expect(page.locator(".characters-grid button")).toHaveCount(2);
});

test("symbol search supports keyboard insertion and both modes fit a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/stories/characters?theme=dark");
  const search = page.getByRole("searchbox", { name: "Search characters", exact: true });
  await search.fill("U+2600");
  await search.press("ArrowDown");
  await expect(page.locator(".characters-grid button").first()).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Your text", exact: true })).toHaveValue("☀︎");
  await page.getByRole("button", { name: "Expand character picker", exact: true }).click();
  await expect(page.locator(".characters-detail h2")).toHaveText("Black sun with rays");
  await page.getByRole("button", { name: "Serif", exact: true }).click();
  await expect(page.locator(".characters-specimen")).toHaveAttribute("data-font", "Serif");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Close character picker", exact: true }).click();
  await expect(page.locator(".characters-window")).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Your text", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Open picker", exact: true }).click();
  await expect(search).toBeFocused();
  await search.fill("not-a-character");
  await expect(page.locator(".characters-empty")).toContainText("No characters found");
});
