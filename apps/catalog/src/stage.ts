/**
 * The preview frame's own bootstrap.
 *
 * Registers every component into *this* document's registry — a custom element
 * registry is per-document, so the parent catalog's registrations do not reach
 * in here — and loads the design tokens so previews resolve real values.
 *
 * The parent drives everything else directly through `contentDocument`.
 */

import "./system.css";
import "@mash/ui/catalogue/mash.css";
import "@mash/shrine/catalogue/mash.css";
import "@mash/ui/register";
import "@mash/shrine/register";
import {
  createDraggable,
  cssTranslateDragPositioner,
  type DragAxis,
  type DragController,
  type DragEventDetail,
  type RevealEventDetail,
} from "@mash/ui";
import {
  defaultLinearWorkspaceSnapshot,
  linearAppendFilterNode,
  linearFilterNodeAtPath,
  linearGroup,
  linearMatchesFilter,
  linearPresetSnapshot,
  linearRemoveFilterNode,
  linearRule,
  linearSetFilterGroupCombinator,
  linearUpdateFilterRule,
  parseLinearWorkspaceSnapshot,
  serializeLinearWorkspaceSnapshot,
  type LinearFilterField,
  type LinearFilterGroup,
  type LinearFilterNode,
  type LinearFilterPreset,
  type LinearWorkspaceSnapshot,
} from "./linear-workspace-state.js";

// Tells the parent the frame is ready without it having to poll for the
// registry being populated.
document.documentElement.dataset.mashCatalogue = "mash";

const dragControllers = new Map<HTMLElement, DragController>();
let activeCatalogDragSource: HTMLElement | null = null;
const canceledCatalogDrags = new WeakSet<HTMLElement>();
const comboboxChipKeys = new WeakMap<HTMLElement, string>();

type CatalogCombobox = HTMLElement & {
  dismiss?: (reason?: string) => void;
  multiple?: boolean;
  open?: boolean;
  show?: () => void;
  value?: string;
  values?: string[];
};

type CatalogComboboxOption = HTMLElement & {
  disabled?: boolean;
  value?: string;
};

type CatalogSelect = HTMLElement & {
  dismiss?: (reason?: string) => void;
  open?: boolean;
  show?: () => void;
  toggle?: (reason?: string) => void;
  value?: string;
};

type CatalogSelectOption = HTMLElement & {
  value?: string;
};

type CatalogMenu = HTMLElement & {
  dismiss?: (reason?: string) => void;
  open?: boolean;
  show?: (reason?: string) => void;
  toggle?: (reason?: string) => void;
};

type CatalogValueControl = HTMLElement & {
  value?: string;
};

type CatalogDisableControl = HTMLElement & {
  disabled?: boolean;
};

function syncCatalogComposer(composer: HTMLElement): void {
  const control = composer.querySelector<CatalogValueControl>("[data-catalog-composer-text]");
  const count = composer.querySelector<HTMLElement>("[data-catalog-composer-count]");
  const status = composer.querySelector<HTMLOutputElement>("[data-catalog-composer-status]");
  const send = composer.querySelector<CatalogDisableControl>("[data-catalog-composer-send]");
  const value = control?.value ?? "";
  const limit = Number.parseInt(control?.getAttribute("maxlength") ?? "", 10);
  const hasLimit = Number.isFinite(limit) && limit > 0;
  const trimmed = value.trim();

  if (count) count.textContent = hasLimit ? `${value.length} / ${limit}` : String(value.length);
  if (send) send.disabled = trimmed.length === 0;
  if (status)
    status.value =
      trimmed.length === 0
        ? "Draft is empty."
        : `${trimmed.length} character${trimmed.length === 1 ? "" : "s"} ready.`;
}

function comboboxValues(combobox: CatalogCombobox): string[] {
  if (combobox.multiple) return Array.isArray(combobox.values) ? [...combobox.values] : [];
  return combobox.value ? [combobox.value] : [];
}

function comboboxOptions(combobox: CatalogCombobox): CatalogComboboxOption[] {
  return [...combobox.querySelectorAll<CatalogComboboxOption>("ui-option")];
}

function comboboxOptionValue(option: CatalogComboboxOption): string {
  return option.value ?? option.getAttribute("value") ?? option.textContent?.trim() ?? "";
}

function comboboxOptionForValue(
  combobox: CatalogCombobox,
  value: string,
): CatalogComboboxOption | undefined {
  return comboboxOptions(combobox).find((option) => comboboxOptionValue(option) === value);
}

function comboboxLabelForValue(combobox: CatalogCombobox, value: string): string {
  return comboboxOptionForValue(combobox, value)?.dataset.catalogComboboxLabel ?? value;
}

function syncComboboxConstraints(combobox: CatalogCombobox): void {
  const values = new Set(comboboxValues(combobox));
  const max = Number.parseInt(combobox.dataset.catalogComboboxMax ?? "", 10);
  const hasMax = Number.isFinite(max) && max > 0;
  const atLimit = hasMax && values.size >= max;
  for (const option of comboboxOptions(combobox)) {
    const pinned = option.dataset.catalogComboboxPinned !== undefined;
    if (pinned) {
      option.disabled = true;
      continue;
    }
    if (!hasMax) continue;
    option.disabled = atLimit && !values.has(comboboxOptionValue(option));
  }
}

function createComboboxChip(
  combobox: CatalogCombobox,
  value: string,
  removable: boolean,
): HTMLElement {
  const chip = document.createElement("ui-chip");
  chip.setAttribute("slot", "chips");
  chip.setAttribute("value", value);
  chip.dataset.catalogComboboxChip = "";
  chip.dataset.catalogLabel = comboboxLabelForValue(combobox, value);
  chip.append(document.createTextNode(comboboxLabelForValue(combobox, value)));
  if (!removable) {
    chip.setAttribute("disabled", "");
    return chip;
  }
  const remove = document.createElement("ui-button");
  remove.setAttribute("slot", "remove");
  remove.setAttribute("type", "button");
  remove.setAttribute("size", "xsmall");
  remove.setAttribute("variant", "quiet");
  remove.setAttribute("tabindex", "-1");
  remove.setAttribute("aria-label", `Remove ${comboboxLabelForValue(combobox, value)}`);
  const icon = document.createElement("ui-icon");
  icon.setAttribute("name", "action.dismiss");
  icon.setAttribute("label", "");
  remove.append(icon);
  chip.append(remove);
  return chip;
}

function syncComboboxChips(combobox: CatalogCombobox): void {
  if (!combobox.matches("[data-catalog-combobox-chips]")) return;
  const values = comboboxValues(combobox);
  const requestedMaxVisible = Number.parseInt(combobox.dataset.catalogComboboxMaxVisible ?? "", 10);
  const maxVisible =
    Number.isFinite(requestedMaxVisible) && requestedMaxVisible >= 0
      ? requestedMaxVisible
      : values.length;
  const key = JSON.stringify([values, maxVisible]);
  if (comboboxChipKeys.get(combobox) === key) return;
  comboboxChipKeys.set(combobox, key);
  for (const chip of combobox.querySelectorAll(":scope > [data-catalog-combobox-chip]"))
    chip.remove();
  const firstOption = combobox.querySelector(
    ":scope > ui-option, :scope > ui-option-group, :scope > ui-option-row",
  );
  const insertChip = (chip: HTMLElement): void => {
    combobox.insertBefore(chip, firstOption);
  };
  for (const value of values.slice(0, maxVisible)) {
    const option = comboboxOptionForValue(combobox, value);
    const removable = option?.dataset.catalogComboboxPinned === undefined;
    insertChip(createComboboxChip(combobox, value, removable));
  }
  const overflow = values.length - maxVisible;
  if (overflow <= 0) return;
  const badge = document.createElement("ui-badge");
  badge.setAttribute("slot", "chips");
  badge.setAttribute("size", "small");
  badge.setAttribute("tone", "neutral");
  badge.setAttribute("aria-label", `${overflow} more selected`);
  badge.dataset.catalogComboboxChip = "";
  badge.textContent = `+${overflow}`;
  insertChip(badge);
}

function syncComboboxDemo(combobox: CatalogCombobox): void {
  syncComboboxConstraints(combobox);
  syncComboboxChips(combobox);
}

function syncCatalogComboboxDemos(): void {
  for (const combobox of document.querySelectorAll<CatalogCombobox>("[data-catalog-combobox-demo]"))
    syncComboboxDemo(combobox);
}

function comboboxLabForAction(action: HTMLElement): HTMLElement | null {
  return action.closest<HTMLElement>("[data-catalog-combobox-lab]");
}

function comboboxForAction(action: HTMLElement): CatalogCombobox | null {
  return (
    action.closest<CatalogCombobox>("[data-catalog-combobox-demo]") ??
    comboboxLabForAction(action)?.querySelector<CatalogCombobox>("[data-catalog-combobox-demo]") ??
    null
  );
}

function dispatchComboboxChange(combobox: CatalogCombobox): void {
  combobox.dispatchEvent(
    new CustomEvent<{ value: string; values: string[] }>("ui-combobox-change", {
      bubbles: true,
      composed: true,
      detail: {
        value: combobox.value ?? "",
        values: combobox.multiple
          ? [...(combobox.values ?? [])]
          : combobox.value
            ? [combobox.value]
            : [],
      },
    }),
  );
}

function dispatchComboboxInput(combobox: CatalogCombobox): void {
  combobox.dispatchEvent(
    new CustomEvent<{ value: string }>("ui-combobox-input", {
      bubbles: true,
      composed: true,
      detail: { value: combobox.value ?? "" },
    }),
  );
}

function createComboboxOption(value: string): CatalogComboboxOption {
  const option = document.createElement("ui-option") as CatalogComboboxOption;
  option.setAttribute("value", value);
  option.append(document.createTextNode(value));
  const indicator = document.createElement("ui-icon");
  indicator.setAttribute("slot", "indicator");
  indicator.setAttribute("name", "action.confirm");
  indicator.setAttribute("label", "");
  option.append(indicator);
  return option;
}

function addComboboxOption(combobox: CatalogCombobox, fallback: string): void {
  const value = (combobox.value ?? "").trim() || fallback.trim();
  if (!value) return;
  if (!comboboxOptionForValue(combobox, value)) combobox.append(createComboboxOption(value));
  if (combobox.multiple) {
    combobox.values = [...new Set([...(combobox.values ?? []), value])];
    combobox.value = "";
  } else {
    combobox.value = value;
  }
  dispatchComboboxChange(combobox);
  if (!combobox.multiple) combobox.dismiss?.("select");
  syncComboboxDemo(combobox);
}

function recordComboboxEvent(combobox: CatalogCombobox, message: string): void {
  if (!combobox.matches("[data-catalog-combobox-events]")) return;
  const log = comboboxLabForAction(combobox)?.querySelector<HTMLOutputElement>(
    "[data-catalog-combobox-log]",
  );
  if (!log) return;
  const lines = (log.textContent ?? "").split("\n").filter(Boolean);
  lines.push(message);
  log.textContent = lines.slice(-6).join("\n");
}

function selectOptions(select: CatalogSelect): CatalogSelectOption[] {
  return [...select.querySelectorAll<CatalogSelectOption>("ui-option")];
}

function selectOptionValue(option: CatalogSelectOption): string {
  return option.value ?? option.getAttribute("value") ?? option.textContent?.trim() ?? "";
}

function selectOptionForValue(
  select: CatalogSelect,
  value: string,
): CatalogSelectOption | undefined {
  return selectOptions(select).find((option) => selectOptionValue(option) === value);
}

function selectLabForAction(action: HTMLElement): HTMLElement | null {
  return action.closest<HTMLElement>("[data-catalog-select-lab]");
}

function selectForAction(action: HTMLElement): CatalogSelect | null {
  return (
    action.closest<CatalogSelect>("[data-catalog-select-demo]") ??
    selectLabForAction(action)?.querySelector<CatalogSelect>("[data-catalog-select-demo]") ??
    null
  );
}

function dispatchSelectChange(select: CatalogSelect): void {
  select.dispatchEvent(
    new CustomEvent<{ value: string }>("ui-select-change", {
      bubbles: true,
      composed: true,
      detail: { value: select.value ?? "" },
    }),
  );
}

function recordSelectEvent(select: CatalogSelect, message: string): void {
  if (!select.matches("[data-catalog-select-events]")) return;
  const log = selectLabForAction(select)?.querySelector<HTMLOutputElement>(
    "[data-catalog-select-log]",
  );
  if (!log) return;
  const lines = (log.textContent ?? "").split("\n").filter(Boolean);
  lines.push(message);
  log.textContent = lines.slice(-6).join("\n");
}

function syncSelectOpenToggle(select: CatalogSelect, open: boolean): void {
  const toggle = selectLabForAction(select)?.querySelector<HTMLElement & { pressed?: boolean }>(
    "[data-catalog-select-open-toggle]",
  );
  if (toggle) toggle.pressed = open;
}

function dragAxis(source: HTMLElement): DragAxis {
  const axis = source.dataset.catalogDragAxis;
  return axis === "x" || axis === "y" ? axis : "both";
}

function syncDragSources(): void {
  for (const [source, controller] of dragControllers) {
    if (source.isConnected) continue;
    controller.destroy();
    dragControllers.delete(source);
  }

  for (const source of document.querySelectorAll<HTMLElement>(
    "[data-catalog-drag-source]:not(ui-draggable)",
  )) {
    if (dragControllers.has(source)) continue;
    const handle = source.querySelector<HTMLElement>("[data-catalog-drag-handle]") ?? source;
    const boundary = source.closest<HTMLElement>("[data-catalog-drag-boundary]");
    const controller = createDraggable(source, {
      axis: dragAxis(source),
      containment: source.dataset.catalogDragFree !== undefined ? false : (boundary ?? "parent"),
      handle,
      positioner: cssTranslateDragPositioner,
    });
    dragControllers.set(source, controller);
  }
}

function syncStageContent(): void {
  syncDragSources();
  syncCatalogComboboxDemos();
  syncToolbarSelectionDemos();
  syncLinearWorkspaces();
}

new MutationObserver(syncStageContent).observe(document.body, { childList: true, subtree: true });
queueMicrotask(syncStageContent);

function dragSource(event: Event): HTMLElement | null {
  const source = event.target;
  return source instanceof HTMLElement && source.dataset.catalogDragSource !== undefined
    ? source
    : null;
}

function resetDrag(source: HTMLElement): void {
  const controller = dragControllers.get(source);
  if (controller) controller.position = { x: 0, y: 0 };
  else (source as HTMLElement & { resetPosition?: () => void }).resetPosition?.();
  delete source.dataset.catalogDragging;
}

function itemLabel(item: HTMLElement): string {
  return (
    item.dataset.catalogLabel ??
    item.getAttribute("title") ??
    item.querySelector<HTMLElement>(":scope > [slot='label']")?.textContent?.trim() ??
    item.textContent?.trim() ??
    "Item"
  );
}

function reportOrder(
  container: Element,
  selector: string,
  output: Element | null,
  prefix: string,
): void {
  if (!(output instanceof HTMLOutputElement)) return;
  const labels = [...container.querySelectorAll<HTMLElement>(`:scope > ${selector}`)].map(
    itemLabel,
  );
  output.textContent = `${prefix}: ${labels.join(", ")}`;
}

function reorderOnAxis(source: HTMLElement, pointer: { x: number; y: number }): void {
  const container = source.parentElement;
  if (!container) return;
  const siblings = [...container.children].filter(
    (candidate): candidate is HTMLElement =>
      candidate instanceof HTMLElement &&
      candidate !== source &&
      candidate.dataset.catalogDragSource === source.dataset.catalogDragSource,
  );
  const coordinate = dragAxis(source) === "y" ? pointer.y : pointer.x;
  const insertion = siblings.find((candidate) => {
    const bounds = candidate.getBoundingClientRect();
    const midpoint =
      dragAxis(source) === "y" ? bounds.top + bounds.height / 2 : bounds.left + bounds.width / 2;
    return coordinate < midpoint;
  });
  container.insertBefore(source, insertion ?? null);
}

function reorderChip(source: HTMLElement, pointer: { x: number; y: number }): void {
  const container = source.parentElement;
  if (!container) return;
  const candidates = [...container.children].filter(
    (candidate): candidate is HTMLElement =>
      candidate instanceof HTMLElement &&
      candidate !== source &&
      candidate.dataset.catalogDragSource === "chip",
  );
  const closest = candidates
    .map((candidate) => {
      const bounds = candidate.getBoundingClientRect();
      const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
      return {
        candidate,
        center,
        distance: Math.hypot(pointer.x - center.x, pointer.y - center.y),
      };
    })
    .sort((a, b) => a.distance - b.distance)[0];
  if (!closest) return;
  const before =
    pointer.y < closest.center.y - closest.candidate.getBoundingClientRect().height / 4 ||
    (Math.abs(pointer.y - closest.center.y) <=
      closest.candidate.getBoundingClientRect().height / 4 &&
      pointer.x < closest.center.x);
  container.insertBefore(source, before ? closest.candidate : closest.candidate.nextSibling);
  if (container.matches("ui-combobox")) {
    const combobox = container as CatalogCombobox;
    if (combobox.multiple) {
      combobox.values = [
        ...container.querySelectorAll<HTMLElement>(':scope > [data-catalog-drag-source="chip"]'),
      ]
        .map((chip) => chip.getAttribute("value") ?? "")
        .filter(Boolean);
      dispatchComboboxChange(combobox);
    }
  }
}

function pointerInside(bounds: DOMRect, pointer: { x: number; y: number }): boolean {
  return (
    pointer.x >= bounds.left &&
    pointer.x <= bounds.right &&
    pointer.y >= bounds.top &&
    pointer.y <= bounds.bottom
  );
}

function createPinnedTreeView(value: string, labelText: string): HTMLElement {
  const item = document.createElement("ui-tree-item");
  item.setAttribute("slot", "children");
  item.setAttribute("kind", "file");
  item.setAttribute("value", `pinned-${value}`);
  item.setAttribute("path", `/interzone/pinned/${value}`);
  item.dataset.catalogLabel = labelText;
  item.dataset.catalogTabValue = value;
  item.dataset.catalogDragSource = "tree-tab";
  item.dataset.catalogDragFree = "";

  const label = document.createElement("span");
  label.slot = "label";
  label.textContent = labelText;
  const icon = document.createElement("ui-icon");
  icon.slot = "icon";
  icon.setAttribute("name", "object.document");
  icon.setAttribute("label", "");
  const handle = document.createElement("ui-button");
  handle.slot = "actions";
  handle.setAttribute("variant", "quiet");
  handle.setAttribute("size", "small");
  handle.setAttribute("aria-label", `Move ${labelText} to the tab bar`);
  handle.dataset.catalogDragHandle = "";
  const handleIcon = document.createElement("ui-icon");
  handleIcon.setAttribute("name", "action.drag");
  handleIcon.setAttribute("label", "");
  handle.append(handleIcon);
  item.append(label, icon, handle);
  return item;
}

function createDraggableTab(value: string, labelText: string): HTMLElement {
  const tab = document.createElement("ui-tab");
  tab.setAttribute("slot", "tab");
  tab.setAttribute("value", value);
  tab.dataset.catalogLabel = labelText;
  tab.dataset.catalogDragSource = "tab";
  tab.dataset.catalogDragFree = "";
  const handle = document.createElement("ui-icon");
  handle.className = "example-drag-grip";
  handle.dataset.catalogDragHandle = "";
  handle.setAttribute("name", "action.drag");
  handle.setAttribute("label", `Move ${labelText} tab`);
  tab.append(handle, document.createTextNode(labelText));
  return tab;
}

interface DropPlacement {
  before: HTMLElement | null;
  line: { left: number; top: number; width: number; height: number };
}

function treeDropPlacement(
  drop: HTMLElement,
  pointer: { x: number; y: number },
  ignored?: HTMLElement,
): DropPlacement {
  const items = [
    ...drop.querySelectorAll<HTMLElement>(":scope > ui-tree-item[slot='children']"),
  ].filter((item) => item !== ignored);
  const before = items.find((item) => {
    const bounds = item.getBoundingClientRect();
    return pointer.y < bounds.top + bounds.height / 2;
  });
  const dropBounds = drop.getBoundingClientRect();
  const firstBounds = items[0]?.getBoundingClientRect();
  const lastBounds = items.at(-1)?.getBoundingClientRect();
  const beforeBounds = before?.getBoundingClientRect();
  const top = beforeBounds?.top ?? lastBounds?.bottom ?? dropBounds.bottom;
  const left = firstBounds?.left ?? dropBounds.left + 24;
  return {
    before: before ?? null,
    line: {
      left,
      top: top - 1,
      width: Math.max(24, (firstBounds?.right ?? dropBounds.right) - left),
      height: 2,
    },
  };
}

function tabDropPlacement(
  tabs: HTMLElement,
  pointer: { x: number; y: number },
  ignored?: HTMLElement,
): DropPlacement | null {
  const list = tabs.shadowRoot?.querySelector<HTMLElement>("[part='list']");
  if (!list) return null;
  const items = [...tabs.querySelectorAll<HTMLElement>(":scope > ui-tab[slot='tab']")].filter(
    (item) => item !== ignored,
  );
  const before = items.find((item) => {
    const bounds = item.getBoundingClientRect();
    return pointer.x < bounds.left + bounds.width / 2;
  });
  const listBounds = list.getBoundingClientRect();
  const beforeBounds = before?.getBoundingClientRect();
  const lastBounds = items.at(-1)?.getBoundingClientRect();
  const left = beforeBounds?.left ?? lastBounds?.right ?? listBounds.left;
  return {
    before: before ?? null,
    line: {
      left: left - 1,
      top: listBounds.top + 3,
      width: 2,
      height: Math.max(20, listBounds.height - 6),
    },
  };
}

function dropIndicator(workspace: HTMLElement): HTMLElement | null {
  return workspace.querySelector<HTMLElement>("[data-catalog-drop-indicator]");
}

function showDropIndicator(
  workspace: HTMLElement,
  orientation: "horizontal" | "vertical",
  line: DropPlacement["line"],
): void {
  const indicator = dropIndicator(workspace);
  if (!indicator) return;
  indicator.setAttribute("orientation", orientation);
  indicator.style.left = `${line.left}px`;
  indicator.style.top = `${line.top}px`;
  indicator.style.width = `${line.width}px`;
  indicator.style.height = `${line.height}px`;
  indicator.hidden = false;
}

function hideDropIndicator(workspace: HTMLElement | null): void {
  const indicator = workspace ? dropIndicator(workspace) : null;
  if (indicator) indicator.hidden = true;
}

interface KanbanDropTarget {
  column: HTMLElement;
  list: HTMLElement;
}

interface CatalogKanbanMoveDetail {
  source: HTMLElement;
  column: HTMLElement;
  columnLabel: string;
  position: number;
}

function clearKanbanDropFeedback(workspace: HTMLElement | null): void {
  if (!workspace) return;
  hideDropIndicator(workspace);
  for (const column of workspace.querySelectorAll<HTMLElement>("[data-catalog-kanban-active]")) {
    delete column.dataset.catalogKanbanActive;
  }
}

function kanbanWorkspace(source: HTMLElement): HTMLElement | null {
  return source.closest<HTMLElement>(
    "[data-catalog-kanban-workspace], [data-linear-kanban-workspace]",
  );
}

function kanbanDropTarget(
  workspace: HTMLElement,
  pointer: { x: number; y: number },
): KanbanDropTarget | null {
  const targets = [...workspace.querySelectorAll<HTMLElement>("[data-catalog-kanban-list]")].map(
    (list) => ({
      list,
      column: list.closest<HTMLElement>("[data-catalog-kanban-column]")!,
      bounds: list.getBoundingClientRect(),
    }),
  );
  const exact = targets.filter((target) => pointerInside(target.bounds, pointer));
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;
  const detents = targets.filter((target) => pointerInsideDetent(target.bounds, pointer, 18, 32));
  return detents.length === 1 ? detents[0]! : null;
}

function kanbanDropPlacement(
  list: HTMLElement,
  pointer: { x: number; y: number },
  ignored?: HTMLElement,
): DropPlacement {
  const cards = [...list.querySelectorAll<HTMLElement>(":scope > .example-kanban-card")].filter(
    (card) => card !== ignored,
  );
  const before = cards.find((card) => {
    const bounds = card.getBoundingClientRect();
    return pointer.y < bounds.top + bounds.height / 2;
  });
  const listBounds = list.getBoundingClientRect();
  const beforeBounds = before?.getBoundingClientRect();
  const lastBounds = cards.at(-1)?.getBoundingClientRect();
  const top = beforeBounds?.top ?? lastBounds?.bottom ?? listBounds.top;
  return {
    before: before ?? null,
    line: {
      left: listBounds.left + 4,
      top: top - 1,
      width: Math.max(24, listBounds.width - 8),
      height: 2,
    },
  };
}

function updateKanbanDropIndicator(source: HTMLElement, pointer: { x: number; y: number }): void {
  const workspace = kanbanWorkspace(source);
  if (!workspace) return;
  clearKanbanDropFeedback(workspace);
  const target = kanbanDropTarget(workspace, pointer);
  if (!target) return;
  target.column.dataset.catalogKanbanActive = "";
  showDropIndicator(
    workspace,
    "horizontal",
    kanbanDropPlacement(target.list, pointer, source).line,
  );
}

function moveKanbanCard(source: HTMLElement, pointer: { x: number; y: number }): boolean {
  const workspace = kanbanWorkspace(source);
  if (!workspace) return false;
  const target = kanbanDropTarget(workspace, pointer);
  clearKanbanDropFeedback(workspace);
  if (!target) return false;
  const placement = kanbanDropPlacement(target.list, pointer, source);
  resetDrag(source);
  target.list.insertBefore(source, placement.before);
  const columnLabel =
    target.column.querySelector<HTMLElement>(
      "[data-catalog-kanban-column-label], .example-kanban-column-heading strong, :scope > header strong",
    )?.textContent ?? "column";
  const position = [
    ...target.list.querySelectorAll<HTMLElement>(":scope > .example-kanban-card"),
  ].indexOf(source);
  const output = workspace.querySelector<HTMLOutputElement>("[data-catalog-kanban-status]");
  if (output)
    output.textContent = `${itemLabel(source)} moved to ${columnLabel}, position ${position + 1}.`;
  workspace.dispatchEvent(
    new CustomEvent<CatalogKanbanMoveDetail>("catalog-kanban-move", {
      bubbles: true,
      detail: { source, column: target.column, columnLabel, position },
    }),
  );
  return true;
}

type WorkspaceDropTarget =
  | { kind: "tree"; element: HTMLElement; bounds: DOMRect }
  | { kind: "tabs"; element: HTMLElement; bounds: DOMRect };

function pointerInsideDetent(
  bounds: DOMRect,
  pointer: { x: number; y: number },
  inlineDetent: number,
  blockDetent: number,
): boolean {
  return (
    pointer.x >= bounds.left - inlineDetent &&
    pointer.x <= bounds.right + inlineDetent &&
    pointer.y >= bounds.top - blockDetent &&
    pointer.y <= bounds.bottom + blockDetent
  );
}

function workspaceDropTarget(
  workspace: HTMLElement,
  pointer: { x: number; y: number },
): WorkspaceDropTarget | null {
  const tree = workspace.querySelector<HTMLElement>("[data-catalog-tab-drop]");
  const tabs = workspace.querySelector<HTMLElement>("[data-catalog-tabbar-drop]");
  const list = tabs?.shadowRoot?.querySelector<HTMLElement>("[part='list']");
  const targets: WorkspaceDropTarget[] = [];
  if (tree) targets.push({ kind: "tree", element: tree, bounds: tree.getBoundingClientRect() });
  if (tabs && list)
    targets.push({ kind: "tabs", element: tabs, bounds: list.getBoundingClientRect() });

  const exact = targets.filter((target) => pointerInside(target.bounds, pointer));
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;
  const detents = targets.filter((target) =>
    pointerInsideDetent(target.bounds, pointer, target.kind === "tabs" ? 24 : 16, 28),
  );
  return detents.length === 1 ? detents[0]! : null;
}

function clearWorkspaceDropFeedback(workspace: HTMLElement | null): void {
  if (!workspace) return;
  hideDropIndicator(workspace);
  for (const target of workspace.querySelectorAll<HTMLElement>(
    "[data-catalog-tab-drop], [data-catalog-tabbar-drop]",
  )) {
    delete target.dataset.catalogDropActive;
  }
}

function updateDropIndicator(source: HTMLElement, pointer: { x: number; y: number }): void {
  const workspace = source.closest<HTMLElement>(".example-tab-workspace");
  if (!workspace) return;
  clearWorkspaceDropFeedback(workspace);
  const target = workspaceDropTarget(workspace, pointer);
  if (!target) return;
  target.element.dataset.catalogDropActive = "";
  if (target.kind === "tree") {
    showDropIndicator(
      workspace,
      "horizontal",
      treeDropPlacement(target.element, pointer, source).line,
    );
    return;
  }
  const placement = tabDropPlacement(target.element, pointer, source);
  if (placement) showDropIndicator(workspace, "vertical", placement.line);
}

function dropTabInSidebar(source: HTMLElement, pointer: { x: number; y: number }): boolean {
  const workspace = source.closest<HTMLElement>(".example-tab-workspace");
  const drop = workspace?.querySelector<HTMLElement>("[data-catalog-tab-drop]");
  if (!workspace || !drop) return false;
  const target = workspaceDropTarget(workspace, pointer);
  if (target?.kind !== "tree" || target.element !== drop) return false;
  clearWorkspaceDropFeedback(workspace);

  const value = source.getAttribute("value") ?? "view";
  const labelText = itemLabel(source);
  const placement = treeDropPlacement(drop, pointer);
  drop.insertBefore(createPinnedTreeView(value, labelText), placement.before);

  const tabs = source.closest<HTMLElement>("ui-tabs");
  const cache = workspace.querySelector<HTMLElement>("[data-catalog-tab-cache]");
  const panel = tabs?.querySelector<HTMLElement>(`ui-tab-panel[value="${CSS.escape(value)}"]`);
  if (panel && cache) cache.append(panel);
  source.remove();
  const output = workspace.querySelector<HTMLOutputElement>("[data-catalog-tab-status]");
  if (output) output.textContent = `${labelText} pinned to the sidebar.`;
  return true;
}

function dropTreeViewInTabBar(source: HTMLElement, pointer: { x: number; y: number }): boolean {
  const workspace = source.closest<HTMLElement>(".example-tab-workspace");
  const tabs = workspace?.querySelector<HTMLElement>("[data-catalog-tabbar-drop]");
  const list = tabs?.shadowRoot?.querySelector<HTMLElement>("[part='list']");
  if (!workspace || !tabs || !list) return false;
  const target = workspaceDropTarget(workspace, pointer);
  if (target?.kind !== "tabs" || target.element !== tabs) return false;
  clearWorkspaceDropFeedback(workspace);

  const value = source.dataset.catalogTabValue ?? source.getAttribute("value") ?? "view";
  const labelText = itemLabel(source);
  const placement = tabDropPlacement(tabs, pointer);
  if (!placement) return false;
  const nextPanel = tabs.querySelector<HTMLElement>(":scope > ui-tab-panel[slot='panel']");
  tabs.insertBefore(createDraggableTab(value, labelText), placement.before ?? nextPanel);
  const cache = workspace.querySelector<HTMLElement>("[data-catalog-tab-cache]");
  const panel = cache?.querySelector<HTMLElement>(`ui-tab-panel[value="${CSS.escape(value)}"]`);
  if (panel) tabs.append(panel);
  (tabs as HTMLElement & { value: string }).value = value;
  source.remove();
  const output = workspace.querySelector<HTMLOutputElement>("[data-catalog-tab-status]");
  if (output) output.textContent = `${labelText} restored to the top tab bar.`;
  return true;
}

function reorderTabInBar(source: HTMLElement, pointer: { x: number; y: number }): boolean {
  const workspace = source.closest<HTMLElement>(".example-tab-workspace");
  const tabs = source.closest<HTMLElement>("[data-catalog-tabbar-drop]");
  if (!workspace || !tabs) return false;
  const target = workspaceDropTarget(workspace, pointer);
  if (target?.kind !== "tabs" || target.element !== tabs) return false;
  const placement = tabDropPlacement(tabs, pointer, source);
  if (!placement) return false;
  const nextPanel = tabs.querySelector<HTMLElement>(":scope > ui-tab-panel[slot='panel']");
  resetDrag(source);
  tabs.insertBefore(source, placement.before ?? nextPanel);
  clearWorkspaceDropFeedback(workspace);
  const position = [...tabs.querySelectorAll<HTMLElement>(":scope > ui-tab[slot='tab']")].indexOf(
    source,
  );
  const output = workspace.querySelector<HTMLOutputElement>("[data-catalog-tab-status]");
  if (output) output.textContent = `${itemLabel(source)} moved to tab position ${position + 1}.`;
  return true;
}

function reorderPinnedTreeView(source: HTMLElement, pointer: { x: number; y: number }): boolean {
  const workspace = source.closest<HTMLElement>(".example-tab-workspace");
  const drop = source.parentElement;
  if (!workspace || !drop?.matches("[data-catalog-tab-drop]")) return false;
  const target = workspaceDropTarget(workspace, pointer);
  if (target?.kind !== "tree" || target.element !== drop) return false;
  const placement = treeDropPlacement(drop, pointer, source);
  resetDrag(source);
  drop.insertBefore(source, placement.before);
  clearWorkspaceDropFeedback(workspace);
  const position = [
    ...drop.querySelectorAll<HTMLElement>(":scope > ui-tree-item[slot='children']"),
  ].indexOf(source);
  const output = workspace.querySelector<HTMLOutputElement>("[data-catalog-tab-status]");
  if (output) output.textContent = `${itemLabel(source)} moved to pinned position ${position + 1}.`;
  return true;
}

function clearTreeLeafTarget(workspace: HTMLElement | null): void {
  for (const target of workspace?.querySelectorAll<HTMLElement>(
    "[data-catalog-leaf-drop-active]",
  ) ?? []) {
    delete target.dataset.catalogLeafDropActive;
  }
}

function treeLeafTarget(
  source: HTMLElement,
  pointer: { x: number; y: number },
): HTMLElement | null {
  const workspace = source.closest<HTMLElement>("[data-catalog-tree-leaf-workspace]");
  const tree = workspace?.querySelector<HTMLElement>("[data-catalog-tree-leaf-zone]");
  if (!workspace || !tree) return null;
  if (!pointerInsideDetent(tree.getBoundingClientRect(), pointer, 20, 28)) return null;
  const candidates = [
    ...tree.querySelectorAll<HTMLElement>("[data-catalog-tree-leaf-drop]"),
  ].filter((candidate) => candidate !== source && !source.contains(candidate));
  return (
    candidates
      .map((candidate) => {
        const bounds = candidate.getBoundingClientRect();
        return {
          candidate,
          distance: Math.hypot(
            (pointer.x - (bounds.left + bounds.width / 2)) * 0.25,
            pointer.y - (bounds.top + bounds.height / 2),
          ),
        };
      })
      .sort((a, b) => a.distance - b.distance)[0]?.candidate ?? null
  );
}

function updateTreeLeafTarget(source: HTMLElement, pointer: { x: number; y: number }): void {
  const workspace = source.closest<HTMLElement>("[data-catalog-tree-leaf-workspace]");
  clearTreeLeafTarget(workspace);
  const target = treeLeafTarget(source, pointer);
  if (target) target.dataset.catalogLeafDropActive = "";
}

function nestTreeLeaf(source: HTMLElement, pointer: { x: number; y: number }): boolean {
  const workspace = source.closest<HTMLElement>("[data-catalog-tree-leaf-workspace]");
  if (!workspace) return false;
  const target = treeLeafTarget(source, pointer);
  clearTreeLeafTarget(workspace);
  if (!target) return false;
  const sourceLabel = itemLabel(source);
  const targetLabel = itemLabel(target);
  resetDrag(source);
  source.setAttribute("slot", "children");
  target.append(source);
  target.setAttribute("kind", "folder");
  (target as HTMLElement & { expanded: boolean }).expanded = true;
  delete target.dataset.catalogTreeLeafDrop;
  const output = workspace.querySelector<HTMLOutputElement>("[data-catalog-tree-leaf-status]");
  if (output) output.textContent = `${sourceLabel} nested under ${targetLabel}.`;
  return true;
}

function reportCanceledDrag(source: HTMLElement): void {
  const tabWorkspace = source.closest<HTMLElement>(".example-tab-workspace");
  const tabOutput = tabWorkspace?.querySelector<HTMLOutputElement>("[data-catalog-tab-status]");
  if (tabOutput) tabOutput.textContent = `${itemLabel(source)} stayed where it was.`;
  const treeWorkspace = source.closest<HTMLElement>("[data-catalog-tree-leaf-workspace]");
  const treeOutput = treeWorkspace?.querySelector<HTMLOutputElement>(
    "[data-catalog-tree-leaf-status]",
  );
  if (treeOutput) treeOutput.textContent = `${itemLabel(source)} stayed where it was.`;
  const workspace = kanbanWorkspace(source);
  const kanbanOutput = workspace?.querySelector<HTMLOutputElement>("[data-catalog-kanban-status]");
  if (kanbanOutput) kanbanOutput.textContent = `${itemLabel(source)} stayed where it was.`;
}

document.addEventListener("ui-drag-start", (event) => {
  const source = dragSource(event);
  if (!source) return;
  activeCatalogDragSource = source;
  source.focus();
  source.dataset.catalogDragging = "";
  clearWorkspaceDropFeedback(source.closest<HTMLElement>(".example-tab-workspace"));
  clearTreeLeafTarget(source.closest<HTMLElement>("[data-catalog-tree-leaf-workspace]"));
  clearKanbanDropFeedback(kanbanWorkspace(source));
});

document.addEventListener("ui-drag-move", (event) => {
  const source = dragSource(event);
  if (!source) return;
  const { pointer } = (event as CustomEvent<DragEventDetail>).detail;
  if (source.dataset.catalogDragSource === "kanban-card")
    updateKanbanDropIndicator(source, pointer);
  else if (source.dataset.catalogDragSource === "tree-leaf") updateTreeLeafTarget(source, pointer);
  else updateDropIndicator(source, pointer);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !activeCatalogDragSource) return;
  event.preventDefault();
  const source = activeCatalogDragSource;
  const controller =
    dragControllers.get(source) ??
    (source as HTMLElement & { controller?: DragController }).controller;
  if (!controller) return;
  canceledCatalogDrags.add(source);
  controller.disabled = true;
  controller.disabled = false;
});

document.addEventListener("ui-drag-end", (event) => {
  const source = dragSource(event);
  if (!source) return;
  activeCatalogDragSource = null;
  clearWorkspaceDropFeedback(source.closest<HTMLElement>(".example-tab-workspace"));
  clearTreeLeafTarget(source.closest<HTMLElement>("[data-catalog-tree-leaf-workspace]"));
  clearKanbanDropFeedback(kanbanWorkspace(source));
  const { pointer } = (event as CustomEvent<DragEventDetail>).detail;
  const kind = source.dataset.catalogDragSource;
  if (canceledCatalogDrags.has(source)) {
    canceledCatalogDrags.delete(source);
    reportCanceledDrag(source);
    resetDrag(source);
    return;
  }
  if (kind === "tab") {
    if (dropTabInSidebar(source, pointer) || reorderTabInBar(source, pointer)) return;
    reportCanceledDrag(source);
    resetDrag(source);
    return;
  }
  if (kind === "tree-tab") {
    if (dropTreeViewInTabBar(source, pointer) || reorderPinnedTreeView(source, pointer)) return;
    reportCanceledDrag(source);
    resetDrag(source);
    return;
  }
  if (kind === "tree-leaf") {
    if (nestTreeLeaf(source, pointer)) return;
    reportCanceledDrag(source);
    resetDrag(source);
    return;
  }
  if (kind === "kanban-card") {
    if (moveKanbanCard(source, pointer)) return;
    reportCanceledDrag(source);
    resetDrag(source);
    return;
  }
  if (kind === "tree-item") {
    const tree = source.parentElement!;
    if (pointerInsideDetent(tree.getBoundingClientRect(), pointer, 20, 28)) {
      reorderOnAxis(source, pointer);
      reportOrder(
        tree,
        '[data-catalog-drag-source="tree-item"]',
        tree.closest(".example-drag-tree-workspace")?.querySelector("[data-catalog-tree-status]") ??
          null,
        "Priority",
      );
    }
  } else if (kind === "chip") {
    reorderChip(source, pointer);
    const chips = source.parentElement!;
    reportOrder(
      chips,
      '[data-catalog-drag-source="chip"]',
      chips.closest(".example-chip-workspace")?.querySelector("[data-catalog-chip-status]") ?? null,
      "Owner precedence",
    );
  }
  resetDrag(source);
});

// The catalogue is a consumer of the controlled tree contract: it opts into
// the requested expansion state so the example remains interactive without
// moving ownership back into the primitive.
document.addEventListener("ui-tree-item-toggle", (event) => {
  const item = event.target as HTMLElement & { expanded?: boolean };
  const { expanded } = (event as CustomEvent<{ expanded: boolean }>).detail;
  item.expanded = expanded;
});

document.addEventListener("ui-tree-item-select", (event) => {
  const item = event.target as HTMLElement & { selected?: boolean };
  const tree = item.closest("ui-tree");
  for (const sibling of tree?.querySelectorAll<HTMLElement>("ui-tree-item") ?? []) {
    (sibling as HTMLElement & { selected?: boolean }).selected = sibling === item;
  }
});

type ShrinePathPreview = HTMLElement & {
  anchorElement?: HTMLElement | null;
  label?: string;
  open?: boolean;
  openDelay?: number;
  closeDelay?: number;
  show?: (reason?: string) => void;
  dismiss?: (reason?: string) => void;
};

type ShrinePathMyth = HTMLElement & {
  kind?: string;
  path?: string;
};

interface ShrinePathPreviewState {
  anchor: HTMLElement | null;
  pointerWithin: boolean;
  focusWithin: boolean;
  openTimer?: number;
  closeTimer?: number;
}

const shrinePathPreviewStates = new WeakMap<ShrinePathPreview, ShrinePathPreviewState>();

function shrinePathPreviewState(preview: ShrinePathPreview): ShrinePathPreviewState {
  const existing = shrinePathPreviewStates.get(preview);
  if (existing) return existing;
  const state: ShrinePathPreviewState = {
    anchor: null,
    pointerWithin: false,
    focusWithin: false,
  };
  shrinePathPreviewStates.set(preview, state);
  preview.addEventListener("pointerover", () => {
    state.pointerWithin = true;
    clearShrinePathPreviewTimer(state, "close");
  });
  preview.addEventListener("pointerout", (event) => {
    if (relatedTargetIsWithin(preview, event.relatedTarget)) return;
    state.pointerWithin = false;
    if (!state.focusWithin && !preview.matches(":focus-within")) closeShrinePathPreview(preview);
  });
  preview.addEventListener("focusin", () => {
    state.focusWithin = true;
    clearShrinePathPreviewTimer(state, "close");
  });
  preview.addEventListener("focusout", (event) => {
    if (relatedTargetIsWithin(preview, event.relatedTarget)) return;
    state.focusWithin = false;
    queueMicrotask(() => {
      if (!state.pointerWithin && !preview.matches(":focus-within"))
        closeShrinePathPreview(preview);
    });
  });
  return state;
}

function clearShrinePathPreviewTimer(state: ShrinePathPreviewState, kind: "open" | "close"): void {
  const key = kind === "open" ? "openTimer" : "closeTimer";
  if (state[key] !== undefined) window.clearTimeout(state[key]);
  state[key] = undefined;
}

function shrinePathFromEvent(event: Event): HTMLElement | null {
  const direct = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        node.localName === "ui-path" &&
        Boolean(node.closest("[data-shrine-path-preview-stage]")),
    );
  if (direct) return direct;
  const item = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        node.localName === "ui-tree-item" &&
        Boolean(node.closest("[data-shrine-path-preview-stage]")),
    );
  return item?.querySelector<HTMLElement>(":scope > ui-path[slot='label']") ?? null;
}

function shrinePreviewForPath(path: HTMLElement): ShrinePathPreview | null {
  return (
    path
      .closest<HTMLElement>("[data-shrine-path-preview-stage]")
      ?.querySelector<ShrinePathPreview>("ui-preview-card[data-shrine-path-preview]") ?? null
  );
}

function updateShrinePathPreview(preview: ShrinePathPreview, path: HTMLElement): void {
  const item = path.closest<HTMLElement>("ui-tree-item");
  if (!item) return;
  const identity = item.getAttribute("value") || item.getAttribute("path") || "path-node";
  const address = item.getAttribute("path") || identity;
  const title = item.getAttribute("title") || path.textContent?.trim() || identity;
  const children = item.querySelectorAll(":scope > ui-tree-item[slot='children']").length;
  const lane = item.dataset.shrineLane ?? "0";
  const overlay = /overlay/i.test(identity) || /\/overlays?\//i.test(address);
  const current = item.hasAttribute("current");
  const relation = overlay
    ? "x→x overlay"
    : current
      ? "current"
      : children > 0
        ? "branch"
        : "witness";
  const kind = children > 0 || item.getAttribute("kind") === "folder" ? "Branch" : "Path node";

  // Hover intent belongs to the authored path label, but geometry belongs to
  // the complete row. Anchoring to the label's text width would place the card
  // over sibling rows instead of beside the tree pane.
  preview.anchorElement = item.shadowRoot?.querySelector<HTMLElement>("[part='control']") ?? item;
  preview.dataset.shrinePreviewValue = identity;
  preview.label = `${title} path preview`;
  const myth = preview.querySelector<ShrinePathMyth>("[data-shrine-preview-myth]");
  if (myth) {
    myth.title = title;
    myth.path = address;
    myth.kind = kind;
  }
  for (const target of preview.querySelectorAll<HTMLElement>("[data-shrine-preview-value]"))
    target.setAttribute("text", identity);
  for (const target of preview.querySelectorAll<HTMLElement>("[data-shrine-preview-lane]"))
    target.setAttribute("text", lane);
  for (const target of preview.querySelectorAll<HTMLElement>("[data-shrine-preview-children]"))
    target.setAttribute("text", String(children));
  for (const target of preview.querySelectorAll<HTMLElement>("[data-shrine-preview-relation]")) {
    target.textContent = relation;
    target.setAttribute("tone", overlay ? "warning" : current ? "positive" : "neutral");
  }
  for (const target of preview.querySelectorAll<HTMLElement>("[data-shrine-preview-open]"))
    target.setAttribute("href", `#${encodeURIComponent(identity)}`);
  for (const target of preview.querySelectorAll<HTMLElement>("[data-shrine-preview-reveal]"))
    target.setAttribute("href", `#${encodeURIComponent(identity)}-reveal`);
}

function openShrinePathPreview(path: HTMLElement): void {
  const preview = shrinePreviewForPath(path);
  if (!preview) return;
  const stage = path.closest<HTMLElement>("[data-shrine-path-preview-stage]");
  for (const item of stage?.querySelectorAll<HTMLElement>("ui-tree-item") ?? [])
    item.removeAttribute("data-shrine-preview-active");
  path.closest<HTMLElement>("ui-tree-item")?.setAttribute("data-shrine-preview-active", "");
  const state = shrinePathPreviewState(preview);
  clearShrinePathPreviewTimer(state, "close");
  if (state.anchor === path && (preview.open || state.openTimer !== undefined)) return;
  clearShrinePathPreviewTimer(state, "open");
  state.anchor = path;
  updateShrinePathPreview(preview, path);
  state.openTimer = window.setTimeout(
    () => {
      state.openTimer = undefined;
      preview.show?.("hover");
    },
    Math.max(0, preview.openDelay ?? 140),
  );
}

function closeShrinePathPreview(preview: ShrinePathPreview): void {
  const state = shrinePathPreviewState(preview);
  clearShrinePathPreviewTimer(state, "open");
  clearShrinePathPreviewTimer(state, "close");
  state.closeTimer = window.setTimeout(
    () => {
      state.closeTimer = undefined;
      state.anchor
        ?.closest<HTMLElement>("ui-tree-item")
        ?.removeAttribute("data-shrine-preview-active");
      state.anchor = null;
      preview.dismiss?.("hover");
    },
    Math.max(0, preview.closeDelay ?? 320),
  );
}

function relatedTargetIsWithin(preview: ShrinePathPreview, target: EventTarget | null): boolean {
  return (
    target instanceof Node &&
    (preview.contains(target) || Boolean(preview.shadowRoot?.contains(target)))
  );
}

document.addEventListener("focusin", (event) => {
  const path = shrinePathFromEvent(event);
  if (path) openShrinePathPreview(path);
});

document.addEventListener("focusout", (event) => {
  const path = shrinePathFromEvent(event);
  const targetPreview = path ? shrinePreviewForPath(path) : null;
  if (!targetPreview) return;
  const relatedTarget = event.relatedTarget;
  queueMicrotask(() => {
    if (
      relatedTargetIsWithin(targetPreview, relatedTarget) ||
      targetPreview.matches(":focus-within")
    )
      return;
    closeShrinePathPreview(targetPreview);
  });
});

// A context menu is an authored overlay over a path projection, not tree
// state. The recipe records the right-clicked path identity on the shared menu
// while leaving selection and disclosure on the existing ui-tree contract.
document.addEventListener("contextmenu", (event) => {
  const path = event.composedPath();
  const menu = path.find(
    (node): node is HTMLElement & { label?: string; dismiss?: (reason?: string) => void } =>
      node instanceof HTMLElement &&
      node.localName === "ui-context-menu" &&
      node.dataset.shrineTreeContext !== undefined,
  );
  if (!menu) return;
  const item = path.find(
    (
      node,
    ): node is HTMLElement & {
      identity?: string;
      path?: string;
      title?: string;
      selected?: boolean;
    } => node instanceof HTMLElement && node.localName === "ui-tree-item",
  );
  if (!item) {
    queueMicrotask(() => menu.dismiss?.("cancel"));
    return;
  }

  const hoverPreview = menu
    .closest<HTMLElement>("[data-shrine-path-preview-stage]")
    ?.querySelector<ShrinePathPreview>("ui-preview-card[data-shrine-path-preview]");
  if (hoverPreview) {
    clearShrinePathPreviewTimer(shrinePathPreviewState(hoverPreview), "open");
    hoverPreview.dismiss?.("contextmenu");
  }

  const tree = item.closest("ui-tree");
  for (const candidate of tree?.querySelectorAll<HTMLElement>("ui-tree-item") ?? []) {
    (candidate as HTMLElement & { selected?: boolean }).selected = candidate === item;
  }
  const identity = item.identity || item.getAttribute("value") || "path node";
  const shrinePath = item.path || item.getAttribute("path") || identity;
  menu.dataset.shrineContextValue = identity;
  menu.label = `${identity} path actions`;
  for (const label of menu.querySelectorAll<HTMLElement>("[data-shrine-context-title]")) {
    label.textContent = item.title || identity;
  }
  for (const label of menu.querySelectorAll<HTMLElement>("[data-shrine-context-path]")) {
    label.textContent = shrinePath;
  }
});

// Pagination is controlled for the same reason as Tree: the primitive emits a
// request and this catalogue example visibly accepts it on the owner's behalf.
document.addEventListener("ui-page-change", (event) => {
  const pagination = event.target as HTMLElement & {
    currentPage?: number;
    totalPages?: number;
  };
  const { page } = (event as CustomEvent<{ page: number }>).detail;
  pagination.currentPage = page;
  const output = pagination
    .closest<HTMLElement>(".example-pagination")
    ?.querySelector<HTMLOutputElement>("[data-catalog-page-output]");
  if (output) output.textContent = `Page ${page} of ${pagination.totalPages ?? page}`;
});

document.addEventListener("input", (event) => {
  const search = event
    .composedPath()
    .find(
      (node): node is HTMLElement & { value?: string } =>
        node instanceof HTMLElement && node.dataset.catalogEditorSearch !== undefined,
    );
  if (!search) return;
  const editor = search.closest<HTMLElement>("ui-editor") as
    (HTMLElement & { searchQuery?: string }) | null;
  if (editor) editor.searchQuery = search.value ?? "";
});

type CatalogResizable = HTMLElement & {
  sizes: readonly number[];
  resizePanel: (index: number, size: number) => void;
  resetPanel: (index: number) => void;
};

type CatalogResizablePanel = HTMLElement & {
  defaultSize: number;
  min: number;
  size: number;
  visible: boolean;
};

function catalogResizableGroup(action: HTMLElement): CatalogResizable | null {
  return (
    action
      .closest<HTMLElement>("[data-catalog-resizable-demo]")
      ?.querySelector<CatalogResizable>("[data-catalog-resizable-group]") ?? null
  );
}

function catalogResizablePanels(group: CatalogResizable): CatalogResizablePanel[] {
  return [...group.children].filter(
    (child): child is CatalogResizablePanel => child.localName === "ui-resizable-panel",
  );
}

function syncCatalogResizableOutput(group: CatalogResizable): void {
  const demo = group.closest<HTMLElement>("[data-catalog-resizable-demo]");
  const output = demo?.querySelector<HTMLOutputElement>("[data-catalog-resizable-output]");
  if (!demo || !output) return;
  const panels = catalogResizablePanels(group);
  if (demo.dataset.catalogResizableDemo === "visibility") {
    const navigator = panels[0];
    const visible = panels.filter((panel) => panel.visible).length;
    const sizing = navigator?.size === 0 ? "flexible" : `fixed at ${navigator?.size ?? 0}px`;
    output.textContent = `Navigator ${sizing} · ${visible} panels visible`;
    return;
  }
  const [left, center, right] = group.sizes.map((size) => Math.round(size));
  output.textContent = `Navigator ${left}px · Workspace ${center}px · Inspector ${right}px`;
}

// Scroll-to is intentionally a catalogue composition rather than a new
// component. The button names the intent; the example owns which scroll area
// and edge that intent targets.
document.addEventListener("click", (event) => {
  const motionReplay = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.catalogMotionReplay !== undefined,
    );
  if (motionReplay) {
    const demo = motionReplay.closest<HTMLElement>("[data-catalog-motion-demo]");
    const scope = motionReplay.closest<HTMLElement>("[data-catalog-motion-item]") ?? demo;
    const motions = [
      ...(scope?.querySelectorAll<HTMLElement>("[data-catalog-motion]") ?? []),
    ] as Array<HTMLElement & { play?: (state: string) => Promise<void>; state?: string }>;
    for (const motion of motions) {
      const state = motion.dataset.catalogMotionState ?? motion.getAttribute("state") ?? "active";
      if (state === "idle") {
        motion.state = "idle";
        continue;
      }
      void motion.play?.(state);
    }
    const output = demo?.querySelector<HTMLOutputElement>("[data-catalog-motion-output]");
    const label =
      scope !== demo
        ? (scope?.querySelector("code")?.textContent ?? "motion")
        : `${motions.length} motions`;
    if (output) output.textContent = `Replaying ${label}`;
    return;
  }

  const motionAction = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.catalogMotionState !== undefined,
    );
  if (motionAction) {
    const demo = motionAction.closest<HTMLElement>("[data-catalog-motion-demo]");
    const motion = demo?.querySelector<HTMLElement>("[data-catalog-motion]") as
      (HTMLElement & { state?: string; play?: (state: string) => Promise<void> }) | null;
    const state = motionAction.dataset.catalogMotionState;
    if (motion && state) void motion.play?.(state);
    return;
  }

  const motionUtilityToggle = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.catalogMotionUtilityToggle !== undefined,
    );
  if (motionUtilityToggle) {
    const demo = motionUtilityToggle.closest<HTMLElement>("[data-catalog-motion-utility-demo]");
    if (!demo) return;
    const active = demo.dataset.motionUtilityActive !== "true";
    demo.dataset.motionUtilityActive = String(active);
    for (const target of demo.querySelectorAll<HTMLElement>(
      "[data-catalog-motion-utility-target]",
    )) {
      if (active) target.dataset.motionUtilityActive = "true";
      else delete target.dataset.motionUtilityActive;
    }
    motionUtilityToggle.textContent = active ? "Reset" : "Apply";
    const output = demo.querySelector<HTMLOutputElement>("[data-catalog-motion-utility-output]");
    if (output) output.textContent = active ? "Utilities applied" : "Utilities at rest";
    return;
  }

  const revealToggle = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.catalogRevealToggle !== undefined,
    );
  if (revealToggle) {
    const demo = revealToggle.closest<HTMLElement>("[data-catalog-reveal-demo]");
    const reveal = demo?.querySelector<HTMLElement>("[data-catalog-reveal]") as
      (HTMLElement & { open?: boolean }) | null;
    const output = demo?.querySelector<HTMLOutputElement>("[data-catalog-reveal-output]");
    if (!reveal) return;
    const nextOpen = !reveal.open;
    reveal.open = nextOpen;
    revealToggle.textContent = nextOpen ? "Close" : "Open";
    if (output) output.textContent = nextOpen ? "Opening…" : "Closing…";
    return;
  }

  const resizeAction = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        node.matches(
          "[data-catalog-resizable-size], [data-catalog-resizable-reset], [data-catalog-resizable-visibility], [data-catalog-resizable-flex]",
        ),
    );
  if (resizeAction) {
    const group = catalogResizableGroup(resizeAction);
    if (!group) return;
    const panels = catalogResizablePanels(group);
    const sizeRequest = resizeAction.dataset.catalogResizableSize;
    const resetRequest = resizeAction.dataset.catalogResizableReset;
    const visibilityRequest = resizeAction.dataset.catalogResizableVisibility;
    const flexRequest = resizeAction.dataset.catalogResizableFlex;

    if (sizeRequest) {
      const [index, size] = sizeRequest.split(":").map(Number);
      if (Number.isFinite(index) && Number.isFinite(size)) group.resizePanel(index!, size!);
    } else if (resetRequest !== undefined) {
      const index = Number(resetRequest);
      if (Number.isFinite(index)) group.resetPanel(index);
    } else if (visibilityRequest !== undefined) {
      const panel = panels[Number(visibilityRequest)];
      if (panel) {
        panel.visible = !panel.visible;
        resizeAction.textContent = panel.visible ? "Hide navigator" : "Show navigator";
      }
    } else if (flexRequest !== undefined) {
      const panel = panels[Number(flexRequest)];
      if (panel) {
        if (panel.size === 0) {
          const size = Number(panel.dataset.catalogFixedSize) || panel.defaultSize || panel.min;
          panel.size = size;
          resizeAction.textContent = "Make navigator flexible";
        } else {
          panel.dataset.catalogFixedSize = String(panel.size);
          panel.size = 0;
          resizeAction.textContent = `Fix navigator at ${panel.dataset.catalogFixedSize}px`;
        }
      }
    }
    queueMicrotask(() => syncCatalogResizableOutput(group));
    return;
  }

  const editorAction = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.catalogEditorFind !== undefined,
    );
  if (editorAction) {
    const editor = editorAction.closest<HTMLElement>("ui-editor") as
      (HTMLElement & { findNext?: () => unknown; findPrevious?: () => unknown }) | null;
    if (editorAction.dataset.catalogEditorFind === "previous") editor?.findPrevious?.();
    else editor?.findNext?.();
    return;
  }

  const action = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.catalogScrollTo !== undefined,
    );
  if (!action) return;
  const example = action.closest<HTMLElement>(".example-scroll-jump");
  const area = example?.querySelector<HTMLElement>("ui-scroll-area");
  const viewport = area?.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]');
  if (!viewport) return;
  const end = action.dataset.catalogScrollTo === "end";
  viewport.scrollTo({
    top: end ? viewport.scrollHeight : 0,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
});

document.addEventListener("mash-motion-start", (event) => {
  const source = event.target;
  if (!(source instanceof HTMLElement) || !source.matches("[data-catalog-motion]")) return;
  const output = source
    .closest<HTMLElement>("[data-catalog-motion-demo]")
    ?.querySelector<HTMLOutputElement>("[data-catalog-motion-output]");
  const state = (event as CustomEvent<{ state: string }>).detail.state;
  if (output) output.textContent = `${state}…`;
});

interface CatalogGestureCommandDetail {
  command: string;
  gesture: string;
  phase: "began" | "changed" | "ended" | "cancelled";
  value: {
    movement?: { x: number; y: number };
    wheel?: { x: number; y: number };
  };
}

const clampGestureValue = (value: number): number => Math.min(100, Math.max(0, value));

const toolbarSelectionRanges = new WeakMap<HTMLElement, Range>();
const initializedToolbarSelectionDemos = new WeakSet<HTMLElement>();

interface ToolbarSelectionCommandDescriptor {
  selector: string;
  tag: string;
  label: string;
  attributes?: Record<string, string>;
  className?: string;
  dataset?: string;
  href?: string;
}

const toolbarSelectionCommands = {
  "format.body": {
    selector: 'ui-typeset[preset="body"]',
    tag: "ui-typeset",
    label: "set to body",
    attributes: { preset: "body" },
  },
  "format.callout": {
    selector: 'ui-typeset[preset="callout"]',
    tag: "ui-typeset",
    label: "set to callout",
    attributes: { preset: "callout" },
  },
  "format.headline": {
    selector: 'ui-typeset[preset="headline"]',
    tag: "ui-typeset",
    label: "set to headline",
    attributes: { preset: "headline" },
  },
  "format.title": {
    selector: 'ui-typeset[preset="title3"]',
    tag: "ui-typeset",
    label: "set to title",
    attributes: { preset: "title3" },
  },
  "format.bold": { selector: "strong, b", tag: "strong", label: "bold" },
  "format.italic": { selector: "em, i", tag: "em", label: "italic" },
  "format.strike": { selector: "s, strike", tag: "s", label: "struck" },
  "format.code": {
    selector: "code",
    tag: "code",
    label: "code",
    className: "rounded-control bg-surface-sunken px-control-block-small type-code",
  },
  "format.link": {
    selector: "a[href]",
    tag: "a",
    label: "linked",
    className: "text-action underline underline-offset-[var(--space-control-block-small)]",
    href: "#migration-brief",
  },
  "format.comment": {
    selector: "[data-catalog-toolbar-comment]",
    tag: "mark",
    label: "commented",
    className: "rounded-control bg-warning-subtle px-control-block-small text-warning",
    dataset: "catalogToolbarComment",
  },
  "tone.secondary": {
    selector: 'ui-typeset[tone="secondary"]',
    tag: "ui-typeset",
    label: "muted",
    attributes: { preset: "body", tone: "secondary" },
  },
  "tone.accent": {
    selector: 'ui-typeset[tone="accent"]',
    tag: "ui-typeset",
    label: "accented",
    attributes: { preset: "body", tone: "accent" },
  },
  "tone.critical": {
    selector: 'ui-typeset[tone="critical"]',
    tag: "ui-typeset",
    label: "marked critical",
    attributes: { preset: "body", tone: "critical" },
  },
  "insert.badge": {
    selector: "[data-catalog-toolbar-badge]",
    tag: "ui-badge",
    label: "badged",
    attributes: { tone: "accent", "data-catalog-toolbar-badge": "" },
  },
  "insert.callout": {
    selector: "[data-catalog-toolbar-callout]",
    tag: "span",
    label: "called out",
    className:
      "inline-flex items-baseline rounded-control bg-action-wash px-control-inline-small py-control-block-small text-action",
    dataset: "catalogToolbarCallout",
  },
} satisfies Record<string, ToolbarSelectionCommandDescriptor>;

type ToolbarSelectionCommand = keyof typeof toolbarSelectionCommands;

const toolbarSelectionCommandMap: Record<
  ToolbarSelectionCommand,
  ToolbarSelectionCommandDescriptor
> = toolbarSelectionCommands;

function toolbarSelectionSurface(demo: HTMLElement): HTMLElement | null {
  return demo.querySelector<HTMLElement>("[data-catalog-toolbar-selection-surface]");
}

function toolbarSelectionToolbar(demo: HTMLElement): HTMLElement | null {
  return demo.querySelector<HTMLElement>("[data-catalog-selection-toolbar]");
}

function toolbarSelectionOutput(demo: HTMLElement): HTMLOutputElement | null {
  return demo.querySelector<HTMLOutputElement>("[data-catalog-toolbar-selection-output]");
}

function toolbarSelectionElement(node: Node): Element | null {
  if (node instanceof Element) return node;
  const parent = node.parentNode;
  return parent instanceof Element ? parent : null;
}

function toolbarSelectionRangeInside(range: Range, surface: HTMLElement): boolean {
  const start = toolbarSelectionElement(range.startContainer);
  const end = toolbarSelectionElement(range.endContainer);
  return Boolean(start && end && surface.contains(start) && surface.contains(end));
}

function toolbarSelectionRangeText(range: Range): string {
  return range.toString().replace(/\s+/g, " ").trim();
}

function toolbarSelectionRect(range: Range): DOMRect | null {
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
  if (rects[0]) return rects[0];
  const rect = range.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0 ? rect : null;
}

function toolbarSelectionActiveElement(toolbar: HTMLElement): boolean {
  const active = document.activeElement;
  return active instanceof HTMLElement && toolbar.contains(active);
}

function toolbarSelectionHasAncestor(
  range: Range,
  surface: HTMLElement,
  selector: string,
): boolean {
  let current: Node | null = toolbarSelectionElement(range.commonAncestorContainer);
  while (current && current !== surface) {
    if (current instanceof Element && current.matches(selector)) return true;
    current = current.parentNode;
  }
  return false;
}

function syncToolbarSelectionPressed(demo: HTMLElement, range: Range): void {
  const surface = toolbarSelectionSurface(demo);
  if (!surface) return;
  for (const control of demo.querySelectorAll<HTMLElement>("[data-catalog-selection-command]")) {
    const command = control.dataset.catalogSelectionCommand;
    const descriptor = toolbarSelectionCommandMap[command as ToolbarSelectionCommand];
    const active =
      descriptor !== undefined &&
      toolbarSelectionRangeInside(range, surface) &&
      toolbarSelectionHasAncestor(range, surface, descriptor.selector);
    if ("pressed" in control) {
      (control as HTMLElement & { pressed?: boolean }).pressed = active;
    } else if ("checked" in control) {
      (control as HTMLElement & { checked?: boolean }).checked = active;
    } else {
      control.toggleAttribute("selected", active);
    }
  }
}

function hideToolbarSelectionDemo(demo: HTMLElement): void {
  delete demo.dataset.toolbarSelectionActive;
  const toolbar = toolbarSelectionToolbar(demo);
  if (toolbar) toolbar.hidden = true;
}

function syncToolbarSelectionDemo(demo: HTMLElement, allowStoredRange = false): void {
  const surface = toolbarSelectionSurface(demo);
  const toolbar = toolbarSelectionToolbar(demo);
  const output = toolbarSelectionOutput(demo);
  if (!surface || !toolbar) return;

  let range: Range | null = null;
  const stored = toolbarSelectionRanges.get(demo);
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
    const candidate = selection.getRangeAt(0);
    if (toolbarSelectionRangeInside(candidate, surface)) {
      if (stored && toolbarSelectionRangeText(stored) !== toolbarSelectionRangeText(candidate)) {
        delete demo.dataset.toolbarSelectionFeedback;
      }
      range = candidate.cloneRange();
      toolbarSelectionRanges.set(demo, range.cloneRange());
    }
  }

  if (
    !range &&
    allowStoredRange &&
    stored &&
    toolbarSelectionActiveElement(toolbar) &&
    toolbarSelectionRangeInside(stored, surface)
  ) {
    range = stored.cloneRange();
  }

  const selectedText = range ? toolbarSelectionRangeText(range) : "";
  if (!range || range.collapsed || !selectedText) {
    hideToolbarSelectionDemo(demo);
    delete demo.dataset.toolbarSelectionFeedback;
    if (output) output.value = "Select text in the brief.";
    return;
  }

  const selectionRect = toolbarSelectionRect(range);
  if (!selectionRect) {
    hideToolbarSelectionDemo(demo);
    return;
  }

  toolbar.hidden = false;
  demo.dataset.toolbarSelectionActive = "true";
  const demoRect = demo.getBoundingClientRect();
  const toolbarRect = toolbar.getBoundingClientRect();
  const gutter = 8;
  const halfToolbar = toolbarRect.width / 2;
  const minimumX = halfToolbar + gutter;
  const maximumX = Math.max(minimumX, demo.clientWidth - halfToolbar - gutter);
  const rawX = selectionRect.left - demoRect.left + selectionRect.width / 2;
  const x = Math.min(maximumX, Math.max(minimumX, rawX));
  const rawY = selectionRect.top - demoRect.top - gutter;
  const y = Math.max(toolbarRect.height + gutter, rawY);

  toolbar.style.left = `${x}px`;
  toolbar.style.top = `${y}px`;
  syncToolbarSelectionPressed(demo, range);
  if (output) output.value = demo.dataset.toolbarSelectionFeedback ?? `${selectedText} selected`;
}

function selectInitialToolbarText(demo: HTMLElement): void {
  if (initializedToolbarSelectionDemos.has(demo)) return;
  initializedToolbarSelectionDemos.add(demo);
  const initial = demo.querySelector<HTMLElement>("[data-catalog-toolbar-selection-initial]");
  if (!initial) return;
  window.requestAnimationFrame(() => {
    if (!demo.isConnected) return;
    const selection = window.getSelection();
    if (!selection || selection.toString().trim()) return;
    const range = document.createRange();
    range.selectNodeContents(initial);
    selection.removeAllRanges();
    selection.addRange(range);
    toolbarSelectionRanges.set(demo, range.cloneRange());
    syncToolbarSelectionDemo(demo);
  });
}

function syncToolbarSelectionDemos(): void {
  for (const demo of document.querySelectorAll<HTMLElement>(
    "[data-catalog-toolbar-selection-demo]",
  )) {
    selectInitialToolbarText(demo);
    syncToolbarSelectionDemo(demo, true);
  }
}

function toolbarSelectionCommand(command: string): ToolbarSelectionCommand | null {
  return Object.prototype.hasOwnProperty.call(toolbarSelectionCommandMap, command)
    ? (command as ToolbarSelectionCommand)
    : null;
}

function applyToolbarSelectionCommand(target: HTMLElement, command: ToolbarSelectionCommand): void {
  const demo = target.closest<HTMLElement>("[data-catalog-toolbar-selection-demo]");
  const surface = demo ? toolbarSelectionSurface(demo) : null;
  const output = demo ? toolbarSelectionOutput(demo) : null;
  if (!demo || !surface) return;
  const stored = toolbarSelectionRanges.get(demo);
  if (!stored || stored.collapsed || !toolbarSelectionRangeInside(stored, surface)) return;

  const descriptor = toolbarSelectionCommandMap[command];
  const wrapper = document.createElement(descriptor.tag);
  if (descriptor.className) wrapper.className = descriptor.className;
  for (const [name, value] of Object.entries(descriptor.attributes ?? {})) {
    wrapper.setAttribute(name, value);
  }
  if (descriptor.href) wrapper.setAttribute("href", descriptor.href);
  if (descriptor.dataset) wrapper.dataset[descriptor.dataset] = "";

  try {
    const range = stored.cloneRange();
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    toolbarSelectionRanges.set(demo, nextRange.cloneRange());
    demo.dataset.toolbarSelectionFeedback = `${toolbarSelectionRangeText(nextRange)} ${
      descriptor.label
    }`;
    syncToolbarSelectionDemo(demo, true);
  } catch {
    delete demo.dataset.toolbarSelectionFeedback;
    if (output) output.value = "Selection could not be formatted.";
  }
}

function syncToolbarSelectionSoon(): void {
  window.requestAnimationFrame(syncToolbarSelectionDemos);
}

document.addEventListener("selectionchange", syncToolbarSelectionSoon);

document.addEventListener("pointerup", (event) => {
  if (
    event
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement && node.matches("[data-catalog-toolbar-selection-demo]"),
      )
  ) {
    window.setTimeout(syncToolbarSelectionDemos, 0);
  }
});

document.addEventListener("keyup", (event) => {
  if (
    event
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement && node.matches("[data-catalog-toolbar-selection-demo]"),
      )
  ) {
    syncToolbarSelectionSoon();
  }
});

function updateGestureSelection(
  demo: HTMLElement,
  target: HTMLElement,
  detail: CatalogGestureCommandDetail,
  output: HTMLOutputElement | null,
  state: HTMLElement | null,
): void {
  if (!demo.hasAttribute("data-gesture-selection-demo") || detail.phase !== "ended") return;
  if (detail.command !== "selection.set" && detail.command !== "selection.extend") return;
  const items = [...demo.querySelectorAll<HTMLElement>("[data-gesture-selection-key]")];
  const focusIndex = items.indexOf(target);
  if (focusIndex < 0) return;
  const anchorIndex = Number(demo.dataset.gestureSelectionAnchor ?? focusIndex);
  const start =
    detail.command === "selection.extend" ? Math.min(anchorIndex, focusIndex) : focusIndex;
  const end =
    detail.command === "selection.extend" ? Math.max(anchorIndex, focusIndex) : focusIndex;
  if (detail.command === "selection.set") demo.dataset.gestureSelectionAnchor = String(focusIndex);
  const selected: string[] = [];
  items.forEach((item, index) => {
    const isSelected = index >= start && index <= end;
    item.toggleAttribute("data-gesture-selected", isSelected);
    item.setAttribute("aria-selected", String(isSelected));
    if (isSelected && item.dataset.gestureSelectionKey) {
      selected.push(item.dataset.gestureSelectionKey);
    }
  });
  if (output) output.value = `${detail.command} · ${selected.join(" ")}`;
  if (state) state.textContent = detail.command === "selection.extend" ? "range" : "anchor";
}

function syncGestureScrubber(demo: HTMLElement, value: number): void {
  const normalized = clampGestureValue(value);
  demo.dataset.gestureValue = String(normalized);
  demo.style.setProperty("--gesture-progress", `${normalized}%`);
  const progress = demo.querySelector<HTMLElement>("[data-gesture-progress]");
  progress?.setAttribute("value", String(normalized));
  progress?.setAttribute("label", `Timeline position ${Math.round(normalized)} percent`);
  const valueOutput = demo.querySelector<HTMLOutputElement>("[data-gesture-value-output]");
  if (valueOutput) valueOutput.value = `${Math.round(normalized)}%`;
}

function updateGestureScrubber(
  demo: HTMLElement,
  target: HTMLElement,
  detail: CatalogGestureCommandDetail,
): void {
  if (!demo.hasAttribute("data-gesture-scrubber")) return;
  const current = Number(demo.dataset.gestureValue ?? 0);
  if (detail.command === "timeline.step-back" || detail.command === "timeline.step-forward") {
    const shouldStep =
      detail.gesture === "key"
        ? detail.phase === "began" || detail.phase === "changed"
        : detail.phase === "ended";
    if (!shouldStep) return;
    syncGestureScrubber(demo, current + (detail.command.endsWith("forward") ? 5 : -5));
    return;
  }
  if (detail.command !== "timeline.scrub") return;
  if (detail.gesture === "wheel") {
    if (detail.phase !== "began" && detail.phase !== "changed") return;
    const wheel = detail.value.wheel ?? { x: 0, y: 0 };
    syncGestureScrubber(demo, current - (wheel.y || wheel.x) * 0.1);
    return;
  }
  const track = target.matches("#gesture-scrub-track")
    ? target
    : demo.querySelector<HTMLElement>("#gesture-scrub-track");
  if (!track) return;
  if (detail.phase === "began") demo.dataset.gestureScrubOrigin = String(current);
  const origin = Number(demo.dataset.gestureScrubOrigin ?? current);
  if (detail.phase === "cancelled") {
    syncGestureScrubber(demo, origin);
    delete demo.dataset.gestureScrubOrigin;
    return;
  }
  const movement = detail.value.movement ?? { x: 0, y: 0 };
  syncGestureScrubber(demo, origin + (movement.x / Math.max(1, track.clientWidth)) * 100);
  if (detail.phase === "ended") delete demo.dataset.gestureScrubOrigin;
}

function updateGesturePreview(
  demo: HTMLElement,
  target: HTMLElement,
  detail: CatalogGestureCommandDetail,
): void {
  if (!demo.hasAttribute("data-gesture-preview-demo") || detail.command !== "preview.project") {
    return;
  }
  const items = demo.querySelectorAll<HTMLElement>("[data-gesture-preview-title]");
  const card = demo.querySelector<HTMLElement>("[data-gesture-preview-card]");
  const title = card?.querySelector<HTMLElement>("[data-gesture-preview-card-title]");
  const copy = card?.querySelector<HTMLElement>("[data-gesture-preview-card-copy]");
  if (!card || !title || !copy) return;
  items.forEach((item) => item.removeAttribute("data-gesture-preview-active"));
  if (detail.phase === "began") {
    target.setAttribute("data-gesture-preview-active", "");
    title.textContent = target.dataset.gesturePreviewTitle ?? "Project preview";
    copy.textContent = target.dataset.gesturePreviewCopy ?? "";
    return;
  }
  if (detail.phase === "ended" || detail.phase === "cancelled") {
    title.textContent = "Hover a project";
    copy.textContent = "Transient preview state appears here.";
  }
}

function updateShrineGesturePreview(
  demo: HTMLElement,
  target: HTMLElement,
  detail: CatalogGestureCommandDetail,
): void {
  if (
    !demo.hasAttribute("data-shrine-path-preview-stage") ||
    detail.command !== "preview.shrine-path"
  ) {
    return;
  }
  const preview = shrinePreviewForPath(target);
  if (!preview) return;
  if (detail.phase === "began") {
    openShrinePathPreview(target);
    return;
  }
  if (detail.phase === "ended" || detail.phase === "cancelled") {
    closeShrinePathPreview(preview);
  }
}

document.addEventListener("mash-command", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const inputLab = target.closest<HTMLElement>("[data-catalog-input-lab]");
  const inputDetail = (event as CustomEvent<CatalogGestureCommandDetail>).detail;
  if (inputLab && inputDetail.command === "input.focus" && inputDetail.phase === "ended") {
    inputLab.querySelector<HTMLElement>("[data-catalog-input-focus]")?.focus();
    return;
  }
  const demo = target.closest<HTMLElement>("[data-catalog-gesture-demo]");
  if (!demo) return;
  const detail = (event as CustomEvent<CatalogGestureCommandDetail>).detail;
  const output = demo.querySelector<HTMLOutputElement>("[data-catalog-gesture-output]");
  const state = demo.querySelector<HTMLElement>("[data-catalog-gesture-state]");
  if (output) output.value = `${detail.command} · ${detail.gesture} · ${detail.phase}`;
  if (state) state.textContent = detail.phase;

  updateGestureSelection(demo, target, detail, output, state);
  updateGestureScrubber(demo, target, detail);
  updateGesturePreview(demo, target, detail);
  updateShrineGesturePreview(demo, target, detail);

  if (detail.command === "workspace.inspect" && detail.phase === "ended") {
    target.toggleAttribute("data-gesture-selected");
  }
  if (detail.command === "canvas.select" && detail.phase === "ended") {
    target.toggleAttribute("data-gesture-selected");
  }
  if (detail.command === "canvas.preview" && detail.phase === "ended") {
    target.toggleAttribute("data-gesture-preview");
  }
  if (detail.command !== "canvas.move") return;

  const movement = detail.value.movement ?? { x: 0, y: 0 };
  const originX = Number(target.dataset.gestureOriginX ?? target.dataset.gestureX ?? 0);
  const originY = Number(target.dataset.gestureOriginY ?? target.dataset.gestureY ?? 0);
  if (detail.phase === "began") {
    target.dataset.gestureOriginX = String(originX);
    target.dataset.gestureOriginY = String(originY);
  }
  if (detail.phase === "began" || detail.phase === "changed" || detail.phase === "ended") {
    const x = originX + movement.x;
    const y = originY + movement.y;
    target.style.setProperty("--gesture-x", `${x}px`);
    target.style.setProperty("--gesture-y", `${y}px`);
    if (detail.phase === "ended") {
      target.dataset.gestureX = String(x);
      target.dataset.gestureY = String(y);
      delete target.dataset.gestureOriginX;
      delete target.dataset.gestureOriginY;
    }
  }
  if (detail.phase === "cancelled") {
    target.style.setProperty("--gesture-x", `${originX}px`);
    target.style.setProperty("--gesture-y", `${originY}px`);
    delete target.dataset.gestureOriginX;
    delete target.dataset.gestureOriginY;
  }
});

document.addEventListener("mash-command", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const detail = (event as CustomEvent<CatalogGestureCommandDetail>).detail;
  if (detail.phase !== "ended") return;
  const command = toolbarSelectionCommand(detail.command);
  if (!command) return;
  target.dataset.catalogSelectionCommandHandledAt = String(performance.now());
  applyToolbarSelectionCommand(target, command);
});

document.addEventListener("click", (event) => {
  const action = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.dataset.catalogSelectionCommand !== undefined,
    );
  if (!action) return;
  const command = toolbarSelectionCommand(action.dataset.catalogSelectionCommand ?? "");
  if (!command) return;
  const handledAt = Number(action.dataset.catalogSelectionCommandHandledAt ?? 0);
  if (performance.now() - handledAt < 250) return;
  applyToolbarSelectionCommand(action, command);
});

document.addEventListener("mash-command", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const lab = target.closest<HTMLElement>("[data-catalog-select-lab]");
  if (!lab) return;
  const detail = (event as CustomEvent<CatalogGestureCommandDetail>).detail;
  if (detail.phase !== "ended") return;
  const select = lab.querySelector<CatalogSelect>("[data-catalog-select-demo]");
  if (!select) return;

  if (detail.command === "select.open") select.show?.();
  if (detail.command === "select.dismiss") select.dismiss?.("imperative");
  if (detail.command === "select.toggle") select.toggle?.("imperative");
  recordSelectEvent(select, `command: ${detail.command}`);
});

document.addEventListener("mash-command", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const lab = target.closest<HTMLElement>("[data-catalog-menu-lab]");
  if (!lab) return;
  const detail = (event as CustomEvent<CatalogGestureCommandDetail>).detail;
  if (detail.phase !== "ended") return;
  const menu = lab.querySelector<CatalogMenu>("[data-catalog-menu-demo]");
  if (!menu) return;
  if (detail.command === "menu.open") menu.show?.("imperative");
  if (detail.command === "menu.dismiss") menu.dismiss?.("imperative");
  if (detail.command === "menu.toggle") menu.toggle?.("imperative");
});

document.addEventListener("mash-gesture-state", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const demo = target.closest<HTMLElement>("[data-catalog-gesture-demo]");
  if (!demo) return;
  const detail = (event as CustomEvent<{ command: string; state: string }>).detail;
  const state = demo.querySelector<HTMLElement>("[data-catalog-gesture-state]");
  if (state) state.textContent = detail.state;
});

document.addEventListener("ui-scroll-area-target", (event) => {
  const source = event.target;
  if (!(source instanceof HTMLElement) || !source.matches("[data-catalog-scroll-targets]")) return;
  const detail = (event as CustomEvent<{ target: string | null }>).detail;
  if (!detail.target) return;
  const composition = source.closest<HTMLElement>("[data-catalog-scroll-breadcrumb]");
  if (!composition) return;
  const title = detail.target.replaceAll("-", " ").replace(/^./, (value) => value.toUpperCase());
  const path = composition.querySelector<HTMLElement>("ui-path");
  const titleSlot = composition.querySelector<HTMLElement>(
    "[data-catalog-scroll-breadcrumb-title]",
  );
  const output = composition.querySelector<HTMLElement>("[data-catalog-scroll-target-output]");
  path?.setAttribute("path", `/interzone/foundations/scrolling/${detail.target}`);
  if (titleSlot) titleSlot.textContent = title;
  if (output) output.textContent = detail.target;
});

document.addEventListener("mash-motion-end", (event) => {
  const source = event.target;
  if (!(source instanceof HTMLElement) || !source.matches("[data-catalog-motion]")) return;
  const output = source
    .closest<HTMLElement>("[data-catalog-motion-demo]")
    ?.querySelector<HTMLOutputElement>("[data-catalog-motion-output]");
  const detail = (event as CustomEvent<{ state: string; interrupted: boolean }>).detail;
  if (output)
    output.textContent = detail.interrupted
      ? `${detail.state} interrupted`
      : `${detail.state} complete`;
});

document.addEventListener("mash-reveal-start", (event) => {
  const source = event.target;
  if (!(source instanceof HTMLElement) || !source.matches("[data-catalog-reveal]")) return;
  const output = source
    .closest<HTMLElement>("[data-catalog-reveal-demo]")
    ?.querySelector<HTMLOutputElement>("[data-catalog-reveal-output]");
  const detail = (event as CustomEvent<RevealEventDetail>).detail;
  if (output) output.textContent = `${detail.state} · ${detail.axis}`;
});

document.addEventListener("mash-reveal-end", (event) => {
  const source = event.target;
  if (!(source instanceof HTMLElement) || !source.matches("[data-catalog-reveal]")) return;
  const output = source
    .closest<HTMLElement>("[data-catalog-reveal-demo]")
    ?.querySelector<HTMLOutputElement>("[data-catalog-reveal-output]");
  const detail = (event as CustomEvent<RevealEventDetail>).detail;
  if (!output) return;
  output.textContent = detail.interrupted
    ? `${detail.state} interrupted`
    : detail.open
      ? "Open · active"
      : "Closed · absent";
});

document.addEventListener("ui-resizable-change", (event) => {
  const group = event.target;
  if (group instanceof HTMLElement && group.matches("[data-catalog-resizable-group]")) {
    syncCatalogResizableOutput(group as CatalogResizable);
  }
});

document.addEventListener("ui-clipboard-copy", (event) => {
  const clipboard = event.target;
  if (!(clipboard instanceof HTMLElement) || !clipboard.matches("[data-catalog-clipboard-dynamic]"))
    return;
  const stamp = new Date().toISOString().slice(11, 19).replaceAll(":", "");
  const detail = (event as CustomEvent<{ setValue(value: string): void }>).detail;
  detail.setValue(`git checkout -b docs/clipboard-${stamp}`);
});

document.addEventListener("ui-clipboard-copied", (event) => {
  const clipboard = event.target;
  if (!(clipboard instanceof HTMLElement)) return;
  const output = clipboard
    .closest<HTMLElement>("[data-catalog-clipboard-demo]")
    ?.querySelector<HTMLOutputElement>("[data-catalog-clipboard-output]");
  if (!output) return;
  const detail = (event as CustomEvent<{ source: string; value: string }>).detail;
  output.value = `Copied ${detail.value.length} characters from ${detail.source}.`;
});

document.addEventListener("ui-clipboard-error", (event) => {
  const clipboard = event.target;
  if (!(clipboard instanceof HTMLElement)) return;
  const output = clipboard
    .closest<HTMLElement>("[data-catalog-clipboard-demo]")
    ?.querySelector<HTMLOutputElement>("[data-catalog-clipboard-output]");
  if (!output) return;
  const detail = (event as CustomEvent<{ error: unknown }>).detail;
  output.value =
    detail.error instanceof Error ? `Copy failed: ${detail.error.message}` : "Copy failed.";
});

type MashValueElement = HTMLElement & { value?: string };
type MashNumericValueElement = HTMLElement & { value?: number };
type MashCheckboxElement = HTMLElement & { checked?: boolean; indeterminate?: boolean };
type MashOverlayElement = HTMLElement & { open?: boolean; show?: () => void; dismiss?: () => void };
type MashMotionElement = HTMLElement & { state?: string };

interface LinearIssue {
  id: string;
  title: string;
  area: string;
  status: string;
  priority: string;
  assignee: string;
  initials: string;
}

interface LinearWorkspaceState extends LinearWorkspaceSnapshot {
  selected: Set<string>;
  highlighted: string | null;
  currentIssue: string | null;
  dataState: "ready" | "loading" | "error";
  nextIssueNumber: number;
}

const linearStates = new WeakMap<HTMLElement, LinearWorkspaceState>();

const linearStatus = {
  backlog: { label: "Backlog", tone: "" },
  todo: { label: "Todo", tone: "" },
  progress: { label: "In progress", tone: "positive" },
  review: { label: "In review", tone: "warning" },
  done: { label: "Done", tone: "positive" },
} as const;

const linearAssignee = {
  maya: { label: "Maya", full: "Maya Chen", initials: "MC" },
  sam: { label: "Sam", full: "Sam Ortiz", initials: "SO" },
  alex: { label: "Alex", full: "Alex Rivera", initials: "AR" },
  priya: { label: "Priya", full: "Priya Jain", initials: "PJ" },
} as const;

const linearPriority = {
  low: { label: "Low", symbol: "↓" },
  medium: { label: "Medium", symbol: "→" },
  high: { label: "High", symbol: "↑" },
  urgent: { label: "Urgent", symbol: "!" },
} as const;

function linearWorkspaceFromEvent(event: Event): HTMLElement | null {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue;
    const workspace = node.matches("[data-linear-workspace]")
      ? node
      : node.closest<HTMLElement>("[data-linear-workspace]");
    if (workspace) return workspace;
  }
  return null;
}

function linearRouteWindow(): Window {
  try {
    return window.parent !== window && window.parent.location.origin === window.location.origin
      ? window.parent
      : window;
  } catch {
    return window;
  }
}

function linearState(workspace: HTMLElement): LinearWorkspaceState {
  let state = linearStates.get(workspace);
  if (state) return state;
  const routeWindow = linearRouteWindow();
  const restored = parseLinearWorkspaceSnapshot(
    new URL(routeWindow.location.href).searchParams.get("state-linear"),
  );
  const snapshot =
    restored ??
    defaultLinearWorkspaceSnapshot(workspace.dataset.linearView === "board" ? "board" : "list");
  state = {
    ...snapshot,
    selected: new Set<string>(),
    highlighted: null,
    currentIssue: null,
    dataState: "ready",
    nextIssueNumber: 151,
  };
  linearStates.set(workspace, state);
  return state;
}

function linearPersistState(workspace: HTMLElement): void {
  const state = linearState(workspace);
  const routeWindow = linearRouteWindow();
  const value = serializeLinearWorkspaceSnapshot({
    filters: state.filters,
    preset: state.preset,
    query: state.query,
    version: 1,
    view: state.view,
  });
  if (routeWindow !== window) {
    routeWindow.postMessage(
      { key: "linear", type: "mash-catalog-example-state", value },
      window.location.origin,
    );
    return;
  }
  const url = new URL(routeWindow.location.href);
  url.searchParams.set("state-linear", value);
  routeWindow.history.replaceState(routeWindow.history.state, "", url);
}

function linearIssueFromElement(element: HTMLElement | null): LinearIssue | null {
  const issue = element?.closest<HTMLElement>("[data-linear-list-row], [data-linear-board-card]");
  const id = issue?.dataset.linearIssue;
  if (!issue || !id) return null;
  return {
    id,
    title: issue.dataset.title ?? id,
    area: issue.dataset.area ?? "Product",
    status: issue.dataset.status ?? "backlog",
    priority: issue.dataset.priority ?? "medium",
    assignee: issue.dataset.assignee ?? "maya",
    initials: issue.dataset.initials ?? "MC",
  };
}

function linearIssueById(workspace: HTMLElement, id: string): LinearIssue | null {
  const source = [...workspace.querySelectorAll<HTMLElement>("[data-linear-list-row]")].find(
    (row) => row.dataset.linearIssue === id,
  );
  return linearIssueFromElement(source ?? null);
}

function linearIssueNodes(workspace: HTMLElement, id: string): HTMLElement[] {
  return [...workspace.querySelectorAll<HTMLElement>("[data-linear-issue]")].filter(
    (node) => node.dataset.linearIssue === id,
  );
}

function linearMatches(issue: LinearIssue, state: LinearWorkspaceState): boolean {
  const query = state.query.trim().toLocaleLowerCase();
  const searchable =
    `${issue.id} ${issue.title} ${issue.area} ${issue.assignee}`.toLocaleLowerCase();
  return (!query || searchable.includes(query)) && linearMatchesFilter(issue, state.filters);
}

function linearVisibleIssues(workspace: HTMLElement): LinearIssue[] {
  const state = linearState(workspace);
  return [...workspace.querySelectorAll<HTMLElement>("[data-linear-list-row]")]
    .map((row) => linearIssueFromElement(row))
    .filter((issue): issue is LinearIssue => issue !== null && linearMatches(issue, state));
}

const linearFilterDefaults: Record<LinearFilterField, string> = {
  status: "progress",
  assignee: "maya",
  priority: "high",
};

const linearFilterOptions: Record<LinearFilterField, readonly [string, string][]> = {
  status: [
    ["backlog", "Backlog"],
    ["todo", "Todo"],
    ["progress", "In progress"],
    ["review", "In review"],
    ["done", "Done"],
  ],
  assignee: [
    ["maya", "Maya Chen"],
    ["sam", "Sam Ortiz"],
    ["alex", "Alex Rivera"],
    ["priya", "Priya Jain"],
  ],
  priority: [
    ["urgent", "Urgent"],
    ["high", "High"],
    ["medium", "Medium"],
    ["low", "Low"],
  ],
};

function linearFilterFieldLabel(field: LinearFilterField): string {
  if (field === "assignee") return "Assignee";
  return field === "priority" ? "Priority" : "Status";
}

function linearFilterRuleLabel(field: LinearFilterField, value: string): string {
  const label = linearFilterOptions[field].find(([candidate]) => candidate === value)?.[1] ?? value;
  return `${linearFilterFieldLabel(field)} is ${label}`;
}

function linearFilterPath(path: readonly number[]): string {
  return path.join(".");
}

function linearParseFilterPath(value: string | undefined): number[] | null {
  if (value === "") return [];
  if (!value || !/^\d+(?:\.\d+)*$/.test(value)) return null;
  return value.split(".").map(Number);
}

function linearFilterNodeDescription(node: LinearFilterNode): string {
  if (node.kind === "rule") return linearFilterRuleLabel(node.field, node.value);
  if (node.children.length === 0) return "All issues";
  const joiner = node.combinator === "and" ? " and " : " or ";
  const description = node.children.map(linearFilterNodeDescription).join(joiner);
  return node.children.length > 1 ? `(${description})` : description;
}

function linearFilterRuleCount(node: LinearFilterNode): number {
  return node.kind === "rule"
    ? 1
    : node.children.reduce((count, child) => count + linearFilterRuleCount(child), 0);
}

function linearRenderFilterRule(
  rule: Extract<LinearFilterNode, { kind: "rule" }>,
  path: readonly number[],
): string {
  const encodedPath = linearFilterPath(path);
  const fieldOptions = (["status", "assignee", "priority"] as const)
    .map(
      (field) =>
        `<ui-option value="${field}"${field === rule.field ? " selected" : ""}>${linearFilterFieldLabel(field)}</ui-option>`,
    )
    .join("");
  const valueOptions = linearFilterOptions[rule.field]
    .map(
      ([value, label]) =>
        `<ui-option value="${value}"${value === rule.value ? " selected" : ""}>${label}</ui-option>`,
    )
    .join("");
  return `<div class="example-linear-query-rule" data-linear-query-rule data-linear-query-path="${encodedPath}">
    <ui-select data-linear-query-field data-linear-query-path="${encodedPath}" value="${linearEscape(rule.field)}" label="Filter field">${fieldOptions}</ui-select>
    <ui-badge size="small">is</ui-badge>
    <ui-select data-linear-query-value data-linear-query-path="${encodedPath}" value="${linearEscape(rule.value)}" label="${linearEscape(linearFilterFieldLabel(rule.field))} value">${valueOptions}</ui-select>
    <ui-button type="button" size="small" variant="quiet" data-linear-query-remove data-linear-query-path="${encodedPath}" aria-label="Remove ${linearEscape(linearFilterRuleLabel(rule.field, rule.value))}"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
  </div>`;
}

function linearRenderFilterGroup(
  group: LinearFilterGroup,
  path: readonly number[] = [],
  depth = 0,
): string {
  const encodedPath = linearFilterPath(path);
  const children = group.children
    .map((child, index) => {
      const childPath = [...path, index];
      const content =
        child.kind === "group"
          ? linearRenderFilterGroup(child, childPath, depth + 1)
          : linearRenderFilterRule(child, childPath);
      if (index === 0) return content;
      return `<span class="example-linear-query-connector" aria-hidden="true">${group.combinator.toLocaleUpperCase()}</span>${content}`;
    })
    .join("");
  const empty =
    group.children.length === 0
      ? `<div class="example-linear-query-empty"><ui-icon name="action.search" label=""></ui-icon><span>No conditions yet. This view includes every issue.</span></div>`
      : children;
  const removeGroup =
    path.length === 0
      ? ""
      : `<ui-button type="button" size="small" variant="quiet" data-linear-query-remove data-linear-query-path="${encodedPath}" aria-label="Remove nested filter group"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>`;
  return `<section class="example-linear-query-group" data-linear-query-group data-linear-query-path="${encodedPath}" aria-label="${depth === 0 ? "Root" : "Nested"} filter group">
    <header class="example-linear-query-group-header">
      <span>${depth === 0 ? "Match" : "Nested group"}</span>
      <ui-toggle-group data-linear-query-group-mode data-linear-query-path="${encodedPath}" mode="single" value="${group.combinator}" label="Group combination">
        <ui-toggle value="and" size="small"${group.combinator === "and" ? " pressed" : ""}>All</ui-toggle>
        <ui-toggle value="or" size="small"${group.combinator === "or" ? " pressed" : ""}>Any</ui-toggle>
      </ui-toggle-group>
      ${removeGroup}
    </header>
    <div class="example-linear-query-children">${empty}</div>
    <footer class="example-linear-query-group-actions">
      <ui-button type="button" size="small" variant="quiet" data-linear-query-add-rule data-linear-query-path="${encodedPath}">＋ Condition</ui-button>
      <ui-button type="button" size="small" variant="quiet" data-linear-query-add-group data-linear-query-path="${encodedPath}"${depth >= 3 ? " disabled" : ""}>＋ Group</ui-button>
    </footer>
  </section>`;
}

function linearCollectFilterRules(
  node: LinearFilterNode,
  path: readonly number[] = [],
): { path: number[]; label: string }[] {
  if (node.kind === "rule")
    return [{ path: [...path], label: linearFilterRuleLabel(node.field, node.value) }];
  return node.children.flatMap((child, index) => linearCollectFilterRules(child, [...path, index]));
}

function linearRenderQueryControls(workspace: HTMLElement): void {
  const state = linearState(workspace);
  const signature = JSON.stringify(state.filters);
  const builder = workspace.querySelector<HTMLElement>("[data-linear-query-builder]");
  if (builder && builder.dataset.linearQuerySignature !== signature) {
    builder.innerHTML = linearRenderFilterGroup(state.filters);
    builder.dataset.linearQuerySignature = signature;
  }
  const chips = workspace.querySelector<HTMLElement>("[data-linear-filter-chips]");
  if (chips && chips.dataset.linearQuerySignature !== signature) {
    const rules = linearCollectFilterRules(state.filters);
    chips.innerHTML = rules
      .map(
        ({ path, label }) =>
          `<ui-chip value="${linearFilterPath(path)}">${linearEscape(label)}<ui-button slot="remove" size="small" variant="quiet" aria-label="Remove ${linearEscape(label)}"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button></ui-chip>`,
      )
      .join("");
    chips.hidden = rules.length === 0;
    chips.dataset.linearQuerySignature = signature;
  }
  const count = workspace.querySelector<HTMLElement>("[data-linear-filter-count]");
  if (count) count.textContent = String(linearFilterRuleCount(state.filters));
}

function linearAnnounce(workspace: HTMLElement, message: string): void {
  const output = workspace.querySelector<HTMLOutputElement>("[data-linear-announcer]");
  if (output) output.value = message;
}

function linearSetQueryPanel(workspace: HTMLElement, open: boolean): void {
  const panel = workspace.querySelector<MashMotionElement>("[data-linear-query-panel]");
  const trigger = workspace.querySelector<HTMLElement>("#linear-filter-trigger");
  if (!panel || !trigger) return;
  trigger.setAttribute("aria-expanded", String(open));
  panel.dataset.linearQueryOpen = String(open);
  if (open) {
    panel.hidden = false;
    panel.state = "entering";
    window.setTimeout(
      () =>
        workspace
          .querySelector<HTMLElement>("[data-linear-query-field]")
          ?.focus({ preventScroll: true }),
      0,
    );
    return;
  }
  panel.state = "exiting";
  window.setTimeout(() => {
    if (panel.dataset.linearQueryOpen === "false") panel.hidden = true;
  }, 180);
  trigger.focus();
}

function linearPresetLabel(preset: LinearFilterPreset): string {
  if (preset === "mine") return "My issues";
  if (preset === "release-risk") return "Release risk";
  if (preset === "custom") return "Custom view";
  return "All issues";
}

function linearSyncFilterControls(workspace: HTMLElement): void {
  const state = linearState(workspace);
  workspace.dataset.linearView = state.view;
  workspace.dataset.linearFilterPreset = state.preset;
  workspace.dataset.linearFilterCombinator = state.filters.combinator;
  workspace.dataset.linearDataState = state.dataState;
  for (const search of workspace.querySelectorAll<MashValueElement>("[data-linear-search]"))
    search.value = state.query;
  const view = workspace.querySelector<MashValueElement>("[data-linear-view-toggle]");
  if (view) view.value = state.view;
  const preset = workspace.querySelector<HTMLElement>("[data-linear-view-preset-label]");
  if (preset) preset.textContent = linearPresetLabel(state.preset);
  const demoState = workspace.querySelector<HTMLElement>("[data-linear-demo-state-label]");
  if (demoState)
    demoState.textContent =
      state.dataState === "loading" ? "Loading" : state.dataState === "error" ? "Error" : "Ready";
  linearRenderQueryControls(workspace);
  const stateOutput = workspace.querySelector<HTMLOutputElement>("[data-linear-view-state]");
  if (stateOutput) {
    const description = linearFilterNodeDescription(state.filters).replace(/^\((.*)\)$/u, "$1");
    stateOutput.value = `${linearPresetLabel(state.preset)} · ${description}`;
  }
}

function linearSyncSelection(workspace: HTMLElement): void {
  const state = linearState(workspace);
  for (const node of workspace.querySelectorAll<HTMLElement>("[data-linear-issue]")) {
    const id = node.dataset.linearIssue;
    if (!id) continue;
    const selected = state.selected.has(id);
    if (node.matches("[data-linear-list-row], [data-linear-board-card]"))
      node.setAttribute("aria-selected", String(selected));
    if (node.matches("[data-linear-select]")) (node as MashCheckboxElement).checked = selected;
  }

  const visible = linearVisibleIssues(workspace);
  const visibleSelected = visible.filter((issue) => state.selected.has(issue.id)).length;
  const selectAll = workspace.querySelector<MashCheckboxElement>("[data-linear-select-all]");
  if (selectAll) {
    selectAll.checked = visible.length > 0 && visibleSelected === visible.length;
    selectAll.indeterminate = visibleSelected > 0 && visibleSelected < visible.length;
  }

  const toolbar = workspace.querySelector<HTMLElement>("[data-linear-selection-toolbar]");
  if (toolbar) toolbar.hidden = state.selected.size === 0;
  const count = workspace.querySelector<HTMLElement>("[data-linear-selection-count]");
  if (count) count.textContent = String(state.selected.size);
}

function linearSyncHighlight(workspace: HTMLElement): void {
  const state = linearState(workspace);
  for (const node of workspace.querySelectorAll<HTMLElement>(
    "[data-linear-list-row], [data-linear-board-card]",
  )) {
    node.tabIndex = -1;
    if (node.dataset.linearIssue === state.highlighted) {
      node.dataset.linearHighlighted = "true";
      node.setAttribute("aria-current", "true");
    } else {
      delete node.dataset.linearHighlighted;
      node.removeAttribute("aria-current");
    }
  }
}

function linearFocusHighlighted(workspace: HTMLElement): void {
  const state = linearState(workspace);
  if (!state.highlighted) return;
  const selector = state.view === "board" ? "[data-linear-board-card]" : "[data-linear-list-row]";
  const target = [...workspace.querySelectorAll<HTMLElement>(selector)].find(
    (node) => node.dataset.linearIssue === state.highlighted && !node.hidden,
  );
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  const issue = linearIssueById(workspace, state.highlighted);
  if (issue) linearAnnounce(workspace, `${issue.id}, ${issue.title}.`);
}

function linearSyncFilters(workspace: HTMLElement): void {
  const state = linearState(workspace);
  linearSyncFilterControls(workspace);
  const visible = linearVisibleIssues(workspace);
  const visibleIds = new Set(visible.map((issue) => issue.id));

  for (const row of workspace.querySelectorAll<HTMLElement>("[data-linear-list-row]"))
    row.hidden = !visibleIds.has(row.dataset.linearIssue ?? "");
  for (const card of workspace.querySelectorAll<HTMLElement>("[data-linear-board-card]"))
    card.hidden = !visibleIds.has(card.dataset.linearIssue ?? "");

  const list = workspace.querySelector<HTMLElement>("[data-linear-list-view]");
  const board = workspace.querySelector<HTMLElement>("[data-linear-board-view]");
  const empty = workspace.querySelector<HTMLElement>("[data-linear-empty]");
  const loading = workspace.querySelector<HTMLElement>("[data-linear-loading]");
  const error = workspace.querySelector<HTMLElement>("[data-linear-error]");
  const ready = state.dataState === "ready";
  workspace.setAttribute("aria-busy", String(state.dataState === "loading"));
  if (list) list.hidden = !ready || state.view !== "list" || visible.length === 0;
  if (board) board.hidden = !ready || state.view !== "board" || visible.length === 0;
  if (empty) empty.hidden = !ready || visible.length > 0;
  if (loading) loading.hidden = state.dataState !== "loading";
  if (error) error.hidden = state.dataState !== "error";

  for (const output of workspace.querySelectorAll<HTMLOutputElement>("[data-linear-visible-count]"))
    output.textContent = `${visible.length} ${visible.length === 1 ? "issue" : "issues"}`;
  for (const badge of workspace.querySelectorAll<HTMLElement>("[data-linear-group-count]"))
    badge.textContent = String(visible.length);

  for (const column of workspace.querySelectorAll<HTMLElement>("[data-linear-board-column]")) {
    const count = [...column.querySelectorAll<HTMLElement>("[data-linear-board-card]")].filter(
      (card) => !card.hidden,
    ).length;
    const badge = column.querySelector<HTMLElement>("[data-linear-board-count]");
    if (badge) badge.textContent = String(count);
  }

  if (state.highlighted && !visibleIds.has(state.highlighted)) state.highlighted = null;
  linearSyncHighlight(workspace);
  linearSyncSelection(workspace);
}

function syncLinearWorkspaces(): void {
  for (const workspace of document.querySelectorAll<HTMLElement>(
    "[data-linear-workspace]:not([data-linear-initialized])",
  )) {
    workspace.dataset.linearInitialized = "true";
    linearSyncFilters(workspace);
  }
}

function linearToast(workspace: HTMLElement, message: string, tone = "positive"): void {
  const stack = workspace.querySelector<HTMLElement>("[data-linear-toasts]");
  if (!stack) return;
  const toast = document.createElement("ui-toast") as HTMLElement & {
    open?: boolean;
    duration?: number;
  };
  toast.textContent = message;
  toast.setAttribute("tone", tone);
  toast.duration = 2600;
  toast.open = true;
  stack.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function linearOpenIssue(workspace: HTMLElement, id: string): void {
  const issue = linearIssueById(workspace, id);
  if (!issue) return;
  const state = linearState(workspace);
  state.currentIssue = id;
  state.highlighted = id;
  workspace.dataset.inspectorOpen = "true";
  const inspector = workspace.querySelector<HTMLElement>("[data-linear-inspector]");
  if (inspector) inspector.hidden = false;
  const key = workspace.querySelector<HTMLElement>("[data-linear-inspector-key]");
  const title = workspace.querySelector<HTMLElement>("[data-linear-inspector-title]");
  const badge = workspace.querySelector<HTMLElement>("[data-linear-inspector-status]");
  if (key) key.textContent = issue.id;
  if (title) title.textContent = issue.title;
  if (badge) {
    const status = linearStatus[issue.status as keyof typeof linearStatus] ?? linearStatus.backlog;
    badge.textContent = status.label;
    if (status.tone) badge.setAttribute("tone", status.tone);
    else badge.removeAttribute("tone");
  }
  const statusSelect = workspace.querySelector<MashValueElement>("[data-linear-detail-status]");
  const prioritySelect = workspace.querySelector<MashValueElement>("[data-linear-detail-priority]");
  const assigneeSelect = workspace.querySelector<MashValueElement>("[data-linear-detail-assignee]");
  if (statusSelect) statusSelect.value = issue.status;
  if (prioritySelect) prioritySelect.value = issue.priority;
  if (assigneeSelect) assigneeSelect.value = issue.assignee;
  linearSyncHighlight(workspace);
}

function linearCloseInspector(workspace: HTMLElement): void {
  const state = linearState(workspace);
  state.currentIssue = null;
  workspace.dataset.inspectorOpen = "false";
  const inspector = workspace.querySelector<HTMLElement>("[data-linear-inspector]");
  if (inspector) inspector.hidden = true;
}

function linearBoardColumn(status: string): string {
  if (status === "done") return "done";
  if (status === "progress" || status === "review") return "progress";
  return "planned";
}

function linearUpdateStatus(workspace: HTMLElement, id: string, nextStatus: string): void {
  const status = linearStatus[nextStatus as keyof typeof linearStatus];
  if (!status) return;
  for (const node of linearIssueNodes(workspace, id)) {
    if (!node.matches("[data-linear-list-row], [data-linear-board-card]")) continue;
    node.dataset.status = nextStatus;
    if (node.matches("[data-linear-list-row]")) {
      const badge = node.querySelector<HTMLElement>('ui-table-cell[column-index="4"] ui-badge');
      if (badge) {
        badge.textContent = status.label;
        if (status.tone) badge.setAttribute("tone", status.tone);
        else badge.removeAttribute("tone");
      }
    } else {
      const column = workspace.querySelector<HTMLElement>(
        `[data-linear-board-column="${linearBoardColumn(nextStatus)}"] .example-linear-card-list`,
      );
      if (column && node.parentElement !== column) column.append(node);
    }
  }
}

function linearUpdatePriority(workspace: HTMLElement, id: string, nextPriority: string): void {
  const priority = linearPriority[nextPriority as keyof typeof linearPriority];
  if (!priority) return;
  for (const node of linearIssueNodes(workspace, id)) {
    if (!node.matches("[data-linear-list-row], [data-linear-board-card]")) continue;
    node.dataset.priority = nextPriority;
    const label = node.querySelector<HTMLElement>(".example-linear-priority");
    if (label) {
      label.dataset.priority = nextPriority;
      label.textContent = `${priority.symbol} ${priority.label}`;
    }
  }
}

function linearUpdateAssignee(workspace: HTMLElement, id: string, nextAssignee: string): void {
  const assignee = linearAssignee[nextAssignee as keyof typeof linearAssignee];
  if (!assignee) return;
  for (const node of linearIssueNodes(workspace, id)) {
    if (!node.matches("[data-linear-list-row], [data-linear-board-card]")) continue;
    node.dataset.assignee = nextAssignee;
    node.dataset.initials = assignee.initials;
    const avatar = node.querySelector<HTMLElement>("ui-avatar");
    if (avatar) avatar.textContent = assignee.initials;
    const rowLabel = node.querySelector<HTMLElement>(".example-linear-assignee > span");
    if (rowLabel) rowLabel.textContent = assignee.label;
  }
}

function linearActionTargets(workspace: HTMLElement): string[] {
  const state = linearState(workspace);
  if (state.selected.size > 0) return [...state.selected];
  if (state.currentIssue) return [state.currentIssue];
  if (state.highlighted) return [state.highlighted];
  return [];
}

function linearRunCommand(workspace: HTMLElement, command: string): void {
  const targets = linearActionTargets(workspace);
  if (targets.length === 0) {
    linearToast(workspace, "Select or open an issue first", "warning");
    return;
  }
  if (command === "status-progress" || command === "status-done") {
    const status = command === "status-done" ? "done" : "progress";
    for (const id of targets) linearUpdateStatus(workspace, id, status);
    linearToast(
      workspace,
      `${targets.length} ${targets.length === 1 ? "issue" : "issues"} moved to ${linearStatus[status].label}`,
    );
  } else if (command === "priority-high") {
    for (const id of targets) linearUpdatePriority(workspace, id, "high");
    linearToast(
      workspace,
      `High priority applied to ${targets.length} ${targets.length === 1 ? "issue" : "issues"}`,
    );
  } else if (command === "assign-maya") {
    for (const id of targets) linearUpdateAssignee(workspace, id, "maya");
    linearToast(
      workspace,
      `${targets.length} ${targets.length === 1 ? "issue" : "issues"} assigned to Maya`,
    );
  } else if (command === "copy-link") {
    const id = targets[0]!;
    void navigator.clipboard?.writeText(`https://linear.example/axiomatic/issue/${id}`);
    linearToast(workspace, `${id} link copied`);
  }
  const state = linearState(workspace);
  if (state.currentIssue) linearOpenIssue(workspace, state.currentIssue);
  linearSyncFilters(workspace);
  const commandDialog = workspace.querySelector<MashOverlayElement>("[data-linear-command-dialog]");
  commandDialog?.dismiss?.();
}

function linearEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function linearCreateIssue(workspace: HTMLElement, action: HTMLElement): void {
  const dialog = action.closest<MashOverlayElement>("[data-linear-create-dialog]");
  const titleInput = dialog?.querySelector<MashValueElement>("[data-linear-create-title]");
  const title = titleInput?.value?.trim() ?? "";
  if (!dialog || !title) {
    titleInput?.focus();
    linearToast(workspace, "Give the issue a title", "warning");
    return;
  }
  const statusSelect = dialog.querySelector<MashValueElement>("[data-linear-create-status]");
  const status = statusSelect?.value || "backlog";
  const state = linearState(workspace);
  const id = `MAS-${state.nextIssueNumber++}`;
  const escapedTitle = linearEscape(title);
  const statusMeta = linearStatus[status as keyof typeof linearStatus] ?? linearStatus.backlog;
  const tone = statusMeta.tone ? ` tone="${statusMeta.tone}"` : "";
  const table = workspace.querySelector<HTMLElement>(".example-linear-table");
  const body = table?.querySelector<HTMLElement>("ui-table-body");
  const rowIndex = workspace.querySelectorAll("[data-linear-list-row]").length + 2;
  body?.insertAdjacentHTML(
    "beforeend",
    `<ui-table-row row-index="${rowIndex}" data-linear-list-row data-linear-issue="${id}" data-title="${escapedTitle}" data-area="Product" data-status="${status}" data-priority="medium" data-assignee="maya" data-initials="MC">
      <ui-table-cell column-index="1"><ui-checkbox data-linear-select data-linear-issue="${id}"><span class="sr-only">Select ${id}</span></ui-checkbox></ui-table-cell>
      <ui-table-cell column-index="2"><span class="example-linear-key">${id}</span></ui-table-cell>
      <ui-table-cell column-index="3"><span class="example-linear-issue"><ui-link href="#${id.toLocaleLowerCase()}" data-linear-open-issue="${id}">${escapedTitle}</ui-link><span>Product</span></span></ui-table-cell>
      <ui-table-cell column-index="4"><ui-badge size="small"${tone}>${statusMeta.label}</ui-badge></ui-table-cell>
      <ui-table-cell column-index="5"><span class="example-linear-priority" data-priority="medium"><span aria-hidden="true">→</span> Medium</span></ui-table-cell>
      <ui-table-cell column-index="6"><span class="example-linear-assignee"><ui-avatar size="small">MC</ui-avatar><span>Maya</span></span></ui-table-cell>
    </ui-table-row>`,
  );
  const column = workspace.querySelector<HTMLElement>(
    `[data-linear-board-column="${linearBoardColumn(status)}"] .example-linear-card-list`,
  );
  column?.insertAdjacentHTML(
    "beforeend",
    `<ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card example-linear-board-card" data-catalog-drag-source="kanban-card" data-catalog-label="${escapedTitle}" data-linear-board-card data-linear-issue="${id}" data-title="${escapedTitle}" data-area="Product" data-status="${status}" data-priority="medium" data-assignee="maya" data-initials="MC">
      <ui-toolbar slot="handle" class="example-linear-card-drag-handle" label="Move ${id}"><ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon><span class="example-linear-key">${id}</span><span class="example-linear-priority">→ Medium</span></ui-toolbar>
      <ui-card><div slot="header" class="example-linear-card-heading"><ui-checkbox data-linear-select data-linear-issue="${id}"><span class="sr-only">Select ${id}</span></ui-checkbox><ui-badge size="small">Product</ui-badge></div><ui-link slot="content" href="#${id.toLocaleLowerCase()}" data-linear-open-issue="${id}">${escapedTitle}</ui-link><div slot="footer" class="example-linear-card-footer"><span>New issue</span><ui-avatar size="small">MC</ui-avatar></div></ui-card>
    </ui-draggable>`,
  );
  if (table) table.setAttribute("row-count", String(rowIndex));
  if (titleInput) titleInput.value = "";
  dialog.dismiss?.();
  state.query = "";
  state.filters = defaultLinearWorkspaceSnapshot(state.view).filters;
  state.preset = "all";
  linearSyncFilters(workspace);
  linearPersistState(workspace);
  linearOpenIssue(workspace, id);
  linearToast(workspace, `${id} created`);
}

document.addEventListener("mash-command", (event) => {
  const workspace = linearWorkspaceFromEvent(event);
  if (!workspace) return;
  const detail = (event as CustomEvent<CatalogGestureCommandDetail>).detail;
  if (detail.command !== "workspace.filters" || detail.phase !== "ended") return;
  linearSetQueryPanel(workspace, true);
});

document.addEventListener("ui-combobox-input", (event) => {
  const combobox = event.target;
  if (!(combobox instanceof HTMLElement) || !combobox.matches("[data-catalog-combobox-demo]"))
    return;
  const detail = (event as CustomEvent<{ value: string }>).detail;
  syncComboboxDemo(combobox as CatalogCombobox);
  recordComboboxEvent(combobox as CatalogCombobox, `input: ${detail.value.trim() || "empty"}`);
});

document.addEventListener("ui-combobox-change", (event) => {
  const combobox = event.target;
  if (!(combobox instanceof HTMLElement) || !combobox.matches("[data-catalog-combobox-demo]"))
    return;
  const detail = (event as CustomEvent<{ value: string; values: string[] }>).detail;
  syncComboboxDemo(combobox as CatalogCombobox);
  recordComboboxEvent(
    combobox as CatalogCombobox,
    `change: ${detail.values.filter(Boolean).join(", ") || "empty"}`,
  );
});

document.addEventListener("ui-combobox-confirm", (event) => {
  const combobox = event.target;
  if (!(combobox instanceof HTMLElement) || !combobox.matches("[data-catalog-combobox-demo]"))
    return;
  const detail = (event as CustomEvent<{ value: string; values: string[] }>).detail;
  recordComboboxEvent(
    combobox as CatalogCombobox,
    `confirm: ${detail.values.filter(Boolean).join(", ") || "empty"}`,
  );
});

document.addEventListener("ui-combobox-open-change", (event) => {
  const combobox = event.target;
  if (!(combobox instanceof HTMLElement) || !combobox.matches("[data-catalog-combobox-demo]"))
    return;
  const detail = (event as CustomEvent<{ open: boolean; reason: string }>).detail;
  recordComboboxEvent(combobox as CatalogCombobox, `open: ${detail.open} (${detail.reason})`);
});

document.addEventListener("ui-select-change", (event) => {
  const select = event.target;
  if (!(select instanceof HTMLElement) || !select.matches("[data-catalog-select-demo]")) return;
  const detail = (event as CustomEvent<{ value: string }>).detail;
  recordSelectEvent(select as CatalogSelect, `change: ${detail.value || "empty"}`);
});

document.addEventListener("ui-select-confirm", (event) => {
  const select = event.target;
  if (!(select instanceof HTMLElement) || !select.matches("[data-catalog-select-demo]")) return;
  const detail = (event as CustomEvent<{ value: string }>).detail;
  recordSelectEvent(select as CatalogSelect, `confirm: ${detail.value || "empty"}`);
});

document.addEventListener("ui-select-open-change", (event) => {
  const select = event.target;
  if (!(select instanceof HTMLElement) || !select.matches("[data-catalog-select-demo]")) return;
  const detail = (event as CustomEvent<{ open: boolean; reason: string }>).detail;
  syncSelectOpenToggle(select as CatalogSelect, detail.open);
  recordSelectEvent(select as CatalogSelect, `open: ${detail.open} (${detail.reason})`);
});

document.addEventListener(
  "pointerdown",
  (event) => {
    const action = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          node.matches(
            "[data-catalog-combobox-action], [data-catalog-combobox-add-option], [data-catalog-combobox-value]",
          ),
      );
    const combobox = action ? comboboxForAction(action) : null;
    if (combobox?.open) event.stopImmediatePropagation();
  },
  true,
);

document.addEventListener(
  "pointerdown",
  (event) => {
    const action = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          node.matches("[data-catalog-select-action], [data-catalog-select-value]"),
      );
    const select = action ? selectForAction(action) : null;
    if (select?.open) event.stopImmediatePropagation();
  },
  true,
);

document.addEventListener("click", (event) => {
  const action = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        node.matches(
          "[data-catalog-combobox-action], [data-catalog-combobox-add-option], [data-catalog-combobox-value]",
        ),
    );
  if (!action) return;
  const combobox = comboboxForAction(action);
  if (!combobox) return;
  event.preventDefault();

  const fallback = action.dataset.catalogComboboxAddOption;
  if (fallback !== undefined) {
    addComboboxOption(combobox, fallback);
    return;
  }

  const nextValue = action.dataset.catalogComboboxValue;
  if (nextValue !== undefined) {
    if (!comboboxOptionForValue(combobox, nextValue))
      combobox.append(createComboboxOption(nextValue));
    if (combobox.multiple) combobox.values = [...new Set([...(combobox.values ?? []), nextValue])];
    else {
      combobox.value = nextValue;
    }
    dispatchComboboxChange(combobox);
    if (!combobox.multiple) combobox.dismiss?.("imperative");
    syncComboboxDemo(combobox);
    return;
  }

  switch (action.dataset.catalogComboboxAction) {
    case "show":
      combobox.show?.();
      break;
    case "dismiss":
      combobox.dismiss?.("imperative");
      break;
    case "clear":
      combobox.value = "";
      combobox.values = [];
      dispatchComboboxInput(combobox);
      dispatchComboboxChange(combobox);
      syncComboboxDemo(combobox);
      break;
  }
});

document.addEventListener("click", (event) => {
  const action = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        node.matches("[data-catalog-select-action], [data-catalog-select-value]"),
    );
  if (!action) return;
  const select = selectForAction(action);
  if (!select) return;
  event.preventDefault();

  const nextValue = action.dataset.catalogSelectValue;
  if (nextValue !== undefined) {
    if (!selectOptionForValue(select, nextValue)) return;
    select.value = nextValue;
    dispatchSelectChange(select);
    select.dismiss?.("imperative");
    return;
  }

  switch (action.dataset.catalogSelectAction) {
    case "show":
      select.show?.();
      break;
    case "dismiss":
      select.dismiss?.("imperative");
      break;
    case "clear":
      select.value = "";
      dispatchSelectChange(select);
      select.dismiss?.("clear");
      break;
  }
});

document.addEventListener("input", (event) => {
  const target = event
    .composedPath()
    .find(
      (node): node is MashValueElement =>
        node instanceof HTMLElement &&
        node.matches("[data-linear-search], [data-linear-command-search]"),
    );
  if (!target) return;
  const workspace = linearWorkspaceFromEvent(event);
  if (!workspace) return;
  if (target.matches("[data-linear-command-search]")) {
    const query = (target.value ?? "").trim().toLocaleLowerCase();
    for (const command of workspace.querySelectorAll<HTMLElement>(
      ".example-linear-command-list [data-linear-command]",
    ))
      command.hidden = Boolean(query) && !command.textContent?.toLocaleLowerCase().includes(query);
    return;
  }
  const state = linearState(workspace);
  state.query = target.value ?? "";
  state.preset = "custom";
  linearSyncFilters(workspace);
  linearPersistState(workspace);
});

document.addEventListener("ui-menu-select", (event) => {
  const workspace = linearWorkspaceFromEvent(event);
  const menu = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-linear-view-preset], [data-linear-demo-state]",
  );
  if (!workspace || !menu) return;
  const value = (event as CustomEvent<{ value: string }>).detail.value;
  const state = linearState(workspace);
  if (menu.matches("[data-linear-demo-state]")) {
    if (value !== "ready" && value !== "loading" && value !== "error") return;
    state.dataState = value;
    linearAnnounce(
      workspace,
      value === "loading"
        ? "Issue data is loading."
        : value === "error"
          ? "Issue data could not be refreshed."
          : "Issue data is ready.",
    );
  } else if (menu.matches("[data-linear-view-preset]")) {
    if (value !== "all" && value !== "mine" && value !== "release-risk") return;
    const snapshot = linearPresetSnapshot(value, state.view);
    state.filters = snapshot.filters;
    state.preset = snapshot.preset;
    state.query = snapshot.query;
  }
  linearSyncFilters(workspace);
  if (!menu.matches("[data-linear-demo-state]")) linearPersistState(workspace);
});

document.addEventListener("ui-menu-open-change", (event) => {
  const menu = event.target;
  if (!(menu instanceof HTMLElement) || !menu.matches("[data-catalog-menu-demo]")) return;
  const lab = menu.closest<HTMLElement>("[data-catalog-menu-lab]");
  const detail = (event as CustomEvent<{ open: boolean; reason: string }>).detail;
  const toggle = lab?.querySelector<HTMLElement & { pressed?: boolean }>(
    "[data-catalog-menu-toggle]",
  );
  const output = lab?.querySelector<HTMLOutputElement>("[data-catalog-menu-log]");
  if (toggle) toggle.pressed = detail.open;
  if (output) output.value = `open: ${detail.open} (${detail.reason})`;
});

document.addEventListener("ui-toggle-change", (event) => {
  const toggle = event.target;
  if (!(toggle instanceof HTMLElement) || !toggle.matches("[data-catalog-password-toggle]")) return;
  const group = toggle.closest<HTMLElement>("[data-catalog-password-group]");
  const input = group?.querySelector<HTMLElement & { type: string }>("ui-input");
  if (!input) return;
  const { pressed } = (event as CustomEvent<{ pressed: boolean }>).detail;
  input.type = pressed ? "text" : "password";
  toggle.textContent = pressed ? "Hide" : "Show";
});

document.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLElement) || !input.matches("[data-catalog-input-events]")) return;
  const lab = input.closest<HTMLElement>("[data-catalog-input-lab]");
  const output = lab?.querySelector<HTMLOutputElement>("[data-catalog-input-log]");
  const value = (input as HTMLElement & { value?: string }).value ?? "";
  if (output) output.value = `value: ${value || "empty"}`;
});

document.addEventListener("input", (event) => {
  const control = event.target;
  if (!(control instanceof HTMLElement) || !control.matches("[data-catalog-composer-text]")) return;
  const composer = control.closest<HTMLElement>("[data-catalog-composer]");
  if (composer) syncCatalogComposer(composer);
});

document.addEventListener("submit", (event) => {
  const composer = event.target;
  if (!(composer instanceof HTMLElement) || !composer.matches("[data-catalog-composer]")) return;
  event.preventDefault();
  syncCatalogComposer(composer);
  const control = composer.querySelector<CatalogValueControl>("[data-catalog-composer-text]");
  const status = composer.querySelector<HTMLOutputElement>("[data-catalog-composer-status]");
  const value = control?.value?.trim() ?? "";
  if (!value) return;
  if (status)
    status.value = `Comment queued: ${value.length} character${value.length === 1 ? "" : "s"}.`;
});

document.addEventListener("ui-input-enter", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLElement) || !input.matches("[data-catalog-input-events]")) return;
  const lab = input.closest<HTMLElement>("[data-catalog-input-lab]");
  const output = lab?.querySelector<HTMLOutputElement>("[data-catalog-input-log]");
  const detail = (event as CustomEvent<{ value: string; secondary: boolean }>).detail;
  if (output)
    output.value = `enter: ${detail.value || "empty"}${detail.secondary ? " secondary" : ""}`;
});

document.addEventListener("ui-input-focus-change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLElement) || !input.matches("[data-catalog-input-events]")) return;
  const lab = input.closest<HTMLElement>("[data-catalog-input-lab]");
  const output = lab?.querySelector<HTMLOutputElement>("[data-catalog-input-log]");
  const detail = (event as CustomEvent<{ focused: boolean }>).detail;
  if (output) output.value = detail.focused ? "focus: editing" : "focus: left";
});

document.addEventListener("click", (event) => {
  const action = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.matches("[data-catalog-input-clear]"),
    );
  if (!action) return;
  const lab = action.closest<HTMLElement>("[data-catalog-input-lab]");
  const input = lab?.querySelector<HTMLElement & { value: string }>("[data-catalog-input-events]");
  if (!input) return;
  input.value = "";
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  input.focus();
});

document.addEventListener("ui-toggle-group-change", (event) => {
  const group = event.target as HTMLElement;
  if (
    !group.matches(
      "[data-linear-view-toggle], [data-linear-filter-mode], [data-linear-query-group-mode]",
    )
  )
    return;
  const workspace = linearWorkspaceFromEvent(event);
  if (!workspace) return;
  const value = (event as CustomEvent<{ values: string[] }>).detail.values[0];
  const state = linearState(workspace);
  if (group.matches("[data-linear-query-group-mode]")) {
    const path = linearParseFilterPath(group.dataset.linearQueryPath);
    if (!path) return;
    state.filters = linearSetFilterGroupCombinator(
      state.filters,
      path,
      value === "or" ? "or" : "and",
    );
    state.preset = "custom";
    linearAnnounce(
      workspace,
      `Filter group now matches ${value === "or" ? "any" : "all"} conditions.`,
    );
  } else if (group.matches("[data-linear-filter-mode]")) {
    state.filters = {
      ...state.filters,
      combinator: value === "or" ? "or" : "and",
    };
    state.preset = "custom";
  } else {
    state.view = value === "board" ? "board" : "list";
  }
  linearSyncFilters(workspace);
  linearPersistState(workspace);
});

document.addEventListener("ui-chip-remove", (event) => {
  const chip = event.target as HTMLElement;
  if (!chip.closest("[data-linear-filter-chips]")) return;
  const workspace = linearWorkspaceFromEvent(event);
  const path = linearParseFilterPath((event as CustomEvent<{ value: string }>).detail.value);
  if (!workspace || !path || path.length === 0) return;
  const state = linearState(workspace);
  state.filters = linearRemoveFilterNode(state.filters, path);
  state.preset = "custom";
  linearSyncFilters(workspace);
  linearPersistState(workspace);
  linearAnnounce(workspace, "Filter condition removed.");
  workspace.querySelector<HTMLElement>("#linear-filter-trigger")?.focus();
});

document.addEventListener("ui-checkbox-change", (event) => {
  const checkbox = event.target as MashCheckboxElement;
  if (!checkbox.matches("[data-linear-select], [data-linear-select-all]")) return;
  const workspace = linearWorkspaceFromEvent(event);
  if (!workspace) return;
  const state = linearState(workspace);
  if (checkbox.matches("[data-linear-select-all]")) {
    for (const issue of linearVisibleIssues(workspace)) {
      if (checkbox.checked) state.selected.add(issue.id);
      else state.selected.delete(issue.id);
    }
  } else {
    const id = checkbox.dataset.linearIssue;
    if (id && checkbox.checked) state.selected.add(id);
    else if (id) state.selected.delete(id);
  }
  linearSyncSelection(workspace);
});

document.addEventListener("ui-select-change", (event) => {
  const select = event.target as HTMLElement;
  if (select.matches("[data-linear-query-field], [data-linear-query-value]")) {
    const workspace = linearWorkspaceFromEvent(event);
    const path = linearParseFilterPath(select.dataset.linearQueryPath);
    if (!workspace || !path) return;
    const state = linearState(workspace);
    const rule = linearFilterNodeAtPath(state.filters, path);
    if (!rule || rule.kind !== "rule") return;
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    if (select.matches("[data-linear-query-field]")) {
      if (value !== "status" && value !== "assignee" && value !== "priority") return;
      state.filters = linearUpdateFilterRule(state.filters, path, {
        field: value,
        value: linearFilterDefaults[value],
      });
      linearAnnounce(workspace, `${linearFilterFieldLabel(value)} condition selected.`);
    } else {
      if (!linearFilterOptions[rule.field].some(([candidate]) => candidate === value)) return;
      state.filters = linearUpdateFilterRule(state.filters, path, { value });
      linearAnnounce(workspace, `${linearFilterRuleLabel(rule.field, value)} applied.`);
    }
    state.preset = "custom";
    linearSyncFilters(workspace);
    linearPersistState(workspace);
    return;
  }
  if (
    !select.matches(
      "[data-linear-detail-status], [data-linear-detail-priority], [data-linear-detail-assignee]",
    )
  )
    return;
  const workspace = linearWorkspaceFromEvent(event);
  if (!workspace) return;
  const state = linearState(workspace);
  if (!state.currentIssue) return;
  const value = (event as CustomEvent<{ value: string }>).detail.value;
  if (select.matches("[data-linear-detail-status]"))
    linearUpdateStatus(workspace, state.currentIssue, value);
  if (select.matches("[data-linear-detail-priority]"))
    linearUpdatePriority(workspace, state.currentIssue, value);
  if (select.matches("[data-linear-detail-assignee]"))
    linearUpdateAssignee(workspace, state.currentIssue, value);
  linearOpenIssue(workspace, state.currentIssue);
  linearSyncFilters(workspace);
  linearToast(workspace, `${state.currentIssue} updated`);
});

document.addEventListener("click", (event) => {
  const action = event
    .composedPath()
    .find(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        node.matches(
          "[data-linear-open-issue], [data-linear-close-inspector], [data-linear-clear-selection], [data-linear-clear-filters], [data-linear-create-action], [data-linear-command], [data-linear-query-toggle], [data-linear-query-add-rule], [data-linear-query-add-group], [data-linear-query-remove], [data-linear-query-reset], [data-linear-query-done], [data-linear-retry]",
        ),
    );
  if (!action) return;
  const workspace = linearWorkspaceFromEvent(event);
  if (!workspace) return;
  if (action.matches("[data-linear-query-toggle]")) {
    const panel = workspace.querySelector<HTMLElement>("[data-linear-query-panel]");
    linearSetQueryPanel(workspace, panel?.dataset.linearQueryOpen !== "true");
    return;
  }
  if (action.matches("[data-linear-query-add-rule], [data-linear-query-add-group]")) {
    const path = linearParseFilterPath(action.dataset.linearQueryPath);
    if (!path) return;
    const state = linearState(workspace);
    const node = action.matches("[data-linear-query-add-group]")
      ? linearGroup("and", [linearRule("status", linearFilterDefaults.status)])
      : linearRule("status", linearFilterDefaults.status);
    state.filters = linearAppendFilterNode(state.filters, path, node);
    state.preset = "custom";
    linearSyncFilters(workspace);
    linearPersistState(workspace);
    linearAnnounce(
      workspace,
      action.matches("[data-linear-query-add-group]")
        ? "Nested filter group added."
        : "Filter condition added.",
    );
    window.setTimeout(() => {
      const controls = workspace.querySelectorAll<HTMLElement>("[data-linear-query-field]");
      controls.item(controls.length - 1)?.focus({ preventScroll: true });
    }, 0);
    return;
  }
  if (action.matches("[data-linear-query-remove]")) {
    const path = linearParseFilterPath(action.dataset.linearQueryPath);
    if (!path || path.length === 0) return;
    const state = linearState(workspace);
    state.filters = linearRemoveFilterNode(state.filters, path);
    state.preset = "custom";
    linearSyncFilters(workspace);
    linearPersistState(workspace);
    linearAnnounce(workspace, "Filter condition removed.");
    workspace.querySelector<HTMLElement>("[data-linear-query-add-rule]")?.focus();
    return;
  }
  if (action.matches("[data-linear-query-reset]")) {
    const state = linearState(workspace);
    const preset = state.preset === "custom" ? "all" : state.preset;
    const snapshot = linearPresetSnapshot(preset, state.view);
    state.filters = snapshot.filters;
    state.query = snapshot.query;
    state.preset = snapshot.preset;
    linearSyncFilters(workspace);
    linearPersistState(workspace);
    linearAnnounce(workspace, `${linearPresetLabel(state.preset)} restored.`);
    return;
  }
  if (action.matches("[data-linear-query-done]")) {
    linearSetQueryPanel(workspace, false);
    return;
  }
  if (action.matches("[data-linear-retry]")) {
    const state = linearState(workspace);
    state.dataState = "loading";
    linearSyncFilters(workspace);
    linearAnnounce(workspace, "Retrying issue data refresh.");
    window.setTimeout(() => {
      if (!workspace.isConnected) return;
      state.dataState = "ready";
      linearSyncFilters(workspace);
      linearAnnounce(workspace, "Issue data refreshed.");
      linearToast(workspace, "Issue data refreshed");
    }, 650);
    return;
  }
  if (action.matches("[data-linear-open-issue]")) {
    event.preventDefault();
    const id = action.dataset.linearOpenIssue;
    if (id) linearOpenIssue(workspace, id);
    return;
  }
  if (action.matches("[data-linear-close-inspector]")) {
    linearCloseInspector(workspace);
    return;
  }
  if (action.matches("[data-linear-clear-selection]")) {
    linearState(workspace).selected.clear();
    linearSyncSelection(workspace);
    return;
  }
  if (action.matches("[data-linear-clear-filters]")) {
    const state = linearState(workspace);
    state.query = "";
    state.filters = defaultLinearWorkspaceSnapshot(state.view).filters;
    state.preset = "all";
    linearSyncFilters(workspace);
    linearPersistState(workspace);
    return;
  }
  if (action.matches("[data-linear-create-action]")) {
    linearCreateIssue(workspace, action);
    return;
  }
  const command = action.dataset.linearCommand;
  if (command) linearRunCommand(workspace, command);
});

document.addEventListener("catalog-kanban-move", (event) => {
  const { source, column, columnLabel } = (event as CustomEvent<CatalogKanbanMoveDetail>).detail;
  const workspace = source.closest<HTMLElement>("[data-linear-workspace]");
  const issueId = source.dataset.linearIssue;
  const linearColumn = column.dataset.linearBoardColumn;
  if (!workspace || !issueId || !linearColumn) return;
  const nextStatus =
    linearColumn === "done" ? "done" : linearColumn === "progress" ? "progress" : "todo";
  linearUpdateStatus(workspace, issueId, nextStatus);
  linearSyncFilters(workspace);
  linearToast(workspace, `${issueId} moved to ${columnLabel}`);
});

document.addEventListener("keydown", (event) => {
  const workspace = document.querySelector<HTMLElement>("[data-linear-workspace]");
  if (!workspace) return;
  const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k";
  if (commandShortcut) {
    event.preventDefault();
    workspace.querySelector<MashOverlayElement>("[data-linear-command-dialog]")?.show?.();
    window.setTimeout(
      () => workspace.querySelector<HTMLElement>("[data-linear-command-search]")?.focus(),
      0,
    );
    return;
  }
  if (event.defaultPrevented) return;
  if (event.key === "Escape") {
    const queryPanel = workspace.querySelector<HTMLElement>("[data-linear-query-panel]");
    if (queryPanel?.dataset.linearQueryOpen === "true") {
      event.preventDefault();
      linearSetQueryPanel(workspace, false);
      return;
    }
  }
  const editing = event
    .composedPath()
    .some(
      (node) =>
        node instanceof HTMLElement &&
        node.matches(
          "input, textarea, select, [contenteditable], ui-input, ui-textarea, ui-select",
        ),
    );
  if (editing) return;
  const key = event.key.toLocaleLowerCase();
  if (key === "c") {
    event.preventDefault();
    workspace.querySelector<MashOverlayElement>("[data-linear-create-dialog]")?.show?.();
    return;
  }
  const state = linearState(workspace);
  if (key === "escape") {
    if (state.selected.size > 0) {
      state.selected.clear();
      linearSyncSelection(workspace);
    } else if (state.currentIssue) linearCloseInspector(workspace);
    return;
  }
  if (key !== "j" && key !== "k" && key !== "x" && key !== "enter") return;
  const issues = linearVisibleIssues(workspace);
  if (issues.length === 0) return;
  if (key === "j" || key === "k") {
    event.preventDefault();
    const index = Math.max(
      0,
      issues.findIndex((issue) => issue.id === state.highlighted),
    );
    const next =
      state.highlighted === null
        ? key === "j"
          ? 0
          : issues.length - 1
        : (index + (key === "j" ? 1 : -1) + issues.length) % issues.length;
    state.highlighted = issues[next]!.id;
    linearSyncHighlight(workspace);
    linearFocusHighlighted(workspace);
    return;
  }
  if (!state.highlighted) state.highlighted = issues[0]!.id;
  if (key === "x") {
    event.preventDefault();
    if (state.selected.has(state.highlighted)) state.selected.delete(state.highlighted);
    else state.selected.add(state.highlighted);
    linearSyncSelection(workspace);
  } else if (key === "enter") {
    event.preventDefault();
    linearOpenIssue(workspace, state.highlighted);
  }
});

interface CatalogDataTableSelectionDetail {
  columnIndex: number | null;
  extended: boolean;
  key: string;
  range: {
    anchor: { columnIndex: number | null; key: string; rowIndex: number | null };
    focus: { columnIndex: number | null; key: string; rowIndex: number | null };
  };
  reason: "keyboard" | "pointer" | "imperative";
  rowIndex: number | null;
  selection: "none" | "row" | "column" | "cell";
}

type CatalogDataTable = HTMLElement & {
  cancelEdit?: () => boolean;
  editing: string;
  focusCell?: (rowIndex: number, columnIndex: number) => boolean;
  selected: string;
};

interface CatalogDataTableEditDetail {
  columnIndex: number;
  form?: HTMLFormElement | null;
  key: string;
  reason: string;
  rowIndex: number;
}

function dataTableCoordinateLabel(
  dataTable: HTMLElement,
  detail: CatalogDataTableSelectionDetail,
): string {
  const workbook = dataTable.dataset.catalogWorkbook !== undefined;
  const label = (rowIndex: number | null, columnIndex: number | null): string => {
    if (detail.selection === "row") {
      const row = workbook && rowIndex !== null ? rowIndex - 1 : rowIndex;
      return `Row ${row ?? "—"}`;
    }
    if (detail.selection === "column") {
      const column = workbook && columnIndex !== null ? columnIndex - 1 : columnIndex;
      return workbook && column !== null
        ? `Column ${String.fromCharCode(64 + Math.max(1, column))}`
        : `Column ${column ?? "—"}`;
    }
    if (rowIndex === null || columnIndex === null) return "No cell";
    const column = workbook ? columnIndex - 1 : columnIndex;
    const row = rowIndex - 1;
    return `${String.fromCharCode(64 + Math.max(1, column))}${Math.max(1, row)}`;
  };
  const focus = label(detail.rowIndex, detail.columnIndex);
  if (!detail.extended || detail.range.anchor.key === detail.range.focus.key) return focus;
  return `${label(detail.range.anchor.rowIndex, detail.range.anchor.columnIndex)}–${focus}`;
}

function syncCatalogDataTableSelection(
  dataTable: CatalogDataTable,
  detail: CatalogDataTableSelectionDetail,
): void {
  const coordinate = dataTableCoordinateLabel(dataTable, detail);
  const coordinateOutput = dataTable.querySelector<HTMLOutputElement>(
    "[data-catalog-data-table-coordinate]",
  );
  if (coordinateOutput) coordinateOutput.value = coordinate;
  const selectionOutput = dataTable.querySelector<HTMLOutputElement>(
    "[data-catalog-data-table-selection]",
  );
  if (selectionOutput) selectionOutput.value = `${coordinate} selected`;
  if (detail.rowIndex === null || detail.columnIndex === null) return;
  const cell = dataTable.querySelector<HTMLElement>(
    `ui-table-row[row-index="${detail.rowIndex}"] ui-table-cell[column-index="${detail.columnIndex}"]`,
  );
  const formula = dataTable.querySelector<MashValueElement>("[data-catalog-data-table-formula]");
  if (formula) formula.value = cell?.dataset.formula ?? cell?.textContent?.trim() ?? "";
}

document.addEventListener("ui-data-table-select", (event) => {
  const dataTable = event.target as CatalogDataTable;
  if (!dataTable.matches("[data-catalog-data-table]")) return;
  const detail = (event as CustomEvent<CatalogDataTableSelectionDetail>).detail;
  if (dataTable.editing && dataTable.editing !== detail.key) {
    dataTable.cancelEdit?.();
    dataTable.editing = "";
  }
  dataTable.selected = detail.key;
  syncCatalogDataTableSelection(dataTable, detail);
});

document.addEventListener("ui-data-table-activate", (event) => {
  const dataTable = event.target as HTMLElement;
  if (!dataTable.matches("[data-catalog-data-table]")) return;
  const detail = (event as CustomEvent<CatalogDataTableSelectionDetail>).detail;
  if (detail.rowIndex === null || detail.columnIndex === null) return;
  const cell = dataTable.querySelector<HTMLElement>(
    `ui-table-row[row-index="${detail.rowIndex}"] ui-table-cell[column-index="${detail.columnIndex}"]`,
  );
  const editor = cell?.querySelector<MashOverlayElement>("ui-popover");
  editor?.show?.();
});

document.addEventListener("ui-data-table-edit-request", (event) => {
  const dataTable = event.target as CatalogDataTable;
  if (!dataTable.matches("[data-catalog-data-table]")) return;
  const editor = dataTable.querySelector<HTMLFormElement>("[data-catalog-data-table-editor]");
  if (!editor) return;
  const detail = (event as CustomEvent<CatalogDataTableEditDetail>).detail;
  const cell = dataTable.querySelector<HTMLElement>(
    `ui-table-row[row-index="${detail.rowIndex}"] ui-table-cell[column-index="${detail.columnIndex}"]`,
  );
  if (!cell) return;
  dataTable.editing = detail.key;
  dataTable.selected = detail.key;
  const selectionDetail = {
    ...detail,
    extended: false,
    range: { anchor: detail, focus: detail },
    selection: "cell" as const,
  } as CatalogDataTableSelectionDetail;
  syncCatalogDataTableSelection(dataTable, selectionDetail);
  const coordinate = editor.querySelector<HTMLElement>(
    "[data-catalog-data-table-editor-coordinate]",
  );
  if (coordinate)
    coordinate.textContent = `Editing ${dataTableCoordinateLabel(dataTable, selectionDetail)}`;
  const value = editor.querySelector<MashNumericValueElement>(
    "[data-catalog-data-table-editor-value]",
  );
  const formatter = cell.querySelector<HTMLElement>("ui-intl-formatter");
  if (value) {
    const nextValue = Number(
      formatter?.getAttribute("value") ?? cell.dataset.formula?.replace(/^=/, "") ?? 0,
    );
    value.value = Number.isFinite(nextValue) ? nextValue : 0;
  }
  const formula = editor.querySelector<MashValueElement>(
    "[data-catalog-data-table-editor-formula]",
  );
  if (formula) formula.value = cell.dataset.formula ?? "";
  window.setTimeout(() => value?.focus(), 0);
});

document.addEventListener("ui-data-table-edit-commit", (event) => {
  const dataTable = event.target as CatalogDataTable;
  if (!dataTable.matches("[data-catalog-data-table]")) return;
  const detail = (event as CustomEvent<CatalogDataTableEditDetail>).detail;
  const editor =
    detail.form ?? dataTable.querySelector<HTMLFormElement>("[data-catalog-data-table-editor]");
  const numericValue = editor?.querySelector<MashNumericValueElement>(
    "[data-catalog-data-table-editor-value]",
  )?.value;
  const value = numericValue === undefined ? undefined : String(numericValue);
  const formula = editor?.querySelector<MashValueElement>(
    "[data-catalog-data-table-editor-formula]",
  )?.value;
  const cell = dataTable.querySelector<HTMLElement>(
    `ui-table-row[row-index="${detail.rowIndex}"] ui-table-cell[column-index="${detail.columnIndex}"]`,
  );
  if (cell && value !== undefined) {
    cell.dataset.formula = formula?.trim() || `=${value}`;
    const formatter = cell.querySelector<HTMLElement>("ui-intl-formatter");
    if (formatter) formatter.setAttribute("value", value);
    else cell.textContent = value;
  }
  dataTable.editing = "";
  const output = dataTable.querySelector<HTMLOutputElement>("[data-catalog-data-table-selection]");
  if (output) output.value = `${detail.key} committed`;
  dataTable.focusCell?.(detail.rowIndex, detail.columnIndex);
});

document.addEventListener("ui-data-table-edit-cancel", (event) => {
  const dataTable = event.target as CatalogDataTable;
  if (!dataTable.matches("[data-catalog-data-table]")) return;
  const detail = (event as CustomEvent<CatalogDataTableEditDetail>).detail;
  dataTable.editing = "";
  const output = dataTable.querySelector<HTMLOutputElement>("[data-catalog-data-table-selection]");
  if (output) output.value = `${detail.key} edit cancelled`;
  dataTable.focusCell?.(detail.rowIndex, detail.columnIndex);
});

document.addEventListener("ui-tree-select", (event) => {
  const explorer = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-catalog-data-explorer]",
  );
  if (!explorer) return;
  const value = (event as CustomEvent<{ value: string }>).detail.value;
  const items = [...explorer.querySelectorAll<HTMLElement>("ui-tree-item")];
  for (const item of items) item.toggleAttribute("selected", item.getAttribute("value") === value);
  const selected = items.find((item) => item.getAttribute("value") === value);
  const label =
    selected?.querySelector<HTMLElement>(":scope > [slot='label']")?.textContent?.trim() ?? value;
  const workspace = explorer.closest("ui-resizable");
  const title = workspace?.querySelector<HTMLElement>("[data-catalog-data-explorer-title]");
  if (title) title.textContent = label;
});

document.documentElement.dataset.stageReady = "true";
