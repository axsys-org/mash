export type LinearWorkspaceView = "list" | "board";
export type LinearFilterCombinator = "and" | "or";
export type LinearFilterField = "status" | "assignee" | "priority";
export type LinearFilterPreset = "all" | "mine" | "release-risk" | "custom";

export interface LinearFilterRule {
  field: LinearFilterField;
  kind: "rule";
  operator: "is";
  value: string;
}

export interface LinearFilterGroup {
  children: LinearFilterNode[];
  combinator: LinearFilterCombinator;
  kind: "group";
}

export type LinearFilterNode = LinearFilterGroup | LinearFilterRule;

export interface LinearFilterRecord {
  assignee: string;
  priority: string;
  status: string;
}

export interface LinearWorkspaceSnapshot {
  filters: LinearFilterGroup;
  preset: LinearFilterPreset;
  query: string;
  version: 1;
  view: LinearWorkspaceView;
}

const filterFields = new Set<LinearFilterField>(["status", "assignee", "priority"]);
const filterPresets = new Set<LinearFilterPreset>(["all", "mine", "release-risk", "custom"]);

export function linearRule(field: LinearFilterField, value: string): LinearFilterRule {
  return { field, kind: "rule", operator: "is", value };
}

export function linearGroup(
  combinator: LinearFilterCombinator,
  children: LinearFilterNode[] = [],
): LinearFilterGroup {
  return { children, combinator, kind: "group" };
}

export function defaultLinearWorkspaceSnapshot(
  view: LinearWorkspaceView = "list",
): LinearWorkspaceSnapshot {
  return {
    filters: linearGroup("and"),
    preset: "all",
    query: "",
    version: 1,
    view,
  };
}

export function linearPresetSnapshot(
  preset: Exclude<LinearFilterPreset, "custom">,
  view: LinearWorkspaceView,
): LinearWorkspaceSnapshot {
  const snapshot = defaultLinearWorkspaceSnapshot(view);
  snapshot.preset = preset;
  if (preset === "mine") {
    snapshot.filters = linearGroup("and", [linearRule("assignee", "maya")]);
  } else if (preset === "release-risk") {
    snapshot.filters = linearGroup("and", [
      linearGroup("or", [linearRule("status", "progress"), linearRule("status", "review")]),
      linearGroup("or", [linearRule("priority", "high"), linearRule("priority", "urgent")]),
    ]);
  }
  return snapshot;
}

export function linearFilterValue(group: LinearFilterGroup, field: LinearFilterField): string {
  const direct = group.children.find(
    (node): node is LinearFilterRule => node.kind === "rule" && node.field === field,
  );
  return direct?.value ?? "all";
}

export function linearSetFilterValue(
  group: LinearFilterGroup,
  field: LinearFilterField,
  value: string,
): LinearFilterGroup {
  const children = group.children.filter((node) => !(node.kind === "rule" && node.field === field));
  if (value !== "all") children.push(linearRule(field, value));
  return linearGroup(group.combinator, children);
}

export function linearMatchesFilter(record: LinearFilterRecord, node: LinearFilterNode): boolean {
  if (node.kind === "rule") return record[node.field] === node.value;
  if (node.children.length === 0) return true;
  return node.combinator === "and"
    ? node.children.every((child) => linearMatchesFilter(record, child))
    : node.children.some((child) => linearMatchesFilter(record, child));
}

export function linearFilterNodeAtPath(
  group: LinearFilterGroup,
  path: readonly number[],
): LinearFilterNode | null {
  let node: LinearFilterNode = group;
  for (const index of path) {
    if (node.kind !== "group" || index < 0 || index >= node.children.length) return null;
    node = node.children[index]!;
  }
  return node;
}

function linearUpdateFilterNode(
  group: LinearFilterGroup,
  path: readonly number[],
  update: (node: LinearFilterNode) => LinearFilterNode,
): LinearFilterGroup {
  if (path.length === 0) {
    const next = update(group);
    return next.kind === "group" ? next : group;
  }
  const [index, ...rest] = path;
  if (index === undefined || index < 0 || index >= group.children.length) return group;
  const child = group.children[index]!;
  const nextChild =
    rest.length === 0
      ? update(child)
      : child.kind === "group"
        ? linearUpdateFilterNode(child, rest, update)
        : child;
  if (nextChild === child) return group;
  const children = [...group.children];
  children[index] = nextChild;
  return linearGroup(group.combinator, children);
}

export function linearAppendFilterNode(
  group: LinearFilterGroup,
  groupPath: readonly number[],
  node: LinearFilterNode,
): LinearFilterGroup {
  return linearUpdateFilterNode(group, groupPath, (target) =>
    target.kind === "group" ? linearGroup(target.combinator, [...target.children, node]) : target,
  );
}

export function linearRemoveFilterNode(
  group: LinearFilterGroup,
  path: readonly number[],
): LinearFilterGroup {
  if (path.length === 0) return group;
  const parentPath = path.slice(0, -1);
  const index = path.at(-1);
  if (index === undefined) return group;
  return linearUpdateFilterNode(group, parentPath, (target) => {
    if (target.kind !== "group" || index < 0 || index >= target.children.length) return target;
    return linearGroup(
      target.combinator,
      target.children.filter((_, childIndex) => childIndex !== index),
    );
  });
}

export function linearSetFilterGroupCombinator(
  group: LinearFilterGroup,
  path: readonly number[],
  combinator: LinearFilterCombinator,
): LinearFilterGroup {
  return linearUpdateFilterNode(group, path, (target) =>
    target.kind === "group" ? linearGroup(combinator, target.children) : target,
  );
}

export function linearUpdateFilterRule(
  group: LinearFilterGroup,
  path: readonly number[],
  update: Partial<Pick<LinearFilterRule, "field" | "value">>,
): LinearFilterGroup {
  return linearUpdateFilterNode(group, path, (target) =>
    target.kind === "rule"
      ? linearRule(update.field ?? target.field, update.value ?? target.value)
      : target,
  );
}

export function serializeLinearWorkspaceSnapshot(snapshot: LinearWorkspaceSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseLinearWorkspaceSnapshot(value: string | null): LinearWorkspaceSnapshot | null {
  if (!value) return null;
  try {
    const candidate: unknown = JSON.parse(value);
    if (!isRecord(candidate) || candidate.version !== 1) return null;
    if (candidate.view !== "list" && candidate.view !== "board") return null;
    if (typeof candidate.query !== "string") return null;
    if (
      typeof candidate.preset !== "string" ||
      !filterPresets.has(candidate.preset as LinearFilterPreset)
    )
      return null;
    const filters = parseFilterNode(candidate.filters);
    if (!filters || filters.kind !== "group") return null;
    return {
      filters,
      preset: candidate.preset as LinearFilterPreset,
      query: candidate.query,
      version: 1,
      view: candidate.view,
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFilterNode(value: unknown, depth = 0): LinearFilterNode | null {
  if (!isRecord(value) || depth > 4) return null;
  if (value.kind === "rule") {
    if (
      typeof value.field !== "string" ||
      !filterFields.has(value.field as LinearFilterField) ||
      value.operator !== "is" ||
      typeof value.value !== "string" ||
      value.value.length > 80
    )
      return null;
    return linearRule(value.field as LinearFilterField, value.value);
  }
  if (
    value.kind !== "group" ||
    (value.combinator !== "and" && value.combinator !== "or") ||
    !Array.isArray(value.children) ||
    value.children.length > 12
  )
    return null;
  const children = value.children.map((child) => parseFilterNode(child, depth + 1));
  if (children.some((child) => child === null)) return null;
  return linearGroup(value.combinator, children as LinearFilterNode[]);
}
