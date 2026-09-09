import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const location = process.env.MASH_STUDIO_HARNESS ?? "/stories/studio";
test.beforeEach(async ({ page }) => {
  await page.goto(location);
  await expect(page.locator(".studio [data-dock]")).toBeVisible();
  await expect(page.getByRole("treeitem", { name: "demo.js", exact: true })).toBeVisible();
});

test("file operations retain buffers through rename, close, reopen and reload", async ({
  page,
}) => {
  await page.getByRole("button", { name: "New file", exact: true }).click();
  await page.locator("[data-modal-input]").fill("src/review.js");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  let source = page.getByRole("textbox", { name: "src/review.js", exact: true });
  await source.fill('console.log("A retained draft");');
  await page.locator('.studio [data-command="file-actions"]').click();
  await page
    .getByRole("combobox", { name: "Workspace commands", exact: true })
    .fill("Rename or move");
  await page.getByRole("combobox", { name: "Workspace commands", exact: true }).press("Enter");
  await page.locator("[data-modal-input]").fill("src/renamed.js");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  source = page.getByRole("textbox", { name: "src/renamed.js", exact: true });
  await expect(source).toHaveValue('console.log("A retained draft");');
  await page.getByRole("button", { name: "Close renamed.js •", exact: true }).click();
  await expect(source).toBeHidden();
  await page.getByRole("button", { name: "Reopen closed file", exact: true }).click();
  await expect(source).toHaveValue('console.log("A retained draft");');
  await page.reload();
  await expect(page.getByRole("textbox", { name: "src/renamed.js", exact: true })).toHaveValue(
    'console.log("A retained draft");',
  );
});

test("workspace search replaces real matches and undo restores both files and diff", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Search files", exact: true }).click();
  await page.getByRole("textbox", { name: "Search files", exact: true }).fill("Project");
  await expect(page.locator("[data-search-count]")).not.toHaveText("0 matches");
  await page.getByRole("textbox", { name: "Replace with", exact: true }).fill("Workspace");
  await page.getByRole("button", { name: "Replace all", exact: true }).click();
  await page
    .locator("[data-file-dialog]")
    .getByRole("button", { name: "Replace all", exact: true })
    .click();
  await expect(page.locator("[data-search-count]")).toHaveText("0 matches");
  await page
    .locator('[data-view="search"]')
    .getByRole("button", { name: "Undo workspace edit", exact: true })
    .click();
  await expect(page.locator("[data-search-count]")).not.toHaveText("0 matches");
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await page.getByRole("treeitem", { name: "demo.js", exact: true }).click();
  await page.getByRole("textbox", { name: "demo.js", exact: true }).fill('console.log("Changed");');
  await page.getByRole("button", { name: "Changes", exact: true }).click();
  await expect(page.locator(".studio-diff-add")).toContainText('console.log("Changed");');
  await page.locator('[data-tools] [data-command="save"]').click();
  await expect(page.locator("[data-diff]")).toContainText("matches its saved baseline");
});

test("JavaScript produces real output and an infinite worker can be stopped", async ({ page }) => {
  await page.getByRole("treeitem", { name: "demo.js", exact: true }).click();
  await page.getByRole("button", { name: "Run file", exact: true }).click();
  await expect(page.locator("[data-output]")).toContainText("18 tasks completed.");
  await expect(page.locator("[data-runtime-state]")).toHaveText("Execution completed.");
  await page
    .getByRole("textbox", { name: "demo.js", exact: true })
    .fill('console.log("Loop started"); while (true) {}');
  await page.getByRole("button", { name: "Run file", exact: true }).click();
  await expect(page.locator("[data-output]")).toContainText("Loop started");
  await page.getByRole("button", { name: "Stop execution", exact: true }).click();
  await expect(page.locator("[data-runtime-state]")).toHaveText("Stopped · isolated worker");
  await page
    .getByRole("textbox", { name: "demo.js", exact: true })
    .fill('console.log("Run again");');
  await page.getByRole("button", { name: "Run file", exact: true }).click();
  await expect(page.locator("[data-output]")).toContainText("Run again");
});

test("HTML preview resolves local styles and scripts inside its sandbox", async ({ page }) => {
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  const preview = page.frameLocator("iframe[data-preview]");
  await expect(
    preview.getByRole("heading", { name: "Make room for something good.", exact: true }),
  ).toBeVisible();
  await preview.getByRole("button", { name: "Add a thought", exact: false }).click();
  await expect(preview.locator("#note")).toHaveText("Start small. Keep going.");
  await expect(page.locator("iframe[data-preview]")).toHaveAttribute("sandbox", "allow-scripts");
  await expect(preview.locator(".card")).toHaveCSS("border-radius", "24px");
});

test("project export contains actual files and current layout", async ({ page }) => {
  await page.locator(".studio-command-trigger").click();
  await page
    .getByRole("combobox", { name: "Workspace commands", exact: true })
    .fill("Export project");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("combobox", { name: "Workspace commands", exact: true }).press("Enter");
  const download = await downloadPromise;
  const project = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(project.version).toBe(1);
  expect(
    project.entries.some(
      (entry: { path: string; content: string }) =>
        entry.path === "demo.js" && entry.content.includes("projects.reduce"),
    ),
  ).toBe(true);
  expect(project.layout.version).toBe(1);
  expect(project.open.length).toBe(3);
});

test("preview and editor preferences use working component choices", async ({ page }) => {
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await page.getByRole("combobox", { name: "Preview device", exact: true }).click();
  await page.getByRole("option", { name: "390px", exact: true }).click();
  await expect(page.locator("iframe[data-preview]")).toHaveCSS("width", "390px");
  await page.getByRole("switch", { name: "Live", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Live", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByRole("combobox", { name: "Editor font size", exact: true }).click();
  await page.getByRole("option", { name: "16px", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "index.html", exact: true })).toHaveCSS(
    "font-size",
    "16px",
  );
});

test("keyboard tab navigation makes commands act on the selected file", async ({ page }) => {
  const indexTab = page.getByRole("tab", { name: "index.html", exact: true });
  await indexTab.focus();
  await indexTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "style.css", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("[data-path]")).toHaveText("src/style.css");
});

test("dialogs manage keyboard focus and Escape returns to their opener", async ({ page }) => {
  const preferences = page.getByRole("button", { name: "Preferences", exact: true });
  await preferences.click();
  await expect(page.getByRole("combobox", { name: "Editor font size", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-preferences]")).not.toHaveAttribute("open");
  await expect(preferences).toBeFocused();

  const newFile = page.getByRole("button", { name: "New file", exact: true });
  await newFile.click();
  await expect(page.locator("[data-modal-input]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-file-dialog]")).not.toHaveAttribute("open");
  await expect(newFile).toBeFocused();

  const commands = page.locator(".studio-command-trigger");
  await commands.click();
  await expect(
    page.getByRole("combobox", { name: "Workspace commands", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-palette-dialog]")).not.toHaveAttribute("open");
  await expect(commands).toBeFocused();
});
