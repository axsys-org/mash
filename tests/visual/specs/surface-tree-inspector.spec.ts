import { expect, test } from "@playwright/test";

const labelNode = "mash://ui-button/node/label";

test("SurfaceTree selection, provenance, realization, and deep links stay connected", async ({
  page,
}) => {
  await page.goto("/components/ui-button?theme=dark&example=Content+variants");

  await page.locator(`[data-mash-node-address="${labelNode}"]`).click();
  expect(new URL(page.url()).searchParams.get("node")).toBe(labelNode);
  expect(new URL(page.url()).searchParams.get("example")).toBe("Content variants");

  const inspector = page.locator(`[data-selected-node-address="${labelNode}"]`);
  await expect(inspector).toBeVisible();
  await expect(inspector.locator(".surface-selection-owner")).toHaveText("ui-button");
  await expect(inspector.locator("[data-selected-binding-address]")).toHaveCount(2);
  await expect(inspector.getByText(/fallback/).first()).toBeVisible();
  await expect(inspector.getByText(/active \d+\/\d+ rules/)).toBeVisible();
  await expect(inspector.getByText(/Token provenance/)).toBeVisible();

  const frame = page.frameLocator("iframe.stage-frame");
  await expect(frame.locator('.mash-semantic-box[data-selected="true"]')).not.toHaveCount(0);

  await page.reload();
  await expect(page.locator(`[data-selected-node-address="${labelNode}"]`)).toBeVisible();
  await expect(page.locator(".segment.is-active").filter({ hasText: "dark" })).toBeVisible();
  await expect(
    page.locator(".segment.is-active").filter({ hasText: "Content variants" }),
  ).toBeVisible();
});

test("selecting a concrete preview region identifies its node and Web binding", async ({
  page,
}) => {
  await page.goto("/components/ui-button");
  await page.getByRole("button", { name: "show semantic map" }).click();

  const boxes = page.frameLocator("iframe.stage-frame").locator(".mash-semantic-box:not([hidden])");
  await expect(boxes.first()).toBeVisible();
  const targets = await boxes.evaluateAll((nodes) =>
    nodes.map((node, index) => ({
      index,
      node: (node as HTMLElement).dataset.mashNodeAddress ?? "",
      bindings: JSON.parse((node as HTMLElement).dataset.mashBindingAddresses ?? "[]") as string[],
    })),
  );
  const target = targets.find((candidate) => candidate.bindings.length === 1);
  expect(target).toBeTruthy();
  await boxes.nth(target!.index).evaluate((node: HTMLButtonElement) => node.click());

  const url = new URL(page.url());
  expect(url.searchParams.get("node")).toBe(target!.node);
  expect(url.searchParams.get("binding")).toBe(target!.bindings[0]);
  await expect(page.locator(`[data-selected-node-address="${target!.node}"]`)).toBeVisible();
  await expect(
    page.locator(`[data-selected-binding-address="${target!.bindings[0]}"]`),
  ).toHaveClass(/is-selected/);
});

test("an unrealized semantic region is reported rather than silently omitted", async ({ page }) => {
  const spinner = "mash://ui-button/node/spinner";
  await page.goto(`/components/ui-button?node=${encodeURIComponent(spinner)}`);
  const inspector = page.locator(`[data-selected-node-address="${spinner}"]`);
  await expect(inspector).toBeVisible();
  await expect(inspector.locator(".surface-realization-summary")).toContainText("0 regions");
  await expect(inspector.locator(".surface-realization-summary")).toHaveClass(/is-missing/);
});

test("the docked property panel is composed from Mash controls", async ({ page }) => {
  const control = "mash://ui-button/node/control";
  await page.goto(`/components/ui-button?example=controls&node=${encodeURIComponent(control)}`);

  const panel = page.getByRole("complementary", { name: "Semantic properties inspector" });
  await expect(panel).toBeVisible();
  await expect(panel.locator("ui-accordion.inspector-sections")).toHaveCount(1);
  await expect(panel.locator("ui-accordion-item.inspector-section")).not.toHaveCount(0);
  await expect(panel.locator("ui-field.recipe-field")).not.toHaveCount(0);
  await expect(panel.locator("ui-select.recipe-kind-control")).not.toHaveCount(0);
  await expect(panel.locator("ui-input.recipe-value-control")).not.toHaveCount(0);
  await expect(panel.locator("ui-toggle-group.inspector-choice-group")).not.toHaveCount(0);
  await expect(panel.locator("ui-button.inspector-action")).not.toHaveCount(0);

  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(300);
  expect(box!.width).toBeLessThanOrEqual(320);
  expect(Math.round(box!.x + box!.width)).toBe(viewport!.width);

  await panel.locator("ui-toggle.inspector-picker").click();
  await expect(
    page.frameLocator("iframe.stage-frame").locator(".mash-semantic-box:not([hidden])").first(),
  ).toBeVisible();
});
