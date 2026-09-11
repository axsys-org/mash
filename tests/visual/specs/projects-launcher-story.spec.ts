import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`Projects retains edits and composes filters, menus and date selection (${theme})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/stories/projects?theme=${theme}`);
    await expect(page.locator("#issue-count")).toHaveText("24 issues");
    await page.getByRole("searchbox", { name: "Filter issues", exact: true }).fill("discoverable");
    await expect(page.locator("#issue-count")).toHaveText("1 issue");
    await page.locator('[data-open="102"]').click();
    await page
      .getByRole("textbox", { name: "Issue title", exact: true })
      .fill("Keyboard navigation reviewed");
    await page
      .getByRole("textbox", { name: "Write a comment", exact: true })
      .fill("A useful review note.");
    await page.locator(".issue-detail-scroll > ui-button[data-action=comment]").click();
    await expect(page.locator(".issue-activity")).toContainText("A useful review note.");
    await page.locator('ui-select[data-field="status"] [part="trigger"]').click();
    await page.getByRole("option", { name: "Done", exact: true }).click();
    await expect(page.locator('ui-select[data-field="status"]')).toHaveAttribute("value", "Done");
    await page.getByRole("button", { name: "Issue due date", exact: true }).click();
    await expect(
      page.locator('ui-date-picker[data-field="due"] ui-calendar [part="grid"]'),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('ui-date-picker[data-field="due"]')).not.toHaveAttribute("open", "");
    await expect(page.locator('ui-date-picker[data-field="due"]:state(present)')).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath(`projects-${theme}.png`) });
    await page.reload();
    await page.locator('[data-open="102"]').click();
    await expect(page.getByRole("textbox", { name: "Issue title", exact: true })).toHaveValue(
      "Keyboard navigation reviewed",
    );
    await expect(page.locator(".issue-activity")).toContainText("A useful review note.");
    expect(errors).toEqual([]);
  });
  test(`Command Center creates searchable items and evaluates real calculations (${theme})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/stories/command-center?theme=${theme}`);
    const search = page.getByRole("combobox", {
      name: "Search workspace",
      exact: true,
    });
    await search.fill("12 km to mi");
    await expect(page.locator("#launcher-detail")).toContainText("7.456454307 mi");
    await search.fill("");
    await page.getByRole("button", { name: "New", exact: true }).click();
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("A collected idea");
    await page
      .getByRole("textbox", { name: "Content", exact: true })
      .fill("Remember the amethyst milestone.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await search.fill("amethyst");
    await expect(page.locator("#launcher-command ui-command-item")).toHaveCount(1);
    await expect(page.locator("#launcher-detail")).toContainText(
      "Remember the amethyst milestone.",
    );
    await expect(page.locator("ui-dialog:state(present)")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath(`launcher-${theme}.png`) });
    await page.reload();
    await page.locator('[data-category="document"]').click();
    await search.fill("amethyst");
    await expect(page.locator("#launcher-command ui-command-item")).toHaveCount(1);
    await expect(page.locator("#launcher-detail")).toContainText("Live source");
    await page.locator('[data-category="block"]').click();
    await search.fill("amethyst");
    await expect(page.locator("#launcher-command ui-command-item")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Make card", exact: true })).toBeVisible();
    await search.fill("");
    await search.press("Escape");
    await expect(page.locator(".launcher-window")).toBeHidden();
    await expect(page.locator(".launcher-reopen")).toBeFocused();
    await page.keyboard.press("ControlOrMeta+K");
    await expect(page.locator(".launcher-window")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("mobile Projects can open and close navigation and issue detail", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/stories/projects");
  await page.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
  await expect(page.locator(".issue-sidebar")).toBeVisible();
  await page.getByRole("button", { name: "Close sidebar", exact: true }).click();
  await page.locator('[data-open="124"]').click();
  await expect(page.getByRole("button", { name: "Close issue", exact: true })).toBeInViewport();
  await expect(page.getByRole("textbox", { name: "Issue title", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("projects-mobile.png") });
  await page.getByRole("button", { name: "Close issue", exact: true }).click();
  await expect(page.locator("#issue-detail-panel")).toBeHidden();
});
