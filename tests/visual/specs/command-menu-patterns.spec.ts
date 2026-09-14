import { expect, test, type Page } from "@playwright/test";

async function example(page: Page, name: string) {
  await page.goto(`/components/ui-command?example=${encodeURIComponent(name)}`);
  const host = page.locator(`iframe[data-variant="${name}"]`);
  await host.scrollIntoViewIfNeeded();
  const frame = host.contentFrame();
  await expect(frame.locator("html")).toHaveAttribute("data-example-ready", "true");
  return frame;
}

test("tabs and sorting compose with command search while document drafts survive actions", async ({
  page,
}) => {
  const frame = await example(page, "Command menu");
  const search = frame.getByRole("combobox", { name: "Workspace commands" });
  await frame.getByRole("textbox", { name: "Page content" }).fill("Keep my draft");
  await frame.getByRole("tab", { name: "Actions", exact: true }).click();
  await expect(frame.getByRole("option", { name: "Team notes", exact: true })).toHaveCount(0);
  await expect(frame.getByRole("option", { name: "New document", exact: true })).toBeVisible();
  await search.fill("clipboard");
  await search.press("Enter");
  await expect(frame.locator("#page-title")).toHaveText("Team notes copy");
  await expect(frame.getByRole("textbox", { name: "Page content" })).toHaveValue("Keep my draft");
  await frame.getByRole("tab", { name: "Go to", exact: true }).click();
  await search.fill("release");
  await search.press("Enter");
  await expect(frame.locator("#page-title")).toHaveText("Release plan");
  await search.fill("");
  await frame.locator("#command-sort").getByRole("combobox").click();
  await frame.getByRole("option", { name: "Name A–Z", exact: true }).click();
  await expect(frame.locator("#menu ui-command-item").first()).toHaveAttribute("value", "settings");
});

test("recent suggestions appear only once and recover after an empty result", async ({ page }) => {
  const frame = await example(page, "Suggestions and recents");
  const search = frame.getByRole("combobox", { name: "Workspace commands" });
  await frame.getByRole("option", { name: "Preferences", exact: true }).click();
  await expect(
    frame.getByRole("group", { name: "Recently used" }).locator("ui-command-item").first(),
  ).toHaveAttribute("value", "settings");
  await expect(frame.locator('ui-command-item[value="settings"]')).toHaveCount(1);
  await search.fill("no such command");
  await expect(frame.getByText("No matches. Try a page name or an action.")).toBeVisible();
  await search.press("Escape");
  await expect(frame.getByRole("group", { name: "Recently used" })).toBeVisible();
});

test("global dialog shortcut changes, dismisses a populated search, and restores focus", async ({
  page,
}) => {
  const frame = await example(page, "Global shortcut dialog");
  const editor = frame.getByRole("textbox", { name: "Page content" });
  const search = frame.getByRole("combobox", { name: "Workspace commands" });
  await editor.press("ControlOrMeta+k");
  await expect(search).toBeFocused();
  await search.fill("new");
  await search.press("Escape");
  await expect(search).toBeHidden();
  await expect(editor).toBeFocused();
  await frame.locator("#shortcut-choice").getByRole("combobox").click();
  await frame.getByRole("option", { name: "Primary + P", exact: true }).click();
  await editor.press("ControlOrMeta+p");
  await expect(search).toBeFocused();
  await search.press("Enter");
  await expect(search).toBeHidden();
  await expect(frame.locator("#page-title")).toHaveText("Untitled 1");
  await frame.getByRole("switch", { name: "Keep open after selection" }).click();
  await editor.press("ControlOrMeta+p");
  await search.fill("release");
  await search.press("Enter");
  await expect(search).toBeVisible();
  await expect(frame.locator("#page-title")).toHaveText("Release plan");
});

test("custom rows search original data and size context resizes the moving highlight", async ({
  page,
}) => {
  let frame = await example(page, "Custom rows and filtering");
  const search = frame.getByRole("combobox", { name: "Workspace commands" });
  await search.fill("engineering available");
  await expect(frame.getByRole("option", { name: "Maya Chen", exact: true })).toBeVisible();
  await expect(frame.getByRole("option", { name: "Sam Rivera", exact: true })).toBeHidden();
  await search.press("Enter");
  await expect(frame.locator("#owner-name")).toHaveText("Maya Chen");
  frame = await example(page, "Sizes and CSS parts");
  const row = frame.locator("ui-command-item").first();
  await expect.poll(async () => Math.round((await row.boundingBox())!.height)).toBe(36);
  await frame.getByRole("switch", { name: "Compact context" }).click();
  await expect.poll(async () => Math.round((await row.boundingBox())!.height)).toBe(28);
  const highlight = frame.locator("ui-command").locator('[part="highlight"]');
  await expect.poll(async () => Math.round((await highlight.boundingBox())!.height)).toBe(28);
  await frame.locator("ui-command").evaluate((element) => {
    element.style.transform = "scale(.85)";
    (element as HTMLElement & { highlight(value: string): boolean }).highlight("new");
  });
  await expect
    .poll(async () =>
      Math.abs((await highlight.boundingBox())!.width - (await row.boundingBox())!.width),
    )
    .toBeLessThan(1);
  await expect
    .poll(async () => Math.abs((await highlight.boundingBox())!.y - (await row.boundingBox())!.y))
    .toBeLessThan(1);
});
