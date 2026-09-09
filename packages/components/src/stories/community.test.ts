import { afterEach, expect, it, vi } from "vitest";
import "@mash/ui/catalogue/mash.css";
import { mount } from "../../../../apps/catalog/src/stories/community.js";
import type { UITextarea } from "@mash/ui/textarea";
import type { UIInput } from "@mash/ui/input";
import type { UICommand } from "@mash/ui/command-palette";
import { fixture, inShadow, settled } from "../test-support/fixture.js";

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  localStorage.removeItem("mash.story.community.v1");
});
async function start() {
  localStorage.removeItem("mash.story.community.v1");
  const root = await fixture<HTMLElement>(
    '<div style="width:1100px;height:760px;position:relative"></div>',
  );
  dispose = await mount(root);
  await settled(root);
  return root;
}
function click(root: ParentNode, action: string) {
  root.querySelector<HTMLElement>(`[data-action="${action}"]`)!.click();
}
async function type(control: UITextarea | UIInput, text: string, root: ParentNode) {
  control.control!.value = text;
  control.control!.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
}
it("retains channel drafts, sends content and opens a working thread", async () => {
  const root = await start();
  let draft = root.querySelector<UITextarea>(".community-main-composer ui-textarea")!;
  await type(draft, "Keep the commons draft", root);
  click(root, "channel:workshop");
  await settled(root);
  draft = root.querySelector<UITextarea>(".community-main-composer ui-textarea")!;
  expect(draft.value).toBe("");
  await type(draft, "A real workshop message", root);
  root.querySelector<HTMLFormElement>(".community-main-composer form")!.requestSubmit();
  await settled(root);
  await vi.waitFor(() => expect(root.textContent).toContain("A real workshop message"));
  expect(draft.value).toBe("");
  click(root, "channel:commons");
  await settled(root);
  expect(root.querySelector<UITextarea>(".community-main-composer ui-textarea")!.value).toBe(
    "Keep the commons draft",
  );
  click(root, "thread:seed-4");
  await settled(root);
  const reply = root.querySelector<UITextarea>(".community-thread-composer ui-textarea")!;
  await type(reply, "A real threaded reply", root);
  root.querySelector<HTMLFormElement>(".community-thread-composer form")!.requestSubmit();
  await settled(root);
  await vi.waitFor(() =>
    expect(root.querySelector(".community-thread-scroller")!.textContent).toContain(
      "A real threaded reply",
    ),
  );
  expect(root.querySelector(".community-thread-count")!.textContent).toBe("4 replies");
});
it("search navigates to a message and room creation produces an editable empty conversation", async () => {
  const root = await start();
  click(root, "search");
  await settled(root);
  const command = root.querySelector<UICommand>(".community-dialog ui-command")!;
  const input = inShadow<HTMLInputElement>(command, "input");
  input.value = "remembering";
  input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
  await settled(root);
  expect(root.querySelectorAll(".community-search-result:not([hidden])")).toHaveLength(1);
  root.querySelector<HTMLElement>(".community-search-result:not([hidden])")!.click();
  await settled(root);
  expect(root.querySelector(".community-thread-context")!.textContent).toContain(
    "one small detail",
  );
  click(root, "new-channel");
  await settled(root);
  await type(root.querySelector<UIInput>('.community-dialog [name="name"]')!, "New room", root);
  root.querySelector<HTMLFormElement>(".community-dialog form")!.requestSubmit();
  await settled(root);
  expect(root.querySelector(".community-channel-title")!.textContent).toContain("New room");
  expect(root.querySelector<UITextarea>(".community-main-composer ui-textarea")!.value).toBe("");
});
it("keeps attachments in their destination, previews local content, and releases URLs on cleanup", async () => {
  const root = await start();
  const picker = root.querySelector<HTMLInputElement>(
    '.community-main-composer input[type="file"]',
  )!;
  const transfer = new DataTransfer();
  transfer.items.add(new File(["A local note"], "note.txt", { type: "text/plain" }));
  picker.files = transfer.files;
  picker.dispatchEvent(new Event("change", { bubbles: true }));
  await settled(root);
  click(root, "channel:workshop");
  await settled(root);
  expect(root.querySelector(".community-main-composer")!.textContent).not.toContain("note.txt");
  click(root, "channel:commons");
  await settled(root);
  expect(root.querySelector(".community-main-composer")!.textContent).toContain("note.txt");
  root.querySelector<HTMLFormElement>(".community-main-composer form")!.requestSubmit();
  await settled(root);
  const attachment = [...root.querySelectorAll(".community-timeline .community-file")].find(
    (node) => node.textContent?.includes("note.txt"),
  )!;
  attachment.querySelector<HTMLElement>('[data-action^="preview:"]')!.click();
  await vi.waitFor(() =>
    expect(root.querySelector(".community-text-preview")?.textContent).toBe("A local note"),
  );
  const revoke = vi.spyOn(URL, "revokeObjectURL");
  dispose?.();
  dispose = undefined;
  expect(root.children).toHaveLength(0);
  expect(revoke).toHaveBeenCalled();
  const restored = JSON.parse(localStorage.getItem("mash.story.community.v1")!);
  expect(
    restored.messages.some(
      (message: { attachmentIds: string[] }) => message.attachmentIds.length > 0,
    ),
  ).toBe(true);
});

it("edits, forwards, archives and restores through the actual application controls", async () => {
  const root = await start();
  const menu = (value: string) =>
    root
      .querySelector(".community-app")!
      .dispatchEvent(new CustomEvent("ui-menu-select", { bubbles: true, detail: { value } }));
  menu("edit:seed-3");
  await settled(root);
  await type(
    root.querySelector<UITextarea>(".community-dialog ui-textarea")!,
    "An edited conversation",
    root,
  );
  root.querySelector<HTMLFormElement>(".community-dialog form")!.requestSubmit();
  await settled(root);
  expect(root.querySelector('[data-message-id="seed-3"]')!.textContent).toContain(
    "An edited conversation",
  );
  menu("forward:seed-3");
  await settled(root);
  root.querySelector<HTMLElement>('[data-forward-channel="workshop"]')!.click();
  await settled(root);
  click(root, "channel:workshop");
  await settled(root);
  await vi.waitFor(() =>
    expect(root.querySelector(".community-timeline")!.textContent).toContain(
      "An edited conversation",
    ),
  );
  menu("channel-settings:workshop");
  await settled(root);
  await type(root.querySelector<UIInput>('.community-dialog [name="name"]')!, "Studio", root);
  root.querySelector<HTMLFormElement>(".community-dialog form")!.requestSubmit();
  await settled(root);
  expect(root.querySelector(".community-channel-title")!.textContent).toContain("Studio");
  menu("channel-settings:workshop");
  await settled(root);
  click(root, "archive:workshop");
  await settled(root);
  root.querySelector<HTMLElement>("[data-confirm-archive]")!.click();
  await settled(root);
  expect(root.querySelector('[data-action="channel:workshop"]')).toBeNull();
  click(root, "archive-list");
  await settled(root);
  click(root, "restore:workshop");
  await settled(root);
  expect(root.querySelector(".community-channel-title")!.textContent).toContain("Studio");
  expect(root.querySelector(".community-timeline")!.textContent).toContain(
    "An edited conversation",
  );
});

it("persists preferences and literal channel labels across cleanup and remount", async () => {
  const root = await start();
  click(root, "settings");
  await settled(root);
  await type(
    root.querySelector<UIInput>('.community-dialog [name="person"]')!,
    "Alex Example",
    root,
  );
  await type(
    root.querySelector<UIInput>('.community-dialog [name="workspace"]')!,
    "Our space",
    root,
  );
  root.querySelector<HTMLFormElement>(".community-dialog form")!.requestSubmit();
  await settled(root);
  click(root, "new-channel");
  await settled(root);
  const literal = 'Room "quotes" <notes>';
  await type(root.querySelector<UIInput>('.community-dialog [name="name"]')!, literal, root);
  root.querySelector<HTMLFormElement>(".community-dialog form")!.requestSubmit();
  await settled(root);
  expect(root.querySelector<UITextarea>(".community-main-composer ui-textarea")!.label).toBe(
    `Message ${literal}…`,
  );
  expect(root.querySelector("notes")).toBeNull();
  dispose?.();
  dispose = await mount(root);
  await settled(root);
  expect(root.querySelector("[data-workspace]")!.textContent).toBe("Our space");
  expect(root.querySelector(".community-channel-title")!.textContent).toContain(literal);
  expect(root.querySelector('[aria-label="Your profile"]')!.textContent).toContain("Alex Example");
});

it("places focus inside file previews so Escape dismisses and restores the launcher", async () => {
  const root = await start();
  click(root, "channel:gallery");
  await settled(root);
  const preview = root.querySelector<HTMLButtonElement>(".community-image-button")!;
  preview.focus();
  preview.click();
  await settled(root);
  const dialog = root.querySelector<HTMLElement>(".community-dialog")!;
  await vi.waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  const active = document.activeElement!;
  const native = active.shadowRoot?.activeElement ?? active;
  native.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
  );
  await settled(root);
  expect(dialog.hasAttribute("open")).toBe(false);
  await vi.waitFor(() => expect(document.activeElement).toBe(preview));
});
