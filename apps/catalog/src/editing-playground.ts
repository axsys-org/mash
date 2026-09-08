import {
  CommandRegistry,
  DOMTextSelectionAdapter,
  SelectionManager,
  dispatchCommand,
  type CommandDefinition,
  type CommandRegistration,
  type DOMTextSelectionRecord,
  type FileUploadChangeDetail,
  type ResolvedCommand,
} from "@mash/ui";
import {
  allocateBlockId,
  blockContentSelector,
  blockDefinitions,
  blockKindLabels,
  blockSelector,
  createBlock,
  createCalloutContent,
  createTextBlockContent,
  editableSelector,
  insertGroups,
  placeCaretAtEnd,
  renderUploadedFile,
  setAttributes,
  textOffsetRange,
  type BlockDefinition,
} from "./editing-blocks.js";
import { MarkupHistory } from "./editing-history.js";
import { applyStageUtilityRecipes } from "./utility-recipes.js";

interface EditingPlaygroundContext {
  root: HTMLElement;
  surface: HTMLElement;
  selection: DOMTextSelectionRecord | null;
  activeBlock: HTMLElement | null;
  selectedBlocks: readonly HTMLElement[];
}

interface EditingCommandMetadata {
  selector?: string;
  tag?: string;
  attributes?: Record<string, string>;
  className?: string;
  block?: BlockDefinition;
}

interface SlashSession {
  anchorBlock: HTMLElement;
  historyIndex: number;
  query: string;
  triggerRange: Range | null;
}

type EditingCommand = CommandDefinition<EditingPlaygroundContext, unknown, EditingCommandMetadata>;
type EditingResolvedCommand = ResolvedCommand<
  EditingPlaygroundContext,
  unknown,
  EditingCommandMetadata
>;
type OpenableElement = HTMLElement & { open: boolean };

const editingPlaygrounds = new Map<HTMLElement, EditingPlayground>();
const flowingTextBlockKinds = new Set(["body", "heading", "quote", "title"]);

function elementForNode(node: Node): Element | null {
  return node instanceof Element ? node : node.parentElement;
}

function elementFromPath(event: Event, selector: string): HTMLElement | null {
  return (
    event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches(selector)) ??
    null
  );
}

function ancestorInside(range: Range, surface: HTMLElement, selector: string): Element | null {
  let current = elementForNode(range.commonAncestorContainer);
  while (current && current !== surface) {
    if (current.matches(selector)) return current;
    current = current.parentElement;
  }
  return null;
}

function blockForRange(range: Range | undefined): HTMLElement | null {
  if (!range) return null;
  return elementForNode(range.startContainer)?.closest<HTMLElement>(blockSelector) ?? null;
}

function selectedBlockKinds(context: EditingPlaygroundContext): readonly string[] {
  const blocks = context.selectedBlocks.length
    ? context.selectedBlocks
    : context.activeBlock
      ? [context.activeBlock]
      : [];
  return [...new Set(blocks.map((block) => block.dataset.editingBlockKind ?? "body"))];
}

function selectionStatus(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").filter(Boolean);
  if (words.length > 6 || normalized.length > 44) return `${words.length} words selected`;
  return `"${normalized}" selected`;
}

function commandMetadata(
  selector: string,
  tag: string,
  attributes?: Record<string, string>,
  className?: string,
): EditingCommandMetadata {
  return { selector, tag, attributes, className };
}

class EditingPlayground {
  readonly #root: HTMLElement;
  readonly #surface: HTMLElement;
  readonly #toolbar: HTMLElement;
  readonly #blockToolbar: HTMLElement;
  readonly #slashMenu: OpenableElement;
  readonly #slashAnchor: HTMLElement;
  readonly #output: HTMLOutputElement | null;
  readonly #selectionManager = new SelectionManager<DOMTextSelectionRecord>();
  readonly #selectionAdapter: DOMTextSelectionAdapter<DOMTextSelectionRecord>;
  readonly #commands = new CommandRegistry<
    EditingPlaygroundContext,
    unknown,
    EditingCommandMetadata
  >();
  readonly #registrations: CommandRegistration[] = [];
  readonly #history: MarkupHistory;
  readonly #toolbarResize: ResizeObserver;
  readonly #selectedBlockIds = new Set<string>();
  #activeBlockId: string | null = null;
  #selectionAnchorId: string | null = null;
  #slashSession: SlashSession | null = null;
  #slashCommands: readonly EditingResolvedCommand[] = [];
  #slashIndex = 0;
  #draggedBlock: HTMLElement | null = null;
  #commentCount = 3;
  #assetCount = 0;
  readonly #assetUrls = new Map<string, string>();
  #positionFrame = 0;

  constructor(root: HTMLElement) {
    const surface = root.querySelector<HTMLElement>("[data-editing-surface]");
    const toolbar = root.querySelector<HTMLElement>("[data-editing-toolbar]");
    const blockToolbar = root.querySelector<HTMLElement>("[data-editing-block-toolbar]");
    const slashMenu = root.querySelector<OpenableElement>("[data-editing-slash-menu]");
    const slashAnchor = root.querySelector<HTMLElement>("[data-editing-slash-anchor]");
    if (!surface || !toolbar || !blockToolbar || !slashMenu || !slashAnchor) {
      throw new Error("Editing playground anatomy is incomplete.");
    }
    this.#root = root;
    this.#surface = surface;
    this.#toolbar = toolbar;
    this.#blockToolbar = blockToolbar;
    this.#slashMenu = slashMenu;
    this.#slashAnchor = slashAnchor;
    this.#output = root.querySelector<HTMLOutputElement>("[data-editing-status]");
    this.#ensureBlockAnatomy();
    this.#activeBlockId = this.#blocks()[0]?.dataset.editingBlock ?? null;
    this.#history = new MarkupHistory(surface, (restored) => this.#onHistoryChange(restored));
    this.#selectionAdapter = new DOMTextSelectionAdapter(this.#selectionManager, surface, {
      retainWithin: root,
    });
    this.#toolbarResize = new ResizeObserver(() => this.#queuePosition());
    this.#toolbarResize.observe(toolbar);
    this.#toolbarResize.observe(blockToolbar);

    this.#registerCommands();
    this.#registrations.push(
      this.#commands.connect(root, {
        context: () => this.#context(),
        scopes: () => this.#scopes(),
        onError: (error, command) => {
          console.error(error);
          if (this.#output) this.#output.value = `${command} failed`;
        },
      }),
      this.#commands.subscribe(() => this.#sync()),
      this.#selectionManager.subscribe(() => this.#onTextSelectionChange()),
    );

    root.addEventListener("click", this.#onClick);
    root.addEventListener("click", this.#onSlashOptionClick, true);
    root.addEventListener("pointerdown", this.#onPointerDown, true);
    root.addEventListener("pointermove", this.#onPointerMove);
    root.addEventListener("focusin", this.#onFocusIn);
    slashMenu.addEventListener("ui-menu-open-change", this.#onSlashOpenChange);
    surface.addEventListener("input", this.#onInput);
    surface.addEventListener("keydown", this.#onKeydown);
    surface.addEventListener("dragstart", this.#onDragStart);
    surface.addEventListener("dragover", this.#onDragOver);
    surface.addEventListener("drop", this.#onDrop);
    surface.addEventListener("dragend", this.#onDragEnd);
    surface.addEventListener("ui-file-upload-change", this.#onFileUploadChange);
    this.#selectInitialText();
    this.#sync();
  }

  destroy(): void {
    this.#root.removeEventListener("click", this.#onClick);
    this.#root.removeEventListener("click", this.#onSlashOptionClick, true);
    this.#root.removeEventListener("pointerdown", this.#onPointerDown, true);
    this.#root.removeEventListener("pointermove", this.#onPointerMove);
    this.#root.removeEventListener("focusin", this.#onFocusIn);
    this.#slashMenu.removeEventListener("ui-menu-open-change", this.#onSlashOpenChange);
    this.#surface.removeEventListener("input", this.#onInput);
    this.#surface.removeEventListener("keydown", this.#onKeydown);
    this.#surface.removeEventListener("dragstart", this.#onDragStart);
    this.#surface.removeEventListener("dragover", this.#onDragOver);
    this.#surface.removeEventListener("drop", this.#onDrop);
    this.#surface.removeEventListener("dragend", this.#onDragEnd);
    this.#surface.removeEventListener("ui-file-upload-change", this.#onFileUploadChange);
    this.#selectionAdapter.destroy();
    this.#history.destroy();
    this.#toolbarResize.disconnect();
    for (const registration of this.#registrations) registration.destroy();
    for (const url of this.#assetUrls.values()) URL.revokeObjectURL(url);
    this.#assetUrls.clear();
    if (this.#positionFrame) cancelAnimationFrame(this.#positionFrame);
  }

  #blocks(): HTMLElement[] {
    return [...this.#surface.querySelectorAll<HTMLElement>(`:scope > ${blockSelector}`)];
  }

  #activeBlock(): HTMLElement | null {
    if (this.#activeBlockId) {
      const block = this.#surface.querySelector<HTMLElement>(
        `${blockSelector}[data-editing-block="${CSS.escape(this.#activeBlockId)}"]`,
      );
      if (block) return block;
    }
    return blockForRange(this.#selectionManager.find("text")?.data.range);
  }

  #selectedBlocks(): HTMLElement[] {
    return this.#blocks().filter((block) =>
      this.#selectedBlockIds.has(block.dataset.editingBlock ?? ""),
    );
  }

  #context(): EditingPlaygroundContext {
    const selection = this.#selectionManager.find("text") ?? null;
    const rangeBlock = blockForRange(selection?.data.range);
    return {
      root: this.#root,
      surface: this.#surface,
      selection,
      activeBlock: rangeBlock ?? this.#activeBlock(),
      selectedBlocks: this.#selectedBlocks(),
    };
  }

  #scopes(): readonly string[] {
    const context = this.#context();
    const scopes = ["editor:*", "editor:insert"];
    if (context.activeBlock) scopes.push("editor:block");
    if (context.selection?.data.text && !context.selection.data.collapsed)
      scopes.push("editor:text");
    return scopes;
  }

  #registerCommands(): void {
    const selected = (context: EditingPlaygroundContext): boolean =>
      Boolean(context.selection?.data.text);
    const active =
      (selector: string) =>
      (context: EditingPlaygroundContext): boolean => {
        const range = context.selection?.data.range;
        return Boolean(range && ancestorInside(range, context.surface, selector));
      };
    const blockActive =
      (kind: string) =>
      (context: EditingPlaygroundContext): boolean =>
        context.activeBlock?.dataset.editingBlockKind === kind;
    const wrap =
      (metadata: EditingCommandMetadata) =>
      (context: EditingPlaygroundContext): void => {
        this.#applyWrapper(context, metadata);
      };
    const setBlock =
      (kind: "body" | "callout" | "heading" | "title") =>
      (context: EditingPlaygroundContext): void => {
        if (!context.activeBlock) return;
        this.#transformBlock(context.activeBlock, kind);
      };

    const textCommands: EditingCommand[] = [
      {
        id: "format.bold",
        label: "Bold",
        shortcut: "Primary+B",
        active: active("strong, b"),
        metadata: commandMetadata("strong, b", "strong"),
      },
      {
        id: "format.italic",
        label: "Italic",
        shortcut: "Primary+I",
        active: active("em, i"),
        metadata: commandMetadata("em, i", "em"),
      },
      {
        id: "format.underline",
        label: "Underline",
        shortcut: "Primary+U",
        active: active("u"),
        metadata: commandMetadata("u", "u"),
      },
      {
        id: "format.strike",
        label: "Strikethrough",
        active: active("s, strike"),
        metadata: commandMetadata("s, strike", "s"),
      },
      {
        id: "format.code",
        label: "Inline code",
        active: active("code"),
        metadata: commandMetadata(
          "code",
          "code",
          undefined,
          "rounded-control bg-surface-sunken px-control-block-small type-code",
        ),
      },
      {
        id: "format.link",
        label: "Link",
        active: active("ui-link[href], a[href]"),
        metadata: commandMetadata("ui-link[href], a[href]", "ui-link", {
          href: "#billing-migration",
          variant: "inline",
        }),
      },
      {
        id: "format.comment",
        label: "Comment",
        active: active("mark[data-editing-comment]"),
        metadata: commandMetadata("mark[data-editing-comment]", "mark", {
          "data-editing-comment": "",
        }),
      },
      {
        id: "tone.secondary",
        label: "Muted",
        active: active('[data-editing-tone="secondary"]'),
        metadata: commandMetadata('[data-editing-tone="secondary"]', "ui-typeset", {
          preset: "body",
          tone: "secondary",
          "data-editing-tone": "secondary",
        }),
      },
      {
        id: "tone.accent",
        label: "Accent",
        active: active('[data-editing-tone="accent"]'),
        metadata: commandMetadata('[data-editing-tone="accent"]', "ui-typeset", {
          preset: "body",
          tone: "accent",
          "data-editing-tone": "accent",
        }),
      },
      {
        id: "tone.critical",
        label: "Critical",
        active: active('[data-editing-tone="critical"]'),
        metadata: commandMetadata('[data-editing-tone="critical"]', "ui-typeset", {
          preset: "body",
          tone: "critical",
          "data-editing-tone": "critical",
        }),
      },
      {
        id: "insert.badge",
        label: "Badge",
        active: active("ui-badge[data-editing-insert]"),
        metadata: commandMetadata("ui-badge[data-editing-insert]", "ui-badge", {
          tone: "accent",
          "data-editing-insert": "badge",
        }),
      },
      {
        id: "insert.callout",
        label: "Callout chip",
        active: active('[data-editing-insert="callout"]'),
        metadata: commandMetadata(
          '[data-editing-insert="callout"]',
          "span",
          { "data-editing-insert": "callout" },
          "inline-flex items-baseline rounded-control bg-action-wash px-control-inline-small py-control-block-small text-action",
        ),
      },
    ].map((command) => ({
      ...command,
      when: selected,
      run: command.metadata ? wrap(command.metadata) : undefined,
    }));

    const insertionCommands: EditingCommand[] = blockDefinitions.map((block, order) => ({
      id: `block.insert.${block.type}`,
      label: block.label,
      description: block.description,
      group: block.group,
      keywords: block.keywords,
      order,
      metadata: { block },
      run: (context) => this.#insertBlock(block, context),
    }));

    this.#registrations.push(
      this.#commands.register({
        id: "editing-history",
        scope: "editor:*",
        commands: [
          {
            id: "history.undo",
            label: "Undo",
            placement: "start",
            disabled: () => !this.#history.canUndo,
            run: () => {
              if (!this.#history.undo()) return false;
              this.#sync("Undo");
              return true;
            },
          },
          {
            id: "history.redo",
            label: "Redo",
            placement: "start",
            disabled: () => !this.#history.canRedo,
            run: () => {
              if (!this.#history.redo()) return false;
              this.#sync("Redo");
              return true;
            },
          },
        ],
      }),
      this.#commands.register({
        id: "editing-text-formatting",
        scope: "editor:text",
        commands: textCommands,
      }),
      this.#commands.register({
        id: "editing-block-types",
        scope: "editor:block",
        commands: [
          {
            id: "block.body",
            label: "Text",
            active: blockActive("body"),
            run: setBlock("body"),
          },
          {
            id: "block.callout",
            label: "Callout",
            active: blockActive("callout"),
            run: setBlock("callout"),
          },
          {
            id: "block.heading",
            label: "Heading 2",
            active: blockActive("heading"),
            run: setBlock("heading"),
          },
          {
            id: "block.title",
            label: "Heading 1",
            active: blockActive("title"),
            run: setBlock("title"),
          },
          {
            id: "block.move-up",
            label: "Move up",
            disabled: (context) => !context.activeBlock?.previousElementSibling,
            run: (context) => this.#moveBlock(context.activeBlock, -1),
          },
          {
            id: "block.move-down",
            label: "Move down",
            disabled: (context) => !context.activeBlock?.nextElementSibling,
            run: (context) => this.#moveBlock(context.activeBlock, 1),
          },
          {
            id: "block.duplicate",
            label: "Duplicate",
            run: (context) => this.#duplicateBlock(context.activeBlock),
          },
          {
            id: "block.copy",
            label: "Copy contents",
            run: async (context) => {
              const blocks = context.selectedBlocks.length
                ? context.selectedBlocks
                : context.activeBlock
                  ? [context.activeBlock]
                  : [];
              const value = blocks
                .map((block) => block.querySelector(blockContentSelector)?.textContent?.trim())
                .filter(Boolean)
                .join("\n\n");
              if (!value) return false;
              await navigator.clipboard.writeText(value);
              this.#sync(`${blocks.length} block${blocks.length === 1 ? "" : "s"} copied`);
              return true;
            },
          },
          {
            id: "block.delete",
            label: "Delete",
            run: (context) => this.#deleteBlocks(context),
          },
        ],
      }),
      this.#commands.register({
        id: "editing-block-insertions",
        scope: "editor:insert",
        commands: insertionCommands,
      }),
    );
  }

  #ensureBlockAnatomy(): void {
    for (const block of this.#blocks()) {
      this.#ensureAnatomyForBlock(block);
    }
  }

  #ensureAnatomyForBlock(block: HTMLElement): void {
    block.tabIndex = -1;
    if (!block.dataset.editingBlock) {
      block.dataset.editingBlock = allocateBlockId();
    }
    const kind = block.dataset.editingBlockKind ?? "body";
    block.dataset.editingBlockVersion ??= String(
      blockDefinitions.find((definition) => definition.type === kind)?.version ?? 1,
    );
    if (!block.querySelector(":scope > [data-editing-block-rail]")) {
      const rail = document.createElement("div");
      rail.dataset.editingBlockRail = "";
      const add = this.#railButton("action.add", "Insert block below", "data-editing-add-block");
      const drag = this.#railButton(
        "action.drag",
        "Select or drag block",
        "data-editing-drag-handle",
      );
      drag.draggable = true;
      rail.append(add, drag);
      block.prepend(rail);
    }
    applyStageUtilityRecipes(block);
  }

  #railButton(iconName: string, label: string, dataAttribute: string): HTMLElement {
    const button = document.createElement("ui-button");
    setAttributes(button, {
      type: "button",
      size: "xsmall",
      variant: "quiet",
      compact: "",
      "aria-label": label,
      title: label,
      [dataAttribute]: "",
    });
    const icon = document.createElement("ui-icon");
    setAttributes(icon, { name: iconName, label: "" });
    button.append(icon);
    return button;
  }

  #onHistoryChange(restored: boolean): void {
    if (restored) {
      this.#selectionAdapter.clear();
      this.#selectedBlockIds.clear();
      this.#ensureBlockAnatomy();
      if (!this.#activeBlock())
        this.#activeBlockId = this.#blocks()[0]?.dataset.editingBlock ?? null;
    }
    this.#sync();
  }

  #applyWrapper(context: EditingPlaygroundContext, metadata: EditingCommandMetadata): void {
    const stored = context.selection?.data.range;
    if (!stored || stored.collapsed || !metadata.selector || !metadata.tag) return;
    const range = stored.cloneRange();
    const editable = ancestorInside(range, context.surface, editableSelector);
    if (!editable) return;
    const existing = ancestorInside(range, context.surface, metadata.selector);

    try {
      let nextRange: Range;
      if (existing && existing.parentNode && existing.firstChild && existing.lastChild) {
        const first = existing.firstChild;
        const last = existing.lastChild;
        const parent = existing.parentNode;
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
        existing.remove();
        nextRange = document.createRange();
        nextRange.setStartBefore(first);
        nextRange.setEndAfter(last);
      } else {
        const wrapper = document.createElement(metadata.tag);
        for (const [name, value] of Object.entries(metadata.attributes ?? {})) {
          wrapper.setAttribute(name, value);
        }
        if (metadata.className) wrapper.className = metadata.className;
        wrapper.append(range.extractContents());
        range.insertNode(wrapper);
        nextRange = document.createRange();
        nextRange.selectNodeContents(wrapper);
      }

      if (metadata.attributes?.["data-editing-comment"] !== undefined && !existing) {
        this.#commentCount += 1;
        const count = this.#root.querySelector<HTMLElement>("[data-editing-comment-count]");
        if (count) count.textContent = String(this.#commentCount);
        const latest = this.#root.querySelector<HTMLElement>("[data-editing-comment-latest]");
        if (latest) {
          latest.hidden = false;
          latest.textContent = `Review note added to "${nextRange.toString().trim()}".`;
        }
      }

      this.#selectionAdapter.setRange(nextRange);
      this.#history.commit();
      this.#sync(`${nextRange.toString().replace(/\s+/g, " ").trim()} formatted`);
    } catch (error) {
      console.error(error);
      if (this.#output) this.#output.value = "Selection could not be formatted";
    }
  }

  #transformBlock(block: HTMLElement, kind: "body" | "callout" | "heading" | "title"): void {
    const container = block.querySelector<HTMLElement>(`:scope > ${blockContentSelector}`);
    if (!container) return;
    const source = container.querySelector<HTMLElement>(editableSelector);
    const markup = source?.innerHTML || container.textContent?.trim() || "";
    let content: HTMLElement;
    if (kind === "callout") {
      content = createCalloutContent();
      const target = content.querySelector<HTMLElement>(editableSelector);
      if (target) target.innerHTML = markup;
    } else {
      const tag = kind === "title" ? "h1" : kind === "heading" ? "h2" : "p";
      content = createTextBlockContent(tag, "");
      content.innerHTML = markup;
    }
    container.replaceChildren(content);
    block.dataset.editingBlockKind = kind;
    applyStageUtilityRecipes(block);
    this.#activeBlockId = block.dataset.editingBlock ?? null;
    this.#selectionAdapter.clear();
    this.#history.commit();
    this.#focusBlock(block);
    this.#sync(`${blockKindLabels[kind]} block`);
  }

  #insertBlock(definition: BlockDefinition, context: EditingPlaygroundContext): void {
    const session = this.#slashSession;
    const anchor = session?.anchorBlock ?? context.activeBlock ?? this.#blocks().at(-1) ?? null;
    if (session?.triggerRange) session.triggerRange.deleteContents();
    const historyCheckpoint = session?.triggerRange ? session.historyIndex : null;
    const block = createBlock(definition.type, definition.create());
    this.#ensureAnatomyForBlock(block);

    const replaceAnchor = Boolean(
      session?.triggerRange &&
      anchor &&
      anchor.querySelector(editableSelector)?.textContent?.trim() === "",
    );
    if (anchor && replaceAnchor) anchor.replaceWith(block);
    else if (anchor) anchor.after(block);
    else this.#surface.append(block);

    this.#closeSlash();
    this.#selectedBlockIds.clear();
    this.#activeBlockId = block.dataset.editingBlock ?? null;
    if (historyCheckpoint === null) this.#history.commit();
    else this.#history.commitFrom(historyCheckpoint);
    this.#focusBlock(block);
    this.#sync(`${definition.label} inserted`);
  }

  #moveBlock(block: HTMLElement | null, direction: -1 | 1): boolean {
    if (!block) return false;
    const sibling = direction < 0 ? block.previousElementSibling : block.nextElementSibling;
    if (!(sibling instanceof HTMLElement) || !sibling.matches(blockSelector)) return false;
    if (direction < 0) sibling.before(block);
    else sibling.after(block);
    this.#activeBlockId = block.dataset.editingBlock ?? null;
    this.#history.commit();
    block.scrollIntoView({ block: "nearest", behavior: "smooth" });
    this.#sync(direction < 0 ? "Block moved up" : "Block moved down");
    return true;
  }

  #duplicateBlock(block: HTMLElement | null): boolean {
    if (!block) return false;
    const clone = block.cloneNode(true) as HTMLElement;
    clone.dataset.editingBlock = allocateBlockId(clone.dataset.editingBlockKind);
    clone.removeAttribute("aria-selected");
    clone.removeAttribute("data-editing-active");
    block.after(clone);
    this.#activeBlockId = clone.dataset.editingBlock;
    this.#selectedBlockIds.clear();
    this.#history.commit();
    this.#focusBlock(clone);
    this.#sync("Block duplicated");
    return true;
  }

  #deleteBlocks(context: EditingPlaygroundContext): boolean {
    const blocks = context.selectedBlocks.length
      ? [...context.selectedBlocks]
      : context.activeBlock
        ? [context.activeBlock]
        : [];
    if (!blocks.length) return false;
    const allBlocks = this.#blocks();
    const firstIndex = allBlocks.indexOf(blocks[0]!);
    const fallback = allBlocks[firstIndex + blocks.length] ?? allBlocks[firstIndex - 1] ?? null;
    if (blocks.length === allBlocks.length) {
      const replacement = createBlock("body", createTextBlockContent("p", ""));
      this.#surface.replaceChildren(replacement);
      this.#ensureBlockAnatomy();
      this.#activeBlockId = replacement.dataset.editingBlock ?? null;
    } else {
      for (const block of blocks) block.remove();
      this.#activeBlockId = fallback?.isConnected
        ? (fallback.dataset.editingBlock ?? null)
        : (this.#blocks()[0]?.dataset.editingBlock ?? null);
    }
    this.#selectedBlockIds.clear();
    this.#history.commit();
    const active = this.#activeBlock();
    if (active) this.#focusBlock(active);
    this.#sync(`${blocks.length} block${blocks.length === 1 ? "" : "s"} deleted`);
    return true;
  }

  #focusBlock(block: HTMLElement): void {
    const editable = block.querySelector<HTMLElement>(editableSelector);
    if (editable) {
      placeCaretAtEnd(editable);
      return;
    }
    const control = block.querySelector<HTMLElement>(
      "ui-input, ui-textarea, ui-button, ui-checkbox, ui-collapsible",
    );
    if (control) control.focus({ preventScroll: true });
    else block.focus({ preventScroll: true });
  }

  #openInsertionMenu(anchorBlock: HTMLElement, rect: DOMRectReadOnly): void {
    this.#selectionAdapter.clear();
    this.#slashSession = {
      anchorBlock,
      historyIndex: this.#history.index,
      query: "",
      triggerRange: null,
    };
    this.#positionSlashAnchor(rect);
    this.#renderSlashCommands();
    this.#slashMenu.open = true;
    this.#sync();
  }

  #updateSlashFromEditable(editable: HTMLElement): void {
    const block = editable.closest<HTMLElement>(blockSelector);
    if (!block || !flowingTextBlockKinds.has(block.dataset.editingBlockKind ?? "")) {
      this.#closeSlash();
      return;
    }
    const selection = document.getSelection();
    if (!selection?.rangeCount) {
      this.#closeSlash();
      return;
    }
    const caret = selection.getRangeAt(0);
    if (!caret.collapsed || !editable.contains(caret.startContainer)) {
      this.#closeSlash();
      return;
    }
    const prefix = document.createRange();
    prefix.selectNodeContents(editable);
    prefix.setEnd(caret.endContainer, caret.endOffset);
    const text = prefix.toString();
    const match = text.match(/(?:^|\s)\/([^/\n]*)$/);
    if (!match) {
      this.#closeSlash();
      return;
    }
    const query = match[1] ?? "";
    const start = text.length - query.length - 1;
    const triggerRange = textOffsetRange(editable, start, text.length);
    const anchorBlock = block;
    if (!triggerRange || !anchorBlock) {
      this.#closeSlash();
      return;
    }
    const rect = caret.getBoundingClientRect();
    const fallback = editable.getBoundingClientRect();
    const activeSession = this.#slashSession;
    if (query !== activeSession?.query) this.#slashIndex = 0;
    this.#slashSession = {
      anchorBlock,
      historyIndex: activeSession?.historyIndex ?? this.#history.index,
      query,
      triggerRange,
    };
    this.#positionSlashAnchor(rect.height || rect.width ? rect : fallback);
    this.#renderSlashCommands();
    this.#slashMenu.open = true;
    this.#sync();
  }

  #renderSlashCommands(): void {
    const session = this.#slashSession;
    if (!session) return;
    for (const entry of this.#slashMenu.querySelectorAll<HTMLElement>(
      ":scope > [data-editing-slash-entry]",
    )) {
      entry.remove();
    }
    this.#slashCommands = this.#commands.search(session.query, ["editor:insert"], this.#context(), {
      groups: insertGroups,
      limit: 24,
    });
    const heading = this.#slashMenu.querySelector<HTMLElement>("[data-editing-slash-heading]");
    if (heading) heading.textContent = session.query || "Insert";
    const count = this.#slashMenu.querySelector<HTMLOutputElement>("[data-editing-slash-count]");
    if (count) count.value = String(this.#slashCommands.length);

    let currentGroup = "";
    this.#slashCommands.forEach((command, index) => {
      const nextGroup = session.query ? "Results" : (command.group ?? "Other");
      if (nextGroup !== currentGroup) {
        const label = document.createElement("ui-menu-label");
        label.dataset.editingSlashEntry = "";
        label.textContent = nextGroup;
        this.#slashMenu.append(label);
        currentGroup = nextGroup;
      }
      const item = document.createElement("ui-menu-item");
      item.dataset.editingSlashEntry = "";
      item.dataset.editingSlashOption = String(index);
      item.dataset.editingCommand = command.id;
      item.setAttribute("value", command.id);
      if (command.disabled) item.setAttribute("disabled", "");
      const icon = document.createElement("ui-icon");
      icon.slot = "prefix";
      setAttributes(icon, { name: command.metadata?.block?.icon ?? "object.document", label: "" });
      const copy = document.createElement("span");
      copy.className = "example-editing-slash-copy";
      const label = document.createElement("strong");
      label.textContent = command.label ?? command.id;
      const description = document.createElement("span");
      description.textContent = command.description ?? "";
      copy.append(label, description);
      item.append(icon, copy);
      this.#slashMenu.append(item);
    });
    applyStageUtilityRecipes(this.#slashMenu);
    this.#slashIndex = Math.min(this.#slashIndex, Math.max(0, this.#slashCommands.length - 1));
    this.#setSlashHighlight(this.#slashIndex, false);
  }

  #setSlashHighlight(index: number, scroll = true): void {
    if (!this.#slashCommands.length) {
      this.#slashIndex = 0;
      return;
    }
    this.#slashIndex = (index + this.#slashCommands.length) % this.#slashCommands.length;
    for (const item of this.#slashMenu.querySelectorAll<HTMLElement>(
      ":scope > [data-editing-slash-option]",
    )) {
      const active = Number(item.dataset.editingSlashOption) === this.#slashIndex;
      item.toggleAttribute("data-editing-highlighted", active);
      item.setAttribute("aria-current", active ? "true" : "false");
      if (active && scroll) item.scrollIntoView({ block: "nearest" });
    }
  }

  #runHighlightedSlash(event: KeyboardEvent): void {
    const command = this.#slashCommands[this.#slashIndex];
    if (!command) return;
    void this.#commands
      .execute(command.id, ["editor:insert"], this.#context(), {
        data: undefined,
        originalEvent: event,
      })
      .catch((error) => console.error(error));
  }

  #positionSlashAnchor(rect: DOMRectReadOnly): void {
    const gutter = 8;
    this.#slashAnchor.style.left = `${Math.max(gutter, Math.min(window.innerWidth - gutter, rect.left))}px`;
    this.#slashAnchor.style.top = `${Math.max(gutter, Math.min(window.innerHeight - gutter, rect.bottom))}px`;
  }

  #closeSlash(): void {
    this.#slashMenu.open = false;
    this.#slashSession = null;
    this.#slashCommands = [];
    this.#slashIndex = 0;
  }

  #splitBlock(editable: HTMLElement): boolean {
    const block = editable.closest<HTMLElement>(blockSelector);
    const selection = document.getSelection();
    if (!block || !selection?.rangeCount) return false;
    const range = selection.getRangeAt(0);
    if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) {
      return false;
    }
    if (!range.collapsed) {
      range.deleteContents();
      range.collapse(true);
    }
    const trailing = document.createRange();
    trailing.selectNodeContents(editable);
    trailing.setStart(range.startContainer, range.startOffset);
    const fragment = trailing.extractContents();
    const next = createBlock("body", createTextBlockContent("p", ""));
    const nextEditable = next.querySelector<HTMLElement>(editableSelector)!;
    nextEditable.replaceChildren(fragment);
    block.after(next);
    this.#ensureBlockAnatomy();
    this.#activeBlockId = next.dataset.editingBlock ?? null;
    this.#selectedBlockIds.clear();
    this.#history.commit();
    placeCaretAtEnd(nextEditable);
    this.#sync("Text block inserted");
    return true;
  }

  #removeEmptyBlockBackward(editable: HTMLElement): boolean {
    if (editable.textContent?.trim()) return false;
    const block = editable.closest<HTMLElement>(blockSelector);
    const previous = block?.previousElementSibling;
    if (!block || !(previous instanceof HTMLElement) || !previous.matches(blockSelector))
      return false;
    block.remove();
    this.#activeBlockId = previous.dataset.editingBlock ?? null;
    this.#history.commit();
    this.#focusBlock(previous);
    this.#sync("Blocks joined");
    return true;
  }

  #selectBlock(block: HTMLElement, event: MouseEvent): void {
    const id = block.dataset.editingBlock;
    if (!id) return;
    const blocks = this.#blocks();
    if (event.shiftKey && this.#selectionAnchorId) {
      const anchorIndex = blocks.findIndex(
        (candidate) => candidate.dataset.editingBlock === this.#selectionAnchorId,
      );
      const currentIndex = blocks.indexOf(block);
      if (anchorIndex >= 0 && currentIndex >= 0) {
        this.#selectedBlockIds.clear();
        for (const candidate of blocks.slice(
          Math.min(anchorIndex, currentIndex),
          Math.max(anchorIndex, currentIndex) + 1,
        )) {
          this.#selectedBlockIds.add(candidate.dataset.editingBlock ?? "");
        }
      }
    } else if (event.metaKey || event.ctrlKey) {
      if (this.#selectedBlockIds.has(id)) this.#selectedBlockIds.delete(id);
      else this.#selectedBlockIds.add(id);
      this.#selectionAnchorId = id;
    } else {
      this.#selectedBlockIds.clear();
      this.#selectedBlockIds.add(id);
      this.#selectionAnchorId = id;
    }
    this.#activeBlockId = id;
    this.#selectionAdapter.clear();
    this.#sync(`${this.#selectedBlockIds.size} block selected`);
  }

  #sync(feedback?: string): void {
    const context = this.#context();
    const commands = this.#commands.resolve(this.#scopes(), context);
    const states = new Map(commands.map((command) => [command.id, command]));

    for (const control of this.#root.querySelectorAll<HTMLElement>("[data-editing-command]")) {
      const state = states.get(control.dataset.editingCommand ?? "");
      const conditional = control.hasAttribute("data-editing-conditional");
      if (conditional) control.hidden = !state;
      if ("disabled" in control) {
        (control as HTMLElement & { disabled: boolean }).disabled = !state || state.disabled;
      } else {
        control.setAttribute("aria-disabled", String(!state || state.disabled));
      }
      if ("pressed" in control) {
        (control as HTMLElement & { pressed: boolean }).pressed = state?.active ?? false;
      } else if ("checked" in control) {
        (control as HTMLElement & { checked: boolean }).checked = state?.active ?? false;
      }
      if ("loading" in control) {
        (control as HTMLElement & { loading: boolean }).loading = state?.executing ?? false;
      }
    }

    const selection = context.selection;
    this.#toolbar.hidden = !selection?.data.text || selection.data.collapsed;
    const activeBlock = context.activeBlock;
    this.#blockToolbar.hidden =
      !activeBlock || !this.#toolbar.hidden || Boolean(this.#slashSession);
    this.#root.toggleAttribute("data-editing-selection-active", !this.#toolbar.hidden);
    if (!this.#toolbar.hidden || !this.#blockToolbar.hidden) this.#queuePosition();

    for (const block of this.#blocks()) {
      const id = block.dataset.editingBlock ?? "";
      block.toggleAttribute("data-editing-active", block === activeBlock);
      if (this.#selectedBlockIds.has(id)) block.setAttribute("aria-selected", "true");
      else block.removeAttribute("aria-selected");
    }

    const styleLabel = this.#root.querySelector<HTMLElement>("[data-editing-style-label]");
    if (styleLabel) {
      const kinds = selectedBlockKinds(context);
      styleLabel.textContent =
        kinds.length === 1 ? (blockKindLabels[kinds[0]!] ?? "Text") : "Mixed";
    }

    const words = this.#surface.textContent?.trim().split(/\s+/).filter(Boolean).length ?? 0;
    const blockCount = this.#root.querySelector<HTMLElement>("[data-editing-block-count]");
    if (blockCount) blockCount.textContent = String(this.#blocks().length);
    const status =
      feedback ?? (selection?.data.text ? selectionStatus(selection.data.text) : `${words} words`);
    if (this.#output) this.#output.value = status;
  }

  #queuePosition(): void {
    if (this.#positionFrame) cancelAnimationFrame(this.#positionFrame);
    this.#positionFrame = requestAnimationFrame(() => {
      this.#positionFrame = 0;
      this.#positionToolbars();
    });
  }

  #positionToolbars(): void {
    const gutter = 8;
    const selection = this.#context().selection;
    if (!this.#toolbar.hidden && selection) {
      const anchor = selection.data.rect;
      const toolbar = this.#toolbar.getBoundingClientRect();
      const maxLeft = Math.max(gutter, window.innerWidth - toolbar.width - gutter);
      const left = Math.min(
        maxLeft,
        Math.max(gutter, anchor.left + anchor.width / 2 - toolbar.width / 2),
      );
      const above = anchor.top - toolbar.height - gutter;
      const top =
        above >= gutter
          ? above
          : Math.min(window.innerHeight - toolbar.height - gutter, anchor.bottom + gutter);
      this.#toolbar.style.left = `${left}px`;
      this.#toolbar.style.top = `${Math.max(gutter, top)}px`;
    }

    const block = this.#activeBlock();
    if (!this.#blockToolbar.hidden && block) {
      const anchor = block.getBoundingClientRect();
      const toolbar = this.#blockToolbar.getBoundingClientRect();
      const left = Math.min(
        window.innerWidth - toolbar.width - gutter,
        Math.max(gutter, anchor.right - toolbar.width),
      );
      const above = anchor.top - toolbar.height - 6;
      const top =
        above >= gutter
          ? above
          : Math.min(anchor.bottom + 6, window.innerHeight - toolbar.height - gutter);
      this.#blockToolbar.style.left = `${left}px`;
      this.#blockToolbar.style.top = `${Math.max(gutter, top)}px`;
    }
  }

  #selectInitialText(): void {
    const initial = this.#root.querySelector<HTMLElement>("[data-editing-initial]");
    if (!initial) return;
    requestAnimationFrame(() => {
      if (!this.#root.isConnected || document.getSelection()?.toString().trim()) return;
      const range = document.createRange();
      range.selectNodeContents(initial);
      this.#activeBlockId =
        initial.closest<HTMLElement>(blockSelector)?.dataset.editingBlock ?? null;
      this.#selectionAdapter.setRange(range);
      this.#sync();
    });
  }

  #onTextSelectionChange(): void {
    const selection = this.#selectionManager.find("text");
    const block = blockForRange(selection?.data.range);
    if (block) {
      this.#activeBlockId = block.dataset.editingBlock ?? null;
      this.#selectedBlockIds.clear();
    }
    this.#sync();
  }

  #onClick = (event: MouseEvent): void => {
    const add = elementFromPath(event, "[data-editing-add-block]");
    if (add) {
      const block = add.closest<HTMLElement>(blockSelector) ?? this.#activeBlock();
      if (!block) return;
      this.#activeBlockId = block.dataset.editingBlock ?? null;
      this.#openInsertionMenu(block, add.getBoundingClientRect());
      return;
    }

    const drag = elementFromPath(event, "[data-editing-drag-handle]");
    const dragBlock = drag?.closest<HTMLElement>(blockSelector);
    if (dragBlock) {
      this.#selectBlock(dragBlock, event);
      return;
    }

    const demoButton = elementFromPath(event, "[data-editing-demo-button]");
    if (demoButton) {
      this.#sync("Migration approved");
      return;
    }

    const control = elementFromPath(event, "[data-editing-command]");
    if (
      !control ||
      control.getAttribute("aria-disabled") === "true" ||
      control.hasAttribute("disabled")
    ) {
      return;
    }
    dispatchCommand(control, control.dataset.editingCommand ?? "", { originalEvent: event });
  };

  #onSlashOptionClick = (event: MouseEvent): void => {
    const option = elementFromPath(event, "[data-editing-slash-option]");
    if (!option || option.hasAttribute("disabled")) return;
    event.preventDefault();
    event.stopPropagation();
    const command = option.dataset.editingCommand;
    if (!command) return;
    void this.#commands
      .execute(command, ["editor:insert"], this.#context(), {
        data: undefined,
        originalEvent: event,
      })
      .catch((error) => console.error(error));
  };

  #onPointerDown = (event: PointerEvent): void => {
    const slashOption = elementFromPath(event, "[data-editing-slash-option]");
    if (slashOption) {
      event.preventDefault();
      return;
    }
    const block = elementFromPath(event, blockSelector);
    if (!block) return;
    this.#activeBlockId = block.dataset.editingBlock ?? null;
    if (!elementFromPath(event, "[data-editing-block-rail]")) {
      this.#selectedBlockIds.clear();
      this.#selectionAnchorId = null;
    }
    this.#sync();
  };

  #onPointerMove = (event: PointerEvent): void => {
    const item = elementFromPath(event, "[data-editing-slash-option]");
    if (!item) return;
    this.#setSlashHighlight(Number(item.dataset.editingSlashOption));
  };

  #onInput = (event: Event): void => {
    this.#history.queue();
    if (event instanceof InputEvent && event.isComposing) return;
    const editable = elementFromPath(event, editableSelector);
    if (editable) this.#updateSlashFromEditable(editable);
    else this.#closeSlash();
    this.#sync();
  };

  #onFileUploadChange = (event: Event): void => {
    const detail = (event as CustomEvent<FileUploadChangeDetail>).detail;
    const upload = elementFromPath(event, "[data-editing-upload]");
    const container = upload?.closest<HTMLElement>("[data-editing-upload-container]");
    const file = detail?.accepted[0];
    if (!upload || !container || !file) {
      const reason = detail?.rejected[0]?.reason;
      if (reason === "max-size") this.#sync("That file is larger than 100 MB");
      else if (reason === "accept") this.#sync("That file type is not supported here");
      return;
    }
    const assetId = `local-asset-${++this.#assetCount}`;
    const url = URL.createObjectURL(file);
    this.#assetUrls.set(assetId, url);
    this.#selectionAdapter.clear();
    this.#selectedBlockIds.clear();
    renderUploadedFile(container, file, url, assetId);
    const block = container.closest<HTMLElement>(blockSelector);
    if (block) this.#activeBlockId = block.dataset.editingBlock ?? null;
    applyStageUtilityRecipes(container);
    this.#history.commit();
    this.#sync(`${file.name} added`);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    if (this.#slashSession) {
      const previous =
        event.key === "ArrowUp" ||
        (event.key === "Tab" && event.shiftKey) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "p");
      const next =
        event.key === "ArrowDown" ||
        (event.key === "Tab" && !event.shiftKey) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "n");
      if (previous || next) {
        event.preventDefault();
        this.#setSlashHighlight(this.#slashIndex + (next ? 1 : -1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        this.#runHighlightedSlash(event);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        this.#closeSlash();
        this.#sync();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home") {
        requestAnimationFrame(() => {
          const editable = elementFromPath(event, editableSelector);
          if (editable) this.#updateSlashFromEditable(editable);
        });
      }
    }

    const editable = elementFromPath(event, editableSelector);
    const block = editable?.closest<HTMLElement>(blockSelector) ?? this.#activeBlock();
    if (event.altKey && block && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      this.#moveBlock(block, event.key === "ArrowUp" ? -1 : 1);
      return;
    }
    if (
      editable &&
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      flowingTextBlockKinds.has(block?.dataset.editingBlockKind ?? "")
    ) {
      event.preventDefault();
      this.#splitBlock(editable);
      return;
    }
    if (
      editable &&
      flowingTextBlockKinds.has(block?.dataset.editingBlockKind ?? "") &&
      event.key === "Backspace" &&
      this.#removeEmptyBlockBackward(editable)
    ) {
      event.preventDefault();
      return;
    }
    if (event.key !== "Escape") return;
    this.#selectionAdapter.clear();
    this.#selectedBlockIds.clear();
    block?.focus({ preventScroll: true });
    this.#sync();
  };

  #onFocusIn = (event: FocusEvent): void => {
    const focusTarget = elementFromPath(event, "[data-editing-focus-block]");
    if (focusTarget) {
      this.#selectionAdapter.clear();
      this.#selectedBlockIds.clear();
      const block = this.#surface.querySelector<HTMLElement>(
        `${blockSelector}[data-editing-block="${CSS.escape(focusTarget.dataset.editingFocusBlock ?? "")}"]`,
      );
      if (block) {
        this.#activeBlockId = block.dataset.editingBlock ?? null;
        block.scrollIntoView({ block: "center", behavior: "smooth" });
        this.#sync();
      }
      return;
    }
    const block = elementFromPath(event, blockSelector);
    if (!block) return;
    this.#activeBlockId = block.dataset.editingBlock ?? null;
    this.#sync();
  };

  #onSlashOpenChange = (event: Event): void => {
    if (event.target !== this.#slashMenu) return;
    const open = (event as CustomEvent<{ open: boolean }>).detail.open;
    if (open) return;
    this.#slashSession = null;
    this.#slashCommands = [];
    this.#slashIndex = 0;
    this.#sync();
  };

  #onDragStart = (event: DragEvent): void => {
    const handle = elementFromPath(event, "[data-editing-drag-handle]");
    const block = handle?.closest<HTMLElement>(blockSelector);
    if (!block) {
      event.preventDefault();
      return;
    }
    this.#draggedBlock = block;
    block.dataset.editingDragging = "";
    event.dataTransfer?.setData("text/plain", block.dataset.editingBlock ?? "");
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  };

  #onDragOver = (event: DragEvent): void => {
    if (!this.#draggedBlock) return;
    const target = elementFromPath(event, blockSelector);
    if (!target || target === this.#draggedBlock) return;
    event.preventDefault();
    const before = event.clientY < target.getBoundingClientRect().top + target.offsetHeight / 2;
    for (const block of this.#blocks()) {
      block.removeAttribute("data-editing-drop-before");
      block.removeAttribute("data-editing-drop-after");
    }
    target.toggleAttribute("data-editing-drop-before", before);
    target.toggleAttribute("data-editing-drop-after", !before);
  };

  #onDrop = (event: DragEvent): void => {
    const dragged = this.#draggedBlock;
    const target = elementFromPath(event, blockSelector);
    if (!dragged || !target || target === dragged) return;
    event.preventDefault();
    if (target.hasAttribute("data-editing-drop-before")) target.before(dragged);
    else target.after(dragged);
    this.#activeBlockId = dragged.dataset.editingBlock ?? null;
    this.#history.commit();
    this.#clearDragState();
    this.#sync("Block reordered");
  };

  #onDragEnd = (): void => this.#clearDragState();

  #clearDragState(): void {
    this.#draggedBlock = null;
    for (const block of this.#blocks()) {
      block.removeAttribute("data-editing-dragging");
      block.removeAttribute("data-editing-drop-before");
      block.removeAttribute("data-editing-drop-after");
    }
  }
}

function reconcileEditingPlaygrounds(): void {
  for (const [root, playground] of editingPlaygrounds) {
    if (!root.isConnected) {
      playground.destroy();
      editingPlaygrounds.delete(root);
    }
  }
  for (const root of document.querySelectorAll<HTMLElement>("[data-catalog-editing-playground]")) {
    if (!editingPlaygrounds.has(root)) editingPlaygrounds.set(root, new EditingPlayground(root));
  }
}

const editingPlaygroundObserver = new MutationObserver(reconcileEditingPlaygrounds);

function observeEditingPlaygrounds(): void {
  const root = document.documentElement;
  if (!root) return;
  editingPlaygroundObserver.observe(root, { childList: true, subtree: true });
  reconcileEditingPlaygrounds();
}

if (document.documentElement) observeEditingPlaygrounds();
else document.addEventListener("DOMContentLoaded", observeEditingPlaygrounds, { once: true });

const editingPlaygroundHot = (
  import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }
).hot;
editingPlaygroundHot?.dispose(() => {
  editingPlaygroundObserver.disconnect();
  for (const playground of editingPlaygrounds.values()) playground.destroy();
  editingPlaygrounds.clear();
});
