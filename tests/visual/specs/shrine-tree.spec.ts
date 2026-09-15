import { expect, test } from "@playwright/test";

test("inline overlays remain real tree items through selection, hiding and reveal", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/sh-tree?example=Inline%20path%20lanes");
  const frame = page.frameLocator("iframe.stage-frame");
  const graph = frame.locator("sh-tree");
  const overlay = frame.locator('ui-tree-item[value="KTK-1/overlay"]').getByRole("treeitem");
  const head = frame.locator('ui-tree-item[value="KTK-1"]').getByRole("treeitem").first();
  await expect(overlay).toBeVisible();
  await expect(graph.locator('[part~="node-anchor"]')).toHaveCount(6);
  await overlay.click();
  await expect(frame.locator("#path-selection")).toContainText("/work/KTK-1/overlays/invoice");
  await frame.getByRole("button", { name: "Hide overlays", exact: true }).click();
  await expect(overlay).toBeHidden();
  await expect(graph.locator('[part~="node-anchor"]')).toHaveCount(4);
  await expect(frame.locator("#path-selection")).toHaveText("/work/KTK-1 · current");
  await head.press("ArrowLeft");
  await frame.getByRole("button", { name: "Reveal invoice overlay", exact: true }).click();
  await expect(overlay).toBeVisible();
  await expect(overlay).toBeFocused();
  await expect(graph.locator('[part~="node-anchor"]')).toHaveCount(6);
  await overlay.press("ArrowDown");
  await expect(
    frame.locator('ui-tree-item[value="KTK-1/source"]').getByRole("treeitem"),
  ).toBeFocused();
  await graph.locator('[data-node-id="KTK-1/overlay"]').click();
  await expect(overlay).toHaveAttribute("aria-selected", "true");
  await frame.getByRole("button", { name: "Preview Invoice overlay", exact: true }).focus();
  await expect(
    frame.locator('ui-preview-card[label="Invoice overlay provenance"]'),
  ).toHaveAttribute("open", "");
  await expect(
    frame.locator('ui-preview-card[label="Invoice overlay provenance"] sh-myth'),
  ).toContainText("x→x");
  expect(errors).toEqual([]);
});

for (const name of ["Mixed node forms", "KTK-1 trace ledger", "Revision graph"]) {
  test(`restored ${name} renders its graph`, async ({ page }) => {
    await page.goto(`/components/sh-tree?example=${encodeURIComponent(name)}`);
    const frame = page.frameLocator("iframe.stage-frame");
    await expect(frame.getByRole("tree")).toBeVisible();
    await expect(frame.locator('sh-tree [part="canvas"]')).toBeVisible();
    await expect(frame.locator('sh-tree [part~="edge"]').first()).toHaveAttribute("d", /^M /);
  });
}
