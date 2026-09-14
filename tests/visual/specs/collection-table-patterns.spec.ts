import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`large collections keep a bounded window in ${theme}`, async ({ page }, testInfo) => {
    await page.goto(`/components/ui-virtual-list?example=Half%20a%20million%20rows&theme=${theme}`);
    const frame = page.frameLocator("iframe.stage-frame");
    await expect(frame.locator("#range")).toContainText("500,000");
    await frame.getByRole("button", { name: "Middle", exact: true }).click();
    await expect(frame.locator("#range")).toContainText("250,");
    expect(await frame.locator("ui-virtual-item").count()).toBeLessThan(30);
    const viewport = frame.locator("ui-virtual-list").locator('[part="viewport"]');
    await viewport.evaluate((element) => (element.scrollLeft = 10000));
    await expect(frame.locator("ui-virtual-item").first()).toContainText("71");
    await page.screenshot({ path: testInfo.outputPath(`collection-${theme}.png`) });
    await frame.getByRole("button", { name: "Last", exact: true }).click();
    await expect(frame.locator("#range")).toContainText("500,000 of 500,000");
    expect(await frame.locator("ui-virtual-item").count()).toBeLessThan(30);
  });
}

test("invoice spans share geometry with table semantics", async ({ page }, testInfo) => {
  await page.goto("/components/ui-table?example=Grouped%20invoice");
  const frame = page.frameLocator("iframe.stage-frame");
  const usage = frame.getByRole("columnheader", { name: "Usage", exact: true });
  const quantity = frame.getByRole("columnheader", { name: "Quantity", exact: true });
  await expect(usage).toHaveAttribute("aria-colspan", "2");
  expect((await usage.boundingBox())!.width).toBeGreaterThan(
    (await quantity.boundingBox())!.width * 1.5,
  );
  await page.screenshot({ path: testInfo.outputPath("invoice.png") });
});

test("paged data recovers, retains selection and exports real records", async ({ page }) => {
  await page.goto("/components/ui-data-table?example=Paged%20records");
  const frame = page.frameLocator("iframe.stage-frame");
  await expect(frame.locator("ui-table-body ui-table-row")).toHaveCount(20);
  await frame.getByRole("gridcell", { name: "Record 1", exact: true }).click();
  await expect(frame.locator("#page-status")).toContainText("Selected record 1");
  await frame.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(frame.locator("#page-status")).toContainText("Selected record 1");
  await frame.getByRole("button", { name: "Try failed request", exact: true }).click();
  await expect(frame.getByText("Records could not load", { exact: true })).toBeVisible();
  await frame.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(frame.locator("#page-status")).toContainText("Selected record 1");
  const download = page.waitForEvent("download");
  await frame.getByRole("button", { name: "Export page", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("records-page-1.csv");
});

test("column geometry composes drag, resize and keyboard controls", async ({ page }) => {
  await page.goto("/components/ui-data-table?example=Column%20layout");
  const frame = page.frameLocator("iframe.stage-frame");
  const resize = frame.getByRole("separator", { name: "Resize Project column" });
  await resize.focus();
  await page.keyboard.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", "170");
  const rect = (await resize.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + 65, rect.y + rect.height / 2, { steps: 8 });
  await expect
    .poll(async () => Number(await resize.getAttribute("aria-valuenow")))
    .toBeGreaterThan(210);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(resize).toHaveAttribute("aria-valuenow", "170");
  const heading = frame.getByLabel("Move Project column", { exact: true });
  await heading.focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(frame.locator("ui-table-header ui-table-head").first()).toHaveAttribute(
    "data-column",
    "Owner",
  );
  await expect(
    frame
      .locator("ui-table-body ui-table-row")
      .first()
      .locator("ui-table-cell,ui-table-head")
      .first(),
  ).toHaveAttribute("data-column", "Owner");
  await frame.getByRole("button", { name: "Reset columns", exact: true }).click();
  await expect(frame.locator("ui-table-header ui-table-head").first()).toHaveAttribute(
    "data-column",
    "Project",
  );
  await expect(resize).toHaveAttribute("aria-valuenow", "160");
});
