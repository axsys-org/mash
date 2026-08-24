import { expect, test } from "@playwright/test";

test.describe("catalog slot composition", () => {
  test("keeps compound examples authored as real component trees", async ({ page }) => {
    await page.goto("/components/ui-card");

    await expect(page.locator(".family-title")).toHaveText([
      "Foundations",
      "Actions",
      "Input & selection",
      "Forms",
      "Navigation & disclosure",
      "Overlays & feedback",
      "Shrine",
    ]);

    const preview = page.frameLocator("iframe.stage-frame");
    const dialog = preview.locator("ui-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('ui-button[slot="trigger"]')).toHaveText("Rename");

    await dialog.locator('ui-button[slot="trigger"]').click();
    await expect(dialog).toHaveAttribute("open", "");
    await expect
      .poll(() => dialog.evaluate((node) => node.ownerDocument.activeElement?.localName ?? ""))
      .toBe("ui-input");

    await dialog.locator('[slot="close"] ui-button').first().click();
    await expect(dialog).not.toHaveAttribute("open", "");
  });

  test("shows typed children instead of synthetic slot fillers for selection and tabs", async ({
    page,
  }) => {
    await page.goto("/components/ui-checkbox-group");
    const checkboxPreview = page.frameLocator("iframe.stage-frame");
    await expect(checkboxPreview.locator("ui-checkbox-group > ui-checkbox")).toHaveCount(3);

    await page.goto("/components/ui-tabs");
    const tabsPreview = page.frameLocator("iframe.stage-frame");
    await tabsPreview.locator('ui-tab[value="members"]').click();
    await expect(tabsPreview.locator('ui-tab-panel[value="members"]')).toHaveAttribute(
      "selected",
      "",
    );
  });

  test("edits the default slot as projected content rather than a synthetic label attribute", async ({
    page,
  }) => {
    await page.goto("/components/ui-kbd?example=controls&label=Kbdss");

    const preview = page.frameLocator("iframe.stage-frame").locator("ui-kbd");
    await expect(preview).toHaveText("Kbdss");
    await expect(page).toHaveURL(/slot-default=Kbdss/);

    const defaultSlotControl = page
      .locator(".control", { hasText: "default slot" })
      .locator("input");
    await defaultSlotControl.fill("⌘ J");

    await expect(preview).toHaveText("⌘ J");
    await expect(page).toHaveURL(/slot-default=%E2%8C%98\+J/);

    const assigned = await preview.evaluate((node) => {
      const slot = node.shadowRoot!.querySelector<HTMLSlotElement>("slot")!;
      return slot.assignedNodes().map((child) => child.textContent);
    });
    expect(assigned).toEqual(["⌘ J"]);
  });

  test("keeps input adornments in the input-group anatomy", async ({ page }) => {
    await page.goto("/components/ui-input-group");

    const preview = page.frameLocator("iframe.stage-frame");
    const group = preview.locator("ui-input-group");
    const input = group.locator('ui-input[slot="control"]');

    await expect(group.locator('[slot="prefix"]')).toHaveText("⌕");
    await expect(group.locator('[slot="suffix"]')).toHaveText("⌘ K");
    await expect(input).toHaveAttribute("label", "Search projects");

    const composition = await group.evaluate((node) => {
      const assigned = (name: string) =>
        node
          .shadowRoot!.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)!
          .assignedElements()
          .map((child) => child.localName);

      return {
        prefix: assigned("prefix"),
        control: assigned("control"),
        suffix: assigned("suffix"),
      };
    });

    expect(composition).toEqual({
      prefix: ["span"],
      control: ["ui-input"],
      suffix: ["ui-kbd"],
    });

    const geometry = await group.evaluate((node) => {
      const root = node.shadowRoot!.querySelector<HTMLElement>('[part="root"]')!;
      const control = node.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
      const inputControl = node
        .querySelector("ui-input")!
        .shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
      const suffix = node.shadowRoot!.querySelector<HTMLElement>('[part="suffix"]')!;
      return {
        rootWidth: root.getBoundingClientRect().width,
        controlWidth: control.getBoundingClientRect().width,
        trailingInset: root.getBoundingClientRect().right - suffix.getBoundingClientRect().right,
        nestedBorder: getComputedStyle(inputControl).borderInlineStartWidth,
      };
    });

    expect(geometry.controlWidth).toBeGreaterThan(geometry.rootWidth / 2);
    expect(geometry.trailingInset).toBeLessThan(24);
    expect(geometry.nestedBorder).toBe("0px");
  });

  test("keeps link variants semantic, composable, and context-aware", async ({ page }) => {
    await page.goto("/components/ui-link?theme=dark&example=Variants+and+states");
    const preview = page.frameLocator("iframe.stage-frame");

    await expect(preview.locator('ui-link[variant="inline"]')).toHaveCount(1);
    await expect(preview.locator('ui-link[variant="quiet"]')).toHaveCount(2);
    await expect(preview.locator("ui-link[current]")).toHaveCount(1);
    await expect(preview.locator("ui-link[disabled]")).toHaveCount(1);

    const variantContract = await preview.locator(".example-link-matrix").evaluate((matrix) => {
      const inline = matrix.querySelector<HTMLElement>('ui-link[variant="inline"]')!;
      const quiet = matrix.querySelector<HTMLElement>('ui-link[variant="quiet"]:not([current])')!;
      const current = matrix.querySelector<HTMLElement>("ui-link[current]")!;
      const paragraph = inline.closest("p")!;
      const control = (node: HTMLElement) =>
        node.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
      return {
        inlineFont: getComputedStyle(control(inline)).font,
        paragraphFont: getComputedStyle(paragraph).font,
        quietDecoration: getComputedStyle(control(quiet)).textDecorationLine,
        ariaCurrent: control(current).getAttribute("aria-current"),
      };
    });

    expect(variantContract.inlineFont).toBe(variantContract.paragraphFont);
    expect(variantContract.quietDecoration).toBe("none");
    expect(variantContract.ariaCurrent).toBe("page");

    await page.goto("/components/ui-link?theme=dark&example=Prefix+and+suffix+content");
    const contentLinks = preview.locator("ui-link");
    await expect(contentLinks).toHaveCount(4);
    await expect(contentLinks.last()).toHaveText("Billing migration");

    const anatomy = await contentLinks.evaluateAll((links) =>
      links.map((link) => ({
        prefixHidden: link.shadowRoot!.querySelector<HTMLElement>('[part="prefix"]')!.hidden,
        suffixHidden: link.shadowRoot!.querySelector<HTMLElement>('[part="suffix"]')!.hidden,
      })),
    );
    expect(anatomy).toEqual([
      { prefixHidden: false, suffixHidden: true },
      { prefixHidden: true, suffixHidden: false },
      { prefixHidden: false, suffixHidden: false },
      { prefixHidden: true, suffixHidden: true },
    ]);
  });

  test("keeps tree rows aligned and controlled pagination live", async ({ page }) => {
    await page.goto("/components/ui-tree?theme=dark");
    const preview = page.frameLocator("iframe.stage-frame");
    const offsets = await preview.locator("ui-tree-item").evaluateAll((items) =>
      items.map((item) => {
        const host = item.getBoundingClientRect();
        const control = item.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
        const disclosure = item.shadowRoot!.querySelector<HTMLElement>('[part="disclosure"]')!;
        const label = item.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!;
        return {
          control: Math.round(control.getBoundingClientRect().left - host.left),
          disclosure: disclosure.dataset.branch,
          disclosureDisplay: getComputedStyle(disclosure).display,
          labelOffset: Math.round(
            label.getBoundingClientRect().left - control.getBoundingClientRect().left,
          ),
        };
      }),
    );

    expect(new Set(offsets.map(({ control }) => control)).size).toBe(1);
    const branches = offsets.filter(({ disclosure }) => disclosure === "true");
    const leaves = offsets.filter(({ disclosure }) => disclosure === "false");
    expect(branches.length).toBeGreaterThan(0);
    expect(leaves.length).toBeGreaterThan(0);
    expect(leaves.every(({ disclosureDisplay }) => disclosureDisplay === "none")).toBe(true);
    expect(Math.min(...leaves.map(({ labelOffset }) => labelOffset))).toBeLessThan(
      Math.min(...branches.map(({ labelOffset }) => labelOffset)),
    );

    const projects = preview.locator('ui-tree-item[title="Projects"]');
    const billing = preview.locator('ui-tree-item[title="Billing migration"]');
    await expect(projects).toHaveAttribute("expanded", "");
    const projectsControl = projects.locator('button[part="control"]').first();
    await projectsControl.click();
    await expect(projects).not.toHaveAttribute("expanded", "");
    await expect(billing).toBeHidden();
    await projectsControl.click();
    await expect(projects).toHaveAttribute("expanded", "");
    await expect(billing).toBeVisible();

    await page.goto("/components/ui-pagination?theme=dark");
    const pagination = preview.locator("ui-pagination");
    await pagination.evaluate((node) =>
      node.shadowRoot!.querySelector<HTMLButtonElement>('button[data-page="7"]')!.click(),
    );
    await expect(pagination).toHaveAttribute("current-page", "7");
    await expect(preview.locator("[data-catalog-page-output]")).toHaveText("Page 7 of 42");
  });

  test("realizes editor provider slots without empty overlay chrome", async ({ page }) => {
    await page.goto("/components/ui-editor?theme=dark");
    const preview = page.frameLocator("iframe.stage-frame");
    const editor = preview.locator("ui-editor");

    const emptyDisplays = await editor.evaluate((node) =>
      ["hover", "code-actions"].map(
        (part) =>
          getComputedStyle(node.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)!)
            .display,
      ),
    );
    expect(emptyDisplays).toEqual(["none", "none"]);

    await page.goto("/components/ui-editor?theme=dark&example=Search+and+provider+surfaces");
    await expect(preview.locator('ui-card[slot="completion"]')).toBeVisible();
    await preview.locator("ui-input[data-catalog-editor-search] input").fill("status");
    await expect
      .poll(() =>
        preview
          .locator("ui-editor")
          .evaluate((node) => (node as HTMLElement & { searchQuery: string }).searchQuery),
      )
      .toBe("status");
  });

  test("shows anatomy-only elements inside their authored parent families", async ({ page }) => {
    const preview = page.frameLocator("iframe.stage-frame");

    await page.goto("/components/ui-tree-item");
    await expect(preview.locator("ui-tree > ui-tree-item").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "controls", exact: true })).toHaveCount(0);

    await page.goto("/components/ui-menu-item");
    await expect(preview.locator("ui-menu[open] ui-menu-item").first()).toBeVisible();

    await page.goto("/components/ui-table-cell");
    const table = preview.locator("ui-table");
    await expect(table.locator('[part~="table"]')).toHaveCSS("display", "table");
    await expect(preview.locator("ui-table-header").locator('[part~="rowgroup"]')).toHaveCSS(
      "display",
      "table-header-group",
    );
    await expect(preview.locator("ui-table-body").locator('[part~="rowgroup"]')).toHaveCSS(
      "display",
      "table-row-group",
    );
    await expect(preview.locator("ui-table-row").first().locator('[part~="row"]')).toHaveCSS(
      "display",
      "table-row",
    );
    await expect(
      preview.locator("ui-table-head").first().locator('[part~="column-header"]'),
    ).toHaveCSS("display", "table-cell");
    await expect(preview.locator("ui-table-cell").first().locator('[part~="cell"]')).toHaveCSS(
      "display",
      "table-cell",
    );
    await expect(preview.locator("ui-table-caption")).toHaveCSS("display", "table-caption");
    await expect(preview.locator("ui-table-caption").locator('[part~="caption"]')).toHaveCSS(
      "display",
      "block",
    );
    await expect(preview.getByRole("table", { name: "Project status" })).toBeVisible();
    await expect(preview.getByRole("columnheader")).toHaveCount(3);
    await expect(preview.getByRole("cell")).toHaveCount(9);
    await expect(
      preview.locator("ui-table-body ui-table-row").first().locator('[part~="row"]'),
    ).not.toHaveCSS("box-shadow", "none");

    await page.goto("/components/ui-table?example=Single+row");
    await expect(preview.getByRole("table", { name: "Current project" })).toBeVisible();
    await expect(preview.locator("ui-table-body ui-table-row")).toHaveCount(1);
    await expect(preview.getByRole("columnheader")).toHaveCount(3);
    await expect(preview.getByRole("cell")).toHaveCount(3);
    await expect(
      preview.locator("ui-table-body ui-table-cell").first().locator('[part~="cell"]'),
    ).toHaveCSS("border-bottom-width", "0px");
    const singleRowGeometry = await preview.locator("ui-table").evaluate((node) => ({
      hostWidth: node.getBoundingClientRect().width,
      viewportWidth: node.ownerDocument.documentElement.clientWidth,
    }));
    expect(singleRowGeometry.hostWidth / singleRowGeometry.viewportWidth).toBeGreaterThan(0.9);
    await expect(
      preview.locator("ui-table-head").first().locator('[part~="column-header"]'),
    ).not.toHaveCSS("border-top-left-radius", "0px");
    await expect(
      preview.locator("ui-table-head").last().locator('[part~="column-header"]'),
    ).not.toHaveCSS("border-top-right-radius", "0px");

    await page.goto("/components/ui-table?example=Project+health");
    await expect(preview.getByRole("table", { name: "Project health" })).toBeVisible();
    await expect(preview.locator("html")).toHaveAttribute("data-layout", "start");
    await expect(preview.locator("ui-avatar")).toHaveCount(3);
    await expect(preview.locator("ui-badge")).toHaveCount(3);
    await expect(preview.locator("ui-progress")).toHaveCount(3);
    const healthRows = await preview.locator("ui-table").evaluate((node) => {
      const caption = node
        .querySelector("ui-table-caption")!
        .shadowRoot!.querySelector<HTMLElement>('[part~="caption"]')!;
      const header = node
        .querySelector("ui-table-head")!
        .shadowRoot!.querySelector<HTMLElement>('[part~="column-header"]')!;
      return {
        captionBottom: caption.getBoundingClientRect().bottom,
        headerTop: header.getBoundingClientRect().top,
      };
    });
    expect(healthRows.headerTop).toBeGreaterThanOrEqual(healthRows.captionBottom - 1);

    await page.goto("/components/ui-table?example=Usage+report");
    await expect(
      preview.getByRole("table", { name: "Workspace usage for the last 30 days" }),
    ).toBeVisible();
    await expect(preview.locator("ui-intl-formatter")).toHaveCount(9);

    await page.goto("/components/ui-table?example=Empty+and+loading");
    await expect(preview.getByRole("table")).toHaveCount(2);
    await expect(preview.locator('ui-table[aria-busy="true"] ui-spinner')).toBeVisible();

    await page.goto("/components/sh-limb");
    await expect(preview.locator("sh-myth sh-limb").first()).toBeVisible();
  });

  test("composes scroll-target actions from buttons and a scroll area", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/components/ui-scroll-area?example=Scroll%20target%20action&theme=dark");

    const preview = page.frameLocator("iframe.stage-frame");
    const area = preview.locator("ui-scroll-area");
    const scrollTop = () =>
      area.evaluate(
        (node) => node.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]')?.scrollTop ?? -1,
      );

    await preview.getByRole("button", { name: "Latest checkpoint" }).click();
    await expect.poll(scrollTop).toBeGreaterThan(0);

    await preview.getByRole("button", { name: "Back to top" }).click();
    await expect.poll(scrollTop).toBe(0);
  });
});
