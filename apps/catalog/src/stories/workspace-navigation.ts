import "@mash/ui/icon";
import "./workspace-navigation.css";

type WorkspaceView = "documents" | "study" | "projects" | "command-center";
const views: { id: WorkspaceView; label: string; icon: string }[] = [
  { id: "documents", label: "Documents", icon: "object.document" },
  { id: "projects", label: "Projects", icon: "object.table" },
  { id: "study", label: "Study", icon: "object.layers" },
  { id: "command-center", label: "Search", icon: "action.search" },
];

export function workspaceHref(view: WorkspaceView, params: Record<string, string> = {}): string {
  const url = new URL(`/stories/${view}`, location.origin);
  const theme = document.documentElement.dataset.theme;
  if (theme) url.searchParams.set("theme", theme);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.pathname + url.search;
}

export function workspaceNavigation(active: WorkspaceView): string {
  return `<nav class="workspace-navigation" aria-label="Workspace views">${views
    .map(
      (view) =>
        `<a href="${workspaceHref(view.id)}" title="${view.label}"${view.id === active ? ' aria-current="page"' : ""}><ui-icon name="${view.icon}" aria-hidden="true"></ui-icon><span>${view.label}</span></a>`,
    )
    .join("")}</nav>`;
}
