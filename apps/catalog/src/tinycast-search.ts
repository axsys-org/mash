type TinycastSearchControl = HTMLElement & { value?: string };

function syncTinycastSearch(menu: HTMLElement, value: string): void {
  const terms = value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const items = [
    ...menu.querySelectorAll<HTMLElement>(":scope > ui-menu-item[data-tinycast-group]"),
  ];

  for (const item of items) {
    const searchText = item.dataset.tinycastSearchText?.toLocaleLowerCase() ?? "";
    item.hidden = !terms.every((term) => searchText.includes(term));
    item.removeAttribute("data-tinycast-selected");
  }

  for (const label of menu.querySelectorAll<HTMLElement>("[data-tinycast-group-label]")) {
    const group = label.dataset.tinycastGroupLabel;
    label.hidden = !items.some((item) => item.dataset.tinycastGroup === group && !item.hidden);
  }

  const visibleItems = items.filter((item) => !item.hidden);
  const selected =
    terms.length > 0
      ? visibleItems[0]
      : items.find((item) => item.dataset.tinycastDefault !== undefined);
  selected?.setAttribute("data-tinycast-selected", "");

  const empty = menu.querySelector<HTMLElement>("[data-tinycast-empty]");
  if (empty) empty.hidden = visibleItems.length > 0;
  const count = menu.querySelector<HTMLOutputElement>("[data-tinycast-count]");
  if (count)
    count.value = `${visibleItems.length} ${visibleItems.length === 1 ? "component" : "components"}`;
}

function syncTinycastSearchFromEvent(event: Event): void {
  const path = event.composedPath();
  const search = path.find(
    (node): node is TinycastSearchControl =>
      node instanceof HTMLElement && node.dataset.tinycastSearch !== undefined,
  );
  if (!search) return;
  const menu = search.closest<HTMLElement>("[data-tinycast-menu]");
  const nativeControl = path.find(
    (node): node is HTMLInputElement => node instanceof HTMLInputElement,
  );
  if (menu) syncTinycastSearch(menu, nativeControl?.value ?? search.value ?? "");
}

document.addEventListener("input", syncTinycastSearchFromEvent);
document.addEventListener("keyup", syncTinycastSearchFromEvent);

document.addEventListener("ui-menu-select", (event) => {
  const menu = event.target;
  if (!(menu instanceof HTMLElement) || !menu.matches("[data-catalog-navigator]")) return;
  const { value: tagName } = (event as CustomEvent<{ value: string }>).detail;
  globalThis.parent.postMessage(
    { type: "mash-catalog-navigate", tagName },
    globalThis.location.origin,
  );
});
