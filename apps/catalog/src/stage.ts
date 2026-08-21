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

import "./stage.css";

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

document.documentElement.dataset.stageReady = "true";
