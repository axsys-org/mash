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
    await expect(page.getByRole("button", { name: "controls", exact: true })).toHaveCount(0);

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

  test("keeps real label attributes distinct from named slot content", async ({ page }) => {
    await page.goto("/components/ui-input?example=controls&label=Search");

    const prefixControl = page.locator(".control", { hasText: "prefix slot" }).locator("input");
    const suffixControl = page.locator(".control", { hasText: "suffix slot" }).locator("input");
    await prefixControl.fill("⌕");
    await suffixControl.fill("⌘ K");

    const preview = page.frameLocator("iframe.stage-frame").locator("ui-input");
    const composition = await preview.evaluate((node) => {
      const shadow = node.shadowRoot!;
      const content = (name: string) =>
        shadow
          .querySelector<HTMLSlotElement>(`slot[name="${name}"]`)!
          .assignedNodes()
          .map((child) => child.textContent);

      return {
        label: shadow.querySelector<HTMLInputElement>("input")!.getAttribute("aria-label"),
        prefix: content("prefix"),
        suffix: content("suffix"),
      };
    });

    expect(composition).toEqual({ label: "Search", prefix: ["⌕"], suffix: ["⌘ K"] });
    await expect(page).toHaveURL(/label=Search/);
    await expect(page).toHaveURL(/slot-prefix=%E2%8C%95/);
    await expect(page).toHaveURL(/slot-suffix=%E2%8C%98\+K/);
  });
});
