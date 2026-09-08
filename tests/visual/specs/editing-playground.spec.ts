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
    await expect(stage.locator("article[data-editing-surface] ui-table")).toHaveCount(2);
    await expect(stage.locator("article[data-editing-surface]")).not.toContainText("/table");

    const tableBlock = stage
      .locator('article[data-editing-surface] > [data-editing-block-kind="table"]')
      .last();
    await tableBlock.locator("[data-editing-drag-handle]").click();
    await expect(stage.locator("[data-editing-block-toolbar]")).toBeVisible();
    await stage.locator('[data-editing-command="block.duplicate"]').click();
    await expect(stage.locator("article[data-editing-surface] ui-table")).toHaveCount(3);

    await stage.locator('[data-editing-command="history.undo"]').click();
    await expect(stage.locator("article[data-editing-surface] ui-table")).toHaveCount(2);
    await stage.locator('[data-editing-command="history.undo"]').click();
    await expect(stage.locator("article[data-editing-surface] ui-table")).toHaveCount(1);
    await expect(summary).toContainText("One document can hold prose, data, controls, media");
  });

  test("hands image and audio files to replaceable document adapters", async ({ page }) => {
    await page.goto("/components/ui-toolbar?example=Editing+playground");

    const stage = page.frameLocator("iframe.stage-frame");
    const cover = stage.locator('[data-editing-upload-container="image"]');
    const coverInput = cover.locator('ui-file-upload input[type="file"]');
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );

    await coverInput.setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: pixel });
    await expect(cover).toHaveAttribute("data-editing-asset-name", "cover.png");
    await expect(cover.locator("ui-image")).toHaveAttribute("src", /^blob:/);

    const mediaBlock = stage.locator('[data-editing-block="media-upload"]');
    const mediaInput = mediaBlock.locator('ui-file-upload input[type="file"]');
    await mediaInput.setInputFiles({
      name: "handoff.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("ID3\u0004\u0000\u0000\u0000\u0000\u0000\u0000"),
    });

    await expect(mediaBlock.locator("audio[controls]")).toHaveCount(1);
    await expect(mediaBlock).toContainText("handoff.mp3");

    await stage.locator('[data-editing-command="history.undo"]').click();
    await expect(mediaBlock.locator('ui-file-upload[data-editing-upload="media"]')).toHaveCount(1);
    await expect(cover).toHaveAttribute("data-editing-asset-name", "cover.png");

    await stage.locator('[data-editing-command="history.redo"]').click();
    await expect(mediaBlock.locator("audio[controls]")).toHaveCount(1);
  });
});
