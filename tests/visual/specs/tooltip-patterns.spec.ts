import { expect, test, type Page } from "@playwright/test";

async function example(page: Page, name: string) {
  await page.goto(`/components/ui-tooltip?example=${encodeURIComponent(name)}`);
  const host = page.locator(`iframe[data-variant="${name}"]`);
  await host.scrollIntoViewIfNeeded();
  const frame = host.contentFrame();
  await expect(frame.locator("html")).toHaveAttribute("data-example-ready", "true");
  return frame;
}

test("keyboard hints describe native controls and dismiss without stealing focus", async ({
  page,
}) => {
  const frame = await example(page, "Action hints");
  const button = frame.getByRole("button", { name: "Save changes", exact: true });
  await button.focus();
  await expect(frame.getByRole("tooltip", { name: "Save changes", exact: true })).toBeVisible();
  await expect(button).toHaveAccessibleDescription("Save changes");
  await button.press("Escape");
  await expect(frame.getByRole("tooltip", { name: "Save changes", exact: true })).toBeHidden();
  await expect(button).toBeFocused();
  await frame.getByRole("textbox", { name: "Page draft" }).fill("A retained draft");
  await button.click();
  await expect(frame.locator("output")).toHaveText("Saved · 16 characters");
});

test("cursor tracking follows only the selected axis and keyboard focus restores anchoring", async ({
  page,
}) => {
  const frame = await example(page, "Follow the cursor");
  const trigger = frame.getByRole("button", { name: "Move across the timeline" });
  await trigger.hover();
  const tooltip = frame.locator('ui-tooltip[follow-cursor="x"]');
  await expect(tooltip).toHaveAttribute("open", "");
  await expect(tooltip).toHaveJSProperty("open", true);
  await expect(frame.locator('ui-tooltip[follow-cursor="x"]:state(active)')).toHaveCount(1);
  const rect = (await trigger.boundingBox())!;
  await page.mouse.move(rect.x + 80, rect.y + 20);
  const popup = tooltip.getByRole("tooltip");
  await expect
    .poll(async () =>
      Math.abs(
        (await popup.boundingBox())!.x + (await popup.boundingBox())!.width / 2 - (rect.x + 80),
      ),
    )
    .toBeLessThan(2);
  const first = (await popup.boundingBox())!;
  await page.mouse.move(rect.x + 150, rect.y + 20);
  await expect.poll(async () => (await popup.boundingBox())!.x - first.x).toBeCloseTo(70, 0);
  expect((await popup.boundingBox())!.y).toBeCloseTo(first.y, 0);
  await trigger.focus();
  await expect
    .poll(async () =>
      Math.abs(
        (await popup.boundingBox())!.x +
          (await popup.boundingBox())!.width / 2 -
          (rect.x + rect.width / 2),
      ),
    )
    .toBeLessThan(2);
  const rail = frame.getByRole("button", { name: "Move along the rail" });
  await rail.hover();
  const railTip = frame.locator('ui-tooltip[follow-cursor="y"]');
  await expect(railTip.locator('[part="popup"]')).toBeVisible();
  const railRect = (await rail.boundingBox())!;
  await page.mouse.move(railRect.x + 20, railRect.y + 50);
  await expect(frame.locator('ui-tooltip[follow-cursor="y"]:state(active)')).toHaveCount(1);
  const railPopup = railTip.getByRole("tooltip");
  await expect
    .poll(async () =>
      Math.abs(
        (await railPopup.boundingBox())!.y +
          (await railPopup.boundingBox())!.height / 2 -
          (railRect.y + 50),
      ),
    )
    .toBeLessThan(2);
  const before = (await railPopup.boundingBox())!;
  await page.mouse.move(railRect.x + 20, railRect.y + 120);
  await expect.poll(async () => (await railPopup.boundingBox())!.y - before.y).toBeCloseTo(70, 0);
  expect((await railPopup.boundingBox())!.x).toBeCloseTo(before.x, 0);
});

test("forced visibility overrides interaction and can be released", async ({ page }) => {
  const frame = await example(page, "Controlled visibility");
  const select = frame.getByRole("combobox", { name: "Visibility" });
  await select.click();
  await frame.getByRole("option", { name: "Force open", exact: true }).click();
  const tooltip = frame.getByRole("tooltip", { name: "The application owns this hint" });
  await expect(tooltip).toBeVisible();
  await frame.getByRole("button", { name: "Controlled hint", exact: true }).press("Escape");
  await expect(tooltip).toBeVisible();
  await select.click();
  await frame.getByRole("option", { name: "Force closed", exact: true }).click();
  await frame.getByRole("button", { name: "Controlled hint", exact: true }).focus();
  await expect(tooltip).toBeHidden();
  await select.click();
  await frame.getByRole("option", { name: "Hover and focus", exact: true }).click();
  await frame.getByRole("button", { name: "Controlled hint", exact: true }).focus();
  await expect(tooltip).toBeVisible();
});

test("a nested hint dismisses before its dialog and removed triggers clean up their descriptions", async ({
  page,
}) => {
  let frame = await example(page, "Inside a dialog");
  await frame.getByRole("button", { name: "Open page details" }).click();
  const info = frame.getByRole("button", { name: "About page names" });
  await info.focus();
  await expect(info).toHaveAccessibleDescription("Names are visible to everyone in this workspace");
  await expect(frame.getByRole("tooltip")).toBeVisible();
  await info.press("Escape");
  await expect(frame.getByRole("tooltip")).toBeHidden();
  await expect(frame.getByRole("dialog")).toBeVisible();
  await info.press("Escape");
  await expect(frame.getByRole("dialog")).toBeHidden();
  frame = await example(page, "Removed trigger");
  await frame.getByRole("button", { name: "Remove me" }).focus();
  await expect(frame.getByRole("tooltip")).toBeVisible();
  await frame.getByRole("button", { name: "Remove me" }).click();
  await expect(frame.getByRole("tooltip")).toHaveCount(0);
  await frame.getByRole("button", { name: "Restore button" }).click();
  await expect(frame.getByRole("button", { name: "Remove me" })).toHaveAccessibleDescription(
    "This trigger can be removed",
  );
});
