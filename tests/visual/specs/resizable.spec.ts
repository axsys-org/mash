import { expect, test } from "@playwright/test";

test.describe("resizable separator anatomy", () => {
  test("keeps a generous hit target while the semantic indicator owns interaction state", async ({
    page,
  }) => {
    await page.goto("/components/ui-resizable?theme=dark&example=Handle+treatments");
    const preview = page.frameLocator("iframe.stage-frame");
    const handle = preview.locator("ui-resizable-handle").first();
    const control = handle.locator('[part="control"]');
    const grip = handle.locator('[part="grip"]');

    await expect(grip).toBeVisible();
    await expect(control).toHaveAttribute("role", "separator");
    await expect(control).toHaveAttribute("aria-valuemin", "112");
    await expect(control).toHaveAttribute("aria-valuemax", "248");
    await expect(control).toHaveAttribute("aria-valuenow", "176");
    await expect(control).toHaveAttribute("aria-controls", /mash-resizable-panel-/);
    await expect(preview.locator("ui-resizable-handle > ui-separator")).toHaveCount(2);

    const idleColor = await grip.evaluate((node) => getComputedStyle(node).backgroundColor);
    await control.hover();
    const hoverColor = await grip.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(hoverColor).not.toBe(idleColor);

    const bounds = await control.boundingBox();
    if (!bounds) throw new Error("Resize separator must be visible.");
    await page.mouse.down();
    await expect(handle).toHaveAttribute("resizing", "");
    const activeColor = await grip.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(activeColor).not.toBe(hoverColor);
    await page.mouse.move(bounds.x + bounds.width / 2 + 24, bounds.y + bounds.height / 2, {
      steps: 4,
    });
    await page.mouse.up();

    await expect(handle).not.toHaveAttribute("resizing", "");
    await expect(control).not.toHaveAttribute("aria-valuenow", "176");
  });

  test("composes horizontal and vertical splitters without changing the primitive API", async ({
    page,
  }) => {
    await page.goto("/components/ui-resizable?example=Nested+workspace");
    const preview = page.frameLocator("iframe.stage-frame");

    await expect(preview.locator('ui-resizable[orientation="horizontal"]')).toHaveCount(1);
    await expect(preview.locator('ui-resizable[orientation="vertical"]')).toHaveCount(1);
    await expect(
      preview.locator('ui-resizable-handle[orientation="horizontal"] [part="control"]'),
    ).toHaveAttribute("aria-orientation", "horizontal");
    await expect(
      preview.locator('ui-resizable-handle[orientation="vertical"] [part="control"]'),
    ).toHaveAttribute("aria-orientation", "vertical");
  });

  test("documents independent nested constraints and a flexible growing neighbor", async ({
    page,
  }) => {
    await page.goto("/components/ui-resizable?example=Nested+panel+constraints");
    let preview = page.frameLocator("iframe.stage-frame");
    await expect(preview.locator("ui-resizable-panel")).toHaveCount(6);
    await expect(preview.locator("ui-resizable-handle")).toHaveCount(4);
    await expect(preview.locator('ui-resizable[orientation="horizontal"]')).toHaveCount(1);
    await expect(preview.locator('ui-resizable[orientation="vertical"]')).toHaveCount(1);

    await page.goto("/components/ui-resizable?example=Growing+neighbor");
    preview = page.frameLocator("iframe.stage-frame");
    const panels = preview.locator("ui-resizable-panel");
    await expect(panels).toHaveCount(2);
    await expect(panels.first()).toHaveAttribute("size", "184");
    await expect(panels.last()).toHaveAttribute("size", "0");
  });

  test("keeps visibility and flexible sizing under consumer control", async ({ page }) => {
    await page.goto("/components/ui-resizable?example=Visibility+and+flex+behavior");
    const preview = page.frameLocator("iframe.stage-frame");
    const panels = preview.locator("[data-catalog-resizable-group] > ui-resizable-panel");
    const handles = preview.locator("[data-catalog-resizable-group] > ui-resizable-handle");
    const output = preview.locator("[data-catalog-resizable-output]");

    await preview.locator("[data-catalog-resizable-visibility]").click();
    await expect(panels.first()).toBeHidden();
    await expect(handles.first()).toBeHidden();
    await expect(output).toContainText("2 panels visible");

    await preview.locator("[data-catalog-resizable-visibility]").click();
    await expect(panels.first()).toBeVisible();
    await expect(handles.first()).toBeVisible();

    await preview.locator("[data-catalog-resizable-flex]").click();
    await expect(panels.first()).toHaveAttribute("size", "0");
    await expect(output).toContainText("Navigator flexible");
  });

  test("routes programmatic compact and reset actions through the group API", async ({ page }) => {
    await page.goto("/components/ui-resizable?example=Programmatic+sizing");
    const preview = page.frameLocator("iframe.stage-frame");
    const first = preview.locator("[data-catalog-resizable-group] > ui-resizable-panel").first();
    const output = preview.locator("[data-catalog-resizable-output]");

    await preview.locator('[data-catalog-resizable-size="0:112"]').click();
    await expect(first).toHaveAttribute("size", "112");
    await expect(output).toContainText("Navigator 112px");

    await preview.locator('[data-catalog-resizable-reset="0"]').click();
    await expect(first).toHaveAttribute("size", "192");
    await expect(output).toContainText("Navigator 192px");
  });
});
