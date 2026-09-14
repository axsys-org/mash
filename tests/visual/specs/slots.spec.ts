import { expect, test } from "@playwright/test";

test("dialog slots retain focus entry, dismissal, and focus restoration", async ({ page }) => {
  await page.goto("/components/ui-dialog");
  const stage = page.frameLocator("iframe.stage-frame");
  const trigger = stage.getByRole("button", { name: "Edit project", exact: true });
  await trigger.click();
  await expect(stage.getByRole("dialog", { name: "Edit project", exact: true })).toBeVisible();
  await stage.getByRole("textbox", { name: "Project name" }).fill("Website");
  await page.keyboard.press("Escape");
  await expect(stage.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("settings use native submission and reset with form-associated controls", async ({ page }) => {
  await page.goto("/components/ui-form?example=Settings");
  const stage = page.frameLocator("iframe.stage-frame");
  const digest = stage.getByRole("switch", { name: "Weekly digest", exact: true });
  await digest.click();
  await expect(digest).toBeChecked();
  await stage.getByRole("button", { name: "Save preferences" }).click();
  await expect(stage.locator("#settings-result")).toHaveText("Saved · system");
  await stage.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(digest).not.toBeChecked();
});

test("description lists retain native term and definition semantics", async ({ page }) => {
  await page.goto("/components/ui-card?example=Description%20list");
  const stage = page.frameLocator("iframe.stage-frame");
  await expect(stage.getByRole("term")).toHaveCount(4);
  await expect(stage.getByRole("definition")).toHaveCount(4);
  await expect(stage.getByRole("img", { name: "Alex", exact: true })).toBeVisible();
});

test("persistent alerts can be dismissed without changing their siblings", async ({ page }) => {
  await page.goto("/components/ui-alert");
  const stage = page.frameLocator("iframe.stage-frame");
  await stage.getByRole("button", { name: "Dismiss alert" }).first().click();
  await expect(stage.locator("ui-alert").first()).toBeHidden();
  await expect(stage.locator("ui-alert").nth(1)).toBeVisible();
});

test("command list can omit search while retaining arrow-key selection", async ({ page }) => {
  await page.goto("/components/ui-command?example=Selectable%20list");
  const stage = page.frameLocator("iframe.stage-frame");
  await expect(stage.getByRole("combobox")).toHaveCount(0);
  const list = stage.getByRole("listbox", { name: "Recent files" });
  await list.focus();
  await page.keyboard.press("ArrowDown");
  // Playwright's role locator does not inspect ElementInternals; verify the browser AX tree.
  const session = await page.context().newCDPSession(page);
  const { root } = await session.send("DOM.getDocument");
  const { nodeId } = await session.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: "iframe.stage-frame",
  });
  const { node: iframeNode } = await session.send("DOM.describeNode", { nodeId });
  const { nodes } = await session.send("Accessibility.getFullAXTree", {
    frameId: iframeNode.frameId!,
  });
  expect(
    nodes.some(
      (node) =>
        node.role?.value === "option" &&
        node.name?.value === "Meeting notes Decisions from the design review",
    ),
  ).toBe(true);
  await session.detach();
  await expect(stage.locator('ui-command-item[value="notes"]')).toHaveAttribute("selected", "");
});

test("menu destinations remain real anchors with disabled destinations removed", async ({
  page,
}) => {
  await page.goto("/components/ui-menu?example=Navigation%20links");
  const stage = page.frameLocator("iframe.stage-frame");
  await stage.getByRole("button", { name: "Resources", exact: true }).click();
  const docs = stage.getByRole("menuitem", { name: "Documentation", exact: true });
  await expect(docs).toHaveAttribute("href", "https://example.com");
  await expect(docs).toHaveAttribute("target", "_blank");
  await expect(stage.getByRole("menuitem", { name: "Archive unavailable" })).not.toHaveAttribute(
    "href",
  );
});
