import { afterEach, expect, it } from "vitest";
import "@mash/ui/catalogue/mash.css";
import { mount as mountProjects } from "../../../../apps/catalog/src/stories/issues.js";
import { mount as mountLauncher } from "../../../../apps/catalog/src/stories/launcher.js";
import {
  arithmetic,
  quickAnswer,
  initialLauncherState,
  isLauncherState,
} from "../../../../apps/catalog/src/stories/launcher-model.js";
import { initialState, isIssueState } from "../../../../apps/catalog/src/stories/issues-model.js";
import { fixture, settled } from "../test-support/fixture.js";

let destroy: (() => void) | undefined;
afterEach(() => {
  destroy?.();
  destroy = undefined;
  localStorage.removeItem("mash-story-projects-v1");
  localStorage.removeItem("mash-story-command-center-v1");
});
async function start(mount: typeof mountProjects) {
  const root = await fixture<HTMLElement>(
    '<div style="width:1200px;height:800px;position:relative"></div>',
  );
  destroy = await mount(root);
  await settled(root);
  return root;
}
function click(root: ParentNode, selector: string) {
  root.querySelector<HTMLElement>(selector)!.click();
}

it("calculates precedence and conversions without evaluating arbitrary code", () => {
  expect(arithmetic("(24 + 18) * 3")).toBe(126);
  expect(arithmetic("-2^2")).toBe(-4);
  expect(arithmetic("2^-2")).toBe(0.25);
  expect(arithmetic("2^3^2")).toBe(512);
  expect(arithmetic("80 * 25%")).toBe(20);
  for (const value of ["1 / 0", "window.close()", "1 2", "(2+3", ""])
    expect(arithmetic(value)).toBeNull();
  expect(quickAnswer("100 c to f")?.result).toBe("212 °F");
  expect(quickAnswer("1 km to m")?.result).toBe("1000 m");
  expect(quickAnswer("1 kg to km")).toBeNull();
});
it("creates, edits, archives and undoes a real issue while retaining comment drafts", async () => {
  const root = await start(mountProjects);
  click(root, '[data-action="new"]');
  await settled(root);
  const form = root.querySelector<HTMLElementTagNameMap["ui-form"]>("#issue-create-form")!;
  form.querySelector<HTMLElementTagNameMap["ui-input"]>('[name="title"]')!.value =
    "Verify workspace composition";
  await settled(root);
  form.form!.requestSubmit();
  await settled(root);
  expect(root.querySelector("#issue-detail")!.textContent).toContain("ENG-125");
  expect(root.querySelector("#issue-content")!.textContent).toContain(
    "Verify workspace composition",
  );
  const note = root.querySelector<HTMLElementTagNameMap["ui-textarea"]>("#issue-comment")!;
  note.value = "A retained comment draft";
  note.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  click(root, '[data-open="101"]');
  await settled(root);
  click(root, '[data-open="125"]');
  await settled(root);
  expect(root.querySelector<HTMLElementTagNameMap["ui-textarea"]>("#issue-comment")!.value).toBe(
    "A retained comment draft",
  );
  const title = root.querySelector<HTMLElementTagNameMap["ui-input"]>('[data-field="title"]')!;
  title.value = "Verified workspace";
  title.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  await settled(root);
  expect(root.querySelector('[data-row="125"] .issue-title')!.textContent).toBe(
    "Verified workspace",
  );
  root.dispatchEvent(
    new CustomEvent("ui-menu-select", { detail: { value: "archive" }, bubbles: true }),
  );
  await settled(root);
  expect(root.querySelector('[data-row="125"]')).toBeNull();
  click(root, "#issue-undo");
  await settled(root);
  expect(root.querySelector('[data-row="125"]')).not.toBeNull();
});
it("searches and filters local records, then performs a reversible bulk change", async () => {
  const root = await start(mountProjects);
  const search = root.querySelector<HTMLElementTagNameMap["ui-input"]>("#issue-search")!;
  search.control!.value = "discoverable";
  search.control!.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
  expect(root.querySelector("#issue-count")!.textContent).toContain("1 issue");
  const checkbox = root.querySelector<HTMLElementTagNameMap["ui-checkbox"]>("[data-check]")!;
  checkbox.checked = true;
  checkbox.dispatchEvent(
    new CustomEvent("ui-checkbox-change", { bubbles: true, detail: { checked: true } }),
  );
  click(root, '[data-action="bulk-done"]');
  await settled(root);
  expect(root.querySelector(".issue-list-group > header")!.textContent).toContain("Done");
  click(root, "#issue-undo");
  await settled(root);
  expect(root.querySelector(".issue-list-group > header")!.textContent).toContain("Todo");
});
it("saves a note, finds its body, and supports deletion and undo", async () => {
  const root = await start(mountLauncher);
  click(root, '[data-action="new"]');
  await settled(root);
  const form = root.querySelector<HTMLElementTagNameMap["ui-form"]>("#launcher-form")!;
  form.querySelector<HTMLElementTagNameMap["ui-input"]>('[name="title"]')!.value = "A useful note";
  form.querySelector<HTMLElementTagNameMap["ui-textarea"]>('[name="content"]')!.value =
    "Remember the amethyst milestone.";
  await settled(root);
  form.form!.requestSubmit();
  await settled(root);
  expect(root.querySelector("#launcher-command")!.textContent).toContain("A useful note");
  const command = root.querySelector<HTMLElementTagNameMap["ui-command"]>("#launcher-command")!;
  command.query = "amethyst";
  command.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
  expect(root.querySelectorAll("ui-command-item")).toHaveLength(1);
  expect(root.querySelector("#launcher-detail")!.textContent).toContain("amethyst milestone");
  root
    .querySelector("#launcher-actions")!
    .dispatchEvent(
      new CustomEvent("ui-menu-select", { bubbles: true, detail: { value: "delete" } }),
    );
  await settled(root);
  expect(root.querySelectorAll("ui-command-item")).toHaveLength(0);
  click(root, '[data-action="undo"]');
  await settled(root);
  expect(root.querySelectorAll("ui-command-item")).toHaveLength(1);
});

it("prefers a calculation answer after native query editing", async () => {
  const root = await start(mountLauncher);
  const command = root.querySelector<HTMLElementTagNameMap["ui-command"]>("#launcher-command")!;
  const search = command.shadowRoot!.querySelector<HTMLInputElement>("[part=search]")!;
  search.value = "12 km to mi";
  search.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
  await settled(root);
  expect(root.querySelector("#launcher-detail")!.textContent).toContain("7.456454307 mi");
});

it("validates portable workspaces before replacing retained state", () => {
  const projects = initialState();
  const collection = initialLauncherState();
  expect(isIssueState(JSON.parse(JSON.stringify(projects)))).toBe(true);
  expect(isLauncherState(JSON.parse(JSON.stringify(collection)))).toBe(true);
  expect(isIssueState({ ...projects, issues: [null] })).toBe(false);
  expect(isIssueState({ ...projects, issues: [{ ...projects.issues[0], comments: [null] }] })).toBe(
    false,
  );
  expect(isIssueState({ ...projects, issues: [projects.issues[0], projects.issues[0]] })).toBe(
    false,
  );
  expect(isLauncherState({ ...collection, items: [null] })).toBe(false);
  expect(isLauncherState({ ...collection, recent: [null] })).toBe(false);
});
