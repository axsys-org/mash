import type { UITextarea } from "@mash/ui/textarea";
import type { UIButton } from "@mash/ui/button";
import type { Draft } from "./community-state.js";

/** Scoped instance of the catalogue's compact composer pattern. */
export function mountComposer(
  root: HTMLElement,
  options: {
    label: string;
    getDraft: () => Draft;
    changed: () => void;
    send: () => void;
    attach: (files: File[]) => void;
    attachmentName: (id: string) => string;
    enterSends: () => boolean;
    quoteLabel: (id: string) => string;
  },
): { refresh: () => void; focus: () => void; dispose: () => void } {
  const controller = new AbortController();
  root.innerHTML = `<form class="community-composer mash-composer" aria-label="Message composer"><div class="community-quote" hidden><span></span><ui-button type="button" size="xsmall" variant="ghost" data-unquote aria-label="Remove quoted message">×</ui-button></div><div class="mash-composer-context" hidden></div><ui-textarea rows="2"></ui-textarea><div class="mash-composer-toolbar"><ui-button type="button" variant="ghost" size="small" data-attach aria-label="Attach files">＋</ui-button><input type="file" multiple hidden aria-label="Choose attachments"><span class="community-composer-hint"></span><span class="mash-composer-spacer"></span><ui-button type="button" variant="ghost" size="small" data-expand aria-label="Expand composer">↗</ui-button><ui-button type="submit" size="small" variant="primary" data-send aria-label="Send message">↑</ui-button></div></form>`;
  const form = root.querySelector("form")!;
  const textarea = root.querySelector<UITextarea>("ui-textarea")!;
  textarea.label = options.label;
  const send = root.querySelector<UIButton>("[data-send]")!;
  const picker = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  const context = root.querySelector<HTMLElement>(".mash-composer-context")!;
  const quote = root.querySelector<HTMLElement>(".community-quote")!;
  const expand = root.querySelector<UIButton>("[data-expand]")!;
  const on = (target: EventTarget, name: string, fn: EventListener) =>
    target.addEventListener(name, fn, { signal: controller.signal });
  const refresh = () => {
    const draft = options.getDraft();
    if (textarea.value !== draft.text) textarea.value = draft.text;
    textarea.placeholder = options.label;
    textarea.rows = draft.expanded ? 6 : Math.min(4, Math.max(2, draft.text.split("\n").length));
    form.toggleAttribute("data-expanded", draft.expanded);
    send.disabled = !draft.text.trim() && !draft.attachmentIds.length;
    expand.setAttribute("aria-expanded", String(draft.expanded));
    expand.setAttribute("aria-label", draft.expanded ? "Collapse composer" : "Expand composer");
    root.querySelector(".community-composer-hint")!.textContent = options.enterSends()
      ? "Shift ↵ for a new line"
      : "⌘ ↵ to send";
    context.hidden = !draft.attachmentIds.length;
    context.replaceChildren(
      ...draft.attachmentIds.map((id) => {
        const chip = document.createElement("span");
        chip.className = "mash-composer-file";
        const label = document.createElement("span");
        label.textContent = options.attachmentName(id);
        const remove = document.createElement("ui-button");
        remove.type = "button";
        remove.variant = "ghost";
        remove.size = "xsmall";
        remove.textContent = "×";
        remove.dataset.removeFile = id;
        remove.setAttribute("aria-label", `Remove ${options.attachmentName(id)}`);
        chip.append(label, remove);
        return chip;
      }),
    );
    quote.hidden = !draft.quoteId;
    quote.querySelector("span")!.textContent = draft.quoteId
      ? options.quoteLabel(draft.quoteId)
      : "";
  };
  on(form, "submit", (event) => {
    event.preventDefault();
    options.send();
    refresh();
  });
  on(textarea, "input", () => {
    options.getDraft().text = textarea.value;
    options.changed();
    refresh();
  });
  on(textarea, "keydown", (event) => {
    const key = event as KeyboardEvent;
    if (
      key.key === "Enter" &&
      !key.isComposing &&
      !key.shiftKey &&
      (options.enterSends() || key.metaKey || key.ctrlKey)
    ) {
      key.preventDefault();
      options.send();
      refresh();
    }
  });
  on(expand, "click", () => {
    options.getDraft().expanded = !options.getDraft().expanded;
    options.changed();
    refresh();
    textarea.focus({ preventScroll: true });
  });
  on(root.querySelector("[data-attach]")!, "click", () => picker.click());
  on(picker, "change", () => {
    options.attach([...(picker.files ?? [])]);
    picker.value = "";
    refresh();
  });
  on(form, "dragover", (event) => {
    if ((event as DragEvent).dataTransfer?.types.includes("Files")) event.preventDefault();
  });
  on(form, "drop", (event) => {
    const files = [...((event as DragEvent).dataTransfer?.files ?? [])];
    if (files.length) {
      event.preventDefault();
      options.attach(files);
      refresh();
    }
  });
  on(context, "click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>("[data-remove-file]");
    if (!button) return;
    const draft = options.getDraft();
    draft.attachmentIds = draft.attachmentIds.filter((id) => id !== button.dataset.removeFile);
    options.changed();
    refresh();
  });
  on(root.querySelector("[data-unquote]")!, "click", () => {
    delete options.getDraft().quoteId;
    options.changed();
    refresh();
  });
  refresh();
  return {
    refresh,
    focus: () => textarea.focus({ preventScroll: true }),
    dispose: () => controller.abort(),
  };
}
