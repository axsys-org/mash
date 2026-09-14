import { expect, test, type Page } from "@playwright/test";
import type { Notebook } from "../../../apps/catalog/src/stories/documents-model.js";
import type { IssueState } from "../../../apps/catalog/src/stories/issues-model.js";
import type { StudyCollection } from "../../../apps/catalog/src/stories/study-model.js";

const notebook = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("mash-documents-notebook-v1")!) as Notebook);
const collection = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("mash-study-v1")!) as StudyCollection);
const documentURL = (document: string, block?: string) =>
  `/stories/documents?${new URLSearchParams({ document, ...(block ? { block } : {}) })}`;

// These tests exercise source identity and continuity across independently mounted views.
test("issue blocks feed linked cards, retain schedules and keep an answer when the source is removed", async ({
  page,
  context,
}) => {
  await page.goto("/stories/projects?issue=102");
  const editor = page.locator(".issue-document-editor");
  await expect(editor.locator("[data-editable]").first()).toBeVisible();
  const source = (await notebook(page)).documents.find((item) => item.id === "issue:102")!;
  const block = source.blocks[0]!;
  const text = editor.locator(`[data-editable="${block.id}"]`);
  await text.fill("One shared block supplies this answer.");
  await expect
    .poll(
      async () =>
        (await notebook(page)).documents.find((item) => item.id === source.id)?.blocks[0]?.text,
    )
    .toBe("One shared block supplies this answer.");

  const study = await context.newPage();
  await study.goto(
    `/stories/study?${new URLSearchParams({ document: source.id, block: block.id })}`,
  );
  await study
    .getByRole("textbox", { name: "Question", exact: true })
    .fill("Where does this answer live?");
  await expect(study.getByRole("textbox", { name: "Answer", exact: true })).toHaveValue(
    "One shared block supplies this answer.",
  );
  await study.locator('[data-action="save-note"]').click();
  const created = await collection(study);
  const note = created.notes.find((item) => item.front === "Where does this answer live?")!;
  const card = created.cards.find((item) => item.note === note.id)!;
  expect(note.source).toEqual({ document: source.id, block: block.id });
  await study.locator('.study-topbar [data-action="browse"]').click();
  await study.getByRole("searchbox", { name: "Search cards", exact: true }).fill(note.front);

  await text.fill("An updated answer from the same issue block.");
  await expect(study.locator("#study-browser-rows")).toContainText(
    "An updated answer from the same issue block.",
  );
  const updated = await collection(study);
  expect(updated.cards.find((item) => item.id === card.id)).toEqual(card);
  expect(updated.notes.find((item) => item.id === note.id)?.back).toBe(
    "An updated answer from the same issue block.",
  );

  const row = editor.locator(`[data-block="${block.id}"]`);
  await row.hover();
  await row.getByRole("button", { name: "Block actions", exact: true }).click();
  await row.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect
    .poll(async () =>
      (await notebook(page)).documents
        .find((item) => item.id === source.id)
        ?.blocks.some((item) => item.id === block.id),
    )
    .toBe(false);
  await study.locator(`[data-action="edit:${note.id}"]`).click();
  await expect(study.locator(".study-source-link")).toContainText("last saved answer is kept");
  await expect(study.getByRole("textbox", { name: "Answer", exact: true })).toHaveValue(
    "An updated answer from the same issue block.",
  );
  expect((await collection(study)).cards.find((item) => item.id === card.id)).toEqual(card);
});

test("command search opens the exact live block and its card action carries the same source", async ({
  page,
}) => {
  await page.goto("/stories/documents");
  await expect(page.locator("#documents-title")).toBeVisible();
  const initial = await notebook(page);
  const source = initial.documents.find((item) => item.id === initial.active)!;
  const block = source.blocks.find((item) => item.kind === "paragraph")!;
  await page.locator(`[data-editable="${block.id}"]`).fill("Heliotrope boundary continuity");
  await expect
    .poll(
      async () =>
        (await notebook(page)).documents
          .find((item) => item.id === source.id)
          ?.blocks.find((item) => item.id === block.id)?.text,
    )
    .toBe("Heliotrope boundary continuity");

  await page.goto("/stories/command-center");
  await page.locator('[data-category="block"]').click();
  await page
    .getByRole("combobox", { name: "Search workspace", exact: true })
    .fill("Heliotrope boundary");
  const result = page.locator("#launcher-command ui-command-item");
  await expect(result).toHaveCount(1);
  await expect(result).toContainText("Heliotrope boundary continuity");
  await result.click();
  await expect(page).toHaveURL(
    new RegExp(`document=${encodeURIComponent(source.id)}.*block=${block.id}`),
  );
  await expect(page.locator(`[data-block="${block.id}"]`)).toHaveClass(/is-active/);
  await expect(page.locator(`[data-editable="${block.id}"]`)).toBeFocused();

  await page.goto("/stories/command-center");
  await page.locator('[data-category="block"]').click();
  await page
    .getByRole("combobox", { name: "Search workspace", exact: true })
    .fill("Heliotrope boundary");
  await page.getByRole("button", { name: "Make card", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/stories/study\\?.*document=${encodeURIComponent(source.id)}.*block=${block.id}`),
  );
  await expect(page.getByRole("textbox", { name: "Answer", exact: true })).toHaveValue(
    "Heliotrope boundary continuity",
  );
});

test("two document views retain external changes through local undo and redo", async ({
  page,
  context,
}) => {
  await page.goto("/stories/documents");
  await expect(page.locator("#documents-title")).toBeVisible();
  const initial = await notebook(page);
  const source = initial.documents.find((item) => item.id === initial.active)!;
  const block = source.blocks.find((item) => item.kind === "paragraph")!;
  const text = page.locator(`[data-editable="${block.id}"]`);
  await text.fill("Local draft, first revision.");
  await expect
    .poll(
      async () =>
        (await notebook(page)).documents
          .find((item) => item.id === source.id)
          ?.blocks.find((item) => item.id === block.id)?.text,
    )
    .toBe("Local draft, first revision.");

  const other = await context.newPage();
  await other.goto(documentURL(source.id, block.id));
  await other.locator(`[data-editable="${block.id}"]`).fill("External revision must survive undo.");
  await expect(text).toHaveText("External revision must survive undo.");
  await page.locator("#documents-title").fill("A local title change");
  await expect
    .poll(async () => (await notebook(page)).documents.find((item) => item.id === source.id)?.title)
    .toBe("A local title change");
  await page.locator("#documents-undo").click();
  await expect(page.locator("#documents-title")).toHaveValue(source.title);
  await page.locator("#documents-undo").click();
  await expect(text).toHaveText("External revision must survive undo.");
  await page.locator("#documents-redo").click();
  await expect(text).toHaveText("External revision must survive undo.");
  await expect
    .poll(
      async () =>
        (await notebook(page)).documents
          .find((item) => item.id === source.id)
          ?.blocks.find((item) => item.id === block.id)?.text,
    )
    .toBe("External revision must survive undo.");
  await expect(other.locator(`[data-editable="${block.id}"]`)).toHaveText(
    "External revision must survive undo.",
  );
});

test("importing an older project backup forks changed documents and preserves live sources", async ({
  page,
}) => {
  await page.goto("/stories/projects?issue=102");
  await expect(page.getByRole("textbox", { name: "Issue title", exact: true })).toBeVisible();
  const original = await notebook(page);
  const source = original.documents.find((doc) => doc.id === "issue:102")!;
  const child = original.documents.find((doc) => doc.id === "issue:103")!;
  const unchanged = original.documents.find((doc) => doc.id === "issue:104")!;
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("mash-story-projects-v1")!) as IssueState,
  );
  const snapshot = structuredClone(source);
  snapshot.blocks[0]!.text = "An older answer restored from a backup.";
  const nested = { ...structuredClone(child), parent: source.id };
  const backup = {
    ...state,
    notebook: { version: 1, active: source.id, documents: [snapshot, nested, unchanged] },
  };
  await page.locator("#issue-import").setInputFiles({
    name: "workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  const issueState = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("mash-story-projects-v1")!) as IssueState);
  await expect
    .poll(async () => (await issueState()).issues.find((issue) => issue.id === 102)?.document)
    .not.toBe(source.id);
  const imported = await issueState();
  const copiedId = imported.issues.find((issue) => issue.id === 102)!.document!;
  const copiedChild = imported.issues.find((issue) => issue.id === 103)!.document!;
  const current = await notebook(page);
  expect(current.documents.find((doc) => doc.id === source.id)).toEqual(source);
  expect(current.documents.find((doc) => doc.id === child.id)).toEqual(child);
  expect(current.documents.find((doc) => doc.id === copiedId)?.blocks[0]?.text).toBe(
    snapshot.blocks[0]!.text,
  );
  expect(current.documents.find((doc) => doc.id === copiedChild)?.parent).toBe(copiedId);
  expect(imported.issues.find((issue) => issue.id === 104)?.document).toBe(unchanged.id);
  expect(current.documents).toHaveLength(original.documents.length + 2);

  await page.locator("#issue-undo").click();
  await expect
    .poll(async () => (await issueState()).issues.find((issue) => issue.id === 102)?.document)
    .toBe(source.id);
  expect((await notebook(page)).documents.find((doc) => doc.id === source.id)).toEqual(source);
});
