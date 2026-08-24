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

// Tells the parent the frame is ready without it having to poll for the
// registry being populated.
document.documentElement.dataset.mashCatalogue = "mash";

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
    `<ui-card data-linear-board-card data-linear-issue="${id}" data-title="${escapedTitle}" data-area="Product" data-status="${status}" data-priority="medium" data-assignee="maya" data-initials="MC">
      <div slot="header" class="example-linear-card-heading"><ui-checkbox data-linear-select data-linear-issue="${id}"><span class="sr-only">Select ${id}</span></ui-checkbox><span class="example-linear-key">${id}</span><span class="example-linear-priority">→ Medium</span></div>
      <ui-link slot="content" href="#${id.toLocaleLowerCase()}" data-linear-open-issue="${id}">${escapedTitle}</ui-link>
      <div slot="footer" class="example-linear-card-footer"><ui-badge size="small">Product</ui-badge><ui-avatar size="small">MC</ui-avatar></div>
    </ui-card>`,
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
