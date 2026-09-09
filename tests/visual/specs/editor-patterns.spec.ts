import { expect, test } from "@playwright/test";

test("search field Enter, previous, case and read-only controls work together", async ({
  page,
}) => {
  await page.goto("/components/ui-editor?example=Source%20editor");
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Find / replace", exact: true }).click();
  const query = frame.getByRole("textbox", { name: "Find", exact: true });
  await query.fill("Alex");
  await expect(frame.locator("#search-count")).toHaveText("2 matches");
  await query.press("Enter");
  await expect(frame.locator("#search-count")).toHaveText("1 of 2");
  await query.press("Enter");
  await expect(frame.locator("#search-count")).toHaveText("2 of 2");
  await query.press("Shift+Enter");
  await expect(frame.locator("#search-count")).toHaveText("1 of 2");
  await query.fill("alex");
  await frame.getByRole("switch", { name: "Match case", exact: true }).click();
  await expect(frame.locator("#search-count")).toHaveText("No matches");
  await frame.getByRole("switch", { name: "Read only", exact: true }).click();
  await expect(frame.getByRole("textbox", { name: "Replace", exact: true })).toBeHidden();
  await expect(
    frame.getByRole("textbox", { name: "TypeScript source", exact: true }),
  ).toHaveAttribute("readonly", "");
});

test("mapped diagnostics follow native text edits and apply a real range fix", async ({ page }) => {
  await page.goto("/components/ui-editor?example=Mapped%20diagnostics");
  const frame = page.frameLocator("iframe.stage-frame");
  const control = frame.getByRole("textbox", { name: "Decorated source", exact: true });
  await control.press("ControlOrMeta+Home");
  await control.pressSequentially("// draft\n");
  await frame.getByRole("button", { name: "Quantity has no local value", exact: true }).click();
  expect(
    await control.evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe("quantity");
  await frame.getByRole("button", { name: "Use a quantity of 2", exact: true }).click();
  await expect(control).toHaveValue(/price \* 2/);
  await expect(
    frame.getByRole("button", { name: "Quantity has no local value", exact: true }),
  ).toHaveCount(0);
  await expect(
    frame.getByRole("button", { name: "Review the legacy name", exact: true }),
  ).toBeVisible();
});

test("font changes keep the mirror width and wrapped line gutter aligned", async ({ page }) => {
  await page.goto("/components/ui-editor?example=Typography");
  const frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("combobox", { name: "Editor font size", exact: true }).click();
  await frame.getByRole("option", { name: "20px", exact: true }).click();
  const control = frame.getByRole("textbox", { name: "Typography source", exact: true });
  await expect.poll(() => control.evaluate((node) => getComputedStyle(node).fontSize)).toBe("20px");
  const geometry = await frame.locator("#type-editor").evaluate((host) => {
    const nativeControl = host.shadowRoot!.querySelector("textarea")!;
    const syntax = host.shadowRoot!.querySelector<HTMLElement>('[part="syntax"]')!;
    const numbers = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="line-number"]')];
    return {
      nativeWidth: nativeControl.clientWidth,
      mirrorWidth: syntax.clientWidth,
      lineHeight: Number.parseFloat(getComputedStyle(nativeControl).lineHeight),
      heights: numbers.map((number) => number.getBoundingClientRect().height),
    };
  });
  expect(geometry.mirrorWidth).toBe(geometry.nativeWidth);
  expect(geometry.heights.some((height) => height > geometry.lineHeight * 1.5)).toBe(true);
});

test("authored article expansion and local navigation reveal real content", async ({ page }) => {
  await page.goto("/components/ui-typeset?example=Expandable%20article");
  let frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("button", { name: "Read more", exact: true }).click();
  await expect(
    frame.getByText("Related controls should share spacing, material, and focus behavior.", {
      exact: false,
    }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Read less", exact: true }).click();
  await expect(frame.locator("#article-details")).not.toHaveAttribute("open", "");
  await page.goto("/components/ui-typeset?example=Local%20links%20and%20code%20actions");
  frame = page.frameLocator("iframe.stage-frame");
  await frame.getByRole("link", { name: "usage notes", exact: true }).click();
  await expect(frame.locator("#article-link-result")).toHaveText("Usage notes opened.");
});
