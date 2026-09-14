import { expect, test, type Page } from "@playwright/test";
import type { StudyCollection } from "../../../apps/catalog/src/stories/study-model.js";
const collection = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("mash-study-v1")!) as StudyCollection);
const choose = async (page: Page, id: string, label: string) => {
  const host = page.locator(`#${id}`);
  await host.getByRole("combobox").click();
  await host.getByRole("option", { name: label, exact: true }).click();
};

test("review keyboard actions persist schedules and undo restores the exact card", async ({
  page,
}) => {
  await page.goto("/stories/study");
  await page.getByRole("button", { name: "Start studying", exact: true }).click();
  const prompt = await page.locator(".study-face h2").textContent();
  await page.keyboard.press("Space");
  await expect(page.locator(".study-answer")).toBeVisible();
  await page.keyboard.press("3");
  const state = await collection(page);
  expect(state.reviews).toHaveLength(1);
  expect(state.cards.find((c) => c.id === state.reviews[0]!.card)!.due).toBeGreaterThan(Date.now());
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".study-face h2")).toHaveText(prompt!);
  expect((await collection(page)).reviews).toHaveLength(0);
  await page.locator("[data-action=reveal]").click();
  await page.locator('[data-action="grade:1"]').click();
  await page.reload();
  expect((await collection(page)).reviews).toHaveLength(1);
  await page.locator('[data-action="nav:stats"]').click();
  await expect(page.locator(".study-log")).toContainText(prompt!);
});

test("note types, search, bulk controls, templates and exports are functional", async ({
  page,
}) => {
  await page.goto("/stories/study");
  await page.locator(".study-topbar [data-action=add]").click();
  await choose(page, "study-note-kind", "Cloze deletion");
  await page
    .getByRole("textbox", { name: "Text with deletions", exact: true })
    .fill("The {{c1::moon}} orbits the {{c2::earth}}.");
  await page.locator("[data-action=preview]").click();
  await expect(page.locator("#study-note-preview .study-face")).toHaveCount(2);
  await page.locator("[data-action=save-note]").click();
  await page.locator(".study-topbar [data-action=browse]").click();
  await page.getByRole("searchbox", { name: "Search cards", exact: true }).fill("moon");
  await expect(page.locator("#study-browser-rows tr")).toHaveCount(2);
  await page.locator("#study-browser-rows ui-checkbox").first().getByRole("checkbox").check();
  await expect(page.locator("#study-browser-count")).toContainText("1 selected");
  await page.locator("[data-action=bulk-suspend]").click();
  await expect(page.locator("#study-browser-rows")).toContainText("Suspended");
  await page.getByRole("button", { name: "Collection actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Card appearance", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Question template", exact: true })
    .fill("Remember: {{Front}}");
  await choose(page, "study-template-font", "Clean sans serif");
  await page.locator("[data-action=save-template]").click();
  expect((await collection(page)).template.front).toBe("Remember: {{Front}}");
  await page.getByRole("button", { name: "Collection actions", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export collection", exact: true }).click();
  expect((await downloading).suggestedFilename()).toBe("recall-collection.json");
  await page.reload();
  await page.locator(".study-topbar [data-action=browse]").click();
  await page.getByRole("searchbox", { name: "Search cards", exact: true }).fill("moon");
  await expect(page.locator("#study-browser-rows tr")).toHaveCount(2);
});

test("linked source cards share the full notebook editor and survive source edits", async ({
  page,
}) => {
  await page.goto("/stories/study");
  await page.locator('[data-action="nav:sources"]').click();
  await page.locator('.study-source-block [data-action^="link:"]').first().click();
  await page
    .getByRole("textbox", { name: "Question", exact: true })
    .fill("What is the source idea?");
  await page.locator("[data-action=save-note]").click();
  const before = await collection(page),
    linked = before.notes.find((n) => n.front === "What is the source idea?")!;
  await page.locator('.study-source-page [data-action^="source:"]').first().click();
  await expect(page.locator("#documents-title")).toBeVisible();
  const block = page.locator(`[data-block="${linked.source!.block}"] [data-editable]`);
  await block.fill("An evolving idea, shared between page and card.");
  await page.locator('.study-document-toolbar [data-action="nav:sources"]').click();
  await page.locator(".study-topbar [data-action=browse]").click();
  await page
    .getByRole("searchbox", { name: "Search cards", exact: true })
    .fill("What is the source idea?");
  await expect(page.locator("#study-browser-rows")).toContainText(
    "An evolving idea, shared between page and card.",
  );
  const after = await collection(page);
  expect(after.cards.find((c) => c.note === linked.id)!.id).toBe(
    before.cards.find((c) => c.note === linked.id)!.id,
  );
  await page.getByRole("link", { name: "Stories", exact: true }).click();
  await page.locator('a.story-card[href="/stories/documents"]').click();
  await expect(page.locator(`[data-block="${linked.source!.block}"] [data-editable]`)).toHaveText(
    "An evolving idea, shared between page and card.",
  );
});

test("imports are atomic and the workspace fits mobile in dark mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/stories/study?theme=dark");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
  await page.locator("[data-action=sidebar]").click();
  await page.locator("[data-action=import]").click();
  await page.locator("#study-file").setInputFiles({
    name: "notes.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      'Front,Back,Tags,Deck,Type\n"A portable question","A portable answer",test,Imported,typed',
    ),
  });
  await expect(page.locator("#study-browser-rows")).toContainText("A portable question");
  const before = await collection(page);
  await page.getByRole("button", { name: "Collection actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Import collection", exact: true }).click();
  await page.locator("#study-file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"notes":[]}'),
  });
  await expect(page.locator(".study-form-error")).toContainText("valid study collection");
  expect(await collection(page)).toEqual(before);
  await page.locator("[data-action=cancel]").click();
  await page.locator("[data-action=sidebar]").click();
  await page.locator("#study-deck-nav ui-button").last().click();
  await page.getByRole("button", { name: "Start studying", exact: true }).click();
  await page.getByRole("textbox", { name: "Your answer", exact: true }).fill("A portable answer");
  await page.getByRole("textbox", { name: "Your answer", exact: true }).press("Enter");
  await expect(page.locator(".study-typed-result")).toContainText("Matched");
  await expect(page.locator(".study-answer")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: test.info().outputPath("study-mobile-review.png") });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
});
