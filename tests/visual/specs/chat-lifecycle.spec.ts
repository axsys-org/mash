import { expect, test } from "@playwright/test";

test("streaming grows in place, stops, and preserves an earlier reading position", async ({
  page,
}) => {
  await page.goto("/components/ui-message-scroller?example=Streaming%20responses");
  const frame = page.frameLocator('iframe[data-variant="Streaming responses"]');
  const response = frame.locator("#response ui-bubble");
  const scroller = frame.locator("ui-message-scroller");
  await frame.getByRole("button", { name: "Start response", exact: true }).click();
  await expect.poll(async () => (await response.textContent())!.length).toBeGreaterThan(80);
  await frame.getByRole("button", { name: "First message", exact: true }).click();
  const top = await frame.getByRole("log").evaluate((element) => element.scrollTop);
  await frame.getByRole("button", { name: "Expand response", exact: true }).click();
  await expect
    .poll(() => frame.getByRole("log").evaluate((element) => element.scrollTop))
    .toBeLessThan(top + 2);
  await expect
    .poll(() => scroller.evaluate((element) => (element as HTMLElement & { atEnd: boolean }).atEnd))
    .toBe(false);
  await frame.getByRole("button", { name: "Start response", exact: true }).click();
  await expect.poll(async () => (await response.textContent())!.length).toBeGreaterThan(30);
  await frame.getByRole("button", { name: "Stop response", exact: true }).click();
  const stopped = await response.textContent();
  await page.waitForTimeout(150);
  await expect(response).toHaveText(stopped!);
  await expect(frame.locator("#chat-status")).toContainText("partial text retained");
});

test("earlier-message loading fails without mutation then retries successfully", async ({
  page,
}) => {
  await page.goto("/components/ui-message-scroller?example=Loading%20earlier%20messages");
  const frame = page.frameLocator('iframe[data-variant="Loading earlier messages"]');
  await frame.getByRole("checkbox", { name: "Fail next load", exact: true }).check();
  await frame.getByRole("button", { name: "Load 5 earlier", exact: true }).click();
  await expect(frame.locator("#chat-status")).toContainText("could not load");
  await expect(frame.locator("ui-message-scroller ui-message")).toHaveCount(24);
  await frame.getByRole("button", { name: "Retry earlier messages", exact: true }).click();
  await expect(frame.locator("#chat-status")).toHaveText("5 earlier messages loaded");
  await expect(frame.locator("ui-message-scroller ui-message")).toHaveCount(29);
  await frame.getByRole("button", { name: "Oldest loaded", exact: true }).click();
  await expect(frame.locator("#earlier-5")).toBeInViewport();
});

test("empty conversation sends a real draft then restores its empty state", async ({ page }) => {
  await page.goto("/components/ui-message-scroller?example=Empty%20conversation");
  const frame = page.frameLocator('iframe[data-variant="Empty conversation"]');
  await expect(frame.getByText("Start a conversation", { exact: true })).toBeVisible();
  const input = frame.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("A fresh conversation");
  await input.press("Enter");
  await expect(frame.locator("ui-message-scroller ui-bubble")).toHaveText("A fresh conversation");
  await expect(input).toHaveValue("");
  await frame.getByRole("button", { name: "Clear conversation", exact: true }).click();
  await expect(frame.getByText("Start a conversation", { exact: true })).toBeVisible();
});

test("reply and forward create actual local message content", async ({ page }) => {
  await page.goto("/components/ui-message?example=Attachments%20and%20actions");
  const frame = page.frameLocator('iframe[data-variant="Attachments and actions"]');
  await frame.getByRole("button", { name: "Reply", exact: true }).click();
  await frame
    .getByRole("textbox", { name: "Reply to Alex", exact: true })
    .fill("The brief reads well.");
  await frame.getByRole("button", { name: "Send reply", exact: true }).click();
  await expect(frame.locator("#replies ui-bubble")).toHaveText("The brief reads well.");
  await frame.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(frame.locator("#replies ui-attachment")).toHaveCount(1);
  await expect(frame.locator("#message-action-result")).toContainText("forwarded");
});

test("attachment download creates the named file and preview opens the document", async ({
  page,
}) => {
  await page.goto("/components/ui-attachment");
  const file = page.frameLocator('iframe[data-variant="File"]');
  const download = page.waitForEvent("download");
  await file.getByRole("button", { name: "Download proposal", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("proposal.md");
  await page.locator('iframe[data-variant="Vertical preview"]').scrollIntoViewIfNeeded();
  const preview = page.frameLocator('iframe[data-variant="Vertical preview"]');
  await preview.getByRole("button", { name: "Open preview", exact: true }).click();
  await expect(
    preview.getByRole("dialog", { name: "Project proposal", exact: true }),
  ).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: "Project proposal", exact: true }),
  ).toBeVisible();
  await preview.getByRole("button", { name: "Close preview", exact: true }).click();
  await expect(preview.getByRole("dialog", { name: "Project proposal", exact: true })).toBeHidden();
});
