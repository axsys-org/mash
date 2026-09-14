export interface MenuCollectionItem extends HTMLElement {
  readonly hasSubmenu: boolean;
  readonly submenuOpen: boolean;
  readonly textValue: string;
  showSubmenu(focusFirst?: boolean): void;
  dismissSubmenu(restoreFocus?: boolean): void;
  setHoverSuppressed(active: boolean): void;
}

export interface MenuKeyboardOptions {
  nested?: boolean;
  parentItem?: () => MenuCollectionItem | null;
  dismissNested?: () => void;
}

/** Shared collection interaction for menu and context-menu realizations. */
export class MenuCollectionController {
  readonly #host: HTMLElement;
  #typeahead = "";
  #typeaheadTimer: number | undefined;

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  items(): MenuCollectionItem[] {
    return [
      ...this.#host.querySelectorAll<MenuCollectionItem>(":scope > ui-menu-item:not([hidden])"),
    ];
  }

  itemFromEvent(event: Event): MenuCollectionItem | undefined {
    return event
      .composedPath()
      .find(
        (node): node is MenuCollectionItem =>
          node instanceof HTMLElement && node.localName === "ui-menu-item",
      );
  }

  destroy(): void {
    if (this.#typeaheadTimer !== undefined) window.clearTimeout(this.#typeaheadTimer);
  }

  #matchTypeahead(event: KeyboardEvent, source?: MenuCollectionItem): boolean {
    if (
      event.key.length !== 1 ||
      event.key === " " ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return false;
    const key = event.key.toLocaleLowerCase();
    const repeated =
      this.#typeahead.length > 0 && [...this.#typeahead].every((part) => part === key);
    this.#typeahead = repeated ? key : `${this.#typeahead}${key}`;
    if (this.#typeaheadTimer !== undefined) window.clearTimeout(this.#typeaheadTimer);
    this.#typeaheadTimer = window.setTimeout(() => {
      this.#typeahead = "";
      this.#typeaheadTimer = undefined;
    }, 500);

    const items = this.items();
    const start = Math.max(0, items.indexOf(source as MenuCollectionItem) + 1);
    const ordered = [...items.slice(start), ...items.slice(0, start)];
    const target = ordered.find((item) =>
      item.textValue.toLocaleLowerCase().startsWith(this.#typeahead),
    );
    if (!target) return false;
    event.preventDefault();
    target.focus();
    return true;
  }

  handleKeydown(event: KeyboardEvent, options: MenuKeyboardOptions = {}): boolean {
    const source = this.itemFromEvent(event);
    if (this.#matchTypeahead(event, source)) return true;
    if (event.key === "ArrowLeft" && options.nested) {
      event.preventDefault();
      event.stopPropagation();
      options.dismissNested?.();
      options.parentItem?.()?.focus();
      return true;
    }
    if (event.key === "ArrowRight" && source?.hasSubmenu) {
      event.preventDefault();
      event.stopPropagation();
      source.showSubmenu(true);
      return true;
    }
    if (!new Set(["ArrowDown", "ArrowUp", "Home", "End"]).has(event.key)) return false;
    const items = this.items();
    if (items.length === 0) return false;
    const index = items.indexOf(source as MenuCollectionItem);
    const target =
      event.key === "Home"
        ? items[0]
        : event.key === "End"
          ? items.at(-1)
          : index === -1
            ? event.key === "ArrowDown"
              ? items[0]
              : items.at(-1)
            : items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
    event.preventDefault();
    target?.focus();
    return true;
  }

  dismissSiblingSubmenus(active?: MenuCollectionItem): void {
    for (const sibling of this.items()) {
      if (sibling !== active && sibling.submenuOpen) sibling.dismissSubmenu();
    }
  }

  suppressHoverSelection(active?: MenuCollectionItem | null): void {
    for (const item of this.items()) item.setHoverSuppressed(item === active);
  }
}
