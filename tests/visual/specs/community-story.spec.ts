import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const storageKey = "mash.story.community.v1";
const route = process.env.MASH_COMMUNITY_HARNESS ?? "/stories/commons";
const mainComposer = (page: Page) => page.locator(".community-main-composer");
const conversation = (page: Page) => page.locator(".community-timeline");
const channel = (page: Page, id: string) =>
  page.locator(`.community-sidebar [data-action="channel:${id}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto(route);
  await expect(page.locator(".community-app")).toBeVisible();
  await expect(mainComposer(page).getByRole("textbox")).toBeVisible();
});

test("room drafts, keyboard sending and thread replies remain in their conversations", async ({
  page,
}) => {
  await mainComposer(page).getByRole("textbox").fill("An unfinished commons thought");
  await mainComposer(page).getByRole("button", { name: "Expand composer", exact: true }).click();
  await channel(page, "workshop").click();
  await expect(mainComposer(page).getByRole("textbox")).toHaveValue("");
  await mainComposer(page).getByRole("textbox").fill("A useful workshop contribution");
  await mainComposer(page).getByRole("textbox").press("Enter");
  const message = conversation(page)
    .locator("ui-message")
    .filter({ hasText: "A useful workshop contribution" });
  await expect(message).toBeVisible();
  await expect(mainComposer(page).getByRole("textbox")).toHaveValue("");
  await message.hover();
  await message.getByRole("button", { name: "Reply in thread", exact: true }).click();
  const thread = page.locator(".community-thread-composer");
  await thread.getByRole("textbox").fill("The reply belongs to this thread");
  await thread.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".community-thread-scroller")).toContainText(
    "The reply belongs to this thread",
  );
  await expect(page.locator(".community-thread-count")).toHaveText("1 replies");
  await expect(conversation(page)).not.toContainText("The reply belongs to this thread");
  await page.getByRole("button", { name: "Close thread", exact: true }).click();
  await channel(page, "commons").click();
  await expect(mainComposer(page).getByRole("textbox")).toHaveValue(
    "An unfinished commons thought",
  );
  await expect(
    mainComposer(page).getByRole("button", { name: "Collapse composer", exact: true }),
  ).toBeVisible();
  await channel(page, "workshop").click();
  await expect(message).toBeVisible();
  await message.getByRole("button", { name: "1 reply ↗", exact: true }).click();
  await expect(page.locator(".community-thread-scroller")).toContainText(
    "The reply belongs to this thread",
  );
});

test("keyboard search, preferences and room management persist through reload", async ({
  page,
}) => {
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.locator(".community-dialog");
  await dialog.getByRole("combobox", { name: "Search messages", exact: true }).fill("remembering");
  await expect(dialog.locator(".community-search-result:visible")).toHaveCount(1);
  await dialog.getByRole("combobox", { name: "Search messages", exact: true }).press("Enter");
  await expect(page.locator(".community-thread-context")).toContainText("one small detail");
  await page.getByRole("button", { name: "Close thread", exact: true }).click();
  await page.getByRole("button", { name: "Community settings", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Your name", exact: true }).fill("Alex Example");
  await dialog.getByRole("textbox", { name: "Space name", exact: true }).fill("A shared space");
  await dialog.getByRole("switch", { name: "Enter sends a message", exact: true }).click();
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.locator("[data-workspace]")).toHaveText("A shared space");
  await channel(page, "workshop").hover();
  await page.getByRole("button", { name: "Actions for Workshop", exact: true }).click();
  await page.getByRole("menuitem", { name: "Room settings", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Room name", exact: true }).fill("Open studio");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await channel(page, "workshop").click();
  await mainComposer(page).getByRole("textbox").fill("A draft retained across reload");
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const state = JSON.parse(localStorage.getItem(key) ?? "null");
        return state?.drafts?.["workshop/main"]?.text;
      }, storageKey),
    )
    .toBe("A draft retained across reload");
  await page.reload();
  await expect(page.locator("[data-workspace]")).toHaveText("A shared space");
  await expect(page.locator(".community-channel-title")).toContainText("Open studio");
  await expect(mainComposer(page).getByRole("textbox")).toHaveValue(
    "A draft retained across reload",
  );
  await mainComposer(page).getByRole("textbox").press("Enter");
  await expect(mainComposer(page).getByRole("textbox")).toHaveValue(
    "A draft retained across reload\n",
  );
  await mainComposer(page).getByRole("textbox").press("ControlOrMeta+Enter");
  await expect(conversation(page)).toContainText("A draft retained across reload");
  await expect(mainComposer(page).getByRole("textbox")).toHaveValue("");
});

test("gallery uploads have actual previews and downloads while notebook entries remain editable", async ({
  page,
}) => {
  await channel(page, "gallery").click();
  const content =
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#8ca59a"/></svg>';
  await mainComposer(page)
    .locator('input[type="file"]')
    .setInputFiles({
      name: "local-color-study.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(content),
    });
  await mainComposer(page).getByRole("textbox").fill("A locally attached color study");
  await mainComposer(page).getByRole("button", { name: "Send message", exact: true }).click();
  const card = page
    .locator(".community-gallery-card")
    .filter({ hasText: "A locally attached color study" });
  await expect(card.getByRole("img", { name: "local-color-study.svg", exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Open local-color-study.svg", exact: true }).click();
  await expect(page.locator(".community-dialog img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".community-dialog")).not.toHaveAttribute("open");
  const downloadPromise = page.waitForEvent("download");
  await card.getByRole("button", { name: "Download local-color-study.svg", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("local-color-study.svg");
  expect(await readFile((await download.path())!, "utf8")).toBe(content);
  await channel(page, "fieldnotes").click();
  await mainComposer(page).getByRole("textbox").fill("A working note\nThe first observation.");
  await mainComposer(page).getByRole("button", { name: "Send message", exact: true }).click();
  const note = page.locator(".community-note-card").filter({ hasText: "A working note" });
  await note.hover();
  await note.getByRole("button", { name: "More message actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit message", exact: true }).click();
  await page
    .locator(".community-dialog")
    .getByRole("textbox", { name: "Edit message text", exact: true })
    .fill("A working note\nThe refined observation.");
  await page
    .locator(".community-dialog")
    .getByRole("button", { name: "Save message", exact: true })
    .click();
  await expect(note).toContainText("The refined observation.");
  await channel(page, "gallery").click();
  await expect(card).toBeVisible();
  await page.reload();
  await expect(card).toContainText("Reattach to open after reload");
  await expect(card.getByRole("button", { name: "Open", exact: true })).toBeDisabled();
  await channel(page, "fieldnotes").click();
  await expect(note).toContainText("The refined observation.");
});
