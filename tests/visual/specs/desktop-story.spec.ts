import { expect, test, type Frame, type Page, type TestInfo } from "@playwright/test";
import type { Notebook } from "../../../apps/catalog/src/stories/documents-model.js";

const pane = (page: Page, app: string) => page.locator(`.desktop-window[data-app="${app}"]`).last();

async function openApp(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Open application launcher", exact: true }).click();
  const search = page.locator(".desktop-launcher").getByRole("combobox");
  await search.fill(name);
  await search.press("Enter");
}

async function openDesktop(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/stories/desktop?theme=dark");
  await expect(
    pane(page, "documents").frameLocator("iframe").locator("#documents-title"),
  ).toBeVisible();
  await expect(pane(page, "documents")).toHaveAttribute("data-ready", "true");
}

async function attachDesktop(page: Page, info: TestInfo, name: string): Promise<void> {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: "image/png" });
}

function documentFrame(page: Page, document: string): Frame | undefined {
  return page.frames().find((frame) => {
    try {
      const url = new URL(frame.url());
      return url.pathname === "/stories/documents" && url.searchParams.get("document") === document;
    } catch {
      return false;
    }
  });
}

// Exercise complete desktop interactions with real app drafts and shared sources.
test("desktop keeps an unsent app draft through workspace moves, floating resize and maximize", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDesktop(page);
  await openApp(page, "Projects");
  const projects = pane(page, "projects");
  const app = projects.frameLocator("iframe");
  await expect(app.locator("#issue-count")).toHaveText("24 issues");
  await app.getByRole("searchbox", { name: "Filter issues", exact: true }).fill("discoverable");
  await app.locator('[data-open="102"]').click();
  const comment = app.getByRole("textbox", { name: "Write a comment", exact: true });
  const draft = "This unsent comment stays with its live window.";
  await comment.fill(draft);
  const originalFrame = await projects.locator("iframe").elementHandle();

  // This shortcut originates inside the app, not in the desktop document.
  await comment.press("Alt+Shift+2");
  await page.getByRole("button", { name: "Workspace 2", exact: true }).click();
  await expect(projects).toBeVisible();
  await expect(comment).toHaveValue(draft);
  expect(
    await projects.evaluate(
      (element, original) => element.querySelector("iframe") === original,
      originalFrame,
    ),
  ).toBe(true);

  await projects.getByRole("button", { name: "Float Projects", exact: true }).click();
  const resize = projects.locator('.desktop-resize-x [part="control"]').first();
  await expect(resize).toBeVisible();
  await projects.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const before = await projects.boundingBox();
  const grip = await resize.boundingBox();
  expect(before).not.toBeNull();
  expect(grip).not.toBeNull();
  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip!.x + grip!.width / 2 + 72, grip!.y + grip!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await projects.boundingBox())!.width)
    .toBeGreaterThan(before!.width + 32);
  const floating = await projects.boundingBox();

  await projects.getByRole("button", { name: "Maximize Projects", exact: true }).click();
  await expect
    .poll(async () => (await projects.boundingBox())!.width)
    .toBeGreaterThan(floating!.width + 80);
  await expect(comment).toHaveValue(draft);
  expect(
    await projects.evaluate(
      (element, original) => element.querySelector("iframe") === original,
      originalFrame,
    ),
  ).toBe(true);
  await attachDesktop(page, info, "desktop-live-projects");
  expect(errors).toEqual([]);
});

test("an issue opens its exact document in another desktop pane and receives live block edits", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDesktop(page);
  await openApp(page, "Projects");
  const app = pane(page, "projects").frameLocator("iframe");
  await expect(app.locator("#issue-count")).toHaveText("24 issues");
  await app.getByRole("searchbox", { name: "Filter issues", exact: true }).fill("discoverable");
  await app.locator('[data-open="102"]').click();
  await expect(app.locator(".issue-document-editor [data-editable]").first()).toBeVisible();
  const source = await page.evaluate(() => {
    const notebook = JSON.parse(localStorage.getItem("mash-documents-notebook-v1")!) as Notebook;
    return notebook.documents.find((item) => item.id === "issue:102")!;
  });
  const block = source.blocks[0]!;
  await app.getByRole("button", { name: "Open issue document", exact: true }).click();
  await expect.poll(() => documentFrame(page, source.id)?.url()).toBeTruthy();
  const documents = documentFrame(page, source.id)!;
  const editable = documents.locator(`[data-editable="${block.id}"]`);
  await expect(editable).toBeVisible();
  await editable.fill("One issue document stays connected across desktop panes.");
  await expect(app.locator(`[data-editable="${block.id}"]`)).toHaveText(
    "One issue document stays connected across desktop panes.",
  );
  await expect(page).toHaveURL(/\/stories\/desktop(?:\?|$)/);
  expect(new URL(documents.url()).searchParams.get("document")).toBe(source.id);
  await attachDesktop(page, info, "desktop-connected-documents");
  expect(errors).toEqual([]);
});

test("desktop keyboard launcher restores its session and remains usable in a narrow light workspace", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDesktop(page);
  await pane(page, "documents")
    .frameLocator("iframe")
    .locator("#documents-title")
    .press("Alt+Space");
  const launcher = page.getByRole("dialog", { name: "Applications and commands", exact: true });
  await expect(launcher).toBeVisible();
  const search = page
    .locator(".desktop-launcher")
    .getByRole("combobox", { name: "Applications and commands", exact: true });
  await search.fill("Study");
  await search.press("Enter");
  await expect(launcher).toBeHidden();
  const study = pane(page, "study");
  await expect(study.frameLocator("iframe").locator(".study-app")).toBeVisible();
  await study.getByRole("button", { name: "Maximize Study", exact: true }).click();
  await page.reload();
  await expect(study).toBeVisible();
  await expect(study.frameLocator("iframe").locator(".study-app")).toBeVisible();
  await expect(study).toHaveAttribute("data-active", "true");

  await page.getByRole("button", { name: "Desktop settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Desktop settings", exact: true });
  await page
    .locator(".desktop-settings")
    .getByRole("button", { name: "Light", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open application launcher", exact: true }),
  ).toBeInViewport();
  await expect(study).toBeInViewport();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Open application launcher", exact: true }).click();
  await expect(launcher).toBeInViewport();
  await expect(search).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(launcher).toBeHidden();
  await attachDesktop(page, info, "desktop-light-mobile");
  expect(errors).toEqual([]);
});

test("tile dragging and keyboard resizing keep a document live through pin, minimize and reopen", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openDesktop(page);
  const documents = pane(page, "documents");
  const title = documents.frameLocator("iframe").locator("#documents-title");
  await title.fill("A document that follows its workspace");
  const originalFrame = await documents.locator("iframe").elementHandle();
  const originalOrigin = await title.evaluate(() => performance.timeOrigin);
  const command = pane(page, "command-center");
  const source = await documents.locator(".desktop-grab").boundingBox();
  const destination = await command.locator(".desktop-grab").boundingBox();
  const originalRight = await command.boundingBox();
  expect(source).not.toBeNull();
  expect(destination).not.toBeNull();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    destination!.x + destination!.width / 2,
    destination!.y + destination!.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await documents.boundingBox())!.x)
    .toBeGreaterThan(originalRight!.x - 10);
  expect(await title.evaluate(() => performance.timeOrigin)).toBe(originalOrigin);
  await expect(title).toHaveValue("A document that follows its workspace");

  const divider = page.locator('.desktop-split [part="control"]').first();
  await expect(divider).toBeVisible();
  const oldWidth = (await documents.boundingBox())!.width;
  await divider.press("ArrowLeft");
  await expect
    .poll(async () => Math.abs((await documents.boundingBox())!.width - oldWidth))
    .toBeGreaterThan(4);
  await documents
    .getByRole("button", { name: "Window options for Documents", exact: true })
    .click();
  await page
    .locator(".desktop-window-options")
    .getByRole("button", { name: "Pin to all workspaces", exact: true })
    .click();
  await page.getByRole("button", { name: "Workspace 5", exact: true }).click();
  await expect(documents).toBeVisible();
  await expect(title).toHaveValue("A document that follows its workspace");
  await documents.getByRole("button", { name: "Minimize Documents", exact: true }).click();
  await expect(documents).toBeHidden();
  await openApp(page, "Documents");
  await expect(title).toHaveValue("A document that follows its workspace");
  expect(
    await documents.evaluate(
      (element, original) => element.querySelector("iframe") === original,
      originalFrame,
    ),
  ).toBe(true);
  await documents.getByRole("button", { name: "Close Documents", exact: true }).click();
  await expect(documents).toHaveCount(0);
  await openApp(page, "Documents");
  await expect(title).toHaveValue("A document that follows its workspace");
  await attachDesktop(page, info, "desktop-pinned-document");
  expect(errors).toEqual([]);
});
