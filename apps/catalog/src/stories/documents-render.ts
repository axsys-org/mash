import {
  filteredRows,
  identifier,
  safeLink,
  type DocumentBlock,
  type TextMark,
  type DataRow,
} from "./documents-model.js";
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function button(label: string, action: string, icon?: string): HTMLElement {
  const node = element("ui-button");
  node.setAttribute("size", "small");
  node.setAttribute("variant", "ghost");
  node.dataset.action = action;
  node.setAttribute("aria-label", label);
  if (icon) {
    const glyph = element("ui-icon");
    glyph.setAttribute("name", icon);
    glyph.setAttribute("label", "");
    node.append(glyph);
  } else node.textContent = label;
  return node;
}
export function richText(host: HTMLElement, text: string, marks: TextMark[]): void {
  host.replaceChildren();
  const edges = [...new Set([0, text.length, ...marks.flatMap((m) => [m.start, m.end])])].sort(
    (a, b) => a - b,
  );
  for (let i = 0; i < edges.length - 1; i++) {
    const start = edges[i]!,
      end = edges[i + 1]!;
    let leaf: Node = document.createTextNode(text.slice(start, end));
    for (const mark of marks.filter((m) => m.start <= start && m.end >= end)) {
      const tag = { bold: "strong", italic: "em", underline: "u", code: "code", link: "a" }[
        mark.kind
      ] as "strong" | "em" | "u" | "code" | "a";
      const wrapper = element(tag);
      if (wrapper instanceof HTMLAnchorElement && mark.href && safeLink(mark.href)) {
        wrapper.href = mark.href;
        wrapper.target = "_blank";
        wrapper.rel = "noopener noreferrer";
      }
      wrapper.append(leaf);
      leaf = wrapper;
    }
    host.append(leaf);
  }
}
export function textOffsets(host: HTMLElement): { start: number; end: number } | null {
  const selection = getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!host.contains(range.startContainer) || !host.contains(range.endContainer)) return null;
  const prefix = range.cloneRange();
  prefix.selectNodeContents(host);
  prefix.setEnd(range.startContainer, range.startOffset);
  const start = prefix.toString().length;
  return { start, end: start + range.toString().length };
}
export function selectText(host: HTMLElement, start: number, end = start): void {
  host.focus({ preventScroll: true });
  const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let node: Node | null,
    total = 0,
    startNode: Node = host,
    endNode: Node = host,
    startOffset = 0,
    endOffset = 0;
  let hasStart = false,
    hasEnd = false;
  while ((node = walk.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (!hasStart && start <= total + length) {
      startNode = node;
      startOffset = Math.max(0, start - total);
      hasStart = true;
    }
    if (end <= total + length) {
      endNode = node;
      endOffset = Math.max(0, end - total);
      hasEnd = true;
      break;
    }
    total += length;
  }
  if (!hasStart || !hasEnd) {
    const range = document.createRange();
    range.selectNodeContents(host);
    range.collapse(false);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
    return;
  }
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  getSelection()?.removeAllRanges();
  getSelection()?.addRange(range);
}
export interface CollectionView {
  query: string;
  status: string;
  sort: string;
  descending: boolean;
  view: "table" | "board";
}
export function renderCollection(
  block: DocumentBlock,
  view: CollectionView,
  onEdit: (edit: (block: DocumentBlock) => void, label: string) => void,
  onView: () => void,
): HTMLElement {
  const container = element("section", "documents-collection");
  container.setAttribute("aria-label", block.text || "Collection");
  const controls = element("div", "documents-collection-controls");
  const search = element("ui-input");
  search.setAttribute("type", "search");
  search.setAttribute("size", "small");
  search.setAttribute("label", "Filter collection");
  search.setAttribute("placeholder", "Filter records…");
  search.value = view.query;
  search.addEventListener("input", () => {
    view.query = search.value;
    renderRows();
  });
  const status = element("ui-select");
  status.setAttribute("label", "Filter status");
  status.setAttribute("size", "small");
  status.value = view.status;
  for (const value of ["", "Planned", "In progress", "Done"]) {
    const option = element("ui-option", "", value || "All statuses");
    option.setAttribute("value", value);
    status.append(option);
  }
  status.addEventListener("ui-select-change", () => {
    view.status = status.value;
    renderRows();
  });
  const sort = element("ui-select");
  sort.setAttribute("size", "small");
  sort.setAttribute("label", "Sort records");
  sort.value = view.sort;
  for (const value of ["title", "status", "owner", "due", "estimate"]) {
    const option = element("ui-option", "", "Sort by " + value);
    option.setAttribute("value", value);
    sort.append(option);
  }
  sort.addEventListener("ui-select-change", () => {
    view.sort = sort.value;
    renderRows();
  });
  const direction = button("Reverse sort", "");
  direction.textContent = view.descending ? "↓" : "↑";
  direction.addEventListener("click", () => {
    view.descending = !view.descending;
    direction.textContent = view.descending ? "↓" : "↑";
    renderRows();
  });
  const toggle = button(view.view === "table" ? "Board view" : "Table view", "");
  toggle.addEventListener("click", () => {
    view.view = view.view === "table" ? "board" : "table";
    onView();
  });
  const add = button("Add record", "", "action.add");
  add.addEventListener("click", () =>
    onEdit(
      (b) =>
        (b.rows ??= []).push({
          id: identifier(),
          title: "Untitled record",
          status: "Planned",
          owner: "",
          due: "",
          estimate: 0,
          done: false,
        }),
      "Added record",
    ),
  );
  controls.append(search, status, sort, direction, toggle, add);
  const body = element("div", "documents-collection-body");
  const count = element("output", "documents-collection-count");
  container.append(controls, body, count);
  function update(id: string, key: keyof DataRow, value: string | number | boolean): void {
    onEdit((b) => {
      const row = b.rows?.find((r) => r.id === id);
      if (row) Object.assign(row, { [key]: value });
    }, "Updated record");
  }
  function renderRows(): void {
    body.replaceChildren();
    const rows = filteredRows(block, view.query, view.status, view.sort, view.descending);
    count.textContent = rows.length + " of " + (block.rows?.length ?? 0) + " records";
    if (view.view === "board") {
      const board = element("div", "documents-board");
      for (const stage of ["Planned", "In progress", "Done"] as const) {
        const lane = element("section", "documents-board-lane");
        lane.setAttribute("aria-label", stage);
        lane.append(element("h4", "", stage));
        lane.addEventListener("dragover", (event) => event.preventDefault());
        lane.addEventListener("drop", (event) => {
          event.preventDefault();
          const id = event.dataTransfer?.getData("application/x-documents-row");
          if (id) update(id, "status", stage);
        });
        for (const row of rows.filter((r) => r.status === stage)) {
          const card = element("article", "documents-record-card");
          card.draggable = true;
          card.addEventListener("dragstart", (event) =>
            event.dataTransfer?.setData("application/x-documents-row", row.id),
          );
          card.append(
            element("strong", "", row.title),
            element("span", "", row.owner || "Unassigned"),
            element("small", "", (row.due || "No date") + " · " + row.estimate + " points"),
          );
          const move = element("ui-select");
          move.setAttribute("aria-label", "Move " + row.title);
          for (const choice of ["Planned", "In progress", "Done"]) {
            const option = element("ui-option", "", choice);
            option.value = choice;
            move.append(option);
          }
          move.value = row.status;
          move.label = "Move " + row.title;
          move.size = "small";
          move.addEventListener("ui-select-change", () => update(row.id, "status", move.value));
          card.append(move);
          lane.append(card);
        }
        board.append(lane);
      }
      body.append(board);
      return;
    }
    const table = element("table");
    table.setAttribute("aria-label", block.text || "Records");
    const head = element("thead"),
      header = element("tr");
    for (const name of ["Done", "Title", "Status", "Owner", "Due date", "Points", "Actions"])
      header.append(element("th", "", name));
    head.append(header);
    table.append(head);
    const tbody = element("tbody");
    for (const row of rows) {
      const tr = element("tr");
      for (const key of ["done", "title", "status", "owner", "due", "estimate"] as const) {
        const cell = element("td");
        let input: HTMLInputElement | HTMLElementTagNameMap["ui-select"];
        if (key === "status") {
          input = element("ui-select");
          input.label = "status for " + row.title;
          input.size = "small";
          for (const stage of ["Planned", "In progress", "Done"]) {
            const option = element("ui-option", "", stage);
            option.value = stage;
            input.append(option);
          }
          input.value = row.status;
        } else {
          input = element("input");
          input.type =
            key === "done"
              ? "checkbox"
              : key === "due"
                ? "date"
                : key === "estimate"
                  ? "number"
                  : "text";
          if (key === "done") input.checked = row.done;
          else input.value = String(row[key]);
          if (key === "estimate") {
            input.min = "0";
            input.step = "1";
            input.required = true;
          }
        }
        input.setAttribute("aria-label", key + " for " + row.title);
        input.addEventListener(key === "status" ? "ui-select-change" : "change", () => {
          if (input instanceof HTMLInputElement && input.type === "number") {
            if (!Number.isFinite(input.valueAsNumber) || input.valueAsNumber < 0) {
              input.setCustomValidity("Enter zero or a positive number.");
              input.reportValidity();
              return;
            }
            input.setCustomValidity("");
            update(row.id, key, input.valueAsNumber);
          } else
            update(row.id, key, key === "done" ? (input as HTMLInputElement).checked : input.value);
        });
        cell.append(input);
        tr.append(cell);
      }
      const actions = element("td");
      const remove = button("Delete " + row.title, "", "action.dismiss");
      remove.addEventListener("click", () =>
        onEdit((b) => {
          b.rows = b.rows?.filter((r) => r.id !== row.id);
        }, "Deleted record"),
      );
      actions.append(remove);
      tr.append(actions);
      tbody.append(tr);
    }
    table.append(tbody);
    body.append(table);
    if (!rows.length)
      body.append(
        element("p", "documents-empty", "No records match. Clear a filter or add a record."),
      );
  }
  renderRows();
  return container;
}
