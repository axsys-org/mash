import { expect, test } from "@playwright/test";

test("button async action completes and can be repeated", async ({ page }) => {
  await page.goto("/components/ui-button?example=Async%20action", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(frame.getByRole("button", { name: "Saving", exact: true })).toBeDisabled();
  await expect(frame.locator("#save-result")).toHaveText("All changes saved");
  await frame.getByRole("button", { name: "Make another change", exact: true }).click();
  await expect(frame.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();
});

test("formatting and filter toggles change their actual content", async ({ page }) => {
  await page.goto("/components/ui-toggle?example=Formatting%20controls", {
    waitUntil: "domcontentloaded",
  });
  let frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Bold", exact: true }).click();
  await frame.getByRole("button", { name: "Italic", exact: true }).click();
  await expect(frame.locator("#formatted-text")).toHaveCSS("font-weight", "700");
  await expect(frame.locator("#formatted-text")).toHaveCSS("font-style", "italic");
  await page.goto("/components/ui-toggle-group?example=Multiple%20filters", {
    waitUntil: "domcontentloaded",
  });
  frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Documents", exact: true }).click();
  await expect(frame.locator("#filtered-files li")).toHaveCount(1);
  await frame.getByRole("button", { name: "Images", exact: true }).click();
  await expect(frame.locator("#filter-count")).toHaveText("No file types selected");
});

test("keyboard hint and effective binding change together", async ({ page }) => {
  await page.goto("/components/ui-kbd?example=Live%20command%20binding", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  const run = frame.getByRole("button", { name: "Run command", exact: true });
  await run.focus();
  await run.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
  await expect(frame.locator("#binding-result")).toHaveText("Command ran 1 time");
  await frame.getByRole("combobox", { name: "Shortcut", exact: true }).click();
  await frame.getByRole("option", { name: "Primary + Shift + K", exact: true }).click();
  await expect(frame.locator("#binding-hint")).toHaveAttribute("shortcut", "Primary+Shift+K");
  await run.press(process.platform === "darwin" ? "Meta+Shift+K" : "Control+Shift+K");
  await expect(frame.locator("#binding-result")).toHaveText("Command ran 2 times");
});

test("outlined punctuation and Windows separators are visible", async ({ page }) => {
  await page.goto("/components/ui-kbd?example=Treatments%20and%20punctuation", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  const plus = frame.locator('ui-kbd[appearance="outline"][shortcut="Primary++"]');
  await plus.evaluate((node) => node.setAttribute("platform", "windows"));
  await expect(plus.locator('[part="separator"]')).toBeVisible();
  await expect(plus.locator('[part="key"]')).toHaveText("+");
});

test("progress action cancels cleanly and produces a downloadable report", async ({ page }) => {
  await page.goto("/components/ui-button?example=Progress%20action", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  await expect(frame.locator("#export-progress")).toBeVisible();
  expect((await frame.locator("#export-progress").boundingBox())!.width).toBeLessThanOrEqual(24);
  expect(
    (await frame.getByRole("button", { name: "Export report", exact: true }).boundingBox())!.height,
  ).toBeLessThanOrEqual(40);
  await frame.getByRole("button", { name: "Export report", exact: true }).click();
  await frame.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(frame.locator("#export-result")).toHaveText("Export cancelled");
  await frame.getByRole("button", { name: "Export report", exact: true }).click();
  const link = frame.getByRole("link", { name: "Download report.csv" });
  await expect(link).toBeVisible();
  expect(
    await link.evaluate(async (node) => (await fetch((node as HTMLAnchorElement).href)).text()),
  ).toBe("Document,Status\nRelease notes,Reviewed\nDesign notes,Ready\n");
});

test("range fill stays between its handles across direction and orientation", async ({ page }) => {
  await page.goto("/components/ui-slider?example=Range");
  const host = page.locator('iframe[data-variant="Range"]');
  await host.scrollIntoViewIfNeeded();
  const frame = page.frameLocator('iframe[data-variant="Range"]');
  await expect(frame.locator("html")).toHaveAttribute("data-example-ready", "true");
  const slider = frame.locator("ui-slider");
  for (const orientation of ["horizontal", "vertical"]) {
    for (const reversed of [false, true]) {
      for (const dir of ["ltr", "rtl"]) {
        const bounds = await slider.evaluate(
          async (element, state) => {
            element.setAttribute("orientation", state.orientation);
            element.toggleAttribute("reversed", state.reversed);
            element.setAttribute("dir", state.dir);
            await (element as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
            const box = (part: string) =>
              element.shadowRoot!.querySelector(`[part~="${part}"]`)!.getBoundingClientRect();
            const start = box("start-thumb"),
              end = box("end-thumb"),
              fill = box("indicator");
            const vertical = state.orientation === "vertical";
            return {
              centers: vertical
                ? [start.y + start.height / 2, end.y + end.height / 2]
                : [start.x + start.width / 2, end.x + end.width / 2],
              fill: vertical ? [fill.top, fill.bottom] : [fill.left, fill.right],
            };
          },
          { orientation, reversed, dir },
        );
        expect(Math.abs(bounds.fill[0]! - Math.min(...bounds.centers))).toBeLessThan(1);
        expect(Math.abs(bounds.fill[1]! - Math.max(...bounds.centers))).toBeLessThan(1);
      }
    }
  }
});

test("quiet scrollbars retain pointer targets and follow native scroll boundaries", async ({
  page,
}) => {
  await page.goto("/components/ui-scroll-area?example=Quiet%20vertical");
  const frame = page.frameLocator('iframe[data-variant="Quiet vertical"]');
  const area = frame.locator("ui-scroll-area");
  const bar = area.locator('[part="block-scrollbar"]');
  const thumb = area.locator('[part="block-thumb"]');
  await expect(bar).toBeVisible();
  await bar.press("Home");
  await expect(area).toHaveJSProperty("orientation", "vertical");
  await expect
    .poll(() => area.evaluate((node) => node.matches(":state(at-block-start)")))
    .toBe(true);
  const startMask = await area
    .locator('[part="viewport"]')
    .evaluate((node) => getComputedStyle(node).maskImage);
  const barBox = (await bar.boundingBox())!;
  const thumbBox = (await thumb.boundingBox())!;
  expect(barBox.width).toBeGreaterThan(thumbBox.width);
  await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(thumbBox.x + thumbBox.width / 2, barBox.y + barBox.height - 2, {
    steps: 6,
  });
  await page.mouse.up();
  await expect.poll(() => bar.getAttribute("aria-valuenow")).not.toBe("0");
  await bar.press("End");
  await expect.poll(() => area.evaluate((node) => node.matches(":state(at-block-end)"))).toBe(true);
  expect(
    await area.locator('[part="viewport"]').evaluate((node) => getComputedStyle(node).maskImage),
  ).not.toBe(startMask);

  await page.goto("/components/ui-scroll-area?example=Horizontal%20months");
  const months = page.frameLocator('iframe[data-variant="Horizontal months"]');
  const horizontalBar = months.locator('[part="inline-scrollbar"]');
  await horizontalBar.press("Home");
  await months.getByRole("button", { name: "Next", exact: true }).click();
  await expect
    .poll(async () => Number(await horizontalBar.getAttribute("aria-valuenow")))
    .toBeGreaterThan(0);
});

test("two-axis scroll composition exposes both controls and uses native bars on touch", async ({
  page,
  browser,
}) => {
  await page.goto("/components/ui-scroll-area?example=Both%20axes");
  const frame = page.frameLocator('iframe[data-variant="Both axes"]');
  await expect(frame.locator('[part="block-scrollbar"]')).toBeVisible();
  await expect(frame.locator('[part="inline-scrollbar"]')).toBeVisible();
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const touchPage = await context.newPage();
    await touchPage.goto(
      new URL("/components/ui-scroll-area?example=Quiet%20vertical", page.url()).href,
    );
    const touchFrame = touchPage.frameLocator('iframe[data-variant="Quiet vertical"]');
    await expect(touchFrame.locator("html")).toHaveAttribute("data-example-ready", "true");
    await expect(touchFrame.locator('[part="block-scrollbar"]')).toBeHidden();
    await expect(touchFrame.locator('[part="viewport"]')).toHaveCSS("scrollbar-width", "auto");
  } finally {
    await context.close();
  }
});

test("number fields retain native drafts, stable geometry and bounded keyboard steps", async ({
  page,
}) => {
  await page.goto("/components/ui-number-field?example=Units%20and%20compact%20controls");
  const frame = page.frameLocator('iframe[data-variant="Units and compact controls"]');
  const rotation = frame.getByRole("spinbutton", { name: "Rotation", exact: true });
  const host = frame.locator('ui-number-field[label="Rotation"]');
  const original = (await host.boundingBox())!;
  await rotation.fill("");
  await rotation.pressSequentially("-12.5");
  await expect(rotation).toHaveValue("-12.5");
  expect((await host.boundingBox())!.width).toBeCloseTo(original.width, 0);
  await rotation.press("ArrowUp");
  await expect(rotation).toHaveValue("-12");
  await rotation.press("Shift+ArrowUp");
  await expect(rotation).toHaveValue("-2");
  const group = (await host.locator('[part="group"]').boundingBox())!;
  const increment = (await host.getByRole("button", { name: "Increase Rotation" }).boundingBox())!;
  const decrement = (await host.getByRole("button", { name: "Decrease Rotation" }).boundingBox())!;
  expect(increment.x).toBeCloseTo(decrement.x, 0);
  expect(increment.y + increment.height).toBeLessThanOrEqual(decrement.y + 1);
  expect(decrement.y + decrement.height).toBeLessThanOrEqual(group.y + group.height);
  const opacity = frame.getByRole("spinbutton", { name: "Opacity", exact: true });
  await opacity.fill("100");
  await opacity.press("Tab");
  await expect(frame.getByRole("button", { name: "Increase Opacity" })).toBeDisabled();
});

test("number editing can cross the minimum, submit empty optional values and reset", async ({
  page,
}) => {
  await page.goto("/components/ui-number-field?example=Editing%20and%20validation");
  const frame = page.frameLocator('iframe[data-variant="Editing and validation"]');
  const quantity = frame.getByRole("spinbutton", { name: "Quantity", exact: true });
  await quantity.fill("");
  await quantity.pressSequentially("250");
  await expect(quantity).toHaveValue("250");
  await frame.getByRole("button", { name: "Apply values", exact: true }).click();
  await expect(frame.locator("output")).toHaveText("Quantity: 250 · no discount");
  await quantity.fill("2");
  await expect(quantity).toHaveValue("2");
  await quantity.press("Tab");
  await expect(quantity).toHaveValue("100");
  await quantity.fill("");
  await frame.getByRole("button", { name: "Apply values", exact: true }).click();
  await expect(quantity).toHaveValue("");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  await frame.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(quantity).toHaveValue("120");
  await expect(quantity).not.toHaveAttribute("aria-invalid", "true");
});

test("switch dragging commits once, cancels cleanly and leaves label activation usable", async ({
  page,
}) => {
  await page.goto("/components/ui-switch?example=Fluid%20toggle");
  const frame = page.frameLocator('iframe[data-variant="Fluid toggle"]');
  const host = frame.locator("#fluid-switch");
  const control = host.getByRole("switch");
  const box = (await control.boundingBox())!;
  await host.evaluate((node) => {
    node.addEventListener("ui-switch-change", () =>
      node.setAttribute("data-changes", String(Number(node.getAttribute("data-changes") || 0) + 1)),
    );
  });
  await page.mouse.move(box.x + 6, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(control).toBeChecked();
  await expect(host).toHaveAttribute("data-changes", "1");
  await page.mouse.move(box.x + box.width - 6, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 3, box.y + box.height / 2, { steps: 4 });
  await control.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse" });
  await page.mouse.up();
  await expect(control).toBeChecked();
  await expect(host).not.toHaveAttribute("data-dragging", "");
  await host.locator(".mash-weight > span").click();
  await expect(control).not.toBeChecked();
  await control.press("Space");
  await expect(control).toBeChecked();
  await host.evaluate((node) => {
    node.setAttribute("dir", "rtl");
    (node as HTMLElement & { checked: boolean }).checked = false;
  });
  await expect(control).not.toBeChecked();
  const rtl = (await control.boundingBox())!;
  await page.mouse.move(rtl.x + rtl.width - 6, rtl.y + rtl.height / 2);
  await page.mouse.down();
  await page.mouse.move(rtl.x + 3, rtl.y + rtl.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(control).toBeChecked();
});

test("switch labels and inherited sizing stay usable in disabled and controlled settings", async ({
  page,
}) => {
  await page.goto("/components/ui-switch?example=Size%20context%20and%20availability");
  const frame = page.frameLocator('iframe[data-variant="Size context and availability"]');
  const inherited = (await frame
    .getByRole("switch", { name: "Inherited compact", exact: true })
    .boundingBox())!;
  const compact = (await frame
    .getByRole("switch", { name: "Pinned compact", exact: true })
    .boundingBox())!;
  const normal = (await frame
    .getByRole("switch", { name: "Default size", exact: true })
    .boundingBox())!;
  expect(inherited.width).toBe(compact.width);
  expect(normal.width).toBeGreaterThan(compact.width);
  await expect(
    frame.getByRole("switch", { name: "Disabled by fieldset", exact: true }),
  ).toBeDisabled();
  await page.goto("/components/ui-switch?example=Controlled%20setting");
  const controlled = page.frameLocator('iframe[data-variant="Controlled setting"]');
  await controlled.getByRole("button", { name: "Enable", exact: true }).click();
  await expect(
    controlled.getByRole("switch", { name: "Sync over cellular", exact: true }),
  ).toBeChecked();
  await controlled.getByRole("button", { name: "Disable", exact: true }).click();
  await expect(
    controlled.getByRole("switch", { name: "Sync over cellular", exact: true }),
  ).not.toBeChecked();
});

test("size context preserves edits and selection while resizing the whole workspace", async ({
  page,
}) => {
  await page.goto("/components/ui-toolbar?example=Size%20context", {
    waitUntil: "domcontentloaded",
  });
  const frame = page.frameLocator("iframe.stage-frame");
  const search = frame.getByRole("textbox", { name: "Find documents", exact: true });
  await search.fill("Keep my draft");
  await frame.getByRole("tab", { name: "Shared", exact: true }).click();
  await frame.getByRole("combobox", { name: "Workspace size", exact: true }).click();
  await frame.getByRole("option", { name: "Compact · 28px", exact: true }).click();
  await expect(search).toHaveValue("Keep my draft");
  await expect(frame.getByRole("tab", { name: "Shared", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(frame.locator("#size-workspace")).toHaveAttribute("data-mash-size", "compact");
  await expect(frame.locator("#size-new").getByRole("button")).toHaveCSS("height", "28px");
  await expect(frame.locator("#size-new ui-icon")).toHaveCSS("width", "14px");
  await frame.getByRole("button", { name: "Actions", exact: true }).click();
  await expect(frame.getByRole("menuitem", { name: "Duplicate document", exact: true })).toHaveCSS(
    "height",
    "28px",
  );
  await frame.getByRole("menuitem", { name: "Duplicate document", exact: true }).click();
  await expect(frame.locator("#size-result")).toHaveText("Document duplicated");
  await frame.getByRole("combobox", { name: "Workspace size", exact: true }).click();
  await frame.getByRole("option", { name: "Default · 36px", exact: true }).click();
  await expect(frame.locator("#size-new").getByRole("button")).toHaveCSS("height", "36px");
  await expect(frame.locator("#size-new ui-icon")).toHaveCSS("width", "16px");
  await expect(search).toHaveValue("Keep my draft");
  // Padded segmented tabs occupy exactly the same ladder step as adjacent controls.
  await expect(frame.locator("#size-workspace ui-tabs").locator('[part="list"]')).toHaveCSS(
    "height",
    "36px",
  );
});
