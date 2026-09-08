import { expect, test } from "@playwright/test";

test.describe("editing playground", () => {
  test("projects one command through slash insertion, block actions, and history", async ({
    page,
  }) => {
    await page.goto("/components/ui-toolbar?example=Editing+playground");

    const stage = page.frameLocator("iframe.stage-frame");
    const summary = stage.locator('section[data-editing-block="summary"] [data-editing-text]');
    const slashMenu = stage.locator("[data-editing-slash-menu]");

    await summary.fill("/table");
    await expect(slashMenu).toHaveAttribute("open", "");
    await expect(slashMenu.locator('[data-editing-command="block.insert.table"]')).toContainText(
      "Editable structured data",
    );

    await summary.press("Enter");
    await expect(stage.locator("article[data-editing-surface] ui-table")).toHaveCount(1);
    await expect(stage.locator("article[data-editing-surface]")).not.toContainText("/table");

    const tableBlock = stage.locator(
      'article[data-editing-surface] > [data-editing-block-kind="table"]',
    );
    await tableBlock.locator("[data-editing-drag-handle]").click();
    await expect(stage.locator("[data-editing-block-toolbar]")).toBeVisible();
    await stage.locator('[data-editing-command="block.duplicate"]').click();
    await expect(stage.locator("article[data-editing-surface] ui-table")).toHaveCount(2);

    await stage.locator('[data-editing-command="history.undo"]').click();
    await expect(stage.locator("article[data-editing-surface] ui-table")).toHaveCount(1);
    await stage.locator('[data-editing-command="history.undo"]').click();
    await expect(stage.locator("article[data-editing-surface] ui-table")).toHaveCount(0);
    await expect(summary).toContainText("billing migration should keep invoice review fast");
  });
});
