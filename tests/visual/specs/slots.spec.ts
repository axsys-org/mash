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

  test("keeps tree rows aligned and controlled pagination live", async ({ page }) => {
    await page.goto("/components/ui-tree?theme=dark");
    const preview = page.frameLocator("iframe.stage-frame");
    const offsets = await preview.locator("ui-tree-item").evaluateAll((items) =>
      items.map((item) => {
        const host = item.getBoundingClientRect();
        const control = item.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
        const disclosure = item.shadowRoot!.querySelector<HTMLElement>('[part="disclosure"]')!;
        return {
          control: Math.round(control.getBoundingClientRect().left - host.left),
          disclosure: disclosure.dataset.branch,
        };
      }),
    );

    expect(new Set(offsets.map(({ control }) => control)).size).toBe(1);
    expect(offsets.some(({ disclosure }) => disclosure === "false")).toBe(true);

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
    await expect(preview.locator("ui-table ui-table-cell").first()).toBeVisible();

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
