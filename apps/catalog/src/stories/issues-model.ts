import { readState, writeState } from "./shared.js";
import { documentBlockText, ensureDocuments, readNotebook } from "./documents-store.js";

export const statuses = [
  "Backlog",
  "Todo",
  "In progress",
  "In review",
  "Done",
  "Canceled",
] as const;
export type Status = (typeof statuses)[number];
export const priorities = ["No priority", "Urgent", "High", "Medium", "Low"] as const;
export const people = ["Unassigned", "You", "Alex Morgan", "Sam Chen", "Jordan Lee"];
export type Issue = {
  id: number;
  title: string;
  description: string;
  document?: string;
  status: Status;
  priority: number;
  assignee: string;
  project: string;
  cycle: string;
  labels: string[];
  estimate: number;
  due: string;
  archived: boolean;
  comments: { id: string; body: string; created: string }[];
  activity: { body: string; created: string }[];
};
export type Project = {
  id: string;
  name: string;
  description: string;
  lead: string;
  target: string;
};
export type IssueState = {
  version: 1;
  issues: Issue[];
  projects: Project[];
  favorites: number[];
  nextId: number;
};
export function initialState(): IssueState {
  const titles = [
    "Refine the first-run experience",
    "Make keyboard shortcuts discoverable",
    "Keep drafts when switching views",
    "Improve empty states across the workspace",
    "Ship the new navigation",
    "Resolve layout shift in compact panels",
    "Add attachment previews",
    "Make search results easier to scan",
    "Review contrast in dark appearance",
    "Preserve focus after closing a tab",
    "Add a release checklist",
    "Document the composition patterns",
    "Reduce time to first interaction",
    "Support selecting a range of records",
    "Polish the command menu",
    "Finish the settings layout",
    "Add project milestones",
    "Improve mobile navigation",
    "Make bulk actions reversible",
    "Keep sorting consistent across views",
    "Review icon alignment",
    "Handle loading and retry states",
    "Test screen-reader navigation",
    "Prepare the September release",
  ];
  const projects = [
    {
      id: "workspace",
      name: "Workspace",
      description: "A calm, focused home for everyday work.",
      lead: "You",
      target: "2026-09-25",
    },
    {
      id: "foundations",
      name: "Foundations",
      description: "Consistent interaction, accessibility, and performance.",
      lead: "Alex Morgan",
      target: "2026-10-09",
    },
    {
      id: "launch",
      name: "Public launch",
      description: "Documentation and a considered first impression.",
      lead: "Sam Chen",
      target: "2026-10-16",
    },
  ];
  return {
    version: 1,
    nextId: 125,
    projects,
    favorites: [101, 109],
    issues: titles.map((title, index) => ({
      id: 101 + index,
      title,
      description: `${title}.\n\nConsider the complete interaction, including keyboard access, empty content, and retained state.\n\nAcceptance\n• The primary action works end to end.\n• The layout remains usable at compact widths.\n• Existing work survives navigation.`,
      status: statuses[[2, 1, 3, 0, 4, 2, 1, 3, 2, 4, 1, 0][index % 12]!]!,
      priority: [2, 3, 2, 4, 1][index % 5]!,
      assignee: people[1 + (index % 4)]!,
      project: projects[index % 3]!.id,
      cycle: index % 4 === 0 ? "Next cycle" : "Current cycle",
      labels: [index % 3 === 0 ? "Design" : index % 3 === 1 ? "Engineering" : "Improvement"],
      estimate: [1, 2, 3, 5][index % 4]!,
      due: "",
      archived: false,
      comments: [],
      activity: [{ body: "Added to the workspace", created: "2026-09-01T09:00:00.000Z" }],
    })),
  };
}
export function isIssueState(value: unknown): value is IssueState {
  const state = value as IssueState | null;
  if (
    !state ||
    state.version !== 1 ||
    !Number.isSafeInteger(state.nextId) ||
    state.nextId < 1 ||
    !Array.isArray(state.favorites) ||
    !state.favorites.every(Number.isSafeInteger) ||
    !Array.isArray(state.projects) ||
    !Array.isArray(state.issues)
  )
    return false;
  const timestamp = (entry: { body: string; created: string }) =>
    !!entry &&
    typeof entry.body === "string" &&
    typeof entry.created === "string" &&
    Number.isFinite(Date.parse(entry.created));
  return (
    state.projects.every(
      (project) =>
        !!project &&
        [project.id, project.name, project.description, project.lead, project.target].every(
          (item) => typeof item === "string",
        ),
    ) &&
    new Set(state.projects.map((project) => project.id)).size === state.projects.length &&
    state.issues.every(
      (issue) =>
        !!issue &&
        Number.isSafeInteger(issue.id) &&
        issue.id > 0 &&
        issue.id < state.nextId &&
        [
          issue.title,
          issue.description,
          issue.assignee,
          issue.project,
          issue.cycle,
          issue.due,
        ].every((item) => typeof item === "string") &&
        (issue.document === undefined || typeof issue.document === "string") &&
        statuses.includes(issue.status) &&
        Number.isInteger(issue.priority) &&
        issue.priority >= 0 &&
        issue.priority < priorities.length &&
        Number.isFinite(issue.estimate) &&
        issue.estimate >= 0 &&
        typeof issue.archived === "boolean" &&
        Array.isArray(issue.labels) &&
        issue.labels.every((label) => typeof label === "string") &&
        Array.isArray(issue.comments) &&
        issue.comments.every((comment) => timestamp(comment) && typeof comment.id === "string") &&
        Array.isArray(issue.activity) &&
        issue.activity.every(timestamp),
    ) &&
    new Set(state.issues.map((issue) => issue.id)).size === state.issues.length
  );
}
export function filterIssues(
  state: IssueState,
  filter: {
    view: string;
    query: string;
    status: string;
    assignee: string;
    priority: string;
    project: string;
  },
): Issue[] {
  const query = filter.query.trim().toLowerCase();
  return state.issues.filter((issue) => {
    if (filter.view === "archive" ? !issue.archived : issue.archived) return false;
    if (filter.view === "mine" && issue.assignee !== "You") return false;
    if (filter.view === "inbox" && issue.status !== "In review") return false;
    if (filter.view === "favorites" && !state.favorites.includes(issue.id)) return false;
    if (filter.view === "cycles" && issue.cycle !== "Current cycle") return false;
    return (
      (!query ||
        `${issue.id} ${issue.title} ${issue.description} ${issue.labels.join(" ")}`
          .toLowerCase()
          .includes(query)) &&
      (!filter.status || issue.status === filter.status) &&
      (!filter.assignee || issue.assignee === filter.assignee) &&
      (!filter.priority || issue.priority === Number(filter.priority)) &&
      (!filter.project || issue.project === filter.project)
    );
  });
}

export const issueStorageKey = "mash-story-projects-v1";

/** Migrate legacy descriptions once; shared documents own the live title and blocks. */
export function connectIssueDocuments(state: IssueState): void {
  const legacy = state.issues.filter((issue) => !issue.document);
  if (legacy.length) {
    ensureDocuments(
      legacy.map((issue) => ({
        id: `issue:${issue.id}`,
        title: issue.title,
        text: issue.description,
      })),
    );
    for (const issue of legacy) issue.document = `issue:${issue.id}`;
  }
  const documents = new Map(readNotebook().documents.map((doc) => [doc.id, doc]));
  for (const issue of state.issues) {
    const doc = documents.get(issue.document!);
    if (!doc) continue;
    issue.title = doc.title;
    issue.description = doc.blocks.map(documentBlockText).filter(Boolean).join("\n\n");
  }
}

export function readIssueState(): IssueState {
  const state = readState(issueStorageKey, initialState, isIssueState);
  const before = JSON.stringify(state);
  connectIssueDocuments(state);
  if (JSON.stringify(state) !== before) writeState(issueStorageKey, state);
  return state;
}

/** Refresh searchable summaries without copying or rewriting document content. */
export function refreshIssueDocuments(state: IssueState): boolean {
  const documents = new Map(readNotebook().documents.map((doc) => [doc.id, doc]));
  let changed = false;
  for (const issue of state.issues) {
    const doc = documents.get(issue.document ?? "");
    if (!doc) continue;
    const description = doc.blocks.map(documentBlockText).filter(Boolean).join("\n\n");
    if (issue.title !== doc.title || issue.description !== description) {
      issue.title = doc.title;
      issue.description = description;
      changed = true;
    }
  }
  return changed;
}
