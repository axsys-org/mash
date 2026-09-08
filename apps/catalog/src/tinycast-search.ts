type TinycastSearchControl = HTMLElement & { value?: string };

function syncTinycastSearch(menu: HTMLElement, value: string): void {
  const query = value.trim().toLocaleLowerCase();
  const items = [
    ...menu.querySelectorAll<HTMLElement>(":scope > ui-menu-item[data-tinycast-group]"),
  ];

  for (const item of items) {
    const searchText = item.dataset.tinycastSearchText?.toLocaleLowerCase() ?? "";
    item.hidden = Boolean(query) && !searchText.includes(query);
    item.removeAttribute("data-tinycast-selected");
  }

  for (const label of menu.querySelectorAll<HTMLElement>("[data-tinycast-group-label]")) {
    const group = label.dataset.tinycastGroupLabel;
    label.hidden = !items.some((item) => item.dataset.tinycastGroup === group && !item.hidden);
  }

  const visibleItems = items.filter((item) => !item.hidden);
  const selected = query
    ? visibleItems[0]
    : items.find((item) => item.dataset.tinycastDefault !== undefined);
  selected?.setAttribute("data-tinycast-selected", "");

  const empty = menu.querySelector<HTMLElement>("[data-tinycast-empty]");
  if (empty) empty.hidden = visibleItems.length > 0;
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
