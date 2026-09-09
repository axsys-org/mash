import { expect, test } from "@playwright/test";

test("reordering and undo preserve an edited document", async ({ page }) => {
  await page.goto("/components/ui-tabs?example=Rearrangeable", { waitUntil: "domcontentloaded" });
  const frame = page.frameLocator("iframe.stage-frame");
  const draft = frame.getByRole("textbox", { name: "Notes", exact: true });
  await draft.fill("Keep this unsaved draft through every move.");
  const order = frame.locator('#reorder-tabs > ui-tab[slot="tab"]');
  await frame.getByRole("tab", { name: "Notes", exact: true }).press("Alt+Shift+ArrowRight");
  await expect(order).toHaveText(["Tasks", "Notes", "Plan", "Archive"]);
  await expect(draft).toHaveValue("Keep this unsaved draft through every move.");
  await expect(frame.getByRole("tab", { name: "Notes", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await frame.getByRole("button", { name: "Undo move", exact: true }).click();
  await expect(order).toHaveText(["Notes", "Tasks", "Plan", "Archive"]);
  await expect(draft).toHaveValue("Keep this unsaved draft through every move.");
  await expect(frame.getByRole("button", { name: "Undo move", exact: true })).toBeDisabled();
});

test("closing and reopening a document restores its existing textarea", async ({ page }) => {
  await page.goto("/components/ui-tabs?example=Dynamic%20tabs", { waitUntil: "domcontentloaded" });
  const frame = page.frameLocator("iframe.stage-frame");
  const draft = frame.getByRole("textbox", { name: "Your notes", exact: true });
  await draft.fill("A draft worth keeping.");
  const original = await draft.elementHandle();
  await frame.getByRole("button", { name: "Close Notes", exact: true }).click();
  await expect(frame.getByRole("tab", { name: "Notes", exact: true })).toHaveCount(0);
  expect(await original!.evaluate((node) => node.isConnected)).toBe(false);
  await frame.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(draft).toHaveValue("A draft worth keeping.");
  expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
  await expect(frame.getByRole("tab", { name: "Notes", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(frame.getByRole("button", { name: "Reopen", exact: true })).toBeDisabled();
});

test("adjacent navigation actions switch panels without resetting edits", async ({ page }) => {
  await page.goto("/components/ui-tabs?example=Adjacent%20controls", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  const account = frame.getByRole("textbox", { name: "Account name", exact: true });
  await account.fill("Studio workspace");
  await frame.getByRole("button", { name: "Next tab", exact: true }).click();
  await expect(frame.getByRole("tab", { name: "Profile", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const profile = frame.getByRole("textbox", { name: "Display name", exact: true });
  await profile.fill("Taylor");
  await frame.getByRole("button", { name: "Next tab", exact: true }).click();
  await expect(frame.getByRole("tab", { name: "Settings", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await frame.getByRole("button", { name: "Previous tab", exact: true }).click();
  await expect(profile).toHaveValue("Taylor");
  await frame.getByRole("button", { name: "First tab", exact: true }).click();
  await expect(account).toHaveValue("Studio workspace");
});
