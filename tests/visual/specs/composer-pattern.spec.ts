import { expect, test } from "@playwright/test";

test("composer collapse preserves draft and attachments can be removed or sent", async ({
  page,
}) => {
  await page.goto("/components/ui-textarea?example=Context%20and%20attachments");
  const frame = page.frameLocator('iframe[data-variant="Context and attachments"]');
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  const mode = frame.getByRole("combobox", { name: "Response mode", exact: true });
  await draft.fill("Review these notes\nKeep the details.");
  await mode.click();
  await frame.getByRole("option", { name: "Plan", exact: true }).click();
  await expect(draft).toHaveAttribute("placeholder", "What would you like to plan?");
  await frame.getByRole("button", { name: "Expand composer", exact: true }).click();
  await expect(frame.locator(".mash-composer")).toHaveAttribute("data-expanded", "");
  await frame.getByRole("button", { name: "Collapse composer", exact: true }).click();
  await expect(draft).toHaveValue("Review these notes\nKeep the details.");
  await expect(mode).toContainText("Plan");
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
  await expect(mode).toContainText("Plan");
});

test("sending can stop and a failed draft can retry without losing content", async ({ page }) => {
  await page.goto("/components/ui-textarea?example=Send%2C%20stop%20and%20retry");
  const frame = page.frameLocator('iframe[data-variant="Send, stop and retry"]');
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  const send = frame.getByRole("button", { name: "Send", exact: true });
  const mode = frame.getByRole("combobox", { name: "Response mode", exact: true });
  await mode.click();
  await frame.getByRole("option", { name: "Write", exact: true }).click();
  await frame.locator(".mash-composer").evaluate((form) => {
    form.addEventListener("composer-send", (event) => {
      (form as HTMLElement).dataset.sentMode = (event as CustomEvent<{ mode: string }>).detail.mode;
    });
  });
  await draft.fill("Keep this message.");
  await send.click();
  await expect(mode).toBeDisabled();
  await frame.getByRole("button", { name: "Stop sending", exact: true }).click();
  await expect(draft).toHaveValue("Keep this message.");
  await expect(frame.locator(".mash-composer-status")).toContainText("Sending stopped");
  await expect(mode).toBeEnabled();
  await expect(mode).toContainText("Write");
  await send.click();
  await expect(frame.locator(".mash-composer-status")).toContainText("Your draft is safe");
  await expect(draft).toHaveValue("Keep this message.");
  await expect(mode).toContainText("Write");
  await frame.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(frame.locator("#sent-message")).toHaveText("Keep this message.");
  await expect(draft).toHaveValue("");
  await expect(frame.locator(".mash-composer")).toHaveAttribute("data-sent-mode", "write");
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
  await expect(frame.locator("select")).toHaveCount(0);
  const mode = frame.getByRole("combobox", { name: "Response mode", exact: true });
  await mode.focus();
  await mode.press("ArrowDown");
  await expect(frame.getByRole("listbox", { name: "Response mode", exact: true })).toBeVisible();
  await frame.getByRole("option", { name: "Plan", exact: true }).focus();
  await frame.getByRole("option", { name: "Plan", exact: true }).press("Enter");
  await expect(mode).toContainText("Plan");
  await expect(mode).toBeFocused();
  await expect(draft).toHaveValue("One\nTwo\nThree\nFour");
});
