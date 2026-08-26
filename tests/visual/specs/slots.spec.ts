import { expect, test } from "@playwright/test";

test.describe("catalog slot composition", () => {
  test("keeps compound examples authored as real component trees", async ({ page }) => {
    await page.goto("/components/ui-card?example=Project+card");

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
      const standalone = matrix.querySelector<HTMLElement>(
        'ui-link[variant="standalone"]:not([disabled])',
      )!;
      const paragraph = inline.closest("p")!;
      const control = (node: HTMLElement) =>
        node.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
      const quietStyle = getComputedStyle(control(quiet));
      const currentStyle = getComputedStyle(control(current));
      return {
        inlineFont: getComputedStyle(control(inline)).font,
        paragraphFont: getComputedStyle(paragraph).font,
        standaloneDecoration: getComputedStyle(control(standalone)).textDecorationLine,
        quietDecoration: quietStyle.textDecorationLine,
        quietHeight: control(quiet).getBoundingClientRect().height,
        quietColor: quietStyle.color,
        currentColor: currentStyle.color,
        currentBackground: currentStyle.backgroundColor,
        ariaCurrent: control(current).getAttribute("aria-current"),
      };
    });

    expect(variantContract.inlineFont).toBe(variantContract.paragraphFont);
    expect(variantContract.standaloneDecoration).toBe("none");
    expect(variantContract.quietDecoration).toBe("none");
    expect(variantContract.quietHeight).toBeGreaterThanOrEqual(32);
    expect(variantContract.currentColor).not.toBe(variantContract.quietColor);
    expect(variantContract.currentBackground).not.toBe("rgba(0, 0, 0, 0)");
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

    await page.goto("/components/ui-link?theme=dark&example=Workspace+navigation");
    const navigation = preview.locator(".example-link-navigation");
    const navigationLinks = preview.locator(".example-link-navigation > ui-link");
    await expect(navigationLinks).toHaveCount(4);
    const navigationWidth = await navigation.evaluate((node) => node.getBoundingClientRect().width);
    const navigationGeometry = await navigationLinks.evaluateAll((links) =>
      links.map((link) => {
        const control = link.shadowRoot!.querySelector<HTMLElement>('[part="control"]')!;
        const box = control.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
    expect(navigationWidth).toBeGreaterThanOrEqual(260);
    expect(navigationWidth).toBeLessThanOrEqual(320);
    expect(navigationGeometry.every(({ height }) => height >= 32)).toBe(true);
    expect(new Set(navigationGeometry.map(({ width }) => Math.round(width))).size).toBe(1);
  });

  test("composes semantic background material roles in both themes", async ({ page }) => {
    const preview = page.frameLocator("iframe.stage-frame");
    const readMaterials = () =>
      preview.locator(".example-material").evaluateAll((nodes) =>
        nodes.map((node) => {
          const style = getComputedStyle(node);
          const card = node.querySelector("ui-card")!;
          return {
            background: style.backgroundColor,
            backdrop: style.backdropFilter,
            cardBackground: getComputedStyle(card).backgroundColor,
          };
        }),
      );

    await page.goto("/components/ui-card?theme=light&example=Background+materials");
    const light = await readMaterials();
    expect(light).toHaveLength(5);
    expect(new Set(light.map(({ background }) => background)).size).toBe(5);
    expect(light.map(({ backdrop }) => backdrop)).toEqual(
      Array.from({ length: 5 }, () => "blur(15px) saturate(1.2)"),
    );
    expect(light.every(({ cardBackground }) => cardBackground === "rgba(0, 0, 0, 0)")).toBe(true);

    await page.goto("/components/ui-card?theme=dark&example=Background+materials");
    const dark = await readMaterials();
    expect(dark).toHaveLength(5);
    expect(dark.map(({ backdrop }) => backdrop)).toEqual(light.map(({ backdrop }) => backdrop));
    expect(dark.map(({ background }) => background)).not.toEqual(
      light.map(({ background }) => background),
    );

    await page.getByRole("button", { name: "vibrant", exact: true }).click();
    await expect(page).toHaveURL(/vibrancy=vibrant/);
    await expect(preview.locator("html")).toHaveAttribute("data-vibrancy", "vibrant");
    const vibrant = await readMaterials();
    expect(vibrant.map(({ backdrop }) => backdrop)).toEqual(
      Array.from({ length: 5 }, () => "blur(15px) saturate(1.5)"),
    );

    await page.getByRole("button", { name: "reduced", exact: true }).click();
    await expect(page).toHaveURL(/vibrancy=reduced/);
    await expect(preview.locator("html")).toHaveAttribute("data-vibrancy", "reduced");
    const reduced = await readMaterials();
    expect(reduced.every(({ backdrop }) => backdrop === "none")).toBe(true);
    expect(new Set(reduced.map(({ background }) => background)).size).toBe(1);

    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    await page.goto("/components/ui-card?theme=dark&example=Background+materials");
    await expect(preview.locator("html")).toHaveAttribute("data-vibrancy", "auto");
    const automaticReduced = await readMaterials();
    expect(automaticReduced.every(({ backdrop }) => backdrop === "none")).toBe(true);

    await page.goto("/components/ui-card?theme=dark&vibrancy=vibrant&example=Background+materials");
    const explicitVibrant = await readMaterials();
    expect(explicitVibrant.every(({ backdrop }) => backdrop.includes("saturate(1.5)"))).toBe(true);
    await session.send("Emulation.setEmulatedMedia", { features: [] });
  });

  test("keeps path breadcrumbs navigable and overflow edges semantic", async ({ page }) => {
    await page.goto("/components/ui-path?theme=dark&example=Breadcrumb+navigation");
    const preview = page.frameLocator("iframe.stage-frame");
    const breadcrumb = preview.locator('ui-path[variant="breadcrumb"]');

    await expect
      .poll(() => breadcrumb.evaluate((node) => node.matches(":state(overflow-start)")))
      .toBe(true);
    const breadcrumbContract = await breadcrumb.evaluate((node) => {
      const root = node.shadowRoot!.querySelector<HTMLElement>('[part="root"]')!;
      const viewport = node.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!;
      const links = [
        ...node.shadowRoot!.querySelectorAll<HTMLAnchorElement>('[part~="segment-link"]'),
      ];
      const current = node.shadowRoot!.querySelector<HTMLElement>('[part~="segment-current"]')!;
      const overflow = node.shadowRoot!.querySelector<HTMLElement>('[part~="overflow-start"]')!;
      return {
        role: root.getAttribute("role"),
        hrefs: links.map((link) => link.getAttribute("href")),
        current: current.getAttribute("aria-current"),
        clipped: viewport.scrollWidth > viewport.clientWidth,
        alignedEnd: Math.abs(viewport.scrollLeft) > 0,
        overflowDisplay: getComputedStyle(overflow).display,
        progressiveBlur: getComputedStyle(overflow).backdropFilter,
        progressiveMask: getComputedStyle(overflow).maskImage,
      };
    });

    expect(breadcrumbContract.role).toBe("navigation");
    expect(breadcrumbContract.hrefs).toEqual([
      "/",
      "/interzone",
      "/interzone/projects",
      "/interzone/projects/billing-migration",
    ]);
    expect(breadcrumbContract.current).toBe("page");
    expect(breadcrumbContract.clipped).toBe(true);
    expect(breadcrumbContract.alignedEnd).toBe(true);
    expect(breadcrumbContract.overflowDisplay).not.toBe("none");
    expect(breadcrumbContract.progressiveBlur).not.toBe("none");
    expect(breadcrumbContract.progressiveMask).not.toBe("none");

    await page.goto("/components/ui-path?theme=light&example=Preview+overflow");
    const paths = preview.locator(".example-path-case ui-path");
    await expect(paths).toHaveCount(3);
    await expect
      .poll(() =>
        paths.evaluateAll((nodes) => [
          nodes[0]!.matches(":state(overflow-end)"),
          nodes[1]!.matches(":state(overflow-start)"),
        ]),
      )
      .toEqual([true, true]);

    await page.goto("/components/ui-tree?theme=dark&example=Constrained+namespace+labels");
    const longTreeItem = preview.locator("ui-tree-item[selected]");
    await expect
      .poll(() => longTreeItem.evaluate((node) => node.matches(":state(overflow-end)")))
      .toBe(true);
    const treeOverflow = await longTreeItem.evaluate((node) => {
      const viewport = node.shadowRoot!.querySelector<HTMLElement>('[part="label-viewport"]')!;
      const overflow = node.shadowRoot!.querySelector<HTMLElement>('[part~="overflow-end"]')!;
      return {
        clipped: viewport.scrollWidth > viewport.clientWidth,
        overflowDisplay: getComputedStyle(overflow).display,
        progressiveBlur: getComputedStyle(overflow).backdropFilter,
        progressiveMask: getComputedStyle(overflow).maskImage,
      };
    });
    expect(treeOverflow.clipped).toBe(true);
    expect(treeOverflow.overflowDisplay).not.toBe("none");
    expect(treeOverflow.progressiveBlur).not.toBe("none");
    expect(treeOverflow.progressiveMask).not.toBe("none");
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

    const projects = preview.locator('ui-tree-item[path="/interzone/projects"]');
    const billing = preview.locator('ui-tree-item[path="/interzone/projects/billing-migration"]');
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

  test("keeps compact nested menus aligned and exposes progressive leaf overflow", async ({
    page,
  }) => {
    await page.goto("/components/ui-menu?theme=dark&example=Nested+compact+leafing");
    const preview = page.frameLocator("iframe.stage-frame");
    const menu = preview.locator('ui-menu[label="Project commands"]');
    const branch = menu.locator(':scope > ui-menu-item[value="recent"]');
    const branchControl = branch.getByRole("menuitem", {
      name: "Recent projects",
      exact: true,
    });
    const submenu = branch.locator('ui-menu[label="Recent projects"]');
    const popup = menu.locator('[part~="popup"]').first();
    const submenuPopup = submenu.locator('[part~="popup"]').first();
    const material = menu.locator('[part~="material"]').first();

    await expect(popup).toHaveCSS("width", "210px");
    await expect(popup).toHaveCSS("border-radius", "13px");
    await expect(popup).toHaveCSS("padding", "5px");
    await expect(popup).toHaveCSS("box-shadow", /0px 0px 0px 0.5px inset/);
    await expect(material).toHaveCSS("background-blend-mode", "normal");
    await expect(branchControl).toHaveCSS("padding-left", "7px");
    await expect(branchControl).toHaveAttribute("aria-expanded", "true");

    const [branchBox, submenuBox] = await Promise.all([
      branchControl.boundingBox(),
      submenuPopup.boundingBox(),
    ]);
    expect(branchBox).not.toBeNull();
    expect(submenuBox).not.toBeNull();
    expect(Math.abs(submenuBox!.x - (branchBox!.x + branchBox!.width + 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(submenuBox!.y - branchBox!.y)).toBeLessThanOrEqual(1);

    const overflowed = await submenu
      .locator('ui-menu-item[value="archive"]')
      .evaluate((item) => item.matches(":state(overflow-end)"));
    expect(overflowed).toBe(true);

    await page.goto("/components/ui-menu?theme=light&vibrancy=vibrant&example=Pull-down+commands");
    const lightPopup = preview.locator('ui-menu[label="Edit commands"] [part~="popup"]').first();
    const lightMaterial = await lightPopup.evaluate((element) => {
      const style = getComputedStyle(element);
      const materialElement = element.previousElementSibling as HTMLElement;
      const materialStyle = getComputedStyle(materialElement);
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--color-background-material-thick)";
      document.body.append(probe);
      return {
        background: materialStyle.backgroundColor,
        materialImage: materialStyle.backgroundImage,
        materialBlendMode: materialStyle.backgroundBlendMode,
        thickMaterial: getComputedStyle(probe).backgroundColor,
        shadow: style.boxShadow,
      };
    });
    expect(lightMaterial.background).toBe(lightMaterial.thickMaterial);
    expect(lightMaterial.materialImage).not.toBe("none");
    expect(lightMaterial.materialBlendMode).toBe("color-dodge");
    expect(lightMaterial.shadow).toContain("inset");
    expect(lightMaterial.shadow).toContain("0.5px inset");
    expect(lightMaterial.shadow).toContain("0.13");

    await page.goto("/components/ui-menu?theme=light&vibrancy=reduced&example=Pull-down+commands");
    const reducedMaterial = await lightPopup.evaluate((element) => {
      const materialElement = element.previousElementSibling as HTMLElement;
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--color-surface-raised)";
      document.body.append(probe);
      return {
        background: getComputedStyle(materialElement).backgroundColor,
        raisedSurface: getComputedStyle(probe).backgroundColor,
      };
    });
    expect(reducedMaterial.background).toBe(reducedMaterial.raisedSurface);
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

  test("composes a responsive issue-tracking workspace from Mash primitives", async ({ page }) => {
    await page.goto("/components/ui-table?theme=dark&example=Issue%20tracker%20workspace");

    const preview = page.frameLocator("iframe.stage-frame");
    const workspace = preview.locator("[data-linear-workspace]");
    const table = preview.getByRole("table", { name: "Product issues" });
    await expect(workspace).toBeVisible();
    await expect(preview.locator("html")).toHaveAttribute("data-layout", "fill");
    await expect(preview.locator(".example-linear-sidebar")).toBeVisible();
    await expect(preview.locator("ui-link.example-linear-nav-link")).toHaveCount(13);
    await expect(preview.locator("a.example-linear-nav-link")).toHaveCount(0);
    await expect(
      preview
        .locator("ui-link.example-linear-nav-link[current]")
        .first()
        .locator('[part="control"]'),
    ).toHaveAttribute("aria-current", "page");
    await expect(table).toBeVisible();
    await expect(preview.locator(".example-linear-table ui-table-row")).toHaveCount(6);
    await expect(preview.locator(".example-linear-table ui-table-head")).toHaveCount(6);

    const search = preview.locator(".example-linear-filter-search").locator('[part="control"]');
    await search.fill("keyboard");
    await expect
      .poll(() =>
        preview
          .locator(".example-linear-filter-search")
          .evaluate((node) => (node as HTMLElement & { value: string }).value),
      )
      .toBe("keyboard");
    await expect(preview.locator("[data-linear-list-row]:not([hidden])")).toHaveCount(1);
    await expect(preview.locator("[data-linear-visible-count]")).toHaveText("1 issue");

    const visibleIssue = preview.locator("[data-linear-list-row]:not([hidden])");
    const firstIssue = visibleIssue.locator("ui-checkbox");
    await firstIssue.click();
    await expect
      .poll(() =>
        firstIssue.evaluate((node) => (node as HTMLElement & { checked: boolean }).checked),
      )
      .toBe(true);
    await expect(preview.locator("[data-linear-selection-toolbar]")).toBeVisible();
    await expect(preview.locator("[data-linear-selection-count]")).toHaveText("1");

    await visibleIssue.locator("[data-linear-open-issue]").click();
    await expect(preview.locator("[data-linear-inspector]")).toBeVisible();
    await expect(preview.locator("[data-linear-inspector-title]")).toHaveText(
      "Ship keyboard navigation for issue lists",
    );
    await preview.locator("[data-linear-close-inspector]").click();

    await preview.getByRole("button", { name: "Mark done" }).click();
    await expect(visibleIssue.locator('ui-table-cell[column-index="4"] ui-badge')).toHaveText(
      "Done",
    );

    await preview.locator("[data-linear-clear-filters]").first().click();
    await expect(preview.locator("[data-linear-list-row]:not([hidden])")).toHaveCount(5);

    await preview.getByRole("button", { name: "Board" }).click();
    await expect(preview.locator("[data-linear-board-view]")).toBeVisible();
    await expect(preview.locator("[data-linear-board-card]:not([hidden])")).toHaveCount(5);

    const plannedIssue = preview.locator('[data-linear-board-card][data-linear-issue="MAS-133"]');
    const doneList = preview.locator(
      '[data-linear-board-column="done"] [data-catalog-kanban-list]',
    );
    const handleBounds = await plannedIssue.locator('[slot="handle"]').boundingBox();
    const doneBounds = await doneList.boundingBox();
    if (!handleBounds || !doneBounds) throw new Error("Linear board drag targets must be visible.");
    await page.mouse.move(
      handleBounds.x + handleBounds.width / 2,
      handleBounds.y + handleBounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(doneBounds.x + doneBounds.width / 2, doneBounds.y + 24, { steps: 12 });
    await expect(preview.locator("[data-catalog-drop-indicator]")).toBeVisible();
    await page.mouse.up();
    await expect(
      doneList.locator(':scope > [data-linear-board-card][data-linear-issue="MAS-133"]'),
    ).toHaveCount(1);
    await expect(
      preview.locator(
        '[data-linear-list-row][data-linear-issue="MAS-133"] ui-table-cell[column-index="4"] ui-badge',
      ),
    ).toHaveText("Done");
    await expect(preview.locator("[data-catalog-kanban-status]")).toHaveText(
      "Add cycle progress to team overview moved to Done, position 1.",
    );

    await preview.locator(".example-linear-main").focus();
    await page.keyboard.press("Control+k");
    await expect(preview.getByRole("dialog", { name: "Command menu" })).toBeVisible();
    await page.keyboard.press("Escape");

    const create = preview.locator("ui-dialog.example-linear-new-issue");
    await create.locator(":scope > ui-button").click();
    await expect(create.getByRole("dialog", { name: "Create issue" })).toBeVisible();
    await create
      .locator("[data-linear-create-title]")
      .locator('[part="control"]')
      .fill("Invent issue choreography");
    await create.locator("[data-linear-create-action]").click();
    await expect(
      preview.locator('[data-linear-list-row][data-linear-issue="MAS-151"]'),
    ).toHaveCount(1);

    await page.setViewportSize({ width: 900, height: 844 });
    await page.goto("/components/ui-table?example=Issue%20tracker%20workspace");
    await expect(preview.locator(".example-linear-sidebar")).toBeHidden();
    const compactGeometry = await preview.locator(".example-linear-table").evaluate((node) => ({
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }));
    expect(compactGeometry.scrollWidth - compactGeometry.clientWidth).toBeLessThanOrEqual(2);
  });
});
