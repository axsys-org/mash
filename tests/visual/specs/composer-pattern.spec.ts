import { expect, test } from "@playwright/test";

test("composer collapse preserves draft and attachments can be removed or sent", async ({
  page,
}) => {
  await page.goto("/components/ui-textarea?example=Context%20and%20attachments");
  const frame = page.frameLocator('iframe[data-variant="Context and attachments"]');
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  await draft.fill("Review these notes\nKeep the details.");
  await frame.getByRole("button", { name: "Expand composer", exact: true }).click();
  await expect(frame.locator(".mash-composer")).toHaveAttribute("data-expanded", "");
  await frame.getByRole("button", { name: "Collapse composer", exact: true }).click();
  await expect(draft).toHaveValue("Review these notes\nKeep the details.");
  await frame.getByRole("button", { name: "Remove release-notes.md", exact: true }).click();
  await expect(frame.locator(".mash-composer-file")).toHaveCount(1);
  await frame.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Local notes"),
  });
  await expect(frame.locator(".mash-composer-file")).toHaveCount(2);
  await frame.getByRole("button", { name: "Send", exact: true }).click();
  await expect(frame.locator("#sent-message")).toContainText("design-review.txt, notes.txt");
  await expect(frame.locator(".mash-composer-file")).toHaveCount(0);
  await expect(draft).toHaveValue("");
});

test("sending can stop and a failed draft can retry without losing content", async ({ page }) => {
  await page.goto("/components/ui-textarea?example=Send%2C%20stop%20and%20retry");
  const frame = page.frameLocator('iframe[data-variant="Send, stop and retry"]');
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  const send = frame.getByRole("button", { name: "Send", exact: true });
  await draft.fill("Keep this message.");
  await send.click();
  await frame.getByRole("button", { name: "Stop sending", exact: true }).click();
  await expect(draft).toHaveValue("Keep this message.");
  await expect(frame.locator(".mash-composer-status")).toContainText("Sending stopped");
  await send.click();
  await expect(frame.locator(".mash-composer-status")).toContainText("Your draft is safe");
  await expect(draft).toHaveValue("Keep this message.");
  await frame.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(frame.locator("#sent-message")).toHaveText("Keep this message.");
  await expect(draft).toHaveValue("");
});

test("compact composer grows for multiline text and fits a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/ui-textarea?example=Compact%20composer&theme=dark");
  const frame = page.frameLocator('iframe[data-variant="Compact composer"]');
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  await expect(draft).toBeVisible();
  const initialHeight = (await draft.boundingBox())!.height;
  await draft.fill("One\nTwo\nThree\nFour");
  await expect.poll(async () => (await draft.boundingBox())!.height).toBeGreaterThan(initialHeight);
  const fits = await frame
    .locator(".mash-composer")
    .evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
  expect(fits).toBe(true);
});
