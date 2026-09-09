import { LitElement, css, html, type PropertyValues, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";

/**
 * Searchable commands that can be composed into a dialog or shown inline.
 * @tag ui-command
 * @summary Filters and selects application commands with the keyboard.
 * @example Quick actions
 * <ui-command label="Quick actions"><ui-command-item value="new">New document</ui-command-item><ui-command-item value="search">Search files</ui-command-item></ui-command>
 * @slot - Command items, with optional labelled sections.
 * @slot empty - Content shown when the query has no matches.
 * @slot footer - Shortcut hints or contextual actions.
 * @csspart root - The command surface.
 * @csspart search - Native search input.
 * @csspart list - The command list.
 * @csspart empty - No-results state.
 * @csspart footer - Optional contextual footer.
 * @mashnode root command
 * @mashnode search query root
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
  #active?: UICommandItem;
  #observer = new MutationObserver(() => this.#filter());
  constructor() {
    super();
    this.label = "Commands";
    this.placeholder = "Search commands…";
    this.query = "";
    this.searchable = true;
    this.addEventListener("ui-command-item-select", this.#onSelect);
  }
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }
      [part="search"] {
        inline-size: 100%;
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
  #filter = (): void => {
    const query = this.query.trim().toLocaleLowerCase();
    for (const item of this.#items)
      item.hidden = !`${item.textContent} ${item.keywords}`.toLocaleLowerCase().includes(query);
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
    const items = this.#available;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const current = items.indexOf(this.#active!);
      const next =
        items[(current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
      this.#activate(next);
      next?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.#select(this.#active);
    } else if (event.key === "Escape" && this.query) {
      event.preventDefault();
      event.stopPropagation();
      this.query = "";
    }
  };
  protected override render(): TemplateResult {
    return html`<div part="root" @keydown=${this.#onKeydown}>
      ${
        this.searchable
          ? html`<input
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
            />`
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
      <div part="footer"><slot name="footer"></slot></div>
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
 * @slot icon - Leading command icon.
 * @slot shortcut - Keyboard hint.
 * @csspart root - Selectable command row.
 * @csspart icon - Leading icon region.
 * @csspart label - Authored command text.
 * @csspart shortcut - Trailing shortcut region.
 * @mashnode root command
 * @mashnode icon icon root
 * @mashnode label label root
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
  static override styles = baseStyles;
  protected override updated(): void {
    this.#internals.ariaSelected = String(this.selected);
    this.#internals.ariaDisabled = String(this.disabled);
  }
  protected override render(): TemplateResult {
    return html`<div part="root">
      <slot name="icon" part="icon"></slot><slot part="label"></slot
      ><slot name="shortcut" part="shortcut"></slot>
    </div>`;
  }
}
