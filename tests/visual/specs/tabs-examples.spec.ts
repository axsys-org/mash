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

for (const theme of ["light", "dark"]) {
  test(`document tabs slide and cancel cleanly in ${theme}`, async ({ page }, testInfo) => {
    await page.goto(`/components/ui-tabs?example=Dynamic%20tabs&theme=${theme}`, {
      waitUntil: "domcontentloaded",
    });
    const frame = page.frameLocator("iframe.stage-frame");
    const notes = frame.getByRole("tab", { name: "Notes", exact: true });
    const tasks = frame.getByRole("tab", { name: "Tasks", exact: true });
    await frame
      .getByRole("textbox", { name: "Your notes" })
      .fill("A retained draft while rearranging.");
    for (let index = 0; index < 3; index++)
      await frame.getByRole("button", { name: "Add document", exact: true }).click();
    await notes.click();
    const before = await notes.boundingBox();
    const sibling = await tasks.boundingBox();
    await page.mouse.move(before!.x + 30, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(sibling!.x + sibling!.width - 8, sibling!.y + sibling!.height / 2, {
      steps: 14,
    });
    await expect(frame.locator("#documents > ui-tab[data-dragging]")).toHaveAttribute(
      "value",
      "notes",
    );
    await expect.poll(async () => (await tasks.boundingBox())!.x).toBeLessThan(sibling!.x - 40);
    expect((await notes.boundingBox())!.x).toBeGreaterThan(before!.x + 40);
    await page.screenshot({ path: testInfo.outputPath(`tabs-drag-${theme}.png`) });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(frame.locator("#documents > ui-tab").first()).toHaveAttribute("value", "notes");
    await expect(frame.locator("#documents > ui-tab[data-dragging]")).toHaveCount(0);
    await expect(frame.getByRole("textbox", { name: "Your notes" })).toHaveValue(
      "A retained draft while rearranging.",
    );
    await expect
      .poll(async () => Math.abs((await notes.boundingBox())!.x - before!.x))
      .toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath(`tabs-rest-${theme}.png`) });
    const end = await tasks.boundingBox();
    await page.mouse.move(before!.x + 30, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(end!.x + end!.width - 8, end!.y + end!.height / 2, { steps: 14 });
    await page.mouse.up();
    await expect(frame.locator("#documents > ui-tab").first()).toHaveAttribute("value", "tasks");
    await expect(notes).toHaveAttribute("aria-selected", "true");
  });
}

test("overflow fades follow scrolling and its Mash menu reaches every file", async ({
  page,
}, testInfo) => {
  await page.goto("/components/ui-tabs?example=Overflow&theme=dark", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  const list = frame.getByRole("tablist", { name: "Open files" });
  await expect(list).toBeVisible();
  const restingHeight = (await page.locator("iframe.stage-frame").boundingBox())!.height;
  const initialMask = await list.evaluate((element) => getComputedStyle(element).maskImage);
  expect(initialMask).toContain("rgba(0, 0, 0, 0)");
  await frame.getByRole("button", { name: "Choose tab in Open files", exact: true }).click();
  const last = frame.getByRole("menuitemradio", {
    name: "Document 12 with a longer name",
    exact: true,
  });
  await expect(last).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tabs-overflow-menu.png") });
  await last.click();
  await expect(
    frame.getByRole("tab", { name: "Document 12 with a longer name", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    frame.getByRole("textbox", { name: "Document 12 title", exact: true }),
  ).toBeVisible();
  await expect.poll(async () => list.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect(await list.evaluate((element) => getComputedStyle(element).maskImage)).not.toBe(
    initialMask,
  );
  expect(await frame.locator("select").count()).toBe(0);
  await expect(
    frame.getByRole("tab", { name: "Document 12 with a longer name", exact: true }),
  ).toBeFocused();
  await expect
    .poll(async () => (await page.locator("iframe.stage-frame").boundingBox())!.height)
    .toBeLessThanOrEqual(restingHeight + 1);
});
