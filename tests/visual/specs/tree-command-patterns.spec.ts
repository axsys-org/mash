import { expect, test, type Page } from "@playwright/test";

async function example(page: Page, component: string, name: string) {
  await page.goto(`/components/${component}?example=${encodeURIComponent(name)}`, {
    waitUntil: "domcontentloaded",
  });
  return page.frameLocator("iframe.stage-frame");
}

test("tree collapses by pointer and keyboard while retaining branch and draft state", async ({
  page,
}, testInfo) => {
  const frame = await example(page, "ui-tree", "Tree");
  const project = frame.getByRole("treeitem", { name: "Project", exact: true });
  const source = frame.getByRole("treeitem", { name: "src", exact: true });
  const app = frame.getByRole("treeitem", { name: "app.ts", exact: true });
  await expect(app).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("tree-expanded.png"), fullPage: true });
  await app.click();
  await frame.getByRole("textbox", { name: "File content" }).fill("My retained edit");
  await project.click();
  await expect(source).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("tree-collapsed.png"), fullPage: true });
  await project.press("ArrowRight");
  await expect(source).toBeVisible();
  await expect(app).toBeVisible();
  await app.click();
  await expect(frame.getByRole("textbox", { name: "File content" })).toHaveValue(
    "My retained edit",
  );
  await source.click();
  await expect(app).toBeHidden();
  await project.click();
  await project.press("ArrowRight");
  await expect(source).toBeVisible();
  await expect(app).toBeHidden();
  await source.press("ArrowRight");
  await expect(app).toBeVisible();
});

test("tree reveal opens every ancestor after collapse all", async ({ page }) => {
  const frame = await example(page, "ui-tree", "Expand and reveal");
  await frame.getByRole("button", { name: "Collapse all" }).click();
  await expect(frame.getByRole("treeitem", { name: "theme.css", exact: true })).toBeHidden();
  await frame.getByRole("button", { name: "Reveal theme.css" }).click();
  await expect(frame.getByRole("treeitem", { name: "theme.css", exact: true })).toBeFocused();
  await expect(frame.locator("#tree-result")).toContainText("Project / src / theme.css");
});

test("command search runs real actions, preserves drafts, and recovers from an empty query", async ({
  page,
}, testInfo) => {
  const frame = await example(page, "ui-command", "Commands");
  const query = frame.getByRole("combobox", { name: "Quick actions" });
  const editor = frame.getByRole("textbox", { name: "Document content" });
  await expect(frame.getByRole("group", { name: "Documents", exact: true })).toBeVisible();
  const list = frame.getByRole("listbox", { name: "Quick actions" });
  await expect
    .poll(() => list.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("command-grouped.png"), fullPage: true });
  await editor.fill("Keep this edit");
  await query.fill("release roadmap");
  await expect(frame.getByRole("group", { name: "Workspace", exact: true })).toBeHidden();
  await query.press("Enter");
  await expect(frame.locator("#document-title")).toHaveText("Release plan");
  await query.fill("meeting");
  await query.press("Enter");
  await expect(editor).toHaveValue("Keep this edit");
  await query.fill("readonly");
  await query.press("Enter");
  await expect(editor).toHaveAttribute("readonly", "");
  await query.fill("missing command");
  await expect(frame.getByText("No matching commands", { exact: true })).toBeVisible();
  await frame.getByRole("button", { name: "Clear search" }).click();
  await expect(query).toBeFocused();
  await query.press("Tab");
  await expect(editor).toBeFocused();
  await query.fill("create document");
  await query.press("Enter");
  await expect(frame.locator("#document-title")).toHaveText("Untitled 1");
  await expect(editor).toHaveValue("");
});

test("command dialog uses shared shortcuts and closes after running an action", async ({
  page,
}, testInfo) => {
  const frame = await example(page, "ui-command", "Command dialog");
  const trigger = frame.getByRole("button", { name: /Open commands/ });
  await trigger.click();
  const query = frame.getByRole("combobox", { name: "Quick actions" });
  await expect(query).toBeFocused();
  await expect(frame.locator("ui-dialog:state(active)")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("command-dialog-open.png"), fullPage: true });
  await query.press("Tab");
  await expect(query).toBeFocused();
  await query.press("Shift+Tab");
  await expect(query).toBeFocused();
  await query.fill("create document");
  await query.press("Enter");
  await expect(query).toBeHidden();
  await expect(frame.locator("#document-title")).toHaveText("Untitled 1");
  await frame.getByRole("textbox", { name: "Document content" }).press("ControlOrMeta+k");
  await expect(query).toBeVisible();
  await expect(query).toBeFocused();
  await expect(query).toHaveValue("create document");
  await query.press("Escape");
  await expect(query).toHaveValue("");
  await expect(query).toBeVisible();
  await query.press("Escape");
  await expect(query).toBeHidden();
});
