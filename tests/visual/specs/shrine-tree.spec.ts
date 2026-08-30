import { expect, test } from "@playwright/test";

test.describe("Shrine revision tree", () => {
  test("inlines expandable path rows beside selectable nodes with authored menus", async ({
    page,
  }) => {
    await page.goto("/components/sh-tree?theme=dark&example=Inline+path+lanes");
    const preview = page.frameLocator("iframe.stage-frame");
    const contextMenu = preview.locator("ui-context-menu[data-shrine-tree-context]");
    const hoverPreview = preview.locator("ui-preview-card[data-shrine-path-preview]");
    const shrineTree = contextMenu.locator('sh-tree[variant="inline"]');
    const ktk = shrineTree.locator('ui-tree-item[value="KTK-1"]');
    const overlay = shrineTree.locator('ui-tree-item[value="KTK-1/overlay"]');

    await expect(shrineTree).toBeVisible();
    await expect(ktk).toHaveAttribute("expanded", "");
    await expect(overlay).toBeVisible();

    const gestureBindings = await preview
      .locator("[data-shrine-path-preview-stage]")
      .evaluate((stage) => {
        const bindings = [
          ...stage.querySelectorAll<HTMLElement & { boundTarget?: HTMLElement }>(
            'ui-gesture-binding[command="preview.shrine-path"]',
          ),
        ];
        return {
          count: bindings.length,
          targets: bindings.map((binding) => binding.boundTarget?.localName ?? ""),
        };
      });
    expect(gestureBindings).toEqual({ count: 6, targets: Array(6).fill("ui-path") });

    const topology = await shrineTree.evaluate((host) => {
      const nodes = [
        ...(host.shadowRoot?.querySelectorAll<SVGCircleElement>('[part~="node"]') ?? []),
      ];
      const items = [...host.querySelectorAll<HTMLElement>("ui-tree-item")];
      return {
        nodes: nodes.length,
        capsules: host.shadowRoot?.querySelectorAll('[part~="capsule"]').length ?? 0,
        paths: host.querySelectorAll('ui-path[size="small"]').length,
        rowsFollowNodes: nodes.every((node, index) => {
          const control = items[index]?.shadowRoot?.querySelector<HTMLElement>('[part="control"]');
          if (!control) return false;
          const hostStart = host.getBoundingClientRect().left;
          return control.getBoundingClientRect().left - hostStart > node.cx.baseVal.value;
        }),
      };
    });
    expect(topology).toEqual({ nodes: 6, capsules: 0, paths: 6, rowsFollowNodes: true });

    const ktkPath = ktk.locator(":scope > ui-path[slot='label']");
    await ktkPath.hover();
    await expect(hoverPreview).toHaveAttribute("open", "");
    await expect(hoverPreview).toHaveAttribute("trigger", "manual");
    await expect(hoverPreview).toHaveAttribute("data-shrine-preview-value", "KTK-1");
    const mythPreview = hoverPreview.locator('sh-myth[variant="preview"]');
    await expect(mythPreview).toHaveAttribute("title", "Stitch revision topology");
    await expect(mythPreview).toHaveAttribute("path", "/work/KTK-1");
    await expect(mythPreview).toHaveAttribute("kind", "Branch");
    await expect(hoverPreview.locator("[data-shrine-preview-children]")).toHaveAttribute(
      "text",
      "2",
    );

    const hitPolicy = await hoverPreview.evaluate((host) => ({
      backdrop: getComputedStyle(host.shadowRoot!.querySelector<HTMLElement>("[part='backdrop']")!)
        .pointerEvents,
      popup: getComputedStyle(host.shadowRoot!.querySelector<HTMLElement>("[part='popup']")!)
        .pointerEvents,
    }));
    expect(hitPolicy).toEqual({ backdrop: "none", popup: "auto" });

    const placement = await hoverPreview.evaluate((host) => {
      const anchor = (host as HTMLElement & { anchorElement?: HTMLElement }).anchorElement;
      const popup = host.shadowRoot?.querySelector<HTMLElement>("[part='popup']");
      const anchorRect = anchor?.getBoundingClientRect();
      const popupRect = popup?.getBoundingClientRect();
      return {
        anchorKind: anchor?.getAttribute("part"),
        anchorValue:
          anchor?.getRootNode() instanceof ShadowRoot
            ? (anchor.getRootNode() as ShadowRoot).host.getAttribute("value")
            : null,
        trailsAnchor: Boolean(anchorRect && popupRect && popupRect.left >= anchorRect.right),
      };
    });
    expect(placement).toEqual({
      anchorKind: "control",
      anchorValue: "KTK-1",
      trailsAnchor: true,
    });

    await hoverPreview.locator("[data-shrine-preview-open]").hover();
    await page.waitForTimeout(360);
    await expect(hoverPreview).toHaveAttribute("open", "");

    await ktk.getByRole("treeitem").first().focus();
    await expect(hoverPreview).toHaveAttribute("open", "");
    await hoverPreview.locator("[data-shrine-preview-open]").focus();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(360);
    await expect(hoverPreview).toHaveAttribute("open", "");
    expect(await hoverPreview.evaluate((host) => host.ownerDocument.activeElement?.localName)).toBe(
      "ui-link",
    );

    await overlay.locator(":scope > ui-path[slot='label']").hover();
    await expect(overlay).toHaveAttribute("data-shrine-preview-active", "");
    await expect(hoverPreview).toHaveAttribute("data-shrine-preview-value", "KTK-1/overlay");
    await expect(hoverPreview.locator("[data-shrine-preview-relation]")).toHaveText("x→x overlay");

    const source = shrineTree.locator('ui-tree-item[value="KTK-1/source"]');
    await source.locator(":scope > ui-path[slot='label']").hover();
    await expect(source).toHaveAttribute("data-shrine-preview-active", "");
    await expect(hoverPreview).toHaveAttribute("data-shrine-preview-value", "KTK-1/source");
    await expect(mythPreview).toHaveAttribute("title", "Source witness");

    await shrineTree.locator('[part~="node-anchor"][data-node-id="KTK-1/overlay"]').click();
    await expect(overlay).toHaveAttribute("selected", "");

    await ktk.getByRole("treeitem").first().hover();
    await expect(
      ktk.locator(':scope > ui-menu[slot="actions"] > ui-button[slot="trigger"]'),
    ).toBeVisible();

    await overlay.getByRole("treeitem").first().click({ button: "right" });
    await expect(contextMenu).toHaveAttribute("open", "");
    await expect(contextMenu).toHaveAttribute("data-shrine-context-value", "KTK-1/overlay");
    await expect(contextMenu.locator("[data-shrine-context-path]")).toHaveText(
      "/work/KTK-1/overlays/invoice",
    );

    await contextMenu.evaluate((menu) =>
      (menu as HTMLElement & { dismiss?: (reason?: string) => void }).dismiss?.("escape"),
    );
    await ktk.getByRole("treeitem").first().click();
    await expect(ktk).not.toHaveAttribute("expanded", "");
    await expect(overlay).toBeHidden();
  });

  test("supports explicit capsule pronunciation without changing node identity", async ({
    page,
  }) => {
    await page.goto("/components/sh-tree?example=Mixed+node+forms");
    const preview = page.frameLocator("iframe.stage-frame");
    const shrineTree = preview.locator('sh-tree[variant="inline"]');

    await expect(shrineTree).toBeVisible();
    const topology = await shrineTree.evaluate((host) => ({
      nodes: host.shadowRoot?.querySelectorAll('[part~="node"]').length ?? 0,
      capsules: host.shadowRoot?.querySelectorAll('[part~="capsule"]').length ?? 0,
      capsuleIdentity:
        host.shadowRoot?.querySelector('[part~="capsule"]')?.getAttribute("data-node-id") ?? "",
    }));

    expect(topology).toEqual({ nodes: 2, capsules: 1, capsuleIdentity: "HEAD" });
  });

  test("renders the KTK-1 ledger as trace topology without nested guides", async ({ page }) => {
    await page.goto("/components/sh-tree?theme=dark&example=KTK-1+trace+ledger");
    const preview = page.frameLocator("iframe.stage-frame");
    const shrineTree = preview.locator('sh-tree[variant="ledger"]');

    await expect(shrineTree).toBeVisible();
    await expect(shrineTree.locator('ui-tree-item[value="KTK-1"]')).toHaveAttribute("current", "");
    await expect(shrineTree.locator("ui-tree-item")).toHaveCount(11);

    const topology = await shrineTree.evaluate((host) => ({
      nodes: host.shadowRoot?.querySelectorAll('[part~="node"]').length ?? 0,
      capsules: host.shadowRoot?.querySelectorAll('[part~="capsule"]').length ?? 0,
      edges: host.shadowRoot?.querySelectorAll('[part~="edge"]').length ?? 0,
      nestedItems: host.querySelectorAll('ui-tree-item[slot="children"]').length,
      paths: host.querySelectorAll('ui-path[size="small"]').length,
      laneCount: host.style.getPropertyValue("--sh-tree-lane-count"),
    }));

    expect(topology).toEqual({
      nodes: 0,
      capsules: 11,
      edges: 12,
      nestedItems: 0,
      paths: 11,
      laneCount: "6",
    });

    await shrineTree.locator('[part~="capsule"][data-node-id="MIR-8"]').click();
    await expect(shrineTree.locator('ui-tree-item[value="MIR-8"]')).toHaveAttribute("selected", "");
    await expect(shrineTree.locator('ui-tree-item[value="KTK-1"]')).not.toHaveAttribute(
      "selected",
      "",
    );
    await expect
      .poll(() =>
        shrineTree.evaluate(
          (host) =>
            host.shadowRoot
              ?.querySelector('[part~="capsule"][data-node-id="MIR-8"]')
              ?.getAttribute("part") ?? "",
        ),
      )
      .toContain("capsule-selected");
  });

  test("aligns decorative revision nodes to the accessible tree rows", async ({ page }) => {
    await page.goto("/components/sh-tree?theme=dark&example=Revision+graph");
    const preview = page.frameLocator("iframe.stage-frame");
    const shrineTree = preview.locator("sh-tree");
    const tree = shrineTree.locator('ui-tree[slot="tree"]');

    await expect(shrineTree).toBeVisible();
    await expect(tree).toBeVisible();
    await expect(tree.locator("ui-tree-item")).toHaveCount(6);

    const contract = await shrineTree.evaluate((host) => {
      const nodes = [
        ...(host.shadowRoot?.querySelectorAll<SVGCircleElement>('[part~="node"]') ?? []),
      ];
      const edges = [
        ...(host.shadowRoot?.querySelectorAll<SVGPathElement>('[part~="edge"]') ?? []),
      ];
      const rows = [...host.querySelectorAll<HTMLElement>("ui-tree-item")].map((item) => {
        const control = item.shadowRoot?.querySelector<HTMLElement>('[part="control"]');
        const rect = control?.getBoundingClientRect();
        return rect ? rect.top - host.getBoundingClientRect().top + rect.height / 2 : -1;
      });
      return {
        graphHidden:
          host.shadowRoot?.querySelector('[part="graph"]')?.getAttribute("aria-hidden") === "true",
        nodeCount: nodes.length,
        edgeCount: edges.length,
        alignment: nodes.map((node, index) =>
          Math.abs(node.cy.baseVal.value - (rows[index] ?? -1)),
        ),
        role: host
          .querySelector("ui-tree")
          ?.shadowRoot?.querySelector('[part="root"]')
          ?.getAttribute("role"),
      };
    });

    expect(contract.graphHidden).toBe(true);
    expect(contract.nodeCount).toBe(6);
    expect(contract.edgeCount).toBe(6);
    expect(contract.alignment.every((difference) => difference <= 1)).toBe(true);
    expect(contract.role).toBe("tree");
  });

  test("keeps expandable namespace details out of the revision graph", async ({ page }) => {
    await page.goto("/components/sh-tree?example=Expandable+change+sets");
    const preview = page.frameLocator("iframe.stage-frame");
    const shrineTree = preview.locator("sh-tree");
    const revision = shrineTree.locator('ui-tree-item[value="rev-current"]');

    await expect(revision).toHaveAttribute("expanded", "");
    await expect(revision.locator('ui-tree-item[value="path-preserved"]')).toBeVisible();
    await expect(revision.locator('ui-tree-item[value="path-compacted"]')).toHaveAttribute(
      "data-shrine-compressed-from",
      "/records /records/archive",
    );

    const nodeCount = await shrineTree.evaluate(
      (host) => host.shadowRoot?.querySelectorAll('[part~="node"]').length ?? 0,
    );
    expect(nodeCount).toBe(3);
  });
});
