import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";

/**
 * Searchable commands that can be composed into a dialog or shown inline.
 * @tag ui-command
 * @summary Filters and selects application commands with the keyboard.
 * @example Quick actions
 * <ui-command label="Quick actions"><ui-command-item value="new">New document</ui-command-item><ui-command-item value="search">Search files</ui-command-item></ui-command>
 * @slot - Command items, with optional labelled sections.
 * @slot search-prefix - Search icon or leading context.
 * @slot search-suffix - Search shortcut or adjacent action.
 * @slot empty - Content shown when the query has no matches.
 * @slot footer - Shortcut hints or contextual actions.
 * @csspart root - The command surface.
 * @csspart search - Native search input.
 * @csspart search-row - Search input and its accessories.
 * @csspart search-prefix - Leading search accessory.
 * @csspart search-suffix - Trailing search accessory.
 * @csspart list - The command list.
 * @csspart empty - No-results state.
 * @csspart footer - Optional contextual footer.
 * @mashnode root command
 * @mashnode search-row row root
 * @mashnode search query search-row
 * @mashnode search-prefix prefix search-row
 * @mashnode search-suffix suffix search-row
 * @mashnode list list root
 * @mashnode empty empty list
 * @mashnode footer footer root
 * @fires {CustomEvent<{ value: string }>} ui-command-select - The user activates a command.
 */
export class UICommand extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    query: { type: String, reflect: true },
    searchable: { type: Boolean, reflect: true },
    _empty: { state: true },
    _footer: { state: true },
  };
  /** Accessible command collection name. */
  declare label: string;
  /** Search input hint. */
  declare placeholder: string;
  /** Current search query. */
  declare query: string;
  /** Show a search input; false exposes a keyboard-focusable quick-action list. */
  declare searchable: boolean;
  protected _empty = false;
  protected _footer = false;
  #active?: UICommandItem;
  #observer = new MutationObserver(() => this.#filter());
  constructor() {
    super();
    this.label = "Commands";
    this.placeholder = "Search commands…";
    this.query = "";
    this.searchable = true;
    this.addEventListener("ui-command-item-select", this.#onSelect);
    this.addEventListener("pointermove", (event) => {
      const item = event
        .composedPath()
        .find((node): node is UICommandItem => node instanceof UICommandItem);
      if (item && this.#available.includes(item)) this.#activate(item);
    });
  }
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }
      [part="search-row"] {
        display: flex;
        align-items: center;
      }
      [part="search"] {
        flex: 1;
        min-inline-size: 0;
        inline-size: 100%;
      }
      slot[name="search-prefix"],
      slot[name="search-suffix"] {
        display: none;
      }
      slot[data-filled] {
        display: block;
      }
      [part="search"]::-webkit-search-cancel-button {
        display: none;
      }
      [part="list"] {
        max-block-size: 20rem;
        overflow: auto;
      }
    `,
  ];
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["disabled", "keywords"],
    });
  }
  override disconnectedCallback(): void {
    this.#observer.disconnect();
    super.disconnectedCallback();
  }
  get #items(): UICommandItem[] {
    return [...this.querySelectorAll<UICommandItem>("ui-command-item")].filter(
      (item) => item.closest("ui-command") === this,
    );
  }
  get #available(): UICommandItem[] {
    return this.#items.filter((item) => !item.hidden && !item.disabled);
  }
  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("query") || changed.has("searchable")) this.#filter();
  }
  /** Focuses the search field or the searchless command list. */
  override focus(options?: FocusOptions): void {
    this.renderRoot
      .querySelector<HTMLElement>(this.searchable ? '[part="search"]' : '[part="list"]')
      ?.focus(options);
  }
  /** Highlights an available command, scrolls it into view, and keeps keyboard ownership on the collection. */
  highlight(value: string): boolean {
    const item = this.#available.find((entry) => entry.value === value);
    if (!item) return false;
    this.#activate(item);
    this.#reveal(item);
    this.focus({ preventScroll: true });
    return true;
  }
  #reveal(item?: UICommandItem): void {
    const list = this.renderRoot.querySelector<HTMLElement>('[part="list"]');
    if (!item || !list) return;
    const viewport = list.getBoundingClientRect();
    const row = item.getBoundingClientRect();
    if (row.top < viewport.top) list.scrollTop += row.top - viewport.top;
    else if (row.bottom > viewport.bottom) list.scrollTop += row.bottom - viewport.bottom;
  }
  #filter = (): void => {
    const terms = this.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    for (const item of this.#items) {
      const text = `${item.textContent} ${item.keywords}`.toLocaleLowerCase();
      item.hidden = !terms.every((term) => text.includes(term));
    }
    for (const group of this.querySelectorAll<HTMLElement>('[role="group"]')) {
      if (group.closest("ui-command") !== this) continue;
      group.hidden = !this.#items.some((item) => group.contains(item) && !item.hidden);
    }
    this._empty = !this.#items.some((item) => !item.hidden);
    this.#activate(this.#available.includes(this.#active!) ? this.#active : this.#available[0]);
  };
  #activate(item?: UICommandItem): void {
    this.#active = item;
    for (const entry of this.#items) entry.selected = entry === item;
    const control = this.renderRoot.querySelector<HTMLElement>(
      this.searchable ? '[part="search"]' : '[part="list"]',
    );
    if (control) control.ariaActiveDescendantElement = item ?? null;
  }
  #select(item?: UICommandItem): void {
    if (!item || item.disabled || item.hidden) return;
    this.#activate(item);
    this.dispatchEvent(
      new CustomEvent("ui-command-select", {
        bubbles: true,
        composed: true,
        detail: { value: item.value },
      }),
    );
  }
  #onSelect = (event: Event): void => {
    const item = event.target as UICommandItem;
    if (this.#items.includes(item)) {
      event.stopPropagation();
      this.#select(item);
    }
  };
  #onKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    const source = event.composedPath()[0];
    if (
      source !== this.renderRoot.querySelector('[part="search"]') &&
      source !== this.renderRoot.querySelector('[part="list"]')
    )
      return;
    const items = this.#available;
    if (!this.searchable && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      const next = event.key === "Home" ? items[0] : items.at(-1);
      this.#activate(next);
      this.#reveal(next);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const current = items.indexOf(this.#active!);
      const next =
        items[(current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
      this.#activate(next);
      this.#reveal(next);
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.#select(this.#active);
    } else if (event.key === "Escape" && this.query) {
      event.preventDefault();
      event.stopPropagation();
      this.query = "";
    }
  };
  #accessoryChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    slot.toggleAttribute("data-filled", slot.assignedNodes().length > 0);
  };
  protected override render(): TemplateResult {
    return html`<div part="root" @keydown=${this.#onKeydown}>
      ${
        this.searchable
          ? html`<div part="search-row">
              <slot
                name="search-prefix"
                part="search-prefix"
                @slotchange=${this.#accessoryChange}
              ></slot
              ><input
                part="search"
                type="search"
                role="combobox"
                aria-label=${this.label}
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls="commands"
                placeholder=${this.placeholder}
                .value=${this.query}
                @input=${(event: Event) => {
                  this.query = (event.target as HTMLInputElement).value;
                }}
              /><slot
                name="search-suffix"
                part="search-suffix"
                @slotchange=${this.#accessoryChange}
              ></slot>
            </div>`
          : ""
      }
      <div
        id="commands"
        part="list"
        role="listbox"
        aria-label=${this.label}
        tabindex=${this.searchable ? "-1" : "0"}
      >
        <slot @slotchange=${this.#filter}></slot>
      </div>
      <div part="empty" role="status" ?hidden=${!this._empty}>
        <slot name="empty">No commands found.</slot>
      </div>
      <div part="footer" ?hidden=${!this._footer}>
        <slot
          name="footer"
          @slotchange=${(event: Event) => {
            this._footer = (event.target as HTMLSlotElement).assignedElements().length > 0;
          }}
        ></slot>
      </div>
    </div>`;
  }
}

/**
 * One selectable application command.
 * @tag ui-command-item
 * @summary Names an action in a searchable command list.
 * @example Command
 * <ui-command><ui-command-item value="new">New document</ui-command-item></ui-command>
 * @slot - Command label and description.
 * @slot description - Supporting command context.
 * @slot icon - Leading command icon.
 * @slot shortcut - Keyboard hint.
 * @csspart root - Selectable command row.
 * @csspart icon - Leading icon region.
 * @csspart label - Authored command text.
 * @csspart text - Label and description stack.
 * @csspart description - Supporting command context.
 * @csspart shortcut - Trailing shortcut region.
 * @mashnode root command
 * @mashnode icon icon root
 * @mashnode text text root
 * @mashnode label label text
 * @mashnode description description text
 * @mashnode shortcut shortcut root
 * @fires {CustomEvent} ui-command-item-select - Requests activation from the command owner.
 */
export class UICommandItem extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    keywords: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
  };
  /** Application action identifier. */
  declare value: string;
  /** Additional search terms. */
  declare keywords: string;
  /** Exclude the command from activation. */
  declare disabled: boolean;
  /** Current keyboard highlight, assigned by the command list. */
  declare selected: boolean;
  #internals = this.attachInternals();
  constructor() {
    super();
    this.value = "";
    this.keywords = "";
    this.disabled = false;
    this.selected = false;
    this.#internals.role = "option";
    this.addEventListener("click", () => {
      if (!this.disabled)
        this.dispatchEvent(
          new CustomEvent("ui-command-item-select", { bubbles: true, composed: true }),
        );
    });
  }
  static override styles = [
    baseStyles,
    css`
      :host([hidden]) {
        display: none !important;
      }
      [part="text"] {
        flex: 1;
        min-inline-size: 0;
        display: grid;
      }
      slot[name="icon"],
      slot[name="shortcut"],
      slot[name="description"] {
        display: none;
      }
      slot[data-filled] {
        display: block;
      }
    `,
  ];
  protected override updated(): void {
    this.#internals.ariaSelected = String(this.selected);
    this.#internals.ariaDisabled = String(this.disabled);
  }
  #slotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    slot.toggleAttribute("data-filled", slot.assignedNodes().length > 0);
  };
  protected override render(): TemplateResult {
    return html`<div part="root">
      <slot name="icon" part="icon" @slotchange=${this.#slotChange}></slot>
      <div part="text">
        <slot part="label"></slot
        ><slot name="description" part="description" @slotchange=${this.#slotChange}></slot>
      </div>
      <slot name="shortcut" part="shortcut" @slotchange=${this.#slotChange}></slot>
    </div>`;
  }
}
