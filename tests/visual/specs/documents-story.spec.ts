import { expect, test } from "@playwright/test";

const route = process.env.DOCUMENTS_TEST_URL ?? "/stories/documents";
test.beforeEach(async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("#documents-title")).toHaveValue("A place for your ideas");
});

test("document blocks retain edits, formatting, comments and typed undo history", async ({
  page,
}) => {
  const texts = page.locator("[data-editable]");
  await texts.nth(1).fill("An edited idea");
  await texts.nth(1).press("End");
  await texts.nth(1).press("Enter");
  await expect(texts).toHaveCount(9);
  await page.keyboard.type("A second thought");
  await expect(texts.nth(2)).toHaveText("A second thought");
  await page.locator('[data-action="undo"]').click();
  await expect(texts.nth(2)).toHaveText("");
  await page.locator('[data-action="undo"]').click();
  await expect(texts).toHaveCount(8);
  await page.locator('[data-action="redo"]').click();
  await expect(texts).toHaveCount(9);
  await texts.nth(2).focus();
  await page.keyboard.type("/");
  await page.locator("#documents-command input").fill("To-do");
  await page.locator("#documents-command").getByText("To-do", { exact: true }).click();
  await expect(page.locator("[data-block]").nth(2)).toHaveAttribute("data-kind", "todo");
  await texts.nth(1).fill("Formatted words");
  await texts.nth(1).selectText();
  await page.locator('[data-action="format-bold"]').click();
  await expect(texts.nth(1).locator("strong")).toHaveText("Formatted words");
  await page.locator('[data-action="comment"]').first().click();
  await page.locator("#documents-comment textarea").fill("Keep this idea.");
  await page.locator('[data-action="add-comment"]').click();
  await expect(page.locator(".documents-comment p")).toHaveText("Keep this idea.");
  const color = page.locator('ui-select[label="Block color"]');
  await color.getByRole("combobox").click();
  await color.getByRole("option", { name: "Blue", exact: true }).click();
  await expect(page.locator("[data-block]").nth(1)).toHaveAttribute("data-color", "blue");
  await page.reload();
  await expect(texts.nth(1).locator("strong")).toHaveText("Formatted words");
  await page.screenshot({ path: test.info().outputPath("documents-page.png") });
});

test("canvas cards support group drag, resize, connections and reversible removal", async ({
  page,
}) => {
  await page.locator('#documents-mode ui-tab[value="canvas"]').click();
  await page.locator('[data-action="fit"]').click();
  const cards = page.locator("[data-canvas-block]");
  const point = async (index: number) => {
    const box = (await cards.nth(index).boundingBox())!;
    return { x: box.x + 25, y: box.y + 18 };
  };
  let first = await point(0),
    second = await point(1);
  await page.mouse.click(first.x, first.y);
  await page.keyboard.down("Shift");
  await page.mouse.click(second.x, second.y);
  await page.keyboard.up("Shift");
  await expect(page.locator(".documents-canvas-card.is-selected")).toHaveCount(2);
  await page.locator('[data-action="group"]').click();
  const before = (await cards.nth(1).boundingBox())!;
  first = await point(0);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(first.x + 30, first.y + 20, { steps: 4 });
  await page.mouse.up();
  const after = (await cards.nth(1).boundingBox())!;
  expect(after.x - before.x).toBeCloseTo(30, 0);
  expect(after.y - before.y).toBeCloseTo(20, 0);
  const handle = (await cards.first().locator("[data-resize]").boundingBox())!;
  const beforeResize = (await cards.first().boundingBox())!;
  await page.mouse.move(handle.x + 5, handle.y + 5);
  await page.mouse.down();
  await page.mouse.move(handle.x + 45, handle.y + 35, { steps: 4 });
  await page.mouse.up();
  expect((await cards.first().boundingBox())!.width).toBeGreaterThan(beforeResize.width + 30);
  await page.locator('[data-action="tool-connect"]').click();
  first = await point(0);
  second = await point(1);
  await page.mouse.click(first.x, first.y);
  await page.mouse.click(second.x, second.y);
  await expect(page.locator(".documents-connections path")).toHaveCount(2);
  await page.locator('[data-action="tool-select"]').click();
  await page.locator("#documents-canvas").focus();
  await page.keyboard.press("ControlOrMeta+A");
  await expect(page.locator(".documents-canvas-card.is-selected")).toHaveCount(8);
  await page.locator('[data-action="canvas-delete"]').click();
  await expect(cards).toHaveCount(0);
  await page.locator('[data-action="undo"]').click();
  await expect(cards).toHaveCount(8);
  await page.screenshot({ path: test.info().outputPath("documents-canvas.png") });
});

test("collections share table and board data with actual filter and status controls", async ({
  page,
}) => {
  await page.locator('ui-tree-item[title="Release planning"]').click();
  const title = page.getByRole("textbox", { name: "Collection block", exact: true });
  await title.focus();
  await title.press("Home");
  await title.press("Backspace");
  await expect(page.locator(".documents-collection tbody tr")).toHaveCount(4);
  await page.locator(".documents-collection-controls ui-input input").fill("Alex");
  await expect(page.locator(".documents-collection tbody tr")).toHaveCount(2);
  await page.locator(".documents-collection-controls ui-input input").fill("");
  await page.getByRole("button", { name: "Board view", exact: true }).click();
  await expect(page.locator(".documents-record-card")).toHaveCount(4);
  const card = page
    .locator(".documents-record-card")
    .filter({ hasText: "Define the interaction model" });
  await card.getByRole("combobox").click();
  await card.getByRole("option", { name: "Planned", exact: true }).click();
  await expect(
    page
      .locator(".documents-board-lane")
      .filter({ has: page.getByRole("heading", { name: "Planned", exact: true }) })
      .locator(".documents-record-card"),
  ).toHaveCount(3);
  await page.reload();
  await expect(page.locator("#documents-title")).toHaveValue("Release planning");
  await expect(
    page.locator('ui-select[label="status for Define the interaction model"]'),
  ).toHaveJSProperty("value", "Planned");
  await page.screenshot({ path: test.info().outputPath("documents-collection.png") });
});

test("page descendants restore after deletion, imports validate and exports can be reopened", async ({
  page,
}) => {
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await page.locator("#documents-title").fill("Research notes");
  await page.getByRole("button", { name: "Document actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "New child page", exact: true }).click();
  await page.locator("#documents-title").fill("Field notes");
  await page.locator("[data-editable]").first().fill("Child content");
  await page
    .locator('ui-tree-item[title="Research notes"]')
    .locator('[part="control"]')
    .first()
    .click();
  await page.getByRole("button", { name: "Document actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete document", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator('ui-tree-item[title="Field notes"]')).toHaveCount(0);
  await page.locator('[data-action="undo"]').click();
  await expect(page.locator('ui-tree-item[title="Field notes"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Document actions", exact: true }).click();
  const promise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export notebook", exact: true }).click();
  const download = await promise;
  await page.locator("#documents-import-file").setInputFiles((await download.path())!);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#documents-status")).toContainText("Imported notebook");
  await page.locator("#documents-import-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"documents":[]}'),
  });
  await expect(page.locator("#documents-status")).toContainText("valid exported notebook");
  await page.locator(".documents-search-button").click();
  await page.locator("#documents-command input").fill("Child content");
  await page.locator("ui-command-item").filter({ hasText: "Field notes" }).click();
  await expect(page.locator("#documents-title")).toHaveValue("Field notes");
});
