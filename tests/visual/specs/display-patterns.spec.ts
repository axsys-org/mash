import { expect, test } from "@playwright/test";

test("upload lifecycle can pause, reset, and switch to an unknown total", async ({ page }) => {
  await page.goto("/components/ui-progress?example=Upload%20lifecycle");
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Start", exact: true }).click();
  await expect(frame.locator("#upload-percent")).not.toHaveText("25%");
  await frame.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(frame.getByRole("button", { name: "Resume", exact: true })).toBeEnabled();
  await frame.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(frame.locator("#upload-percent")).toHaveText("0%");
  await frame.getByRole("switch", { name: "Unknown total", exact: true }).click();
  await expect(
    frame.getByRole("progressbar", { name: "Asset upload", exact: true }),
  ).not.toHaveAttribute("aria-valuenow");
  await expect(frame.locator("#upload-status")).toHaveText("Calculating the total…");
});

test("image errors recover through the real fallback source", async ({ page }) => {
  await page.goto("/components/ui-image?example=Failure%20and%20recovery");
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Fail image", exact: true }).click();
  await expect(frame.locator("#image-status")).toHaveText("Image unavailable");
  await frame.getByRole("button", { name: "Recover with fallback", exact: true }).click();
  await expect(frame.locator("#image-status")).toHaveText("Fallback image loaded");
  await frame.getByRole("button", { name: "Retry original", exact: true }).click();
  await expect(frame.locator("#image-status")).toHaveText("Original image loaded");
});

test("resizable actions resolve constraints and visibility preserves draft state", async ({
  page,
}) => {
  await page.goto("/components/ui-resizable?example=Programmatic%20resize");
  let frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Compact left", exact: true }).click();
  await expect(frame.locator("#sized-panels > ui-resizable-panel").first()).toHaveAttribute(
    "size",
    "100",
  );
  await frame.getByRole("button", { name: "Reset left", exact: true }).click();
  await expect(frame.locator("#sized-panels > ui-resizable-panel").first()).toHaveAttribute(
    "size",
    "180",
  );
  await page.goto("/components/ui-resizable?example=Fixed%20and%20growing%20panels");
  frame = page.frameLocator("iframe.stage-frame");
  const draft = frame.getByRole("textbox", { name: "Inspector notes", exact: true });
  await draft.fill("Keep this note through layout changes.");
  await frame.getByRole("switch", { name: "Show left panel", exact: true }).click();
  await expect(frame.locator("#flex-left")).toBeHidden();
  await frame.getByRole("switch", { name: "Keep right panel fixed", exact: true }).click();
  await expect(draft).toHaveValue("Keep this note through layout changes.");
});

test("notification actions restore state and keyed updates reuse one message", async ({ page }) => {
  await page.goto("/components/ui-toast?example=Undo%20action");
  let frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Archive note", exact: true }).click();
  await frame.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(frame.locator("#note-state")).toHaveText("Note restored.");
  await expect(frame.getByRole("button", { name: "Archive note", exact: true })).toBeEnabled();
  await page.goto("/components/ui-toast?example=Keyed%20updates");
  frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Update upload", exact: true }).click();
  await frame.getByRole("button", { name: "Update upload", exact: true }).click();
  await expect(frame.locator("#job-notices > ui-toast")).toHaveCount(1);
  await expect(frame.locator("#job-result")).toHaveText("Updated upload · 2");
  await frame.getByRole("button", { name: "Update index", exact: true }).click();
  await expect(frame.locator("#job-notices > ui-toast")).toHaveCount(2);
  await frame.getByRole("button", { name: "Dismiss all", exact: true }).click();
  await expect(frame.locator("#job-notices > ui-toast")).toHaveCount(0);
});

test("workspace navigation updates content without remounting its draft", async ({ page }) => {
  await page.goto("/components/ui-navigation-menu?example=Workspace%20navigation");
  const frame = page.frameLocator("iframe.stage-frame");
  const draft = frame.getByRole("textbox", { name: "Workspace draft", exact: true });
  await draft.fill("A local draft that stays mounted.");
  await frame.getByRole("link", { name: "Documentation", exact: true }).click();
  await expect(frame.locator("#destination-title")).toHaveText("Documentation");
  await frame.getByRole("switch", { name: "Right side", exact: true }).click();
  await expect(draft).toHaveValue("A local draft that stays mounted.");
  await frame.getByRole("switch", { name: "Show another project", exact: true }).click();
  await frame.getByRole("link", { name: "Release notes", exact: true }).click();
  await expect(frame.locator("#destination-title")).toHaveText("Release notes");
});

test("toolbar status counts words and saves the edited document", async ({ page }) => {
  await page.goto("/components/ui-toolbar?example=Status%20bar");
  const frame = page.frameLocator("iframe.stage-frame");
  await frame
    .getByRole("textbox", { name: "Status document", exact: true })
    .fill("Three useful words");
  await frame.getByRole("button", { name: "3 words", exact: true }).click();
  await expect(frame.locator("#status-result")).toHaveText("3 words · 18 characters");
  await frame.getByRole("button", { name: "Save now", exact: true }).click();
  await expect(frame.locator("#save-state")).toHaveText("Saved");
});

test("marker completion reveals a draft and restart preserves its value", async ({ page }) => {
  await page.goto("/components/ui-marker?example=Loading%20and%20actions");
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Complete", exact: true }).click();
  await frame.getByRole("button", { name: "Open draft", exact: true }).click();
  const draft = frame.getByRole("textbox", { name: "Prepared draft", exact: true });
  await draft.fill("A revised response.");
  await frame.getByRole("button", { name: "Restart", exact: true }).click();
  await frame.getByRole("button", { name: "Complete", exact: true }).click();
  await frame.getByRole("button", { name: "Open draft", exact: true }).click();
  await expect(draft).toHaveValue("A revised response.");
});
