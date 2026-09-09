import { expect, test } from "@playwright/test";
import { hasRenderedContent } from "./helpers/rendered-content.js";

test("preview content detection sees shadow controls and text without accepting empty wrappers", async ({
  page,
}) => {
  await page.setContent('<main style="width:320px; min-height:200px"><div></div></main>');
  const root = page.locator("main");
  expect(await root.evaluate(hasRenderedContent)).toBe(false);
  await root.evaluate((element) => {
    const host = document.createElement("test-field");
    host.attachShadow({ mode: "open" }).innerHTML = "<label>Project name <input></label>";
    element.append(host);
  });
  await expect(root).toBeEmpty(); // Light-DOM text is not rendered-content evidence.
  expect(await root.evaluate(hasRenderedContent)).toBe(true);
  await root.locator("test-field").evaluate((element) => {
    element.shadowRoot!.innerHTML = "<kbd>⌘K</kbd>";
  });
  expect(await root.evaluate(hasRenderedContent)).toBe(true);
  await root.locator("test-field").evaluate((element) => {
    element.shadowRoot!.innerHTML = '<meter min="0" max="100" value="60"></meter>';
  });
  expect(await root.evaluate(hasRenderedContent)).toBe(true);
  await root.locator("test-field").evaluate((element) => (element.style.display = "none"));
  expect(await root.evaluate(hasRenderedContent)).toBe(false);
  await root.evaluate((element) => {
    const sample = document.createElement("div");
    sample.style.cssText = "width:100px;height:12px;background:gray";
    element.append(sample);
  });
  expect(await root.evaluate(hasRenderedContent)).toBe(true);
});
