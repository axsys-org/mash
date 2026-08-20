import { expect, test } from "@playwright/test";
import sharedPatch from "../../../packages/conformance/fixtures/recipe-patch.json" with { type: "json" };

const controlNode = "mash://ui-button/node/control";

async function chooseMashOption(
  control: import("@playwright/test").Locator,
  value: string,
): Promise<void> {
  await control.click();
  await control.locator(`ui-option[value="${value}"]`).click();
}

async function buttonStyle(page: import("@playwright/test").Page) {
  return page
    .frameLocator("iframe.stage-frame")
    .locator("ui-button")
    .evaluate((host) => {
      const control = host.shadowRoot?.querySelector("button");
      const style = control ? getComputedStyle(control) : null;
      return { background: style?.backgroundColor ?? "", paddingBlock: style?.paddingTop ?? "" };
    });
}

test("live recipe edits survive theme, density, URL sharing, and export", async ({ page }) => {
  await page.goto("/components/ui-button?example=controls");
  await page.locator(`[data-mash-node-address="${controlNode}"]`).click();

  const before = await buttonStyle(page);
  let fill = page.locator('[data-recipe-trait="surface.fill"]').first();
  await chooseMashOption(fill.locator(".recipe-kind-control"), "token");
  fill = page.locator('[data-recipe-trait="surface.fill"]').first();
  await chooseMashOption(fill.locator(".recipe-value-control"), "color.critical");

  const patched = await buttonStyle(page);
  expect(patched.background).not.toBe(before.background);
  let url = new URL(page.url());
  const overrides = JSON.parse(url.searchParams.get("patch") ?? "[]");
  expect(overrides).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        nodeAddress: controlNode,
        trait: "surface.fill",
        value: { kind: "token", token: "color.critical" },
      }),
    ]),
  );

  await page.getByRole("button", { name: "compact", exact: true }).click();
  await page.getByRole("button", { name: "dark", exact: true }).click();
  url = new URL(page.url());
  expect(url.searchParams.get("density")).toBe("compact");
  expect(url.searchParams.get("theme")).toBe("dark");
  expect(url.searchParams.get("patch")).not.toBeNull();
  const compact = await buttonStyle(page);
  expect(Number.parseFloat(compact.paddingBlock)).toBeLessThan(
    Number.parseFloat(before.paddingBlock),
  );

  await page.reload();
  await expect(page.locator('[data-recipe-trait="surface.fill"].is-overridden')).toBeVisible();
  expect((await buttonStyle(page)).background).toBe(compact.background);
  const exported = await page.locator(".recipe-patch-export code").textContent();
  expect(exported).toContain("recipe-patch-1.0.0");
  expect(exported).toContain(controlNode);
  expect(exported).toContain('"trait": "surface.fill"');
  expect(exported).not.toContain("sourceProperty");
  expect(exported).not.toContain("selector");
});

test("the shared portable patch is realized by the Web adapter", async ({ page }) => {
  const params = new URLSearchParams({
    example: "controls",
    node: controlNode,
    patch: JSON.stringify(sharedPatch.overrides),
  });
  await page.goto(`/components/ui-button?${params}`);
  const realized = await page
    .frameLocator("iframe.stage-frame")
    .locator("ui-button")
    .evaluate((host) => {
      const control = host.shadowRoot?.querySelector("button");
      const style = control ? getComputedStyle(control) : null;
      return {
        background: style?.backgroundColor ?? "",
        distribution: style?.justifyContent ?? "",
      };
    });
  expect(realized.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(realized.distribution).toBe("flex-end");
  await expect(page.locator(".recipe-override-badge")).toHaveCount(sharedPatch.overrides.length);
});

test("invalid values are explained and never enter the portable patch", async ({ page }) => {
  await page.goto(`/components/ui-button?example=controls&node=${encodeURIComponent(controlNode)}`);
  let fill = page.locator('[data-recipe-trait="surface.fill"]').first();
  await chooseMashOption(fill.locator(".recipe-kind-control"), "literal");
  fill = page.locator('[data-recipe-trait="surface.fill"]').first();
  const literal = fill.locator(".recipe-value-control").locator("input");
  await literal.fill("definitely-not-a-background");
  await literal.press("Tab");
  await expect(fill.locator(".recipe-field-error")).toContainText("not valid for background");
  expect(page.url()).not.toContain("definitely-not-a-background");
});

test("layout fields edit physical measures and logical direction intent", async ({ page }) => {
  await page.goto(`/components/ui-button?example=controls&node=${encodeURIComponent(controlNode)}`);
  const before = await buttonStyle(page);

  let padding = page.locator('[data-recipe-trait="layout.padding"]').first();
  await expect(padding.getByText("layout.inset.blockStart")).toBeVisible();
  await chooseMashOption(padding.locator(".recipe-kind-control"), "token");
  padding = page.locator('[data-recipe-trait="layout.padding"]').first();
  await chooseMashOption(padding.locator(".recipe-value-control"), "space.region");

  const distribution = page.locator('[data-recipe-trait="layout.justifyContent"]').first();
  await expect(distribution.getByText("layout.distribute")).toBeVisible();
  await distribution.locator('ui-toggle[value="trailing"]').click();

  const after = await page
    .frameLocator("iframe.stage-frame")
    .locator("ui-button")
    .evaluate((host) => {
      const control = host.shadowRoot?.querySelector("button");
      const style = control ? getComputedStyle(control) : null;
      return { paddingBlock: style?.paddingTop ?? "", distribution: style?.justifyContent ?? "" };
    });
  expect(Number.parseFloat(after.paddingBlock)).toBeGreaterThan(
    Number.parseFloat(before.paddingBlock),
  );
  expect(after.distribution).toBe("flex-end");

  const overrides = JSON.parse(new URL(page.url()).searchParams.get("patch") ?? "[]");
  expect(overrides).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        trait: "layout.padding",
        value: { kind: "token", token: "space.region" },
      }),
      expect.objectContaining({
        trait: "layout.justifyContent",
        value: { kind: "literal", value: "trailing" },
      }),
    ]),
  );
});
