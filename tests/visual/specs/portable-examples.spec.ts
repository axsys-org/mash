import { expect, test } from "@playwright/test";

// Registration and rendered content are checked for every example by
// example-variants.spec.ts. Check the shared copy/export contract once.
test("reference code uses public package imports", async ({ page }) => {
  await page.goto("/components/ui-toolbar");
  await page.locator(".reference-code summary").first().click();
  const code = page.locator(".reference-code pre").first();
  await expect(code).toContainText('import "@mash/ui";');
  await expect(code).toContainText("@mash/ui/catalogue/mash.css");
  await expect(code).not.toContainText("/register");
});

test("mixed toolbar restores its theme, geometry, and keyboard navigation", async ({ page }) => {
  await page.goto("/components/ui-toolbar?example=Mixed%20controls&theme=dark");
  const stage = page.frameLocator("iframe.stage-frame");
  await expect(stage.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(stage.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  const frame = (await (await page.locator("iframe.stage-frame").elementHandle())!.contentFrame())!;
  const heights = await frame.evaluate(() =>
    [...document.querySelector("ui-toolbar")!.children].map((host) => {
      const part = host.localName === "ui-select" ? "trigger" : "control";
      return host.shadowRoot!.querySelector(`[part="${part}"]`)!.getBoundingClientRect().height;
    }),
  );
  expect(heights).toEqual([24, 24, 24, 24]);
  await stage.getByRole("button", { name: "New", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(stage.getByRole("textbox", { name: "Find in document" })).toBeFocused();
  await stage.getByRole("combobox", { name: "Status" }).click();
  await stage.getByRole("option", { name: "In review", exact: true }).click();
  await expect(stage.getByRole("combobox", { name: "Status" })).toContainText("In review");
});

for (const theme of ["light", "dark"]) {
  test(`${theme} distinguishes hover, press, selection, and inverse surfaces`, async ({ page }) => {
    await page.goto("/components/ui-button?example=Theme%20boundaries");
    const stage = page.frameLocator("iframe.stage-frame");
    const panel = stage.locator(`.mash-panel[data-theme="${theme}"]`);
    const fill = (name: string) => panel.getByRole("button", { name, exact: true });
    const background = async (name: string) =>
      fill(name).evaluate((node) => getComputedStyle(node).backgroundColor);
    const secondary = await background("Secondary");
    await fill("Secondary").hover();
    await expect.poll(() => background("Secondary")).not.toBe(secondary);
    const hover = await background("Secondary");
    await page.mouse.down();
    await expect.poll(() => background("Secondary")).not.toBe(hover);
    await page.mouse.up();
    await fill("Primary").hover();
    const selected = await background("Selected");
    await fill("Selected").hover();
    await expect.poll(() => background("Selected")).not.toBe(selected);
    await fill("Unselected").hover();
    await expect.poll(() => background("Selected")).toBe(selected);
    const disabled = await background("Disabled");
    await fill("Disabled").hover({ force: true });
    expect(await background("Disabled")).toBe(disabled);
    await fill("Details").focus();
    const tooltip = panel.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    const inverse = await tooltip.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      foreground: getComputedStyle(node).color,
    }));
    expect(inverse.background).not.toBe(inverse.foreground);
    // Ordinary surface customization must not change the inverse foreground.
    await panel.evaluate((node) =>
      (node as HTMLElement).style.setProperty("--color-surface", "rgb(123, 45, 67)"),
    );
    expect(await tooltip.evaluate((node) => getComputedStyle(node).color)).toBe(inverse.foreground);
  });
}

test("menus default to opaque surfaces and preserve keyboard selection", async ({ page }) => {
  await page.goto("/components/ui-menu");
  const stage = page.frameLocator("iframe.stage-frame");
  await stage.getByRole("button", { name: "Edit", exact: true }).focus();
  await page.keyboard.press("Enter");
  const copy = stage.getByRole("menuitem", { name: /Copy/ });
  await expect(copy).toBeVisible();
  await expect(stage.locator('ui-menu [part="material"]')).toHaveCSS("display", "none");
  await copy.focus();
  await page.keyboard.press("ArrowDown");
  await expect(stage.getByRole("menuitem", { name: "Paste", exact: true })).toBeFocused();
  await expect(stage.getByRole("menuitem", { name: "Paste", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("ArrowDown");
  await expect(stage.getByRole("menuitemcheckbox", { name: "Word wrap" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(stage.getByRole("button", { name: "Edit", exact: true })).toBeFocused();
});
