import { expect, test, type Page } from "@playwright/test";

async function example(page: Page, name: string) {
  await page.goto(`/components/ui-sidebar?example=${encodeURIComponent(name)}`);
  const host = page.locator(`iframe[data-variant="${name}"]`);
  await host.scrollIntoViewIfNeeded();
  const frame = host.contentFrame();
  await expect(frame.locator("html")).toHaveAttribute("data-example-ready", "true");
  return frame;
}

test("sidebar navigation preserves document drafts and scoped shortcuts leave typing alone", async ({
  page,
}) => {
  const frame = await example(page, "Nesting and row actions");
  const sidebar = frame.locator("ui-sidebar");
  const notes = frame.getByRole("textbox", { name: "Document notes", exact: true });
  await notes.fill("A draft worth keeping");
  await notes.press("[");
  await expect(sidebar).toHaveJSProperty("expanded", true);
  await frame.getByRole("treeitem", { name: "Navigation study", exact: true }).click();
  await expect(notes).toHaveValue("Start writing here…");
  await frame.getByRole("treeitem", { name: "Release checklist", exact: true }).click();
  await expect(notes).toHaveValue("A draft worth keeping[");
  const toggle = frame.getByRole("button", { name: "Toggle sidebar", exact: true });
  await toggle.press("[");
  await expect(sidebar).toHaveJSProperty("expanded", false);
  await toggle.click();
  await expect(notes).toHaveValue("A draft worth keeping[");
  const shared = frame.locator('ui-tree-item[value="shared"]');
  await shared.locator('[part="disclosure"]').first().click();
  await expect(shared).toHaveJSProperty("expanded", true);
  await shared.locator('[part="disclosure"]').first().click();
  await expect(shared).toHaveJSProperty("expanded", false);
});

test("sidebar rail supports pointer and keyboard resizing on both edges and click collapse", async ({
  page,
}) => {
  const frame = await example(page, "Workspace");
  const sidebar = frame.locator("ui-sidebar");
  const rail = frame.getByRole("separator", { name: "Resize or collapse sidebar" });
  const initial = Number(await rail.getAttribute("aria-valuenow"));
  await rail.hover({ position: { x: 2, y: 80 } });
  const box = (await rail.boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 42, box.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await rail.getAttribute("aria-valuenow")))
    .toBe(initial + 40);
  await rail.press("ArrowRight");
  await expect
    .poll(async () => Number(await rail.getAttribute("aria-valuenow")))
    .toBeGreaterThan(initial + 40);
  await frame.getByRole("combobox", { name: "Side", exact: true }).click();
  await frame.getByRole("option", { name: "Right", exact: true }).click();
  const rightWidth = Number(await rail.getAttribute("aria-valuenow"));
  await rail.press("ArrowLeft");
  await expect
    .poll(async () => Number(await rail.getAttribute("aria-valuenow")))
    .toBeGreaterThan(rightWidth);
  await rail.click();
  await expect(sidebar).toHaveJSProperty("expanded", false);
  await expect(frame.getByRole("button", { name: "Toggle sidebar", exact: true })).toBeFocused();
});

test("click and hover peek float without reallocating document width", async ({ page }) => {
  for (const mode of ["click", "hover"]) {
    const frame = await example(page, `Peek on ${mode}`);
    const sidebar = frame.locator("ui-sidebar");
    const inset = sidebar.locator('[part="inset"]');
    const width = (await inset.boundingBox())!.width;
    const edge = frame.getByRole("button", { name: "Peek sidebar", exact: true });
    if (mode === "click") await edge.click();
    else await edge.hover();
    await expect(sidebar).toHaveJSProperty("peeking", true);
    expect((await inset.boundingBox())!.width).toBe(width);
    await frame.getByRole("textbox", { name: "Search navigation", exact: true }).press("Escape");
    await expect(sidebar).toHaveJSProperty("peeking", false);
    await expect(sidebar).toHaveJSProperty("expanded", false);
    await frame.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
    await expect(sidebar).toHaveJSProperty("expanded", true);
  }
});

test("mobile drawer reprojects existing navigation, traps focus, and restores desktop state", async ({
  page,
}) => {
  const frame = await example(page, "Mobile drawer");
  const sidebar = frame.locator("ui-sidebar");
  const notes = frame.getByRole("textbox", { name: "Document notes", exact: true });
  await notes.fill("Keep the document alive");
  await frame.getByRole("button", { name: "Use mobile layout", exact: true }).click();
  await expect(sidebar).toHaveJSProperty("mobile", true);
  const toggle = frame.getByRole("button", { name: "Toggle sidebar", exact: true });
  await toggle.click();
  await expect(sidebar).toHaveJSProperty("mobileOpen", true);
  const close = frame.getByRole("button", { name: "Close sidebar", exact: true });
  await close.press("Tab");
  const workspace = frame.getByRole("button", { name: "Acme workspace", exact: true });
  await expect(workspace).toBeFocused();
  await workspace.press("Shift+Tab");
  await expect(close).toBeFocused();
  await close.press("Escape");
  await expect(sidebar).toHaveJSProperty("mobileOpen", false);
  await expect(toggle).toBeFocused();
  await frame.getByRole("button", { name: "Use desktop layout", exact: true }).click();
  await expect(sidebar).toHaveJSProperty("mobile", false);
  await expect(sidebar).toHaveJSProperty("expanded", true);
  await expect(notes).toHaveValue("Keep the document alive");
});

test("application-owned state and opt-in persistence agree with visible navigation", async ({
  page,
}) => {
  const frame = await example(page, "Controlled state and persistence");
  const sidebar = frame.locator("ui-sidebar");
  await frame.getByRole("switch", { name: "Remember desktop state", exact: true }).click();
  await frame.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
  await expect(sidebar).toHaveJSProperty("open", false);
  await expect(frame.getByRole("switch", { name: "Desktop open", exact: true })).not.toBeChecked();
  await expect
    .poll(
      async () =>
        (await page.context().cookies()).find((cookie) => cookie.name === "mash-sidebar-demo")
          ?.value,
    )
    .toBe("false");
  await frame.getByRole("button", { name: "Forget preference", exact: true }).click();
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((cookie) => cookie.name === "mash-sidebar-demo"),
    )
    .toBe(false);
});

test("static sidebar composes dialog focus and moving navigation without a nested drawer", async ({
  page,
}) => {
  const frame = await example(page, "Settings composition");
  await frame.getByRole("button", { name: "Open workspace settings", exact: true }).click();
  await expect(
    frame.getByRole("dialog", { name: "Workspace settings", exact: true }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Appearance", exact: true }).click();
  await expect(frame.locator("#settings-title")).toHaveText("Appearance");
  await frame.getByRole("textbox", { name: "Workspace name", exact: true }).fill("New workspace");
  await frame.getByRole("button", { name: "Done", exact: true }).click();
  await frame.getByRole("button", { name: "Open workspace settings", exact: true }).click();
  await expect(frame.getByRole("textbox", { name: "Workspace name", exact: true })).toHaveValue(
    "New workspace",
  );
  await expect(frame.getByRole("button", { name: "Toggle sidebar", exact: true })).toBeHidden();
});

test("workspace navigation keeps row actions inside selection and restores conversation drafts", async ({
  page,
}) => {
  const frame = await example(page, "Workspace");
  const active = frame.locator('ui-tree-item[value="navigation"]');
  const row = (await active.locator('[part="root"]').first().boundingBox())!;
  const actions = (await active
    .getByRole("button", { name: "Conversation actions" })
    .boundingBox())!;
  expect(actions.x).toBeGreaterThanOrEqual(row.x);
  expect(actions.x + actions.width).toBeLessThanOrEqual(row.x + row.width);
  const account = frame.getByRole("button", { name: "Alex Morgan", exact: true });
  expect((await account.boundingBox())!.width).toBeGreaterThan(120);
  const navigation = frame.locator("#workbench ui-scroll-area");
  const viewport = navigation.locator('[part="viewport"]');
  const initialMask = await viewport.evaluate((node) => getComputedStyle(node).maskImage);
  await viewport.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect
    .poll(() => navigation.evaluate((node) => node.matches(":state(at-block-end)")))
    .toBe(true);
  expect(await viewport.evaluate((node) => getComputedStyle(node).maskImage)).not.toBe(initialMask);
  await viewport.evaluate((node) => {
    node.scrollTop = 0;
  });
  const draft = frame.getByRole("textbox", { name: "Message", exact: true });
  await draft.fill("Keep this idea");
  await frame.getByRole("treeitem", { name: "Find the useful details", exact: true }).click();
  await expect(draft).toHaveValue("");
  await frame.getByRole("treeitem", { name: "A calmer navigation", exact: true }).click();
  await expect(draft).toHaveValue("Keep this idea");
  await draft.press("Enter");
  await expect(frame.locator("ui-message-scroller ui-bubble")).toHaveText("Keep this idea");
  await frame.getByRole("button", { name: "Search workspace", exact: true }).click();
  await frame.getByRole("option", { name: "What we heard this week", exact: true }).click();
  await expect(frame.locator("[data-conversation-title]")).toHaveText("What we heard this week");
  await expect(frame.getByRole("dialog", { name: "Search workspace", exact: true })).toBeHidden();
});
