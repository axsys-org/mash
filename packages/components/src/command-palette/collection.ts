import type { UICommandItem } from "./command-palette.js";

/** Optional data adapter; authored ui-command-item rows remain equally supported. */
export interface CommandItem {
  [key: string]: unknown;
  value: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  keywords?: readonly string[];
  group?: string;
  disabled?: boolean;
  onSelect?: () => void;
}
export type CommandItemRenderer = (item: CommandItem) => Node | string;

export class CommandCollection {
  readonly sources = new WeakMap<UICommandItem, CommandItem>();
  #root: HTMLElement | undefined;
  #rows: UICommandItem[] = [];
  constructor(private readonly host: HTMLElement) {}

  render(items: readonly CommandItem[] | undefined, renderer?: CommandItemRenderer): void {
    if (!items) {
      this.#root?.remove();
      this.#root = undefined;
      this.#rows = [];
      return;
    }
    const doc = this.host.ownerDocument;
    this.#root ??= doc.createElement("div");
    this.#root.setAttribute("data-command-collection", "");
    if (!this.#root.isConnected) this.host.append(this.#root);
    const previous = new Map(this.#rows.map((row) => [row.value, row]));
    this.#rows = items.map((item) => {
      const row = previous.get(item.value) ?? doc.createElement("ui-command-item");
      previous.delete(item.value);
      row.value = item.value;
      row.disabled = Boolean(item.disabled);
      row.keywords = (item.keywords ?? []).join(" ");
      row.setAttribute("aria-label", item.label);
      row.replaceChildren(renderer?.(item) ?? item.label);
      if (!renderer && item.description) {
        const description = doc.createElement("span");
        description.slot = "description";
        description.textContent = item.description;
        row.append(description);
      }
      if (item.icon) {
        const icon = doc.createElement("ui-icon");
        icon.slot = "icon";
        icon.setAttribute("name", item.icon);
        icon.setAttribute("label", "");
        row.prepend(icon);
      }
      if (item.shortcut) {
        const shortcut = doc.createElement("ui-kbd");
        shortcut.slot = "shortcut";
        shortcut.setAttribute("shortcut", item.shortcut);
        row.append(shortcut);
      }
      this.sources.set(row, item);
      return row;
    });
    previous.forEach((row) => row.remove());
  }

  group(suggestions: readonly string[], label: string): void {
    if (!this.#root) return;
    const doc = this.host.ownerDocument;
    const suggested = suggestions
      .map((value) => this.#rows.find((row) => row.value === value))
      .filter(
        (row, index, rows): row is UICommandItem => Boolean(row) && rows.indexOf(row) === index,
      );
    const groups = new Map<string, UICommandItem[]>();
    for (const row of this.#rows) {
      if (suggested.includes(row)) continue;
      const name = this.sources.get(row)?.group ?? "";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(row);
    }
    const sections: HTMLElement[] = [];
    const section = (name: string, rows: UICommandItem[]): void => {
      const group = doc.createElement("section");
      if (name) {
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", name);
        const heading = doc.createElement("span");
        heading.setAttribute("data-command-heading", "");
        heading.textContent = name;
        group.append(heading);
      }
      group.append(...rows);
      sections.push(group);
    };
    if (suggested.length) section(label, suggested);
    groups.forEach((rows, name) => section(name, rows));
    this.#root.replaceChildren(...sections);
  }
}
