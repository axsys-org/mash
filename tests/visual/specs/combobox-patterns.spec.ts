import { expect, test, type Page } from "@playwright/test";

async function example(page: Page, name: string) {
  await page.goto(`/components/ui-combobox?example=${encodeURIComponent(name)}`);
  const host = page.locator(`iframe[data-variant="${name}"]`);
  await host.scrollIntoViewIfNeeded();
  const frame = host.contentFrame();
  await expect(frame.locator("html")).toHaveAttribute("data-example-ready", "true");
  return frame;
}

test("selection displays labels, filters on typing, clears, and reopens the complete list", async ({
  page,
}) => {
  const frame = await example(page, "Single selection");
  const field = frame.getByRole("combobox", { name: "Framework", exact: true });
  await field.fill("next");
  await field.press("Enter");
  await expect(field).toHaveValue("Next.js");
  await expect(frame.locator("output")).toContainText("next");
  await frame.getByRole("button", { name: "Open suggestions", exact: true }).click();
  await expect(frame.getByRole("option")).toHaveCount(7);
  await frame.getByRole("option", { name: "Astro", exact: true }).click();
  await expect(field).toHaveValue("Astro");
  await frame.getByRole("button", { name: "Clear selection" }).click();
  await expect(field).toHaveValue("");
  await field.fill("no results");
  await expect(frame.getByText("No matches found", { exact: true })).toBeVisible();
  await frame.getByRole("button", { name: "Clear selection" }).click();
  await expect(field).toHaveValue("");
  await field.press("Escape");
  await expect(field).toHaveAttribute("aria-expanded", "false");
});

test("multiple picks, creation and chip removal keep keyboard focus usable", async ({ page }) => {
  const frame = await example(page, "Create from search");
  const field = frame.getByRole("combobox", { name: "Labels", exact: true });
  await field.fill("Interaction");
  await expect(
    frame.getByRole("option", { name: "Create “Interaction”", exact: true }),
  ).toBeVisible();
  await field.press("Enter");
  await expect(frame.locator("#choice")).toHaveJSProperty("values", ["Design", "Interaction"]);
  await expect(field).toBeFocused();
  await frame.getByRole("button", { name: "Remove Interaction", exact: true }).click();
  await expect(frame.locator("#choice")).toHaveJSProperty("values", ["Design"]);
  await field.fill("Interaction");
  await expect(frame.getByRole("option", { name: "Interaction", exact: true })).toBeVisible();
  await expect(
    frame.getByRole("option", { name: "Create “Interaction”", exact: true }),
  ).toHaveCount(0);
});

test("custom filters search metadata and hidden picks return after removal", async ({ page }) => {
  let frame = await example(page, "People and custom filtering");
  const field = frame.getByRole("combobox", { name: "Collaborator", exact: true });
  await field.fill("design");
  await expect(frame.getByRole("option")).toHaveCount(2);
  await frame.getByRole("option", { name: "Sam Rivera", exact: true }).click();
  await expect(field).toHaveValue("Sam Rivera");
  frame = await example(page, "Hide selected options");
  await frame.getByRole("combobox", { name: "Invite people", exact: true }).click();
  await expect(frame.getByRole("option")).toHaveCount(3);
  await frame.getByRole("button", { name: "Remove Alex Morgan", exact: true }).click();
  await frame.getByRole("combobox", { name: "Invite people", exact: true }).click();
  await expect(frame.getByRole("option", { name: "Alex Morgan", exact: true })).toBeVisible();
});

test("form submission excludes uncommitted search and reset restores initial chips", async ({
  page,
}) => {
  const frame = await example(page, "Form values and reset");
  const field = frame.getByRole("combobox", { name: "Framework for submission", exact: true });
  await field.fill("nuxt");
  await field.press("Escape");
  await frame.getByRole("button", { name: "Save preferences" }).click();
  await expect(frame.locator("output")).toHaveText("framework: astro · labels: Design");
  await field.fill("nuxt");
  await field.press("Enter");
  await frame.getByRole("button", { name: "Save preferences" }).click();
  await expect(frame.locator("output")).toContainText("framework: nuxt");
  await frame.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(field).toHaveValue("Astro");
  await expect(frame.locator("#form-labels")).toHaveJSProperty("values", ["Design"]);
});

test("compact sizing coordinates the field and popup, and long lists scroll locally", async ({
  page,
}) => {
  let frame = await example(page, "Size inheritance");
  await frame.getByRole("switch", { name: "Compact context" }).click();
  const inherited = frame.getByRole("combobox", { name: "Inherited size", exact: true });
  await inherited.click();
  // Placement is queued on the next frame and the popup animates from a smaller scale.
  await expect
    .poll(() =>
      frame.locator('ui-combobox[label="Inherited size"]').evaluate((element) => {
        const root = element.shadowRoot!;
        const field = root.querySelector('[part="input-group"]')!.getBoundingClientRect();
        const popup = root.querySelector('[part="popup"]')!.getBoundingClientRect();
        return {
          height: field.height,
          matchesWidth: Math.abs(field.width - popup.width) < 2,
        };
      }),
    )
    .toEqual({ height: 28, matchesWidth: true });
  frame = await example(page, "Long list");
  const zone = frame.getByRole("combobox", { name: "Time zone", exact: true });
  await zone.click();
  const scroll = await page.evaluate(() => scrollY);
  await zone.press("End");
  await expect
    .poll(() =>
      frame
        .locator("#choice")
        .evaluate((element) => element.shadowRoot!.querySelector('[part="viewport"]')!.scrollTop),
    )
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await zone.press("Enter");
  await expect(frame.locator("output")).toContainText("Selected value");
});
