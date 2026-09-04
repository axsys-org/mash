import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import {
  AnchoredPositionController,
  type AnchoredAlign,
  type AnchoredPlacement,
} from "../internal/anchored-position.js";
import { baseStyles } from "../internal/base-styles.js";
import type { OverlayChangeReason, OverlayOpenChangeDetail } from "../internal/overlay.js";
import type { UIOption } from "../option/option.js";

let selectListId = 0;

export type SelectFilter = "contains" | "none" | "starts-with";
export type SelectSize = "small" | "medium" | "large";

function optionLabel(option: UIOption): string {
  return [...option.childNodes]
    .filter((node) => !(node instanceof HTMLElement && node.slot))
    .map((node) => node.textContent ?? "")
    .join("")
    .trim();
}

/**
 * A form-associated button/listbox select with slotted `ui-option` values.
 *
 * The control preserves native form participation while exposing a complete
 * portable listbox anatomy. The option slot is intentional: callers retain
 * rich labels and disabled options without leaking array rendering policy into
 * the component API.
 *
 * @tag ui-select
 * @summary Selects one slotted option and submits its value with a form.
 *
 * @example Project visibility
 * <ui-select name="visibility" value="team" label="Visibility">
 *   <ui-option value="private">Private</ui-option>
 *   <ui-option value="team">Team</ui-option>
 * </ui-select>
 *
 * @slot - `ui-option` elements.
 * @slot label - Optional visible label content.
 * @slot value - Optional authored selected-value presentation.
 * @slot icon - Optional symbolic content inside the trigger.
 * @slot clear - Optional control that clears the current value.
 * @slot backdrop - Optional renderer-specific backdrop content.
 * @slot arrow - Optional connector between the popup and its anchor.
 * @slot empty - Content shown when no enabled option is available.
 * @slot scroll-up - Optional action that reveals earlier options.
 * @slot scroll-down - Optional action that reveals later options.
 *
 * @csspart root - The complete select realization.
 * @csspart label - The optional visible label.
 * @csspart control - The trigger and adjacent authored actions.
 * @csspart trigger - The native listbox trigger button.
 * @csspart value - The selected-value presentation inside the trigger.
 * @csspart icon - Optional symbolic content inside the trigger.
 * @csspart clear - The optional clear action.
 * @csspart backdrop - The optional layer behind the popup.
 * @csspart positioner - The owner of anchor-relative popup placement.
 * @csspart popup - The floating option surface.
 * @csspart arrow - The popup-to-anchor connector.
 * @csspart search - The optional search-field row above the listbox.
 * @csspart search-control - The native search input.
 * @csspart status - The live result-count announcement.
 * @csspart empty - The authored empty-option content.
 * @csspart viewport - The natively scrollable option viewport.
 * @csspart scroll-up - The action that reveals earlier options.
 * @csspart scroll-down - The action that reveals later options.
 * @csspart listbox - The semantic option list.
 * @csspart list - Alias for the semantic option list.
 * @csspart children - The authored option collection.
 *
 * @cssstate open - Matches `:state(open)` while choices are visible.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate readonly - Matches `:state(readonly)` while selection cannot change.
 * @cssstate empty - Matches `:state(empty)` while no enabled option is available.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 *
 * @fires {CustomEvent<{ value: string }>} ui-select-change - Emitted after selection changes.
 * @fires {CustomEvent<{ value: string }>} ui-select-confirm - Emitted when the open option surface closes with the current value.
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-select-open-change - Emitted after interaction changes list visibility, including a portable reason.
 *
 * @mashrole slot arrow pointer arrow
 * @mashrole part arrow pointer arrow
 * @mashrole slot clear clear clear
 * @mashrole part clear clear clear
 * @mashrole slot empty empty empty
 * @mashrole part empty empty empty
 * @mashrole slot scroll-up scroll-backward scroll-start
 * @mashrole part scroll-up scroll-backward scroll-start
 * @mashrole slot scroll-down scroll-forward scroll-end
 * @mashrole part scroll-down scroll-forward scroll-end
 * @mashrole part list listbox listbox
 * @mashnode root root
 * @mashnode label label root
 * @mashnode control group root
 * @mashnode trigger trigger control
 * @mashnode value value trigger
 * @mashnode icon icon trigger
 * @mashnode clear clear control
 * @mashnode backdrop backdrop root
 * @mashnode positioner positioner root
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode arrow pointer popup
 * @mashnode search search popup
 * @mashnode search-control control search
 * @mashnode status status popup
 * @mashnode empty empty popup
 * @mashnode viewport viewport popup
 * @mashnode scroll-start scroll-backward popup
 * @mashnode scroll-end scroll-forward popup
 * @mashnode listbox listbox viewport
 * @mashnode children children listbox
 * @mashnode size size root
 * @mashnode searchable searchable root
 * @mashnode open open root
 * @mashnode invalid invalid trigger
 * @mashrole event ui-select-change change value
 * @mashrole event ui-select-confirm confirm value
 * @mashrole event ui-select-open-change open open
 * @mashrole slot default children children
 */
export class UISelect extends LitElement {
  static formAssociated = true;
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static override properties = {
    value: { type: String, reflect: true },
    size: { type: String, reflect: true },
    searchable: { type: Boolean, reflect: true },
    filter: { type: String, reflect: true },
    searchPlaceholder: { type: String, attribute: "search-placeholder", reflect: true },
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readonly: { type: Boolean, reflect: true },
    placement: { type: String, reflect: true },
    align: { type: String, reflect: true },
    offset: { type: Number, reflect: true },
    collisionPadding: { type: Number, attribute: "collision-padding", reflect: true },
    _resultCount: { type: Number, state: true },
  };

  /** Value of the selected option. */
  declare value: string;
  /** Physical scale of the select trigger. */
  declare size: SelectSize;
  /** Shows an inline search field inside the option popup. */
  declare searchable: boolean;
  /** Client-side label matching policy for the popup search field. */
  declare filter: SelectFilter;
  /** Hint shown inside the popup search field. */
  declare searchPlaceholder: string;
  /** Form key used for submission. */
  declare name: string;
  /** Accessible name for the select trigger. */
  declare label: string;
  /** Text shown before an option is selected. */
  declare placeholder: string;
  /** Whether the option list is visible. */
  declare open: boolean;
  /** Prevents selection and form participation. */
  declare disabled: boolean;
  /** Prevents selection changes while preserving focus and submitted values. */
  declare readonly: boolean;
  /** Preferred side of the option popup before collision handling. */
  declare placement: AnchoredPlacement;
  /** Logical popup alignment along the selected side. */
  declare align: AnchoredAlign;
  /** Gap in CSS pixels between the popup and trigger. */
  declare offset: number;
  /** Minimum viewport-edge clearance in CSS pixels. */
  declare collisionPadding: number;
  declare private _resultCount: number;

  readonly #internals: ElementInternals;
  readonly #listboxId = `ui-select-listbox-${++selectListId}`;
  #formDisabled = false;
  #defaultValue: string | undefined;
  #typeahead = "";
  #typeaheadTimer: number | undefined;
  #fieldDescription = "";
  #fieldInvalid = false;
  #query = "";
  readonly #collectionObserver = new MutationObserver(() => {
    this.#sync();
    this.#positioner.queue();
  });
  readonly #positioner = new AnchoredPositionController(this, {
    anchor: () => this.renderRoot.querySelector<HTMLElement>("[part~='control']"),
    popup: () => this.renderRoot.querySelector<HTMLElement>("[part~='popup']"),
    positioner: () => this.renderRoot.querySelector<HTMLElement>("[part~='positioner']"),
    config: () => this,
  });

  constructor() {
    super();
    this.value = "";
    this.size = "medium";
    this.searchable = false;
    this.filter = "contains";
    this.searchPlaceholder = "Search options";
    this.name = "";
    this.label = "Select an option";
    this.placeholder = "Select…";
    this.open = false;
    this.disabled = false;
    this.readonly = false;
    this.placement = "bottom";
    this.align = "start";
    this.offset = 4;
    this.collisionPadding = 4;
    this._resultCount = 0;
    this.#internals = this.attachInternals();
    this.addEventListener("ui-option-select", this.#onOptionSelect);
    this.addEventListener("click", this.#onComposedClick);
    this.addEventListener("keydown", this.#onOptionKeydown);
  }

  static override styles = [
    baseStyles,
    css`
      [part~="root"],
      [part~="label"],
      [part~="control"],
      [part~="value"],
      [part~="icon"],
      [part~="clear"],
      [part~="arrow"],
      [part~="search"],
      [part~="empty"],
      [part~="scroll-up"],
      [part~="scroll-down"] {
        display: contents;
      }

      [part~="search"][hidden],
      [part~="empty"][hidden] {
        display: none;
      }

      [part~="status"] {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ];

  get #isDisabled(): boolean {
    return this.disabled || this.#formDisabled;
  }
  #options(): UIOption[] {
    return [...this.querySelectorAll<UIOption>("ui-option")];
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue ??= this.value;
    this.#collectionObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  override disconnectedCallback(): void {
    this.#collectionObserver.disconnect();
    this.#positioner.stop();
    this.ownerDocument.removeEventListener("pointerdown", this.#onDocumentPointerDown, true);
    super.disconnectedCallback();
  }

  #sync(): void {
    const needle = this.#query.trim().toLocaleLowerCase();
    const options = this.#options();
    for (const option of options) {
      const label = optionLabel(option).toLocaleLowerCase();
      option.hidden =
        this.searchable &&
        Boolean(needle) &&
        this.filter !== "none" &&
        (this.filter === "starts-with" ? !label.startsWith(needle) : !label.includes(needle));
      option.selected = option.value === this.value;
    }
    for (const group of this.querySelectorAll<HTMLElement>("ui-option-group")) {
      const groupOptions = [...group.querySelectorAll<UIOption>("ui-option")];
      group.hidden = groupOptions.length > 0 && groupOptions.every((option) => option.hidden);
    }
    this._resultCount = options.filter((option) => !option.hidden && !option.disabled).length;
    if (this._resultCount === 0) this.#internals.states.add("empty");
    else this.#internals.states.delete("empty");
    const active = options.find((option) => option.active);
    if (active && (active.hidden || active.disabled)) this.#setActive(null, false);
    if (this.#isDisabled || !this.name) {
      this.#internals.setFormValue(null);
    } else {
      this.#internals.setFormValue(this.value);
    }
    if (this.open) this.#internals.states.add("open");
    else this.#internals.states.delete("open");
    if (this.#isDisabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
    for (const state of ["readonly"] as const) {
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("value") ||
      changed.has("name") ||
      changed.has("open") ||
      changed.has("disabled") ||
      changed.has("readonly") ||
      changed.has("searchable") ||
      changed.has("filter")
    )
      this.#sync();
  }

  protected override updated(): void {
    if (this.open) {
      this.#positioner.start();
      this.#positioner.queue();
      this.ownerDocument.addEventListener("pointerdown", this.#onDocumentPointerDown, true);
    } else {
      this.#positioner.stop();
      this.ownerDocument.removeEventListener("pointerdown", this.#onDocumentPointerDown, true);
    }
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }
  formResetCallback(): void {
    this.value = this.#defaultValue ?? "";
    this.open = false;
    this.#query = "";
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string") this.value = state;
  }

  #setOpen(open: boolean, reason: OverlayChangeReason): void {
    if (this.#isDisabled || (this.readonly && open) || this.open === open) return;
    this.open = open;
    if (!open) {
      this.#query = "";
      this.#setActive(null, false);
    }
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-select-open-change", {
        bubbles: true,
        composed: true,
        detail: { open, reason },
      }),
    );
    if (!open) {
      this.dispatchEvent(
        new CustomEvent<{ value: string }>("ui-select-confirm", {
          bubbles: true,
          composed: true,
          detail: { value: this.value },
        }),
      );
    }
  }

  #onDocumentPointerDown = (event: PointerEvent): void => {
    if (this.open && !event.composedPath().includes(this)) this.#setOpen(false, "outside");
  };

  /** @internal Cooperative field context without introducing visual anatomy. */
  _setFieldContext(context: { description: string; invalid: boolean }): void {
    this.#fieldDescription = context.description;
    this.#fieldInvalid = context.invalid;
    if (context.invalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
    this.requestUpdate();
  }

  #onOptionSelect = (event: Event): void => {
    if (this.readonly) return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.localName !== "ui-option") return;
    this.#commitOption(target as UIOption);
  };

  #commitOption(option: UIOption): void {
    this.value = option.value;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-select-change", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
    this.#setOpen(false, "select");
    queueMicrotask(() => this.#focusTrigger());
  }

  #visibleOptions(): UIOption[] {
    return this.#options().filter((option) => !option.disabled && !option.hidden);
  }

  #setActive(option: UIOption | null, focus = true): void {
    for (const candidate of this.#options()) candidate.active = candidate === option;
    if (focus) option?.focus();
  }

  #activeOption(): UIOption | undefined {
    return this.#visibleOptions().find((option) => option.active);
  }

  #moveActive(current: UIOption, direction: 1 | -1): void {
    const options = this.#visibleOptions();
    const index = options.indexOf(current);
    if (index === -1 || options.length === 0) return;
    this.#setActive(options[(index + direction + options.length) % options.length] ?? null);
  }

  #focusInitial(direction: 1 | -1): void {
    const options = this.#visibleOptions();
    if (options.length === 0) return;
    const selected = options.find((option) => option.selected);
    this.#setActive(selected ?? options[direction === 1 ? 0 : options.length - 1] ?? null);
  }

  #matchTypeahead(key: string, select: boolean): void {
    window.clearTimeout(this.#typeaheadTimer);
    this.#typeahead += key.toLocaleLowerCase();
    this.#typeaheadTimer = window.setTimeout(() => (this.#typeahead = ""), 500);
    const options = this.#visibleOptions();
    const match = options.find((option) =>
      optionLabel(option).toLocaleLowerCase().startsWith(this.#typeahead),
    );
    if (!match) return;
    if (select) this.#commitOption(match);
    else this.#setActive(match);
  }

  #searchInput(): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>("[part~='search-control']");
  }

  #focusTrigger(): void {
    this.renderRoot.querySelector<HTMLButtonElement>("button[part~=trigger]")?.focus();
  }

  #focusAfterOpen(target: "option" | "search", direction: 1 | -1): void {
    void this.updateComplete.then(() => {
      if (!this.open) return;
      if (target === "search") {
        this.#searchInput()?.focus();
        return;
      }
      this.#focusInitial(direction);
    });
  }

  #onTriggerClick = (event: MouseEvent): void => {
    event.preventDefault();
    const nextOpen = !this.open;
    this.#setOpen(nextOpen, "trigger");
    if (nextOpen) this.#focusAfterOpen(this.searchable ? "search" : "option", 1);
  };

  #onSearchInput = (event: Event): void => {
    if (this.readonly) return;
    this.#query = (event.currentTarget as HTMLInputElement).value;
    this.#setActive(null, false);
    this.#sync();
    this.#positioner.queue();
  };

  #onSearchKeydown = (event: KeyboardEvent): void => {
    if (this.readonly && event.key !== "Escape") return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.#setOpen(false, "escape");
      queueMicrotask(() => this.#focusTrigger());
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.#focusInitial(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Tab") {
      this.#setOpen(false, "keyboard");
      return;
    }
    if (event.key !== "Enter") return;
    const active = this.#activeOption();
    const [onlyOption, extraOption] = this.#visibleOptions();
    const target = active ?? (onlyOption && !extraOption ? onlyOption : undefined);
    if (!target) return;
    event.preventDefault();
    this.#commitOption(target);
  };

  #onTriggerKeydown = (event: KeyboardEvent): void => {
    if (this.readonly && event.key !== "Escape") return;
    if (event.key === "Escape") {
      this.#setOpen(false, "escape");
      return;
    }
    if (
      !this.open &&
      this.searchable &&
      event.key.length === 1 &&
      event.key !== " " &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      this.#query = event.key;
      this.#sync();
      this.#setOpen(true, "keyboard");
      this.#focusAfterOpen("search", 1);
      return;
    }
    if (
      !this.open &&
      event.key.length === 1 &&
      event.key !== " " &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      this.#matchTypeahead(event.key, true);
      return;
    }
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      if (this.open && (event.key === "Enter" || event.key === " ")) {
        const active = this.#activeOption();
        if (active) this.#commitOption(active);
        else this.#setOpen(false, "select");
        return;
      }
      const direction: 1 | -1 = event.key === "ArrowUp" ? -1 : 1;
      this.#setOpen(true, "keyboard");
      const focusTarget =
        event.key === "ArrowDown" || event.key === "ArrowUp" || !this.searchable
          ? "option"
          : "search";
      this.#focusAfterOpen(focusTarget, direction);
    }
  };

  #onOptionKeydown = (event: KeyboardEvent): void => {
    const option = event
      .composedPath()
      .find(
        (node): node is UIOption => node instanceof HTMLElement && node.localName === "ui-option",
      );
    if (!option || (this.readonly && event.key !== "Escape")) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.#moveActive(option, event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const options = this.#visibleOptions();
      this.#setActive(options[event.key === "Home" ? 0 : options.length - 1] ?? null);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.#commitOption(option);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.#setOpen(false, "escape");
      queueMicrotask(() => this.#focusTrigger());
      return;
    }
    if (event.key === "Tab") {
      this.#setOpen(false, "keyboard");
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.#matchTypeahead(event.key, false);
    }
  };

  #onSlotChange = (): void => this.#sync();

  #eventIsWithinSlot(event: Event, name: string): boolean {
    const path = event.composedPath();
    return [...this.querySelectorAll<HTMLElement>(`:scope > [slot="${name}"]`)].some((element) =>
      path.includes(element),
    );
  }

  #onComposedClick = (event: MouseEvent): void => {
    if (this.#eventIsWithinSlot(event, "label")) {
      this.#focusTrigger();
      return;
    }
    if (!this.#eventIsWithinSlot(event, "clear") || this.#isDisabled || this.readonly) return;
    event.preventDefault();
    if (!this.value) return;
    this.value = "";
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-select-change", {
        bubbles: true,
        composed: true,
        detail: { value: "" },
      }),
    );
    this.#setOpen(false, "clear");
    queueMicrotask(() => this.#focusTrigger());
  };

  /** Opens the option surface through the portable open-change contract. */
  show(): void {
    this.#setOpen(true, "imperative");
  }

  /** Dismisses the option surface through the portable open-change contract. */
  dismiss(reason: OverlayChangeReason = "imperative"): void {
    this.#setOpen(false, reason);
  }

  /** Toggles the option surface while retaining a transition reason. */
  toggle(reason: OverlayChangeReason = "imperative"): void {
    this.#setOpen(!this.open, reason);
  }

  protected override render(): TemplateResult {
    const selected = this.#options().find((option) => option.value === this.value);
    const selectedText = selected ? optionLabel(selected) : "";
    return html`
      <span part="root">
        <span part="label"><slot name="label"></slot></span>
        <span part="control">
          <button
            part="trigger"
            type="button"
            role="combobox"
            aria-label=${this.label}
            aria-description=${this.#fieldDescription || nothing}
            aria-invalid=${this.#fieldInvalid ? "true" : nothing}
            aria-controls=${this.open ? this.#listboxId : nothing}
            aria-expanded=${this.open ? "true" : "false"}
            aria-haspopup="listbox"
            ?disabled=${this.#isDisabled}
            aria-readonly=${this.readonly ? "true" : nothing}
            @click=${this.#onTriggerClick}
            @keydown=${this.#onTriggerKeydown}
          >
            <span part="value">
              <slot name="value">${selectedText || this.placeholder}</slot>
            </span>
            <span part="icon"><slot name="icon"></slot></span>
          </button>
          <span part="clear"><slot name="clear"></slot></span>
        </span>
        <span part="backdrop" ?hidden=${!this.open}><slot name="backdrop"></slot></span>
        <div part="positioner" ?hidden=${!this.open}>
          <div part="popup">
            <span part="scroll-up"><slot name="scroll-up"></slot></span>
            <span part="arrow"><slot name="arrow"></slot></span>
            <span part="search" ?hidden=${!this.searchable}>
              <input
                part="search-control"
                type="search"
                .value=${this.#query}
                placeholder=${this.searchPlaceholder}
                aria-label=${this.searchPlaceholder}
                aria-controls=${this.#listboxId}
                ?disabled=${this.#isDisabled}
                ?readonly=${this.readonly}
                @input=${this.#onSearchInput}
                @keydown=${this.#onSearchKeydown}
              />
            </span>
            <span part="status" role="status" aria-live="polite">
              ${this._resultCount} ${this._resultCount === 1 ? "option" : "options"} available
            </span>
            <span part="empty" ?hidden=${this._resultCount !== 0}>
              <slot name="empty"></slot>
            </span>
            <div part="viewport">
              <div
                part="listbox list"
                id=${this.#listboxId}
                role="listbox"
                aria-label=${this.label}
              >
                <slot part="children" @slotchange=${this.#onSlotChange}></slot>
              </div>
            </div>
            <span part="scroll-down"><slot name="scroll-down"></slot></span>
          </div>
        </div>
      </span>
    `;
  }
}
