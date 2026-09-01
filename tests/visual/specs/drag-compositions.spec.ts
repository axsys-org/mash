import { expect, type Locator, type Page, test } from "@playwright/test";

async function dragBetween(
  page: Page,
  source: Locator,
  target: Locator,
  targetOffsetY = 0,
  targetOffsetX = 0,
  duringDrag?: () => Promise<void>,
) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag source and target must both be visible.");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2 + targetOffsetX, to.y + to.height / 2 + targetOffsetY, {
    steps: 12,
  });
  await duringDrag?.();
  await page.mouse.up();
}

test.describe("catalog drag compositions", () => {
  test("reorders semantic tree rows through their actions-slot handles", async ({ page }) => {
    await page.goto("/components/ui-tree?theme=dark&example=Reorder+with+handles");
    const preview = page.frameLocator("iframe.stage-frame");
    const rows = preview.locator('[data-catalog-drag-source="tree-item"]');

    await dragBetween(page, rows.first().locator("[data-catalog-drag-handle]"), rows.last(), 12);

    await expect(preview.locator("[data-catalog-tree-status]")).toHaveText(
      "Priority: Invoice reconciliation, Archive import, Billing migration",
    );
    await expect
      .poll(() => rows.evaluateAll((items) => items.map((item) => item.getAttribute("value"))))
      .toEqual(["invoices", "archive", "billing"]);
  });

  test("moves and resizes the floating workspace without merging those behaviors", async ({
    page,
  }) => {
    await page.goto("/components/ui-draggable?theme=dark&example=Resizable+workspace+window");
    const preview = page.frameLocator("iframe.stage-frame");
    const window = preview.locator("ui-draggable.example-drag-window");
    const titlebar = window.locator('[slot="handle"]');
    await titlebar.scrollIntoViewIfNeeded();
    const start = await titlebar.boundingBox();
    if (!start) throw new Error("Window titlebar must be visible.");
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(start.x + start.width / 2 + 72, start.y + start.height / 2 + 48, {
      steps: 12,
    });
    await page.mouse.up();

    await expect.poll(async () => Number(await window.getAttribute("x"))).toBeGreaterThan(0);
    await expect.poll(async () => Number(await window.getAttribute("y"))).toBeGreaterThan(0);
    await expect(window).toHaveCSS("resize", "both");

    const panels = window.locator("ui-resizable-panel");
    const firstSize = await panels.first().boundingBox();
    const separator = window.locator('ui-resizable-handle [part="control"]');
    if (!firstSize) throw new Error("Resizable panes must be visible.");
    await separator.focus();
    await separator.press("ArrowRight");
    await expect
      .poll(async () => (await panels.first().boundingBox())?.width ?? 0)
      .toBeGreaterThan(firstSize.width);
  });

  test("moves and reorders Kanban cards through column detents with a semantic insertion line", async ({
    page,
  }) => {
    await page.goto("/components/ui-draggable?theme=dark&example=Kanban+board");
    const preview = page.frameLocator("iframe.stage-frame");
    const card = preview.locator('[data-catalog-kanban-id="axi-72"]');
    const progress = preview.locator('[data-catalog-kanban-column="progress"]');
    const progressList = progress.locator("[data-catalog-kanban-list]");
    const indicator = preview.locator("[data-catalog-drop-indicator]");

    await dragBetween(page, card.locator('[slot="handle"]'), progressList, 120, 0, async () => {
      await expect(indicator).toBeVisible();
      await expect(indicator.locator('[slot="prefix"]')).toBeVisible();
      await expect(progress).toHaveAttribute("data-catalog-kanban-active", "");
    });

    await expect(progressList.locator(':scope > [data-catalog-kanban-id="axi-72"]')).toHaveCount(1);
    await expect(preview.locator("[data-catalog-kanban-status]")).toHaveText(
      "Audit invoice states moved to In progress, position 3.",
    );

    const firstProgressCard = progressList.locator(":scope > .example-kanban-card").first();
    await dragBetween(page, card.locator('[slot="handle"]'), firstProgressCard, -24, 0);
    await expect
      .poll(() =>
        progressList
          .locator(":scope > .example-kanban-card")
          .evaluateAll((cards) => cards.map((item) => item.getAttribute("data-catalog-kanban-id"))),
      )
      .toEqual(["axi-72", "axi-68", "axi-70"]);

    await dragBetween(
      page,
      card.locator('[slot="handle"]'),
      preview.locator('[data-catalog-kanban-column="review"] [data-catalog-kanban-list]'),
      0,
      0,
      async () => page.keyboard.press("Escape"),
    );
    await expect
      .poll(() =>
        progressList
          .locator(":scope > .example-kanban-card")
          .evaluateAll((cards) => cards.map((item) => item.getAttribute("data-catalog-kanban-id"))),
      )
      .toEqual(["axi-72", "axi-68", "axi-70"]);
    await expect(preview.locator("[data-catalog-kanban-status]")).toHaveText(
      "Audit invoice states stayed where it was.",
    );
  });

  test("moves the same view from the top tab bar into the tree and back", async ({ page }) => {
    await page.goto("/components/ui-tabs?theme=dark&example=Move+views+between+tabs+and+tree");
    const preview = page.frameLocator("iframe.stage-frame");
    const tab = preview.locator('ui-tab[value="invoices"]');
    const drop = preview.locator("[data-catalog-tab-drop]");
    const indicator = preview.locator("[data-catalog-drop-indicator]");

    await dragBetween(page, tab.locator("[data-catalog-drag-handle]"), drop, 0, 0, async () => {
      await expect(indicator).toBeVisible();
      await expect(indicator).toHaveAttribute("orientation", "horizontal");
      await expect(indicator.locator('[slot="prefix"]')).toBeVisible();
    });

    await expect(preview.locator('ui-tree-item[value="pinned-invoices"]')).toHaveText(/Invoices/);
    await expect(tab).toHaveCount(0);
    await expect(preview.locator("[data-catalog-tab-status]")).toHaveText(
      "Invoices pinned to the sidebar.",
    );

    const pinned = preview.locator('ui-tree-item[value="pinned-invoices"]');
    const activityTab = preview.locator('ui-tab[value="activity"]');
    await dragBetween(
      page,
      pinned.locator("[data-catalog-drag-handle]"),
      activityTab,
      0,
      -20,
      async () => {
        await expect(indicator).toBeVisible();
        await expect(indicator).toHaveAttribute("orientation", "vertical");
      },
    );

    await expect(preview.locator('ui-tab[value="invoices"]')).toHaveText(/Invoices/);
    await expect(pinned).toHaveCount(0);
    await expect(preview.locator('ui-tab-panel[value="invoices"]')).toHaveText(
      /Invoice reconciliation queue/,
    );
    await expect(preview.locator("[data-catalog-tab-status]")).toHaveText(
      "Invoices restored to the top tab bar.",
    );
    await expect
      .poll(() =>
        preview
          .locator('ui-tab[slot="tab"]')
          .evaluateAll((tabs) => tabs.map((candidate) => candidate.getAttribute("value"))),
      )
      .toEqual(["overview", "invoices", "activity"]);

    const tabList = preview.locator('ui-tabs [part="list"]');
    const overview = preview.locator('ui-tab[value="overview"]');
    await dragBetween(page, overview.locator("[data-catalog-drag-handle]"), tabList, 0, 300);
    await expect
      .poll(() =>
        preview
          .locator('ui-tab[slot="tab"]')
          .evaluateAll((tabs) => tabs.map((candidate) => candidate.getAttribute("value"))),
      )
      .toEqual(["invoices", "activity", "overview"]);
    await expect(preview.locator("[data-catalog-tab-status]")).toHaveText(
      "Overview moved to tab position 3.",
    );

    await dragBetween(
      page,
      overview.locator("[data-catalog-drag-handle]"),
      preview.locator('ui-tab[value="invoices"]'),
      0,
      -20,
      async () => page.keyboard.press("Escape"),
    );
    await expect
      .poll(() =>
        preview
          .locator('ui-tab[slot="tab"]')
          .evaluateAll((tabs) => tabs.map((candidate) => candidate.getAttribute("value"))),
      )
      .toEqual(["invoices", "activity", "overview"]);
    await expect(preview.locator("[data-catalog-tab-status]")).toHaveText(
      "Overview stayed where it was.",
    );
  });

  test("promotes a regular tree leaf into a branch on a valid nested drop", async ({ page }) => {
    await page.goto("/components/ui-tree?theme=dark&example=Nest+into+leaves");
    const preview = page.frameLocator("iframe.stage-frame");
    const billing = preview.locator('ui-tree-item[value="billing"]');
    const archive = preview.locator('ui-tree-item[value="archive"]');

    await dragBetween(
      page,
      billing.locator("[data-catalog-drag-handle]"),
      archive,
      0,
      0,
      async () => {
        await expect(archive).toHaveAttribute("data-catalog-leaf-drop-active", "");
      },
    );

    await expect(archive).toHaveAttribute("kind", "folder");
    await expect(archive).toHaveAttribute("expanded", "");
    await expect(archive.locator(':scope > ui-tree-item[value="billing"]')).toHaveCount(1);
    await expect(preview.locator("[data-catalog-tree-leaf-status]")).toHaveText(
      "Billing migration nested under Archive import.",
    );
  });

  test("rearranges Combobox-owned chips by their dedicated grips", async ({ page }) => {
    await page.goto("/components/ui-combobox?theme=dark&example=Rearrange+selected+owners");
    const preview = page.frameLocator("iframe.stage-frame");
    const chips = preview.locator('[data-catalog-drag-source="chip"]');

    await dragBetween(
      page,
      preview
        .locator('[data-catalog-drag-source="chip"][data-catalog-label="Jo"]')
        .locator("[data-catalog-drag-handle]"),
      chips.first(),
      0,
      -24,
    );

    await expect(preview.locator("[data-catalog-chip-status]")).toHaveText(
      "Owner precedence: Jo, Maya, Sam, Alex",
    );
    await expect
      .poll(() => chips.evaluateAll((items) => items.map((item) => item.getAttribute("value"))))
      .toEqual(["jo", "maya", "sam", "alex"]);
  });
});
