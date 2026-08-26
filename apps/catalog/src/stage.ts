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
} from "@mash/ui";

// Tells the parent the frame is ready without it having to poll for the
// registry being populated.
document.documentElement.dataset.mashCatalogue = "mash";

const dragControllers = new Map<HTMLElement, DragController>();
let activeCatalogDragSource: HTMLElement | null = null;
const canceledCatalogDrags = new WeakSet<HTMLElement>();

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

new MutationObserver(syncDragSources).observe(document.body, { childList: true, subtree: true });
queueMicrotask(syncDragSources);

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
    item.textContent?.replace("⠿", "").trim() ??
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
  const icon = document.createElement("span");
  icon.slot = "icon";
  icon.className = "example-tree-glyph";
  icon.dataset.kind = "file";
  icon.ariaHidden = "true";
  const handle = document.createElement("ui-button");
  handle.slot = "actions";
  handle.setAttribute("variant", "quiet");
  handle.setAttribute("size", "small");
  handle.setAttribute("aria-label", `Move ${labelText} to the tab bar`);
  handle.dataset.catalogDragHandle = "";
  handle.textContent = "⠿";
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
  const handle = document.createElement("span");
  handle.className = "example-drag-grip";
  handle.dataset.catalogDragHandle = "";
  handle.setAttribute("aria-label", `Move ${labelText} tab`);
  handle.textContent = "⠿";
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

// Scroll-to is intentionally a catalogue composition rather than a new
// component. The button names the intent; the example owns which scroll area
// and edge that intent targets.
document.addEventListener("click", (event) => {
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

type MashValueElement = HTMLElement & { value?: string };
type MashCheckboxElement = HTMLElement & { checked?: boolean; indeterminate?: boolean };
type MashOverlayElement = HTMLElement & { open?: boolean; show?: () => void; dismiss?: () => void };

interface LinearIssue {
  id: string;
  title: string;
  area: string;
  status: string;
  priority: string;
  assignee: string;
  initials: string;
}

interface LinearWorkspaceState {
  query: string;
  status: string;
  assignee: string;
  view: "list" | "board";
  selected: Set<string>;
  highlighted: string | null;
  currentIssue: string | null;
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

function linearState(workspace: HTMLElement): LinearWorkspaceState {
  let state = linearStates.get(workspace);
  if (state) return state;
  state = {
    query: "",
    status: "all",
    assignee: "all",
    view: workspace.dataset.linearView === "board" ? "board" : "list",
    selected: new Set<string>(),
    highlighted: null,
    currentIssue: null,
    nextIssueNumber: 151,
  };
  linearStates.set(workspace, state);
  return state;
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
  return (
    (!query || searchable.includes(query)) &&
    (state.status === "all" || issue.status === state.status) &&
    (state.assignee === "all" || issue.assignee === state.assignee)
  );
}

function linearVisibleIssues(workspace: HTMLElement): LinearIssue[] {
  const state = linearState(workspace);
  return [...workspace.querySelectorAll<HTMLElement>("[data-linear-list-row]")]
    .map((row) => linearIssueFromElement(row))
    .filter((issue): issue is LinearIssue => issue !== null && linearMatches(issue, state));
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
    if (node.dataset.linearIssue === state.highlighted) node.dataset.linearHighlighted = "true";
    else delete node.dataset.linearHighlighted;
  }
}

function linearSyncFilters(workspace: HTMLElement): void {
  const state = linearState(workspace);
  const visible = linearVisibleIssues(workspace);
  const visibleIds = new Set(visible.map((issue) => issue.id));

  for (const row of workspace.querySelectorAll<HTMLElement>("[data-linear-list-row]"))
    row.hidden = !visibleIds.has(row.dataset.linearIssue ?? "");
  for (const card of workspace.querySelectorAll<HTMLElement>("[data-linear-board-card]"))
    card.hidden = !visibleIds.has(card.dataset.linearIssue ?? "");

  const list = workspace.querySelector<HTMLElement>("[data-linear-list-view]");
  const board = workspace.querySelector<HTMLElement>("[data-linear-board-view]");
  const empty = workspace.querySelector<HTMLElement>("[data-linear-empty]");
  if (list) list.hidden = state.view !== "list" || visible.length === 0;
  if (board) board.hidden = state.view !== "board" || visible.length === 0;
  if (empty) empty.hidden = visible.length > 0;

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
      <ui-toolbar slot="handle" class="example-linear-card-drag-handle" label="Move ${id}"><span class="example-drag-grip" aria-hidden="true">⠿</span><span class="example-linear-key">${id}</span><span class="example-linear-priority">→ Medium</span></ui-toolbar>
      <ui-card><div slot="header" class="example-linear-card-heading"><ui-checkbox data-linear-select data-linear-issue="${id}"><span class="sr-only">Select ${id}</span></ui-checkbox><ui-badge size="small">Product</ui-badge></div><ui-link slot="content" href="#${id.toLocaleLowerCase()}" data-linear-open-issue="${id}">${escapedTitle}</ui-link><div slot="footer" class="example-linear-card-footer"><span>New issue</span><ui-avatar size="small">MC</ui-avatar></div></ui-card>
    </ui-draggable>`,
  );
  if (table) table.setAttribute("row-count", String(rowIndex));
  if (titleInput) titleInput.value = "";
  dialog.dismiss?.();
  state.query = "";
  state.status = "all";
  state.assignee = "all";
  for (const search of workspace.querySelectorAll<MashValueElement>("[data-linear-search]"))
    search.value = "";
  linearSyncFilters(workspace);
  linearOpenIssue(workspace, id);
  linearToast(workspace, `${id} created`);
}

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
  for (const search of workspace.querySelectorAll<MashValueElement>("[data-linear-search]"))
    if (search !== target) search.value = state.query;
  linearSyncFilters(workspace);
});

document.addEventListener("ui-menu-select", (event) => {
  const workspace = linearWorkspaceFromEvent(event);
  const menu = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-linear-filter]");
  if (!workspace || !menu) return;
  const value = (event as CustomEvent<{ value: string }>).detail.value;
  const state = linearState(workspace);
  const kind = menu.dataset.linearFilter;
  if (kind === "status") state.status = value;
  if (kind === "assignee") state.assignee = value;
  const label = menu.querySelector<HTMLElement>("[data-linear-filter-label]");
  if (label) {
    const prefix = kind === "status" ? "Status" : "Assignee";
    const next =
      value === "all"
        ? "All"
        : kind === "status"
          ? (linearStatus[value as keyof typeof linearStatus]?.label ?? value)
          : (linearAssignee[value as keyof typeof linearAssignee]?.label ?? value);
    label.textContent = `${prefix} · ${next}`;
  }
  linearSyncFilters(workspace);
});

document.addEventListener("ui-toggle-group-change", (event) => {
  const group = event.target as HTMLElement;
  if (!group.matches("[data-linear-view-toggle]")) return;
  const workspace = linearWorkspaceFromEvent(event);
  if (!workspace) return;
  const value = (event as CustomEvent<{ values: string[] }>).detail.values[0];
  const state = linearState(workspace);
  state.view = value === "board" ? "board" : "list";
  workspace.dataset.linearView = state.view;
  linearSyncFilters(workspace);
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
          "[data-linear-open-issue], [data-linear-close-inspector], [data-linear-clear-selection], [data-linear-clear-filters], [data-linear-create-action], [data-linear-command]",
        ),
    );
  if (!action) return;
  const workspace = linearWorkspaceFromEvent(event);
  if (!workspace) return;
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
    state.status = "all";
    state.assignee = "all";
    for (const search of workspace.querySelectorAll<MashValueElement>("[data-linear-search]"))
      search.value = "";
    for (const menu of workspace.querySelectorAll<HTMLElement>("[data-linear-filter]")) {
      const label = menu.querySelector<HTMLElement>("[data-linear-filter-label]");
      if (label)
        label.textContent = `${menu.dataset.linearFilter === "status" ? "Status" : "Assignee"} · All`;
    }
    linearSyncFilters(workspace);
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

document.documentElement.dataset.stageReady = "true";
