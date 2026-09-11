import "@mash/ui/button";
import "@mash/ui/icon";
import "@mash/ui/input";
import "@mash/ui/textarea";
import "@mash/ui/select";
import "@mash/ui/checkbox";
import "@mash/ui/badge";
import "@mash/ui/avatar";
import "@mash/ui/date-picker";
import "@mash/ui/calendar";
import "@mash/ui/menu";
import "@mash/ui/dialog";
import "@mash/ui/form";
import "@mash/ui/command-palette";
import "@mash/ui/resizable";
import "@mash/ui/draggable";
import "@mash/ui/toolbar";
import "@mash/ui/kbd";
import "@mash/ui/gesture-binding";
import {
  readIssueState,
  issueStorageKey,
  connectIssueDocuments,
  refreshIssueDocuments,
  isIssueState,
  filterIssues,
  statuses,
  priorities,
  people,
  type Issue,
  type IssueState,
  type Status,
} from "./issues-model.js";
import { escape, writeState, download } from "./shared.js";
import {
  documentBlockText,
  ensureDocument,
  readNotebook,
  subscribeNotebook,
  updateDocument,
  writeNotebook,
} from "./documents-store.js";
import {
  createBlock,
  createDocument,
  parseNotebook,
  identifier,
  type NotebookDocument,
} from "./documents-model.js";
import "./issues.css";
import { workspaceNavigation, workspaceHref } from "./workspace-navigation.js";
import { navigateWorkspace } from "./desktop-bridge.js";

const storeKey = issueStorageKey;
const icon = (name: string) => `<ui-icon name="${name}" aria-hidden="true"></ui-icon>`;
const options = (values: readonly string[], selected = "") =>
  values
    .map(
      (value) =>
        `<ui-option value="${escape(value)}" ${value === selected ? "selected" : ""}>${escape(value || "All")}</ui-option>`,
    )
    .join("");
const priorityMark = (priority: number) =>
  priority === 1
    ? icon("status.warning")
    : `<ui-icon aria-hidden="true"><svg slot="primary" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${[0, 1, 2].map((index) => `<path d="M${4 + index * 5} 14V${10 - index * 4}" opacity="${priority === 0 || index >= 5 - priority ? ".24" : "1"}"/>`).join("")}</svg></ui-icon>`;
const badge = (status: string) =>
  `<span class="issue-status" data-status="${escape(status)}" aria-label="${escape(status)}"></span>`;
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

export async function mount(root: HTMLElement): Promise<() => void> {
  const controller = new AbortController();
  const { signal } = controller;
  let state = readIssueState();
  let history: IssueState[] = [],
    future: IssueState[] = [];
  let view = "issues",
    layout = "list",
    query = "",
    status = "",
    assignee = "",
    priority = "",
    project = "",
    selected: number | undefined;
  let sort: "updated" | "priority" | "title" | "id" = "updated";
  const checked = new Set<number>();
  const commentDrafts = new Map<number, string>();
  let documentEditor: HTMLElement | undefined;
  let documentEditorId: string | undefined;
  let destroyDocumentEditor: ((() => void) & { flush?: () => void }) | undefined;
  let documentLoadVersion = 0;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  root.classList.add("issues-app");
  root.dataset.mashCatalogue = "mash";
  root.dataset.mashSize = "compact";
  root.innerHTML = `<ui-resizable class="issues-workspace" label="Project workspace"><ui-resizable-panel id="issue-sidebar" size="224" min="176" max="320"><aside class="issue-sidebar">${workspaceNavigation("projects")}<ui-button class="issue-nav-close" data-action="sidebar" variant="ghost" aria-label="Close sidebar">${icon("action.dismiss")}</ui-button><div class="issue-sidebar-actions"><ui-button data-action="command" variant="ghost" size="small"><ui-icon name="action.search"></ui-icon> Search</ui-button><ui-button data-action="new" variant="ghost" size="small" aria-label="Create issue"><ui-icon name="action.add"></ui-icon></ui-button></div><nav id="issue-nav" aria-label="Workspace navigation"></nav><div class="issue-sidebar-bottom"><ui-button data-action="new-project" variant="ghost" size="small">${icon("action.add")} Add project</ui-button><ui-button data-action="settings" variant="ghost" size="small">${icon("action.settings")} Settings</ui-button></div></aside></ui-resizable-panel><ui-resizable-handle label="Resize navigation"></ui-resizable-handle><ui-resizable-panel min="320"><section class="issue-main"><header class="issue-topbar"><ui-button data-action="sidebar" variant="ghost" size="small" aria-label="Toggle sidebar">${icon("navigation.menu")}</ui-button><span class="issue-breadcrumb"><strong id="issue-view-title">Issues</strong></span><span class="issue-topbar-spacer"></span><ui-button data-action="undo" id="issue-undo" variant="ghost" size="small" disabled>Undo</ui-button><ui-menu label="View actions"><ui-button slot="trigger" variant="ghost" size="small" aria-label="View actions">${icon("navigation.more.horizontal")}</ui-button><ui-menu-item value="export-visible">Export visible issues</ui-menu-item><ui-menu-item value="redo">Redo last change</ui-menu-item><ui-menu-item value="settings">Workspace settings</ui-menu-item></ui-menu><ui-button data-action="new" variant="primary" size="small">${icon("action.add")} New issue</ui-button></header><ui-toolbar class="issue-filters" label="Issue filters"><ui-input id="issue-search" label="Filter issues" type="search" size="small" placeholder="Filter issues…" clean-on-escape></ui-input><ui-select id="filter-status" label="Status filter" value="" size="small"><ui-option value="">All statuses</ui-option>${options(statuses)}</ui-select><ui-select id="filter-assignee" label="Assignee filter" value="" size="small"><ui-option value="">Everyone</ui-option>${options(people)}</ui-select><ui-select id="filter-priority" label="Priority filter" value="" size="small"><ui-option value="">Any priority</ui-option>${priorities.map((title, index) => `<ui-option value="${index}">${title}</ui-option>`).join("")}</ui-select><ui-button data-action="clear-filters" variant="ghost" size="small">Clear</ui-button><span class="issue-filter-spacer"></span><ui-select id="issue-sort" label="Sort issues" value="updated" size="small"><ui-option value="updated">Recently updated</ui-option><ui-option value="priority">Priority</ui-option><ui-option value="title">Title</ui-option><ui-option value="id">Identifier</ui-option></ui-select><ui-button data-action="layout" id="issue-layout" variant="ghost" size="small">Board view</ui-button></ui-toolbar><div id="issue-selection" class="issue-selection" hidden><span></span><ui-button data-action="bulk-done" size="small">Mark done</ui-button><ui-button data-action="bulk-assign" size="small">Assign to me</ui-button><ui-button data-action="bulk-archive" size="small">Archive</ui-button><ui-button data-action="clear-selection" variant="ghost" size="small">Clear</ui-button></div><div id="issue-content" class="issue-content"></div><footer class="issue-foot"><span id="issue-count"></span><span><ui-kbd>C</ui-kbd> Create <ui-kbd>⌘K</ui-kbd> Search</span></footer></section></ui-resizable-panel><ui-resizable-handle id="issue-detail-handle" label="Resize issue detail" hidden></ui-resizable-handle><ui-resizable-panel id="issue-detail-panel" size="560" min="380" max="900" hidden><aside id="issue-detail" class="issue-detail"></aside></ui-resizable-panel></ui-resizable><ui-dialog id="issue-create" label="Create issue"><strong slot="title">New issue</strong><ui-form id="issue-create-form"><ui-input name="title" label="Issue title" placeholder="What needs to be done?" required></ui-input><ui-textarea name="description" label="Description" placeholder="Add context, requirements, or a starting point…" rows="5"></ui-textarea><div class="issue-form-grid"><ui-select name="status" label="Status" value="Todo">${options(statuses)}</ui-select><ui-select name="assignee" label="Assignee" value="You">${options(people)}</ui-select><ui-select name="project" id="new-issue-project" label="Project" value="workspace"></ui-select><ui-select name="priority" label="Priority" value="3">${priorities.map((title, index) => `<ui-option value="${index}">${title}</ui-option>`).join("")}</ui-select></div><ui-button type="submit" variant="primary">Create issue</ui-button></ui-form></ui-dialog><ui-dialog id="issue-command-dialog" label="Search workspace"><ui-command id="issue-command" label="Search workspace" placeholder="Search issues and commands…"><ui-icon slot="search-prefix" name="action.search"></ui-icon><span slot="footer">Enter to open · Escape to close</span></ui-command></ui-dialog><ui-dialog id="issue-settings" label="Workspace settings"><strong slot="title">Workspace settings</strong><p>Your changes stay in this browser. Export a workspace to keep a portable copy.</p><ui-button data-action="export-workspace">Export workspace</ui-button><ui-button data-action="import-workspace">Import workspace</ui-button><ui-button data-action="new-project">Create a project</ui-button></ui-dialog><ui-dialog id="project-create" label="Create project"><strong slot="title">New project</strong><ui-form id="project-create-form"><ui-input name="name" label="Project name" required></ui-input><ui-textarea name="description" label="Project description" rows="3"></ui-textarea><ui-date-picker id="project-target" label="Target date"><ui-button slot="trigger" aria-label="Target date">Set date</ui-button><ui-calendar></ui-calendar></ui-date-picker><ui-button variant="primary" type="submit">Create project</ui-button></ui-form></ui-dialog><div class="issue-notice" role="status" hidden><span></span><ui-button data-action="undo" variant="ghost" size="small">Undo</ui-button></div><input type="file" id="issue-import" accept="application/json,.json" hidden><ui-gesture-binding id="issue-command-key" gesture="key" shortcut="Primary+K" command="issues.search" prevent-default="always"></ui-gesture-binding>`;

  const find = <K extends keyof HTMLElementTagNameMap>(
    selector: string,
  ): HTMLElementTagNameMap[K] => root.querySelector(selector) as HTMLElementTagNameMap[K];
  const content = find<"div">("#issue-content");
  const detail = find<"aside">("#issue-detail");
  const showNotice = (text: string) => {
    const notice = find<"div">(".issue-notice");
    notice.hidden = false;
    notice.querySelector("span")!.textContent = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (notice.hidden = true), 4500);
  };
  function commit(label: string, change: () => void, renderMode: "all" | "main" | "none" = "all") {
    history.push(structuredClone(state));
    if (history.length > 50) history.shift();
    future = [];
    change();
    save();
    if (renderMode !== "none") render(renderMode === "main");
    find<"ui-button">("#issue-undo").disabled = !history.length;
    showNotice(label);
  }
  function save() {
    if (!writeState(storeKey, state)) showNotice("Changes are in memory. Export to keep a copy.");
  }
  function updateIssue(
    id: number,
    patch: Partial<Issue>,
    description: string,
    renderMode: "all" | "main" | "none" = "all",
  ) {
    commit(
      description,
      () => {
        const issue = state.issues.find((item) => item.id === id);
        if (!issue) return;
        Object.assign(issue, patch);
        if (patch.title && issue.document)
          updateDocument(issue.document, (doc) => {
            doc.title = patch.title!;
          });
        issue.activity.push({ body: description, created: new Date().toISOString() });
      },
      renderMode,
    );
    if (patch.title)
      root
        .querySelectorAll(`[data-open="${id}"] .issue-title`)
        .forEach((node) => (node.textContent = patch.title!));
  }
  function visible() {
    const rows = filterIssues(state, { view, query, status, assignee, priority, project });
    return rows.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "priority"
          ? (a.priority || 5) - (b.priority || 5)
          : sort === "id"
            ? a.id - b.id
            : (b.activity.at(-1)?.created ?? "").localeCompare(a.activity.at(-1)?.created ?? "") ||
              b.id - a.id,
    );
  }
  function openIssue(id: number) {
    if (!state.issues.some((issue) => issue.id === id)) return;
    selected = id;
    const url = new URL(location.href);
    url.searchParams.set("issue", String(id));
    window.history.replaceState(null, "", url);
    find<"ui-resizable-panel">("#issue-detail-panel").visible = true;
    find<"ui-resizable-handle">("#issue-detail-handle").hidden = false;
    renderDetail();
  }
  function disposeDocumentEditor() {
    documentLoadVersion++;
    destroyDocumentEditor?.();
    destroyDocumentEditor = undefined;
    documentEditor = undefined;
    documentEditorId = undefined;
  }
  function closeIssue() {
    disposeDocumentEditor();
    selected = undefined;
    const url = new URL(location.href);
    url.searchParams.delete("issue");
    window.history.replaceState(null, "", url);
    find<"ui-resizable-panel">("#issue-detail-panel").visible = false;
    find<"ui-resizable-handle">("#issue-detail-handle").hidden = true;
  }
  function renderNav() {
    const navItems = [
      ["inbox", "Inbox", "object.layers"],
      ["mine", "My issues", "action.select"],
      ["issues", "All issues", "object.table"],
      ["projects", "Projects", "object.folder"],
      ["cycles", "Current cycle", "action.refresh"],
      ["favorites", "Favorites", "action.confirm"],
      ["archive", "Archive", "object.folder"],
    ];
    find<"nav">("#issue-nav").innerHTML =
      `<div class="issue-nav-group">${navItems.map(([id, label, glyph]) => `<button data-view="${id}" ${view === id && !project ? 'aria-current="page"' : ""}><span>${icon(glyph!)}</span>${label}${id === "inbox" ? `<small>${state.issues.filter((item) => item.status === "In review" && !item.archived).length}</small>` : ""}</button>`).join("")}</div><div class="issue-nav-label">Your projects</div><div class="issue-nav-group">${state.projects.map((item) => `<button data-project="${item.id}" ${project === item.id ? 'aria-current="page"' : ""}><span>${icon("object.folder")}</span>${escape(item.name)}</button>`).join("")}</div><div class="issue-nav-label">Favorites</div><div class="issue-nav-group">${state.favorites
        .map((id) => state.issues.find((item) => item.id === id))
        .filter((item): item is Issue => !!item)
        .map(
          (item) =>
            `<button data-open="${item.id}" title="${escape(item.title)}"><span>${badge(item.status)}</span><span class="issue-truncate">${escape(item.title)}</span></button>`,
        )
        .join("")}</div>`;
    find<"ui-select">("#new-issue-project").innerHTML = state.projects
      .map((item) => `<ui-option value="${item.id}">${escape(item.name)}</ui-option>`)
      .join("");
  }
  function rowBody(issue: Issue) {
    return `<span class="issue-id">ENG-${issue.id}</span>${badge(issue.status)}<span class="issue-title">${escape(issue.title)}</span><span class="issue-tags">${issue.labels.map((label) => `<ui-badge>${escape(label)}</ui-badge>`).join("")}</span><span class="issue-priority" aria-label="${priorities[issue.priority]}" title="${priorities[issue.priority]}">${priorityMark(issue.priority)}</span><ui-avatar size="small" alt="${escape(issue.assignee)}">${initials(issue.assignee)}</ui-avatar>`;
  }
  function render(preserveDetail = false) {
    renderNav();
    find<"ui-button">("#issue-undo").disabled = !history.length;
    find<"strong">("#issue-view-title").textContent = project
      ? (state.projects.find((item) => item.id === project)?.name ?? "Project")
      : ({
          issues: "Issues",
          mine: "My issues",
          inbox: "Inbox",
          projects: "Projects",
          cycles: "Current cycle",
          favorites: "Favorites",
          archive: "Archive",
        }[view] ?? "Issues");
    const rows = visible();
    find<"span">("#issue-count").textContent =
      `${rows.length} ${rows.length === 1 ? "issue" : "issues"}${project ? " · " + state.projects.find((item) => item.id === project)?.name : ""}`;
    find<"ui-button">("#issue-layout").textContent = layout === "list" ? "Board view" : "List view";
    const selection = find<"div">("#issue-selection");
    selection.hidden = !checked.size;
    selection.querySelector("span")!.textContent = `${checked.size} selected`;
    if (view === "projects" && !project) {
      content.innerHTML = `<div class="issue-projects"><header><h1>Projects</h1><p>Plan, track, and work directly in the documents behind each issue.</p></header>${state.projects
        .map((item) => {
          const projectIssues = state.issues.filter(
              (issue) => issue.project === item.id && !issue.archived,
            ),
            done = projectIssues.filter((issue) => issue.status === "Done").length;
          return `<button class="issue-project-card" data-project="${item.id}"><span class="issue-project-symbol">${icon("object.folder")}</span><div><h2>${escape(item.name)}</h2><p>${escape(item.description)}</p><div class="issue-project-progress"><span style="width:${projectIssues.length ? (done / projectIssues.length) * 100 : 0}%"></span></div><small>${done} of ${projectIssues.length} completed · ${escape(item.lead)} · ${escape(item.target || "No target date")}</small></div><span>${icon("navigation.forward")}</span></button>`;
        })
        .join("")}</div>`;
    } else if (layout === "board") {
      content.innerHTML = `<div class="issue-board">${statuses
        .filter((value) => value !== "Canceled")
        .map(
          (value) =>
            `<section class="issue-lane" data-status="${value}"><header>${badge(value)}<strong>${value}</strong><span>${rows.filter((issue) => issue.status === value).length}</span><ui-button data-new-status="${value}" variant="ghost" size="small" aria-label="Add ${value} issue">${icon("action.add")}</ui-button></header><div class="issue-lane-cards">${rows
              .filter((issue) => issue.status === value)
              .map(
                (issue) =>
                  `<ui-draggable data-issue-drag="${issue.id}" threshold="5" containment="none"><button class="issue-board-card" data-open="${issue.id}"><span class="issue-card-id">ENG-${issue.id}<span>${priorityMark(issue.priority)}</span></span><strong>${escape(issue.title)}</strong><span class="issue-card-footer">${issue.labels.map((label) => `<ui-badge>${escape(label)}</ui-badge>`).join("")}<ui-avatar size="small" alt="${escape(issue.assignee)}">${initials(issue.assignee)}</ui-avatar></span></button></ui-draggable>`,
              )
              .join(
                "",
              )}<button class="issue-board-add" data-new-status="${value}">${icon("action.add")} Add issue</button></div></section>`,
        )
        .join("")}</div>`;
    } else {
      const groups = status ? [status] : [...statuses];
      content.innerHTML = rows.length
        ? groups
            .filter((value) => rows.some((issue) => issue.status === value))
            .map(
              (value) =>
                `<section class="issue-list-group"><header>${badge(value)}<strong>${value}</strong><span>${rows.filter((issue) => issue.status === value).length}</span><ui-button data-new-status="${value}" variant="ghost" size="small" aria-label="Add ${value} issue">${icon("action.add")}</ui-button></header>${rows
                  .filter((issue) => issue.status === value)
                  .map(
                    (issue) =>
                      `<div class="issue-row" data-row="${issue.id}" ${selected === issue.id ? 'data-active=""' : ""}><ui-checkbox data-check="${issue.id}" aria-label="Select ENG-${issue.id}" ${checked.has(issue.id) ? "checked" : ""}></ui-checkbox><button data-open="${issue.id}">${rowBody(issue)}</button></div>`,
                  )
                  .join("")}</section>`,
            )
            .join("")
        : `<div class="issue-empty"><span>${icon("object.document")}</span><h2>No issues here</h2><p>Create an issue or clear the filters to get started.</p><ui-button data-action="new" size="small">Create issue</ui-button><ui-button data-action="clear-filters" variant="ghost" size="small">Clear filters</ui-button></div>`;
    }
    if (selected && !state.issues.some((item) => item.id === selected)) closeIssue();
    if (selected && !preserveDetail) renderDetail();
  }
  function renderDetail() {
    const issue = state.issues.find((item) => item.id === selected);
    if (!issue) return;
    if (documentEditorId && documentEditorId !== issue.document) disposeDocumentEditor();
    const retainedEditor = documentEditor;
    const next = document.createElement("div");
    next.innerHTML = `<header><span>ENG-${issue.id}</span><div><ui-button data-action="open-document" variant="ghost" size="small" aria-label="Open issue document">${icon("action.launch")}</ui-button><ui-button data-action="favorite" variant="ghost" size="small" aria-label="${state.favorites.includes(issue.id) ? "Remove favorite" : "Favorite issue"}" aria-pressed="${state.favorites.includes(issue.id)}"><ui-icon aria-hidden="true"><svg slot="primary" width="18" height="18" viewBox="0 0 20 20" fill="${state.favorites.includes(issue.id) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.4"><path d="m10 2 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/></svg></ui-icon></ui-button><ui-menu><ui-button slot="trigger" variant="ghost" size="small" aria-label="Issue actions">${icon("navigation.more.horizontal")}</ui-button><ui-menu-item value="duplicate">Duplicate issue</ui-menu-item><ui-menu-item value="copy-issue">Copy issue</ui-menu-item><ui-menu-item value="archive">${issue.archived ? "Restore issue" : "Archive issue"}</ui-menu-item><ui-menu-item value="delete" tone="critical">Delete issue</ui-menu-item></ui-menu><ui-button data-action="close-detail" variant="ghost" size="small" aria-label="Close issue">${icon("action.dismiss")}</ui-button></div></header><div class="issue-detail-scroll"><div class="issue-properties"><label>Status</label><ui-select data-field="status" label="Issue status" value="${issue.status}" size="small">${options(statuses)}</ui-select><label>Priority</label><ui-select data-field="priority" label="Issue priority" value="${issue.priority}" size="small">${priorities.map((title, index) => `<ui-option value="${index}">${title}</ui-option>`).join("")}</ui-select><label>Assignee</label><ui-select data-field="assignee" label="Issue assignee" value="${escape(issue.assignee)}" size="small">${options(people)}</ui-select><label>Project</label><ui-select data-field="project" label="Issue project" value="${issue.project}" size="small">${state.projects.map((item) => `<ui-option value="${item.id}">${escape(item.name)}</ui-option>`).join("")}</ui-select><label>Cycle</label><ui-select data-field="cycle" label="Issue cycle" value="${escape(issue.cycle)}" size="small">${options(["No cycle", "Current cycle", "Next cycle"])}</ui-select><label>Estimate</label><ui-select data-field="estimate" label="Issue estimate" value="${issue.estimate}" size="small">${options(["0", "1", "2", "3", "5", "8", "13"])}</ui-select><label>Labels</label><ui-input data-field="labels" label="Issue labels" value="${escape(issue.labels.join(", "))}" size="small"></ui-input><label>Due date</label><ui-date-picker data-field="due" label="Issue due date" value="${issue.due}" size="small"><ui-button slot="trigger" variant="ghost" size="small" aria-label="Issue due date">${issue.due || "Set date"}</ui-button><ui-calendar></ui-calendar></ui-date-picker></div><div id="issue-document-slot" class="issue-document-slot"></div><section class="issue-activity"><h2>Activity</h2>${issue.activity
      .slice(-5)
      .map(
        (item) =>
          `<p><span class="issue-activity-dot"></span>${escape(item.body)}<time>${new Date(item.created).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></p>`,
      )
      .join(
        "",
      )}${issue.comments.map((comment) => `<article><header><ui-avatar size="small" alt="You">Y</ui-avatar><strong>You</strong><time>${new Date(comment.created).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time><ui-button data-delete-comment="${comment.id}" variant="ghost" size="small" aria-label="Delete comment">${icon("action.dismiss")}</ui-button></header><p>${escape(comment.body).replaceAll("\n", "<br>")}</p></article>`).join("")}</section><ui-textarea id="issue-comment" value="${escape(commentDrafts.get(issue.id) ?? "")}" label="Write a comment" placeholder="Leave a comment…" rows="3"></ui-textarea><ui-button data-action="comment" size="small" variant="primary">Comment</ui-button></div>`;
    if (retainedEditor) {
      for (const selector of [
        ":scope > header",
        ".issue-properties",
        ".issue-activity",
        "#issue-comment",
      ])
        detail.querySelector(selector)!.replaceWith(next.querySelector(selector)!);
    } else {
      detail.replaceChildren(...next.childNodes);
      void mountIssueDocument(issue, detail.querySelector<HTMLElement>("#issue-document-slot")!);
    }
  }
  async function mountIssueDocument(issue: Issue, slot: HTMLElement) {
    const documentId = issue.document!;
    const host = document.createElement("div");
    host.className = "issue-document-editor";
    host.setAttribute("aria-label", "Issue document");
    host.innerHTML = `<div class="issue-document-error" role="status"><p>Opening document…</p></div>`;
    documentEditor = host;
    documentEditorId = documentId;
    slot.append(host);
    // Embedded controls keep their commands within the document's own controller.
    for (const type of [
      "click",
      "input",
      "change",
      "keydown",
      "ui-menu-select",
      "ui-command-select",
      "ui-select-change",
      "ui-checkbox-change",
      "ui-date-picker-change",
      "ui-drag-end",
      "mash-command",
    ])
      host.addEventListener(type, (event) => event.stopPropagation(), { signal });
    const version = ++documentLoadVersion;
    const unavailable = (message: string, restore = false) => {
      host.innerHTML = `<div class="issue-document-error"><ui-icon name="object.document"></ui-icon><p>${message}</p><ui-button>${restore ? "Create document from saved summary" : "Try again"}</ui-button></div>`;
      host.querySelector("ui-button")!.addEventListener(
        "click",
        () => {
          if (restore)
            ensureDocument({ id: documentId, title: issue.title, text: issue.description });
          disposeDocumentEditor();
          renderDetail();
        },
        { once: true, signal },
      );
    };
    if (!readNotebook().documents.some((doc) => doc.id === documentId)) {
      unavailable("This issue's document was removed. Its saved summary is still available.", true);
      return;
    }
    try {
      const documents = await import("./documents.js");
      if (version !== documentLoadVersion || signal.aborted) return;
      const cleanup = await documents.mount(host, {
        activeDocument: documentId,
        embedded: true,
      });
      if (version !== documentLoadVersion || signal.aborted) {
        cleanup();
        return;
      }
      destroyDocumentEditor = cleanup;
      host.querySelector("#documents-title")?.setAttribute("aria-label", "Issue title");
    } catch {
      if (version === documentLoadVersion && !signal.aborted)
        unavailable("The document could not be opened.");
    }
  }
  function newIssue(newStatus = "Todo") {
    const form = find<"ui-form">("#issue-create-form");
    form.reset();
    const statusField =
      form.querySelector<HTMLElementTagNameMap["ui-select"]>("ui-select[name=status]")!;
    statusField.value = newStatus;
    find<"ui-select">("#new-issue-project").value = project || state.projects[0]?.id || "";
    find<"ui-dialog">("#issue-create").show();
  }
  function openCommand() {
    const command = find<"ui-command">("#issue-command");
    command.query = "";
    command.innerHTML = `<ui-icon slot="search-prefix" name="action.search"></ui-icon><ui-command-item value="action:new">Create issue</ui-command-item><ui-command-item value="action:new-project">Create project</ui-command-item><ui-command-item value="action:undo">Undo last change</ui-command-item><ui-command-item value="action:settings">Workspace settings</ui-command-item>${state.issues
      .filter((item) => !item.archived)
      .map(
        (issue) =>
          `<ui-command-item value="issue:${issue.id}"><span slot="icon">${badge(issue.status)}</span>${escape(issue.title)}<span slot="shortcut">ENG-${issue.id}</span></ui-command-item>`,
      )
      .join("")}<span slot="footer">Enter to open · Escape to close</span>`;
    find<"ui-dialog">("#issue-command-dialog").show();
  }
  async function action(name: string) {
    const issue = state.issues.find((item) => item.id === selected);
    if (["open-document", "export-workspace", "copy-issue", "duplicate"].includes(name))
      destroyDocumentEditor?.flush?.();
    if (name === "open-document" && issue?.document) {
      navigateWorkspace(workspaceHref("documents", { document: issue.document }));
    } else if (name === "new") newIssue();
    else if (name === "command") openCommand();
    else if (name === "close-detail") closeIssue();
    else if (name === "sidebar") {
      const sidebar = find<"ui-resizable-panel">("#issue-sidebar");
      if (matchMedia("(max-width: 650px)").matches) {
        sidebar.visible = true;
        root.classList.toggle("issue-sidebar-open");
      } else sidebar.visible = !sidebar.visible;
    } else if (name === "layout") {
      layout = layout === "list" ? "board" : "list";
      render();
    } else if (name === "settings") find<"ui-dialog">("#issue-settings").show();
    else if (name === "new-project") find<"ui-dialog">("#project-create").show();
    else if (name === "undo" && history.length) {
      future.push(structuredClone(state));
      state = history.pop()!;
      connectIssueDocuments(state);
      save();
      render();
      showNotice("Change undone");
    } else if (name === "redo" && future.length) {
      history.push(structuredClone(state));
      state = future.pop()!;
      connectIssueDocuments(state);
      save();
      render();
      showNotice("Change restored");
    } else if (name === "clear-filters") {
      query = status = assignee = priority = project = "";
      find<"ui-input">("#issue-search").value = "";
      for (const id of ["status", "assignee", "priority"])
        find<"ui-select">("#filter-" + id).value = "";
      render();
    } else if (name === "clear-selection") {
      checked.clear();
      render();
    } else if (name.startsWith("bulk-"))
      commit("Updated selected issues", () => {
        for (const record of state.issues.filter((item) => checked.has(item.id))) {
          if (name === "bulk-done") record.status = "Done";
          if (name === "bulk-assign") record.assignee = "You";
          if (name === "bulk-archive") record.archived = true;
          record.activity.push({
            body: "Updated in a bulk action",
            created: new Date().toISOString(),
          });
        }
        checked.clear();
      });
    else if (name === "favorite" && issue)
      commit(
        state.favorites.includes(issue.id) ? "Removed favorite" : "Added favorite",
        () =>
          (state.favorites = state.favorites.includes(issue.id)
            ? state.favorites.filter((id) => id !== issue.id)
            : [...state.favorites, issue.id]),
      );
    else if (name === "archive" && issue)
      updateIssue(
        issue.id,
        { archived: !issue.archived },
        issue.archived ? "Restored issue" : "Archived issue",
      );
    else if (name === "delete" && issue)
      commit("Deleted issue", () => {
        state.issues = state.issues.filter((item) => item.id !== issue.id);
        state.favorites = state.favorites.filter((id) => id !== issue.id);
      });
    else if (name === "duplicate" && issue)
      commit("Duplicated issue", () => {
        const copy = structuredClone(issue);
        copy.id = state.nextId++;
        copy.title += " (copy)";
        const source = readNotebook().documents.find((doc) => doc.id === issue.document);
        copy.document = `issue:${copy.id}:${identifier()}`;
        ensureDocument({ id: copy.document, title: copy.title, text: copy.description });
        if (source)
          updateDocument(copy.document, (doc) => {
            const ids = new Map(source.blocks.map((block) => [block.id, identifier()]));
            doc.blocks = structuredClone(source.blocks).map((block) => ({
              ...block,
              id: ids.get(block.id)!,
              comments: block.comments.map((comment) => ({ ...comment, id: identifier() })),
            }));
            doc.connections = structuredClone(source.connections).map((connection) => ({
              ...connection,
              id: identifier(),
              from: ids.get(connection.from)!,
              to: ids.get(connection.to)!,
            }));
          });
        copy.comments = [];
        copy.activity = [
          { body: "Duplicated from ENG-" + issue.id, created: new Date().toISOString() },
        ];
        state.issues.push(copy);
        selected = copy.id;
      });
    else if (name === "copy-issue" && issue) {
      try {
        await navigator.clipboard.writeText(
          `ENG-${issue.id} ${issue.title}\n\n${issue.description}`,
        );
        showNotice("Issue copied");
      } catch {
        showNotice("Clipboard unavailable. Export the issue list instead.");
      }
    } else if (name === "comment" && issue) {
      const field = find<"ui-textarea">("#issue-comment");
      const body = field.value.trim();
      if (body)
        commit("Comment added", () => {
          commentDrafts.delete(issue.id);
          issue.comments.push({ id: crypto.randomUUID(), body, created: new Date().toISOString() });
        });
    } else if (name === "export-workspace") {
      refreshIssueDocuments(state);
      const ids = new Set(state.issues.map((item) => item.document));
      const documents = readNotebook().documents.filter((doc) => ids.has(doc.id));
      download(
        "workspace.json",
        JSON.stringify(
          {
            ...state,
            ...(documents.length
              ? { notebook: { version: 1, active: documents[0]!.id, documents } }
              : {}),
          },
          null,
          2,
        ),
        "application/json",
      );
    } else if (name === "export-visible") {
      const csv = (value: unknown) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
      download(
        "issues.csv",
        [
          ["ID", "Title", "Status", "Priority", "Assignee", "Project"],
          ...visible().map((item) => [
            item.id,
            item.title,
            item.status,
            priorities[item.priority],
            item.assignee,
            item.project,
          ]),
        ]
          .map((row) => row.map(csv).join(","))
          .join("\r\n"),
        "text/csv",
      );
    } else if (name === "import-workspace") find<"input">("#issue-import").click();
  }
  root.addEventListener(
    "click",
    (event) => {
      const target = event
        .composedPath()
        .find(
          (node): node is HTMLElement =>
            node instanceof HTMLElement &&
            !!(
              node.dataset.action ||
              node.dataset.view ||
              node.dataset.project ||
              node.dataset.open ||
              node.dataset.newStatus ||
              node.dataset.deleteComment
            ),
        );
      if (!target) return;
      if (target.dataset.action) void action(target.dataset.action);
      if (target.dataset.view || target.dataset.project || target.dataset.open)
        root.classList.remove("issue-sidebar-open");
      if (target.dataset.view) {
        view = target.dataset.view;
        project = "";
        checked.clear();
        render();
      }
      if (target.dataset.project) {
        view = "issues";
        project = target.dataset.project;
        checked.clear();
        render();
      }
      if (target.dataset.open) openIssue(Number(target.dataset.open));
      if (target.dataset.newStatus) newIssue(target.dataset.newStatus);
      if (target.dataset.deleteComment) {
        const issue = state.issues.find((item) => item.id === selected);
        if (issue)
          commit(
            "Deleted comment",
            () =>
              (issue.comments = issue.comments.filter(
                (comment) => comment.id !== target.dataset.deleteComment,
              )),
          );
      }
    },
    { signal },
  );
  root.addEventListener(
    "ui-menu-select",
    (event) => void action((event as CustomEvent<{ value: string }>).detail.value),
    { signal },
  );
  root.addEventListener(
    "ui-command-select",
    (event) => {
      const value = (event as CustomEvent<{ value: string }>).detail.value;
      find<"ui-dialog">("#issue-command-dialog").dismiss();
      if (value.startsWith("issue:")) openIssue(Number(value.slice(6)));
      else void action(value.slice(7));
    },
    { signal },
  );
  root.addEventListener(
    "ui-select-change",
    (event) => {
      const field = event.target as HTMLInputElement;
      const value = (event as CustomEvent<{ value: string }>).detail.value;
      if (field.id === "filter-status") status = value;
      else if (field.id === "filter-assignee") assignee = value;
      else if (field.id === "filter-priority") priority = value;
      else if (field.id === "issue-sort") sort = value as typeof sort;
      else if (field.dataset.field && selected) {
        const key = field.dataset.field as keyof Issue;
        updateIssue(
          selected,
          { [key]: ["priority", "estimate"].includes(key) ? Number(value) : value },
          `Updated ${key}`,
          "main",
        );
        return;
      } else return;
      render();
    },
    { signal },
  );
  root.addEventListener(
    "ui-date-picker-change",
    (event) => {
      const field = event.target as HTMLElement;
      const value = (event as CustomEvent<{ value: string }>).detail.value;
      const trigger = field.querySelector("[slot=trigger]");
      if (trigger) trigger.textContent = value || "Set date";
      if (field.dataset.field === "due" && selected)
        updateIssue(
          selected,
          { due: (event as CustomEvent<{ value: string }>).detail.value },
          "Updated due date",
          "main",
        );
    },
    { signal },
  );
  root.addEventListener(
    "ui-checkbox-change",
    (event) => {
      const field = event.target as HTMLElementTagNameMap["ui-checkbox"];
      if (!field.dataset.check) return;
      const id = Number(field.dataset.check);
      if (field.checked) checked.add(id);
      else checked.delete(id);
      const selection = find<"div">("#issue-selection");
      selection.hidden = !checked.size;
      selection.querySelector("span")!.textContent = checked.size + " selected";
    },
    { signal },
  );
  root.addEventListener(
    "input",
    (event) => {
      if ((event.target as HTMLElement).id === "issue-comment" && selected)
        commentDrafts.set(selected, (event.target as HTMLElementTagNameMap["ui-textarea"]).value);
    },
    { signal },
  );
  root.addEventListener(
    "change",
    (event) => {
      const field = event.target as HTMLInputElement;
      if (field.dataset.check) {
        const id = Number(field.dataset.check);
        if (field.checked) checked.add(id);
        else checked.delete(id);
        const selection = find<"div">("#issue-selection");
        selection.hidden = !checked.size;
        selection.querySelector("span")!.textContent = checked.size + " selected";
      }
      if (field.dataset.field && selected && field.localName !== "ui-select") {
        const key = field.dataset.field as keyof Issue;
        if (key === "title" && !field.value.trim()) return;
        updateIssue(
          selected,
          {
            [key]:
              key === "labels"
                ? field.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                : field.value,
          },
          `Updated ${key}`,
          "none",
        );
      }
    },
    { signal },
  );
  find<"ui-input">("#issue-search").addEventListener(
    "input",
    (event) => {
      query = (event.target as HTMLInputElement).value;
      render();
    },
    { signal },
  );
  find<"ui-form">("#issue-create-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = find<"ui-form">("#issue-create-form");
      const values = new FormData(form.form!);
      const title = String(values.get("title") ?? "").trim();
      if (!title) return;
      commit("Created issue", () => {
        const id = state.nextId++;
        const description = String(values.get("description") ?? "");
        const document = `issue:${id}:${identifier()}`;
        ensureDocument({ id: document, title, text: description });
        state.issues.push({
          id,
          title,
          description,
          document,
          status: String(values.get("status") ?? "Todo") as Status,
          priority: Number(values.get("priority") ?? 3),
          assignee: String(values.get("assignee") ?? "You"),
          project: String(values.get("project") ?? ""),
          cycle: "Current cycle",
          labels: [],
          estimate: 0,
          due: "",
          archived: false,
          comments: [],
          activity: [{ body: "Created issue", created: new Date().toISOString() }],
        });
        connectIssueDocuments(state);
        selected = id;
      });
      find<"ui-dialog">("#issue-create").dismiss();
      openIssue(selected!);
    },
    { signal },
  );
  find<"ui-form">("#project-create-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const form = find<"ui-form">("#project-create-form"),
        values = new FormData(form.form!);
      const name = String(values.get("name") ?? "").trim();
      if (!name) return;
      commit("Created project", () => {
        const id = crypto.randomUUID();
        state.projects.push({
          id,
          name,
          description: String(values.get("description") ?? ""),
          lead: "You",
          target: find<"ui-date-picker">("#project-target").value,
        });
        project = id;
        view = "issues";
      });
      find<"ui-dialog">("#project-create").dismiss();
      find<"ui-date-picker">("#project-target").value = "";
      find<"ui-date-picker">("#project-target").querySelector("[slot=trigger]")!.textContent =
        "Set date";
      form.reset();
    },
    { signal },
  );
  root.addEventListener(
    "ui-drag-end",
    (event) => {
      const drag = event.target as HTMLElement & { resetPosition(): void };
      const data = (event as CustomEvent<{ cancelled: boolean; pointer: { x: number; y: number } }>)
        .detail;
      if (!drag.dataset.issueDrag) return;
      drag.resetPosition();
      if (data.cancelled) return;
      const lane = document
        .elementsFromPoint(data.pointer.x, data.pointer.y)
        .map((node) => node.closest<HTMLElement>(".issue-lane"))
        .find(Boolean);
      if (lane?.dataset.status)
        updateIssue(
          Number(drag.dataset.issueDrag),
          { status: lane.dataset.status as Status },
          "Moved to " + lane.dataset.status,
        );
    },
    { signal },
  );
  find<"input">("#issue-import").addEventListener(
    "change",
    async (event) => {
      const input = event.target as HTMLInputElement,
        file = input.files?.[0];
      if (!file) return;
      try {
        const next: unknown = JSON.parse(await file.text());
        if (!isIssueState(next)) throw Error();
        const embedded = (next as IssueState & { notebook?: unknown }).notebook;
        const importedDocuments: NotebookDocument[] = embedded
          ? parseNotebook(JSON.stringify(embedded)).documents
          : [];
        if (signal.aborted) return;
        let copiedSources = 0;
        commit("Imported workspace", () => {
          disposeDocumentEditor();
          const before = readNotebook();
          const notebook = structuredClone(before);
          const existing = new Map(before.documents.map((doc) => [doc.id, doc]));
          const incoming = new Map(importedDocuments.map((doc) => [doc.id, doc]));
          // Older exports carry text summaries. Give changed summaries their own source too.
          for (const issue of next.issues) {
            const id = issue.document ?? `issue:${issue.id}`;
            issue.document = id;
            if (incoming.has(id)) continue;
            const live = existing.get(id);
            if (
              live &&
              live.title === issue.title &&
              live.blocks.map(documentBlockText).filter(Boolean).join("\n\n") === issue.description
            ) {
              incoming.set(id, live);
            } else {
              const doc = createDocument(issue.title);
              doc.id = id;
              doc.blocks = issue.description
                .split(/\n\s*\n/)
                .map((text, index) => createBlock("paragraph", text, index));
              incoming.set(id, doc);
            }
          }
          const documentContent = (doc: NotebookDocument) =>
            JSON.stringify({
              title: doc.title,
              blocks: doc.blocks,
              connections: doc.connections,
            });
          const mapped = new Map<string, string>();
          let copies = 0;
          for (const doc of incoming.values()) {
            const live = existing.get(doc.id);
            const conflicting = live && documentContent(live) !== documentContent(doc);
            mapped.set(doc.id, conflicting ? identifier() : doc.id);
            if (conflicting) copies++;
          }
          // A copied parent needs copied descendants where reusing them would reparent live work.
          let remappedParent = true;
          while (remappedParent) {
            remappedParent = false;
            for (const doc of incoming.values()) {
              const live = existing.get(doc.id);
              if (
                !live ||
                mapped.get(doc.id) !== doc.id ||
                !doc.parent ||
                !incoming.has(doc.parent)
              )
                continue;
              if (live.parent === mapped.get(doc.parent)) continue;
              mapped.set(doc.id, identifier());
              copies++;
              remappedParent = true;
            }
          }
          for (const doc of incoming.values()) {
            const id = mapped.get(doc.id)!;
            if (existing.has(id)) continue;
            notebook.documents.push({
              ...structuredClone(doc),
              id,
              parent: doc.parent ? (mapped.get(doc.parent) ?? doc.parent) : null,
            });
          }
          writeNotebook(notebook, before);
          copiedSources = copies;
          state = {
            version: 1,
            issues: next.issues.map((issue) => ({
              ...issue,
              document: mapped.get(issue.document!),
            })),
            projects: next.projects,
            favorites: next.favorites,
            nextId: next.nextId,
          };
          connectIssueDocuments(state);
          selected = undefined;
          checked.clear();
        });
        closeIssue();
        if (copiedSources)
          showNotice(`Imported workspace · ${copiedSources} changed sources kept as copies`);
      } catch {
        showNotice("This file is not a valid workspace export.");
      }
      input.value = "";
    },
    { signal },
  );
  root.addEventListener(
    "keydown",
    (event) => {
      const typing = event
        .composedPath()
        .some(
          (node) =>
            node instanceof HTMLElement &&
            (node.matches("input,textarea,[contenteditable=true]") ||
              node.localName === "ui-editor"),
        );
      if (event.key === "Escape" && !event.defaultPrevented) closeIssue();
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        newIssue();
      }
      if (event.key === "/") {
        event.preventDefault();
        find<"ui-input">("#issue-search").focus();
      }
    },
    { signal },
  );
  root.addEventListener(
    "mash-command",
    (event) => {
      if (
        (event as CustomEvent<{ command: string; phase: string }>).detail.command ===
          "issues.search" &&
        (event as CustomEvent<{ phase: string }>).detail.phase === "ended"
      )
        openCommand();
    },
    { signal },
  );
  root.querySelector(".workspace-navigation")!.addEventListener(
    "click",
    () => {
      destroyDocumentEditor?.flush?.();
    },
    { signal },
  );
  subscribeNotebook(
    () => {
      if (signal.aborted || !refreshIssueDocuments(state)) return;
      save();
      render(true);
    },
    { signal },
  );
  window.addEventListener(
    "storage",
    (event) => {
      if (event.key !== storeKey) return;
      state = readIssueState();
      render();
    },
    { signal },
  );
  const requestedIssue = Number(new URL(location.href).searchParams.get("issue"));
  closeIssue();
  render();
  if (requestedIssue) openIssue(requestedIssue);
  return () => {
    disposeDocumentEditor();
    controller.abort();
    clearTimeout(noticeTimer);
    root.classList.remove("issues-app");
  };
}
