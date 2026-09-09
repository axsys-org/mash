import { expect, test, type Page } from "@playwright/test";

async function example(page: Page, component: string, name: string) {
  await page.goto(`/components/${component}?example=${encodeURIComponent(name)}`, {
    waitUntil: "domcontentloaded",
  });
  return page.frameLocator("iframe.stage-frame");
}

test("document menu mutates local records and its nested export produces real content", async ({
  page,
}) => {
  const frame = await example(page, "ui-menu", "Document actions");
  const trigger = frame.getByRole("button", { name: "Document actions", exact: true });
  await trigger.click();
  await frame.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(frame.locator("#document-list li")).toHaveCount(2);
  await trigger.click();
  await frame.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(frame.locator("#document-list li").first()).toHaveText("Project brief · Archived");
  await trigger.click();
  await frame.getByRole("menuitem", { name: "Export", exact: true }).focus();
  await frame.getByRole("menuitem", { name: "Export", exact: true }).press("ArrowRight");
  await frame.getByRole("menuitem", { name: "JSON", exact: true }).click();
  await expect(frame.locator("#document-export")).toContainText('"archived": true');
  await expect(frame.locator("#document-export")).toContainText("Project brief copy 1");
  await frame.getByRole("button", { name: "Reset documents" }).click();
  await expect(frame.locator("#document-list li")).toHaveCount(1);
  await expect(frame.locator("#document-export")).toBeHidden();
});

test("checked menu state changes the visible view and survives reopening", async ({ page }) => {
  const frame = await example(page, "ui-menu", "Checked view preferences");
  const trigger = frame.getByRole("button", { name: "View preferences", exact: true });
  await trigger.click();
  await frame.getByRole("menuitemcheckbox", { name: "Show descriptions" }).click();
  await expect(frame.locator("[data-description]").first()).toBeHidden();
  await trigger.click();
  await expect(frame.getByRole("menuitemcheckbox", { name: "Show descriptions" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await frame.getByRole("menuitemradio", { name: "Compact", exact: true }).click();
  await expect(frame.locator("#view-result")).toHaveText("Compact · descriptions hidden");
  await trigger.click();
  await expect(frame.getByRole("menuitemradio", { name: "Compact", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(
    frame.getByRole("menuitemradio", { name: "Comfortable", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
});

test("rich menu labels stay single actions and update their working context", async ({ page }) => {
  const frame = await example(page, "ui-menu", "Rich command rows");
  await frame.getByRole("button", { name: "Choose workspace", exact: true }).click();
  const studio = frame.locator('ui-menu-item[value="studio"]');
  const studioBounds = await studio.getByRole("menuitem").boundingBox();
  const archiveBounds = await frame
    .locator("#workspace-switcher ui-menu-item[disabled]")
    .getByRole("menuitem")
    .boundingBox();
  expect(studioBounds).not.toBeNull();
  expect(archiveBounds).not.toBeNull();
  expect(studioBounds!.y + studioBounds!.height).toBeLessThanOrEqual(archiveBounds!.y + 1);
  await studio.getByRole("menuitem").click();
  await expect(frame.locator("#workspace-name")).toHaveText("Studio workspace");
  await expect(frame.locator("#workspace-description")).toHaveText("Shared with your design team.");
});

test("context actions work through both pointer and keyboard invocation", async ({ page }) => {
  const frame = await example(page, "ui-context-menu", "Context actions");
  const target = frame.locator("#context-file");
  await target.click({ button: "right", position: { x: 70, y: 40 } });
  await frame.getByRole("menuitemcheckbox", { name: "Pin document" }).click();
  await expect(frame.locator("#context-file-state")).toHaveText("Pinned · draft");
  await target.focus();
  await target.press("Shift+F10");
  await frame.getByRole("menuitem", { name: "Mark complete" }).click();
  await expect(frame.locator("#context-file-state")).toHaveText("Pinned · complete");
  await target.focus();
  await target.press("Shift+F10");
  await frame.getByRole("menuitem", { name: "Reset document" }).click();
  await expect(frame.locator("#context-file-state")).toHaveText("Unpinned · draft");
});

test("edit dialog retains invalid form and commits only saved values", async ({ page }) => {
  const frame = await example(page, "ui-dialog", "Validated edit");
  const trigger = frame.getByRole("button", { name: "Edit details", exact: true });
  await trigger.click();
  const input = frame.getByRole("textbox", { name: "Project name", exact: true });
  await input.fill("");
  await frame.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(frame.getByRole("dialog", { name: "Project details", exact: true })).toBeVisible();
  await input.fill("Updated project");
  await frame.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(frame.locator("#saved-project-name")).toHaveText("Updated project");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await input.fill("Unsaved change");
  await frame.getByRole("button", { name: "Cancel editing" }).click();
  await expect(frame.locator("#saved-project-name")).toHaveText("Updated project");
});

test("dialog dismissal policy and nested confirmation retain or discard the draft", async ({
  page,
}) => {
  const frame = await example(page, "ui-dialog", "Dismissal and nested dialogs");
  await frame.getByRole("switch", { name: "Escape closes", exact: true }).click();
  await frame.getByRole("button", { name: "Open working draft" }).click();
  const notes = frame.getByRole("textbox", { name: "Draft notes" });
  await notes.fill("Keep until confirmed");
  await notes.press("Escape");
  await expect(notes).toBeVisible();
  await frame.getByRole("button", { name: "Discard draft", exact: true }).click();
  await frame.getByRole("button", { name: "Keep draft", exact: true }).click();
  await expect(notes).toHaveValue("Keep until confirmed");
  await frame.getByRole("button", { name: "Discard draft", exact: true }).click();
  await frame.getByRole("button", { name: "Confirm discard", exact: true }).click();
  await expect(frame.locator("#dialog-policy-result")).toHaveText("Draft discarded.");
  await frame.getByRole("button", { name: "Open working draft" }).click();
  await expect(notes).toHaveValue("");
});

test("popover settings update the preview without closing the surface", async ({ page }) => {
  const frame = await example(page, "ui-popover", "Live display settings");
  await frame.getByRole("button", { name: "Display settings", exact: true }).click();
  await frame.getByRole("switch", { name: "Show description", exact: true }).click();
  await expect(frame.locator("#settings-preview-description")).toBeHidden();
  const slider = frame.getByRole("slider", { name: "Text emphasis" });
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(frame.locator("#settings-result")).toHaveText(
    "Description hidden · text weight 500",
  );
  await expect(frame.getByRole("button", { name: "Done", exact: true })).toBeVisible();
  await frame.getByRole("button", { name: "Done", exact: true }).click();
  await expect(frame.getByRole("button", { name: "Done", exact: true })).toBeHidden();
});

test("async confirmation stays open on failure and closes after successful retry", async ({
  page,
}) => {
  const frame = await example(page, "ui-alert-dialog", "Async confirmation");
  await frame.getByRole("button", { name: "Archive local draft", exact: true }).click();
  await frame.getByRole("button", { name: "Archive draft", exact: true }).click();
  await expect(frame.locator("#archive-progress")).toHaveText(
    "The first attempt failed. Retry to finish.",
  );
  await expect(frame.locator("#archive-state")).toHaveText("Draft is active.");
  await frame.getByRole("button", { name: "Retry archive", exact: true }).click();
  await expect(frame.locator("#archive-state")).toHaveText("Draft archived.");
  await expect(
    frame.getByRole("button", { name: "Archive local draft", exact: true }),
  ).toBeFocused();
  await frame.getByRole("button", { name: "Reset draft", exact: true }).click();
  await expect(frame.locator("#archive-state")).toHaveText("Draft is active.");
});
