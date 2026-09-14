import { expect, test } from "@playwright/test";

test("suggestions fill without sending and history restores an unfinished draft", async ({
  page,
}) => {
  await page.goto("/components/ui-textarea?example=Suggested%20prompts");
  const frame = page.frameLocator('iframe[data-variant="Suggested prompts"]');
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  await expect(frame.locator(".mash-composer-placeholder")).toBeVisible();
  await draft.focus();
  await draft.press("Tab");
  await expect(draft).toHaveValue("Help me plan the next release");
  await expect(frame.locator(".mash-composer-result")).toBeEmpty();
  await draft.fill("");
  await draft.press("ArrowDown");
  await draft.press("Enter");
  await expect(draft).toHaveValue("Summarize the notes");
  await expect(frame.locator(".mash-composer-result")).toBeEmpty();
  await draft.press("Enter");
  await expect(frame.locator(".mash-composer-result")).toHaveText("Sent: Summarize the notes");
  await page.goto("/components/ui-textarea?example=History%20recall");
  const history = page.frameLocator('iframe[data-variant="History recall"]');
  const input = history.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("An unfinished draft");
  await input.press("ArrowUp");
  await expect(input).toHaveValue("What should we work on next?");
  await input.press("ArrowDown");
  await expect(input).toHaveValue("An unfinished draft");
  await input.press("Shift+Enter");
  await input.press("x");
  await expect(input).toHaveValue("An unfinished draft\nx");
});

test("attachments filter, deduplicate and send without text; disabled blocks sending", async ({
  page,
}) => {
  await page.goto("/components/ui-textarea?example=Attachment%20previews%20and%20limits");
  const frame = page.frameLocator('iframe[data-variant="Attachment previews and limits"]');
  await expect(frame.locator(".mash-composer-file")).toHaveCount(2);
  await expect(frame.locator(".mash-composer-file img")).toBeVisible();
  await frame.locator('input[type="file"]').setInputFiles({
    name: "blocked.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("x"),
  });
  await expect(frame.locator(".mash-composer-file")).toHaveCount(2);
  await expect(frame.locator(".mash-composer-status")).toContainText("skipped");
  await frame.locator(".mash-composer").evaluate((form) => {
    const transfer = new DataTransfer();
    const file = new File(["notes"], "note.txt", { type: "text/plain", lastModified: 1 });
    transfer.items.add(file);
    transfer.items.add(file);
    form.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
  });
  await expect(frame.locator(".mash-composer-file")).toHaveCount(3);
  await frame.getByRole("button", { name: "Send", exact: true }).click();
  await expect(frame.locator(".mash-composer-result")).toContainText(
    "review-notes.md, palette.svg, note.txt",
  );
  await expect(frame.locator(".mash-composer-file")).toHaveCount(0);
  await page.goto("/components/ui-textarea?example=Compact%20and%20disabled");
  const disabled = page.frameLocator('iframe[data-variant="Compact and disabled"]');
  await expect(disabled.getByRole("textbox", { name: "Message", exact: true })).toBeDisabled();
  await expect(disabled.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
  await disabled.getByRole("switch", { name: "Enable composer" }).click();
  await expect(disabled.getByRole("textbox", { name: "Message", exact: true })).toBeEnabled();
});

test("queued drafts reorder by pointer and keyboard, edit safely, and dispatch in order", async ({
  page,
}) => {
  await page.goto("/components/ui-textarea?example=Streaming%20and%20queued%20drafts");
  const frame = page.frameLocator('iframe[data-variant="Streaming and queued drafts"]');
  const rows = frame.locator(".mash-composer-queued");
  await expect(rows).toHaveCount(2);
  const grip = rows.first().locator('[slot="handle"]');
  const first = (await grip.boundingBox())!,
    last = (await rows.last().boundingBox())!;
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await page.mouse.move(first.x + first.width / 2, last.y + last.height - 4, { steps: 8 });
  await page.mouse.up();
  await expect(rows.first()).toContainText("Then list");
  const edit = rows.first().locator("[data-queue-edit]");
  await edit.focus();
  await edit.press("Alt+ArrowDown");
  await expect(rows.first()).toContainText("Start with");
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  await draft.fill("Keep my current draft");
  await rows.first().locator("[data-queue-edit]").click();
  await expect(draft).toHaveValue("Start with a short summary.");
  await expect(rows.first()).toContainText("Keep my current draft");
  await draft.press("Enter");
  await expect(rows).toHaveCount(3);
  await frame.getByRole("button", { name: "Finish response", exact: true }).click();
  await expect(frame.locator(".mash-composer-result")).toHaveText(
    "Dispatched: Keep my current draft",
  );
  await expect(rows).toHaveCount(2);
  await rows.first().locator("[data-queue-edit]").press("Delete");
  await expect(rows).toHaveCount(1);
});

test("conversation streams, stops, edits, regenerates, and fits a narrow dark preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/ui-message?example=Message%20input%20and%20conversation&theme=dark");
  const frame = page.frameLocator('iframe[data-variant="Message input and conversation"]');
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  await expect(frame.locator('ui-icon[name="action.duplicate"] svg').first()).toBeVisible();
  expect((await frame.locator(".mash-chat-message").first().boundingBox())!.height).toBeLessThan(
    150,
  );
  await draft.fill("A small first step");
  await draft.press("Enter");
  await expect(frame.locator(".mash-chat-message")).toHaveCount(4);
  await expect(frame.locator(".mash-chat-message").last()).toContainText("Start with");
  await frame.getByRole("button", { name: "Stop response", exact: true }).click();
  await expect(frame.locator("#conversation-status")).toHaveText("Response stopped.");
  await frame.getByRole("button", { name: "Edit message", exact: true }).last().focus();
  await frame.getByRole("button", { name: "Edit message", exact: true }).last().press("Enter");
  await expect(draft).toHaveValue("A small first step");
  await draft.fill("");
  await frame.getByRole("button", { name: "Regenerate response", exact: true }).last().focus();
  await frame
    .getByRole("button", { name: "Regenerate response", exact: true })
    .last()
    .press("Enter");
  await expect(frame.locator(".mash-chat-message").last()).toContainText("another approach");
  expect(
    await frame
      .locator(".mash-composer")
      .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
});
