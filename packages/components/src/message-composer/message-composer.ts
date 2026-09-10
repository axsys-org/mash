import type { UIButton } from "../button/button.js";
import type { UIIcon } from "../icon/icon.js";
import type { UIDraggable } from "../draggable/draggable.js";
import type { DragEventDetail } from "../drag/drag.js";
import type { UITextarea } from "../textarea/textarea.js";
import type { UISelect } from "../select/select.js";

export type ComposerStatus = "idle" | "streaming";
export interface ComposerMessage {
  id: string;
  text: string;
  files: File[];
  mode?: string;
}
export interface MessageComposerOptions {
  /** Abort listeners, drags, pending delivery, observers and object URLs together. */
  signal?: AbortSignal;
  /** Optional asynchronous delivery; rejection restores the draft for retry. */
  onSend?: (message: ComposerMessage, signal: AbortSignal) => Promise<void>;
}
export interface MessageComposer {
  value: string;
  files: File[];
  queue: ComposerMessage[];
  history: string[];
  status: ComposerStatus;
  disabled: boolean;
  set suggestions(value: string[]);
  openFilePicker(accept?: string): void;
  send(): void;
  stop(): void;
  destroy(): void;
}
export interface MessageComposerEvents {
  "composer-change": { value: string };
  "composer-files-change": { files: File[] };
  "composer-queue-change": { queue: ComposerMessage[] };
  "composer-send": ComposerMessage;
  "composer-stop": Record<string, never>;
}
type ComposerEvents = HTMLElementEventMap & {
  pagehide: PageTransitionEvent;
  "ui-drag-start": CustomEvent;
  "ui-drag-move": CustomEvent<DragEventDetail>;
  "ui-drag-end": CustomEvent<DragEventDetail>;
};
const composers = new WeakMap<HTMLFormElement, MessageComposer>();

/**
 * Binds the public .mash-composer recipe to existing Mash controls. The owner
 * supplies markup and handles delivery events; no network or app store is owned.
 * Rebinding the same form returns its controller until destroy() is called.
 */
export function bindMessageComposer(
  form: HTMLFormElement,
  options: MessageComposerOptions = {},
): MessageComposer {
  const existing = composers.get(form);
  if (existing) return existing;
  const find = <T extends Element>(selector: string): T => {
    const element = form.querySelector<T>(selector);
    if (!element) throw new Error("Message composer requires " + selector);
    return element;
  };
  const draft = find<UITextarea>("ui-textarea");
  const send = find<UIButton>("[data-send]");
  const stop = find<UIButton>("[data-stop]");
  const expand = form.querySelector<UIButton>("[data-expand]");
  const attach = form.querySelector<UIButton>("[data-attach]");
  const picker = find<HTMLInputElement>('input[type="file"]');
  const context = find<HTMLElement>(".mash-composer-context");
  const statusBar = find<HTMLElement>(".mash-composer-status");
  const output = statusBar.querySelector("output")!;
  const retry = find<UIButton>("[data-retry]");
  const mode = form.querySelector<UISelect>(".mash-composer-mode");
  const queueList = find<HTMLElement>(".mash-composer-queue");
  const suggestionsList = find<HTMLElement>(".mash-composer-suggestions");
  const scope = new AbortController();
  const on = <K extends keyof ComposerEvents>(
    node: EventTarget | null,
    type: K,
    callback: (event: ComposerEvents[K]) => void,
  ): void => {
    node?.addEventListener(type, callback as EventListener, { signal: scope.signal });
  };
  const emit = <K extends keyof MessageComposerEvents>(type: K, detail: MessageComposerEvents[K]) =>
    form.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  let files: File[] = [],
    queue: ComposerMessage[] = [],
    history: string[] = [],
    suggestions: string[] = [];
  let responseStatus: ComposerStatus = "idle";
  let disabled = form.hasAttribute("data-disabled"),
    destroyed = false;
  let pending: ComposerMessage | null = null;
  let delivery: AbortController | undefined;
  let frame = 0;
  let historyIndex = -1,
    savedDraft = "",
    highlighted = -1,
    dropDepth = 0;
  let pinned = form.hasAttribute("data-expanded");
  const urls = new Set<string>();
  const announce = (text: string, error = false) => {
    statusBar.hidden = !text;
    output.textContent = text;
    form.dataset.status = error ? "error" : responseStatus;
    retry.hidden = !error;
  };
  const hasDraft = () => Boolean(draft.value.trim() || files.length);
  const makeButton = (label: string, icon: string, action: () => void) => {
    const button = document.createElement("ui-button");
    button.type = "button";
    button.variant = "ghost";
    button.size = "compact";
    button.setAttribute("aria-label", label);
    button.disabled = disabled;
    const glyph = document.createElement("ui-icon");
    glyph.name = icon;
    glyph.label = "";
    button.append(glyph);
    on(button, "click", action);
    return button;
  };
  const sync = () => {
    if (destroyed) return;
    const busy = Boolean(pending);
    const stopping = responseStatus === "streaming" && !hasDraft();
    send.disabled = disabled || !hasDraft();
    send.hidden = busy || stopping;
    stop.hidden = !busy && !stopping;
    stop.disabled = disabled;
    stop.setAttribute("aria-label", busy ? "Stop sending" : "Stop response");
    send.setAttribute("aria-label", responseStatus === "streaming" ? "Queue message" : "Send");
    send.querySelector("ui-icon")!.name =
      responseStatus === "streaming" ? "action.add" : "navigation.up";
    draft.disabled = disabled;
    draft.readonly = busy;
    if (attach) attach.disabled = disabled || busy;
    if (mode) mode.disabled = disabled || busy;
    if (expand) expand.disabled = disabled;
    context.inert = disabled || busy;
    for (const area of form.querySelectorAll<HTMLElement>("[data-actions]"))
      area.inert = disabled || busy;
    picker.disabled = disabled || busy;
    draft.rows = pinned ? 6 : Math.max(1, Number(form.dataset.minRows) || 1);
    form.toggleAttribute("data-expanded", pinned);
    form.toggleAttribute("data-disabled", disabled);
    form.toggleAttribute("data-sending", busy);
    if (expand) {
      expand.setAttribute("aria-expanded", String(pinned));
      expand.setAttribute("aria-label", pinned ? "Collapse composer" : "Expand composer");
    }
    suggestionsList.hidden = disabled || busy || Boolean(draft.value) || !suggestions.length;
    const hint = form.querySelector<HTMLElement>(".mash-composer-placeholder");
    if (hint) hint.hidden = disabled || Boolean(draft.value);
    // field-sizing is the CSS fast path. This also handles wrapping in engines without it.
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (destroyed || !form.isConnected) return;
      const control = draft.control;
      if (!control) return;
      const css = getComputedStyle(control),
        line = parseFloat(css.lineHeight) || 22;
      const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
      const min = (pinned ? 6 : Math.max(1, Number(form.dataset.minRows) || 1)) * line + padding;
      const max = Math.max(min, (Number(form.dataset.maxRows) || 8) * line + padding);
      control.style.height = "auto";
      control.style.height = Math.min(max, Math.max(min, control.scrollHeight)) + "px";
      control.style.overflowY = control.scrollHeight > max + 1 ? "auto" : "hidden";
    });
  };
  const changed = () => {
    historyIndex = -1;
    highlighted = -1;
    renderSuggestions();
    sync();
    emit("composer-change", { value: draft.value });
  };
  const setDraft = (text: string) => {
    draft.value = text;
    changed();
  };
  const focusDraft = () => {
    draft.focus();
    draft.updateComplete.then(() =>
      draft.setSelectionRange(draft.value.length, draft.value.length),
    );
  };
  const renderFiles = () => {
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls.clear();
    context.replaceChildren();
    context.hidden = !files.length;
    files.forEach((file, index) => {
      const tile = document.createElement("ui-attachment");
      tile.className = "mash-composer-file";
      tile.size = "small";
      const name = document.createElement("span");
      name.slot = "title";
      name.textContent = file.name;
      const description = document.createElement("span");
      description.slot = "description";
      description.textContent =
        file.size < 1024 ? file.size + " B" : Math.ceil(file.size / 1024) + " KB";
      let media: HTMLImageElement | UIIcon;
      if (file.type.startsWith("image/")) {
        media = document.createElement("img");
        media.src = URL.createObjectURL(file);
        urls.add(media.src);
        media.alt = "";
      } else {
        media = document.createElement("ui-icon");
        media.name = "object.document";
        media.label = "";
      }
      media.slot = "media";
      const remove = makeButton("Remove " + file.name, "action.dismiss", () => {
        files = files.filter((_, i) => i !== index);
        renderFiles();
        sync();
        emit("composer-files-change", { files: [...files] });
        focusDraft();
      });
      remove.slot = "actions";
      tile.append(media, name, description, remove);
      context.append(tile);
    });
  };
  const addFiles = (candidates: Iterable<File>, replacing = false) => {
    if (!replacing && (disabled || pending || form.hasAttribute("data-no-attachments"))) return;
    if (replacing) files = [];
    const accepts = picker.accept
      .toLowerCase()
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const limit = Number(form.dataset.maxFiles) || Infinity;
    const key = (file: File) => file.name + ":" + file.size + ":" + file.lastModified;
    const seen = new Set(files.map(key));
    let rejected = 0;
    for (const file of candidates) {
      if (seen.has(key(file))) continue;
      const matches =
        !accepts.length ||
        accepts.some((type) =>
          type.startsWith(".")
            ? file.name.toLowerCase().endsWith(type)
            : type.endsWith("/*")
              ? file.type.toLowerCase().startsWith(type.slice(0, -1))
              : file.type.toLowerCase() === type,
        );
      if (!matches || files.length >= limit) {
        rejected++;
        continue;
      }
      files.push(file);
      seen.add(key(file));
    }
    renderFiles();
    sync();
    emit("composer-files-change", { files: [...files] });
    announce(
      rejected ? rejected + " file(s) skipped. Check the allowed types and attachment limit." : "",
    );
  };
  const renderSuggestions = () => {
    suggestionsList.replaceChildren();
    // Each real button is keyboard reachable; arrow navigation keeps focus in the editor.
    suggestions.forEach((text, index) => {
      const button = document.createElement("ui-button");
      button.type = "button";
      button.variant = "ghost";
      button.className = "mash-composer-suggestion";
      button.toggleAttribute("data-highlighted", index === highlighted);
      button.textContent = text;
      const hint = document.createElement("ui-kbd");
      hint.appearance = "plain";
      hint.textContent = index === highlighted ? "↵" : index === 0 ? "↓" : "";
      button.append(hint);
      on(button, "click", () => {
        setDraft(text);
        focusDraft();
      });
      suggestionsList.append(button);
    });
    if (highlighted >= 0)
      announce("Suggested prompt: " + suggestions[highlighted] + ". Enter to use.");
  };
  const editQueued = (id: string) => {
    if (disabled) return;
    const index = queue.findIndex((item) => item.id === id);
    if (index < 0) return;
    const item = queue[index]!;
    // Preserve a draft already in progress by swapping it into the edited row.
    if (hasDraft())
      queue.splice(index, 1, {
        id: crypto.randomUUID(),
        text: draft.value,
        files: [...files],
        mode: mode?.value,
      });
    else queue.splice(index, 1);
    draft.value = item.text;
    files = [...item.files];
    if (mode && item.mode !== undefined) mode.value = item.mode;
    renderFiles();
    renderQueue();
    changed();
    focusDraft();
    emit("composer-queue-change", {
      queue: queue.map((queued) => ({ ...queued, files: [...queued.files] })),
    });
    announce("Queued message moved into the draft.");
  };
  const removeQueued = (id: string) => {
    if (disabled) return;
    const index = queue.findIndex((item) => item.id === id);
    queue = queue.filter((item) => item.id !== id);
    renderQueue();
    emit("composer-queue-change", {
      queue: queue.map((queued) => ({ ...queued, files: [...queued.files] })),
    });
    const next =
      queueList.querySelectorAll<UIButton>("[data-queue-edit]")[Math.min(index, queue.length - 1)];
    next?.focus();
    if (!queue.length) focusDraft();
    announce("Queued message removed.");
  };
  const reorder = (id: string, index: number) => {
    const from = queue.findIndex((item) => item.id === id);
    if (disabled || from < 0 || index < 0 || index >= queue.length || from === index) return;
    const [item] = queue.splice(from, 1);
    queue.splice(index, 0, item!);
    renderQueue();
    emit("composer-queue-change", {
      queue: queue.map((queued) => ({ ...queued, files: [...queued.files] })),
    });
    queueList.querySelectorAll<UIButton>("[data-queue-edit]")[index]?.focus();
    announce("Moved to position " + (index + 1) + " of " + queue.length + ".");
  };
  const renderQueue = () => {
    queueList.replaceChildren();
    queueList.hidden = !queue.length;
    queue.forEach((item, index) => {
      const row = document.createElement("ui-draggable");
      row.axis = "y";
      row.containment = "parent";
      row.threshold = 5;
      row.disabled = disabled;
      row.className = "mash-composer-queued";
      row.dataset.id = item.id;
      const handle = document.createElement("span");
      handle.slot = "handle";
      handle.className = "mash-composer-grip";
      handle.setAttribute("aria-hidden", "true");
      handle.textContent = "⠿";
      const edit = document.createElement("ui-button");
      edit.type = "button";
      edit.variant = "ghost";
      edit.disabled = disabled;
      edit.dataset.queueEdit = "";
      edit.textContent = item.text || item.files.map((file) => file.name).join(", ");
      edit.setAttribute(
        "aria-label",
        "Edit queued message " + (index + 1) + ": " + edit.textContent,
      );
      edit.setAttribute(
        "aria-description",
        "Enter edits. Delete removes. Alt and arrow keys reorder.",
      );
      if (item.files.length) {
        const count = document.createElement("span");
        count.className = "mash-composer-file-count";
        count.textContent = item.files.length + " file" + (item.files.length > 1 ? "s" : "");
        edit.append(count);
      }
      on(edit, "click", () => editQueued(item.id));
      on(edit, "keydown", (event) => {
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          removeQueued(item.id);
        } else if (event.key === "F2") {
          event.preventDefault();
          editQueued(item.id);
        } else if (event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          reorder(item.id, index + (event.key === "ArrowUp" ? -1 : 1));
        }
      });
      const remove = makeButton("Remove queued message " + (index + 1), "action.dismiss", () =>
        removeQueued(item.id),
      );
      row.append(handle, edit, remove);
      let targetIndex = index;
      let rowRects: DOMRect[] = [];
      on(row, "ui-drag-start", () => {
        rowRects = [...queueList.children].map((element) => element.getBoundingClientRect());
      });
      on(row, "ui-drag-move", (event) => {
        const center = rowRects[index]!.top + rowRects[index]!.height / 2 + event.detail.position.y;
        targetIndex = rowRects.reduce(
          (nearest, rect, i) =>
            Math.abs(center - (rect.top + rect.height / 2)) <
            Math.abs(center - (rowRects[nearest]!.top + rowRects[nearest]!.height / 2))
              ? i
              : nearest,
          index,
        );
        [...queueList.querySelectorAll<UIDraggable>(":scope > ui-draggable")].forEach(
          (element, i) => {
            if (i === index) return;
            const distance =
              rowRects[index]!.height + parseFloat(getComputedStyle(queueList).rowGap || "0");
            element.style.translate =
              "0 " +
              (index < targetIndex && i > index && i <= targetIndex
                ? -distance
                : index > targetIndex && i < index && i >= targetIndex
                  ? distance
                  : 0) +
              "px";
          },
        );
      });
      on(row, "ui-drag-end", (event) => {
        [...queueList.querySelectorAll<UIDraggable>(":scope > ui-draggable")].forEach(
          (element) => (element.style.translate = ""),
        );
        row.resetPosition();
        if (!event.detail.cancelled) reorder(item.id, targetIndex);
      });
      queueList.append(row);
    });
  };
  const dispatchMessage = (message: ComposerMessage) => {
    history.push(message.text);
    historyIndex = -1;
    emit("composer-send", message);
  };
  const deliver = (message: ComposerMessage): void => {
    if (!options.onSend) {
      dispatchMessage(message);
      return;
    }
    pending = message;
    const request = new AbortController();
    delivery = request;
    sync();
    announce("Sending…");
    stop.focus();
    void Promise.resolve()
      .then(() => {
        if (request.signal.aborted) return;
        return options.onSend!(message, request.signal);
      })
      .then(
        () => {
          if (request.signal.aborted || destroyed) return;
          pending = null;
          delivery = undefined;
          sync();
          dispatchMessage(message);
          announce("Sent");
          focusDraft();
        },
        () => {
          if (request.signal.aborted || destroyed) return;
          pending = null;
          delivery = undefined;
          draft.value = message.text;
          files = [...message.files];
          renderFiles();
          sync();
          announce("Couldn't send. Your draft is safe.", true);
          focusDraft();
        },
      );
  };
  const submit = () => {
    if (destroyed || disabled || pending || !hasDraft()) return;
    const message = {
      id: crypto.randomUUID(),
      text: draft.value.trim(),
      files: [...files],
      mode: mode?.value,
    };
    draft.value = "";
    files = [];
    historyIndex = -1;
    highlighted = -1;
    renderFiles();
    renderSuggestions();
    emit("composer-change", { value: "" });
    emit("composer-files-change", { files: [] });
    if (responseStatus === "streaming") {
      queue.push(message);
      renderQueue();
      sync();
      emit("composer-queue-change", {
        queue: queue.map((queued) => ({ ...queued, files: [...queued.files] })),
      });
      announce("Queued for the next response.");
      focusDraft();
      return;
    }
    sync();
    deliver(message);
    if (!pending) focusDraft();
  };
  const stopResponse = () => {
    if (disabled) return;
    if (pending) {
      delivery?.abort();
      delivery = undefined;
      draft.value = pending.text;
      files = pending.files;
      pending = null;
      renderFiles();
      sync();
      announce("Sending stopped. Continue editing.");
      focusDraft();
    } else emit("composer-stop", {});
  };
  const openFilePicker = (accept?: string) => {
    if (disabled || pending || form.hasAttribute("data-no-attachments")) return;
    // A temporary picker can narrow types without changing the form's drop policy.
    if (accept) {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = accept;
      on(input, "change", () => addFiles(input.files ?? []));
      input.click();
    } else picker.click();
  };
  const setStatus = (value: ComposerStatus) => {
    const previous = responseStatus;
    responseStatus = value === "streaming" ? "streaming" : "idle";
    sync();
    if (previous === "streaming" && responseStatus === "idle" && !disabled && queue.length) {
      const message = queue.shift();
      renderQueue();
      emit("composer-queue-change", {
        queue: queue.map((queued) => ({ ...queued, files: [...queued.files] })),
      });
      deliver(message!);
    }
  };
  const api: MessageComposer = {
    get value() {
      return draft.value;
    },
    set value(value) {
      setDraft(value);
    },
    get files() {
      return [...files];
    },
    set files(value) {
      addFiles(value, true);
    },
    get queue() {
      return queue.map((queued) => ({ ...queued, files: [...queued.files] }));
    },
    set queue(value) {
      queue = value.map((item) => ({ ...item, files: [...item.files] }));
      renderQueue();
    },
    get history() {
      return [...history];
    },
    set history(value) {
      history = [...value];
      historyIndex = -1;
    },
    get status() {
      return responseStatus;
    },
    set status(value) {
      setStatus(value);
    },
    get disabled() {
      return disabled;
    },
    set disabled(value) {
      disabled = Boolean(value);
      renderFiles();
      renderQueue();
      sync();
    },
    set suggestions(value: string[]) {
      suggestions = [...value];
      highlighted = -1;
      renderSuggestions();
      sync();
    },
    openFilePicker,
    send: submit,
    stop: stopResponse,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      scope.abort();
      delivery?.abort();
      cancelAnimationFrame(frame);
      resize.disconnect();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      pending = null;
      files = [];
      queue = [];
      history = [];
      suggestions = [];
      context.replaceChildren();
      queueList.replaceChildren();
      suggestionsList.replaceChildren();
      form.querySelector(".mash-composer-placeholder")?.remove();
      form.removeAttribute("data-file-over");
      composers.delete(form);
    },
  };
  composers.set(form, api);

  on(form, "submit", (event) => {
    event.preventDefault();
    submit();
  });
  on(draft, "input", changed);
  on(draft, "keydown", (event) => {
    if (disabled || pending || event.isComposing) return;
    const control = draft.control;
    if (!control) return;
    const hasSelection = control.selectionStart !== control.selectionEnd;
    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      !draft.value &&
      form.dataset.placeholderSuggestion
    ) {
      event.preventDefault();
      setDraft(form.dataset.placeholderSuggestion);
      focusDraft();
      return;
    }
    if (event.key === "Escape" && highlighted >= 0) {
      event.preventDefault();
      highlighted = -1;
      renderSuggestions();
      announce("");
      return;
    }
    if (
      !draft.value &&
      suggestions.length &&
      !event.altKey &&
      ["ArrowUp", "ArrowDown"].includes(event.key) &&
      historyIndex < 0 &&
      (event.key === "ArrowDown" || highlighted >= 0)
    ) {
      event.preventDefault();
      highlighted = Math.max(
        -1,
        Math.min(suggestions.length - 1, highlighted + (event.key === "ArrowDown" ? 1 : -1)),
      );
      renderSuggestions();
      return;
    }
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      if (highlighted >= 0 && !draft.value) {
        setDraft(suggestions[highlighted]!);
        focusDraft();
      } else if (responseStatus === "streaming" && !hasDraft()) stopResponse();
      else submit();
      return;
    }
    if (
      !hasSelection &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      ["ArrowUp", "ArrowDown"].includes(event.key) &&
      history.length
    ) {
      const firstLine = !draft.value.slice(0, control.selectionStart).includes("\n");
      const lastLine = !draft.value.slice(control.selectionEnd).includes("\n");
      if (event.key === "ArrowUp" && firstLine) {
        event.preventDefault();
        if (historyIndex < 0) {
          savedDraft = draft.value;
          historyIndex = history.length;
        }
        historyIndex = Math.max(0, historyIndex - 1);
        draft.value = history[historyIndex]!;
        sync();
        focusDraft();
      } else if (event.key === "ArrowDown" && lastLine && historyIndex >= 0) {
        event.preventDefault();
        historyIndex++;
        draft.value = historyIndex >= history.length ? savedDraft : history[historyIndex]!;
        if (historyIndex >= history.length) historyIndex = -1;
        sync();
        focusDraft();
      }
    }
  });
  on(expand, "click", () => {
    pinned = !pinned;
    sync();
    draft.focus();
  });
  on(attach, "click", () => openFilePicker());
  on(picker, "change", () => {
    addFiles(picker.files ?? []);
    picker.value = "";
    focusDraft();
  });
  const fileDrag = (event: DragEvent) => event.dataTransfer?.types.includes("Files");
  on(form, "dragenter", (event) => {
    if (!fileDrag(event)) return;
    event.preventDefault();
    if (disabled || pending || form.hasAttribute("data-no-attachments")) return;
    dropDepth++;
    form.setAttribute("data-file-over", "");
  });
  on(form, "dragleave", (event) => {
    if (!fileDrag(event)) return;
    dropDepth = Math.max(0, dropDepth - 1);
    if (!dropDepth) form.removeAttribute("data-file-over");
  });
  on(form, "dragover", (event) => {
    if (fileDrag(event)) {
      event.preventDefault();
      event.dataTransfer!.dropEffect =
        disabled || pending || form.hasAttribute("data-no-attachments") ? "none" : "copy";
    }
  });
  on(form, "drop", (event) => {
    if (!fileDrag(event)) return;
    event.preventDefault();
    dropDepth = 0;
    form.removeAttribute("data-file-over");
    addFiles(event.dataTransfer!.files);
  });
  on(form, "click", (event) => {
    if (
      event
        .composedPath()
        .some(
          (node) =>
            node instanceof Element &&
            node.matches("button,input,textarea,select,a,ui-button,ui-select,ui-draggable"),
        )
    )
      return;
    if (!disabled) focusDraft();
  });
  on(stop, "click", stopResponse);
  on(retry, "click", submit);

  const resize = new ResizeObserver(sync);
  resize.observe(form);
  on(window, "pagehide", () => api.destroy());

  if (form.dataset.placeholderSuggestion) {
    draft.placeholder = form.dataset.placeholderSuggestion;
    const hint = document.createElement("ui-kbd");
    hint.className = "mash-composer-placeholder";
    hint.appearance = "plain";
    hint.textContent = "Tab";
    hint.setAttribute("aria-hidden", "true");
    form.append(hint);
  }
  renderSuggestions();
  sync();
  if (options.signal?.aborted) api.destroy();
  else
    options.signal?.addEventListener("abort", () => api.destroy(), {
      once: true,
      signal: scope.signal,
    });
  return api;
}
