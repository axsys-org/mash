import { expect, test } from "@playwright/test";

const tags = [
  "ui-button",
  "ui-input",
  "ui-input-group",
  "ui-toggle",
  "ui-toggle-group",
  "ui-toolbar",
  "ui-select",
  "ui-combobox",
];

for (const tag of tags) {
  test(`${tag} runs with only its displayed registrations`, async ({ page }) => {
    await page.goto(`/components/${tag}`);
    await expect(page.locator("iframe")).toHaveAttribute("src", /\/fixture\.html\?tags=/);
    const stage = page.frameLocator("iframe");
    await expect(stage.locator("html")).toHaveAttribute("data-stage-ready", "true");
    await expect(stage.locator(tag).first()).toBeVisible();
    const frame = page.frames().find((candidate) => candidate.url().includes("/fixture.html"))!;
    const registry = await frame.evaluate(() => {
      const names = [
        ...new Set(
          [...document.querySelectorAll("*")]
            .map((node) => node.localName)
            .filter((name) => name.startsWith("ui-")),
        ),
      ];
      return {
        names,
        upgraded: names.every((name) => Boolean(customElements.get(name))),
        unrelated: Boolean(customElements.get("ui-data-table")),
      };
    });
    expect(registry.upgraded).toBe(true);
    expect(registry.unrelated).toBe(false);
    const imports = await page.locator(".usage-panel pre").nth(1).innerText();
    for (const name of registry.names)
      expect(imports).toContain(`@mash/ui/${name.slice(3)}/register`);
    await expect(page.locator(".token-list")).toContainText(
      /--(?:color|space|type|radius|layout)-/,
    );
  });
}

test("mixed toolbar restores its theme, geometry, and keyboard navigation", async ({ page }) => {
  await page.goto("/components/ui-toolbar?example=Mixed%20controls&theme=dark");
  const stage = page.frameLocator("iframe");
  await expect(stage.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(stage.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  const frame = page.frames().find((candidate) => candidate.url().includes("/fixture.html"))!;
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
