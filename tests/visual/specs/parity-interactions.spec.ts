import { expect, test } from "@playwright/test";

test("chat composer sends typed text, retains line breaks, and rejects blank drafts", async ({
  page,
}) => {
  await page.goto("/components/ui-message-scroller");
  const frame = page.frameLocator('iframe[data-variant="Live conversation"]');
  const input = frame.getByRole("textbox", { name: "Message", exact: true });
  const send = frame.getByRole("button", { name: "Send", exact: true });
  await expect(send).toBeDisabled();
  await input.fill("First line");
  await input.press("Shift+Enter");
  await input.pressSequentially("Second line");
  await send.click();
  await expect(frame.locator("ui-bubble").last()).toHaveText("First line\nSecond line");
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(send).toBeDisabled();
  await input.fill("<script>plain text</script>");
  await input.press("Enter");
  await expect(frame.locator("ui-bubble").last()).toHaveText("<script>plain text</script>");
});

test("virtual history keeps a bounded window and an unread anchor while older rows arrive", async ({
  page,
}) => {
  await page.goto("/components/ui-message-scroller?example=Long%20history");
  const frame = page.frameLocator('iframe[data-variant="Long history"]');
  await frame.getByRole("button", { name: "Jump to unread", exact: true }).click();
  const row = frame.locator('[data-message-id="message-9750"]');
  await expect(row).toBeVisible();
  const before = (await row.boundingBox())!.y;
  await frame.getByRole("button", { name: "Load 100 earlier", exact: true }).click();
  await expect.poll(async () => Math.abs((await row.boundingBox())!.y - before)).toBeLessThan(2);
  expect(await frame.locator("[data-message-id]").count()).toBeLessThan(40);
  const bubble = row.locator("ui-bubble");
  expect(
    await bubble.evaluate(
      (node) =>
        getComputedStyle(node.shadowRoot!.querySelector('[part="content"]')!).backgroundColor,
    ),
  ).not.toBe("rgba(0, 0, 0, 0)");
});

test("dock moves panel content without losing edits and restores saved geometry", async ({
  page,
}) => {
  await page.goto("/components/ui-dock");
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("textbox", { name: "Working notes" }).fill("Keep this after moving");
  await frame.getByRole("button", { name: "Split preview right", exact: true }).click();
  await expect(frame.getByRole("separator")).toHaveCount(1);
  await expect(frame.getByRole("textbox", { name: "Working notes" })).toHaveValue(
    "Keep this after moving",
  );
  await frame.getByRole("button", { name: "Save layout", exact: true }).click();
  await frame.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(frame.getByRole("separator")).toHaveCount(0);
  await frame.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(frame.getByRole("separator")).toHaveCount(1);
  await expect(frame.getByRole("textbox", { name: "Working notes" })).toHaveValue(
    "Keep this after moving",
  );
});

test("color selector changes through the plane and native hex control", async ({ page }) => {
  await page.goto("/components/ui-color-picker");
  const frame = page.frameLocator("iframe.stage-frame");
  const hex = frame.getByRole("textbox", { name: "Hex color" });
  await hex.fill("#12AB34");
  await hex.press("Tab");
  await expect(frame.locator("#color-value")).toHaveText("#12AB34");
  await frame.locator('[part="plane"]').click({ position: { x: 35, y: 35 } });
  await expect(frame.locator("#color-value")).not.toHaveText("#12AB34");
});

test("editor finds and replaces source using its displayed controls", async ({ page }) => {
  await page.goto("/components/ui-editor");
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Find / replace", exact: true }).click();
  await frame.getByRole("textbox", { name: "Find", exact: true }).fill("Alex");
  await frame.getByRole("textbox", { name: "Replace", exact: true }).fill("Sam");
  await frame.getByRole("button", { name: "Replace all", exact: true }).click();
  await expect(frame.getByRole("textbox", { name: "TypeScript source" })).toHaveValue(
    /greeting\("Sam"\)/,
  );
});
