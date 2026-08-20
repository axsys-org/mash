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
  });
});
