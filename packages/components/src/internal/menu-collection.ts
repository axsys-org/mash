export interface MenuCollectionItem extends HTMLElement {
  readonly hasSubmenu: boolean;
  readonly submenuOpen: boolean;
  showSubmenu(focusFirst?: boolean): void;
  dismissSubmenu(restoreFocus?: boolean): void;
}

export interface MenuKeyboardOptions {
  nested?: boolean;
  parentItem?: () => MenuCollectionItem | null;
  dismissNested?: () => void;
}

/** Shared collection interaction for menu and context-menu realizations. */
export class MenuCollectionController {
  readonly #host: HTMLElement;

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  items(): MenuCollectionItem[] {
    return [...this.#host.querySelectorAll<MenuCollectionItem>(":scope > ui-menu-item")];
  }

  itemFromEvent(event: Event): MenuCollectionItem | undefined {
    return event
      .composedPath()
      .find(
        (node): node is MenuCollectionItem =>
          node instanceof HTMLElement && node.localName === "ui-menu-item",
      );
  }

  handleKeydown(event: KeyboardEvent, options: MenuKeyboardOptions = {}): boolean {
    const source = this.itemFromEvent(event);
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
}
