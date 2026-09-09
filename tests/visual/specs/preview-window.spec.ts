import { expect, test } from "@playwright/test";

test("one preview window scrolls all variants and reaches deep-linked examples", async ({
  page,
}) => {
  await page.goto("/components/ui-tabs?example=Variants", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".preview-window")).toHaveCount(1);
  const viewport = page.locator(".preview-viewport");
  expect(await viewport.evaluate((node) => node.scrollHeight)).toBeGreaterThan(
    await viewport.evaluate((node) => node.clientHeight),
  );
  await expect(page.locator("#variants h2")).toBeInViewport();
  const before = await page.evaluate(() => scrollY);
  await viewport.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect(page.locator(".showcase-section").last()).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(before);
});

test("expand, zoom, theme, and restore preserve the mounted editor", async ({ page }) => {
  await page.goto("/components/ui-editor?theme=light", { waitUntil: "domcontentloaded" });
  const stage = page.frameLocator("iframe.stage-frame");
  const editor = stage.locator("ui-editor textarea");
  await editor.fill("const draft = 'keep this';");
  const frame = await page.locator("iframe.stage-frame").elementHandle();
  const documentFrame = await frame!.contentFrame();
  await documentFrame!.evaluate(() => {
    (window as Window & { previewIdentity?: string }).previewIdentity = "same window";
  });
  await page.getByRole("button", { name: "Switch color theme" }).click();
  await page.getByRole("button", { name: "Expand preview" }).click();
  const dialog = page.getByRole("dialog", { name: "Editor preview" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await page.getByRole("combobox", { name: "Preview zoom" }).selectOption("0.75");
  await expect(editor).toHaveValue("const draft = 'keep this';");
  await expect(stage.locator("html")).toHaveAttribute("data-theme", "dark");
  await editor.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Expand preview" })).toBeFocused();
  await expect(editor).toHaveValue("const draft = 'keep this';");
  expect(
    await documentFrame!.evaluate(
      () => (window as Window & { previewIdentity?: string }).previewIdentity,
    ),
  ).toBe("same window");
  await page.getByRole("button", { name: "Expand preview" }).click();
  await page.getByRole("button", { name: "Restore preview" }).click();
  await expect(editor).toHaveValue("const draft = 'keep this';");
});

for (const width of [390, 1280]) {
  test(`preview fits a ${width}px screen at every zoom`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/components/ui-color-picker", { waitUntil: "domcontentloaded" });
    const stage = page.locator("iframe.stage-frame");
    await expect(stage).toBeVisible();
    expect((await stage.boundingBox())!.height).toBeGreaterThanOrEqual(320);
    await page.getByRole("button", { name: "Expand preview" }).click();
    for (const zoom of ["0.5", "0.75", "1", "1.25", "1.5"]) {
      await page.getByRole("combobox", { name: "Preview zoom" }).selectOption(zoom);
      const bounds = (await page.locator(".preview-window").boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ).toBeLessThanOrEqual(1);
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Expand preview" })).toBeFocused();
  });
}

test("calendar popup and its final date remain reachable inside the preview", async ({ page }) => {
  await page.goto("/components/ui-date-picker", { waitUntil: "domcontentloaded" });
  const stage = page.frameLocator("iframe.stage-frame");
  await stage.getByRole("button", { name: "Choose date", exact: true }).click();
  const popup = stage.locator("ui-date-picker").locator('[part="popup"]');
  await expect(popup).toBeVisible();
  await expect
    .poll(() =>
      popup.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
      }),
    )
    .toBe(true);
  const lastDate = stage.locator('ui-calendar [part~="day"]:not([disabled])').last();
  await expect(lastDate).toBeVisible();
  await lastDate.click();
  await expect(popup).not.toBeVisible();
});
