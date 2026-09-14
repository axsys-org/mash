import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import {
  AnchoredPositionController,
  type AnchoredAlign,
  type AnchoredPlacement,
} from "../internal/anchored-position.js";
import { baseStyles } from "../internal/base-styles.js";
import type { OverlayChangeReason, OverlayOpenChangeDetail } from "../internal/overlay.js";
import {
  PresenceLifecycleController,
  type PresenceLifecycleContext,
  type PresenceLifecycleEventDetail,
  type PresenceState,
} from "../internal/presence-lifecycle.js";
import { stringArrayConverter } from "../internal/string-array.js";
import {
  ComboboxCollection,
  type ComboboxItem,
  type ComboboxItemRenderer,
  itemRecord,
} from "./collection.js";
import { ReorderMotionController } from "../internal/reorder-motion.js";
export type { ComboboxItem, ComboboxItemRenderer } from "./collection.js";

import type { UIOption } from "../option/option.js";

let comboboxListId = 0;

export type ComboboxFilter =
  "contains" | "none" | "starts-with" | ((item: ComboboxItem, query: string) => boolean);
export type ComboboxSize = "inherit" | "default" | "compact" | "small" | "medium" | "large";

function optionLabel(option: UIOption): string {
  if (option.hasAttribute("aria-label")) return option.getAttribute("aria-label")!;
  return [...option.childNodes]
    .filter((node) => !(node instanceof HTMLElement && node.slot))
    .map((node) => node.textContent ?? "")
    .join("")
    .trim();
}

/**
 * A form-associated editable listbox with filterable slotted options.
 *
 * The component leaves option sourcing to the caller—static slots, rendered
 * search results, or an async wrapper all work—while it owns editable input,
 * listbox relationships, keyboard opening, selection, and form state.
 *
 * @tag ui-combobox
 * @summary Search, select, and create with data-backed or authored options.
 *
 * @example Framework selector
 * <ui-combobox name="framework" label="Framework" placeholder="Search frameworks">
 *   <ui-option value="Next.js">Next.js</ui-option>
 *   <ui-option value="SvelteKit">SvelteKit</ui-option>
 * </ui-combobox>
 *
 * @slot - `ui-option` suggestions or `ui-option-row` grid rows.
 * @slot label - Optional visible label content.
 * @slot chips - Selected-value chips used when `multiple` is active.
 * @slot value - Optional authored value/chip presentation beside the input.
 * @slot trigger - Optional control that toggles the suggestion popup.
 * @slot icon - Optional symbolic content associated with the input.
 * @slot clear - Optional control that clears the current value.
 * @slot backdrop - Optional renderer-specific backdrop content.
 * @slot arrow - Optional connector between the popup and its anchor.
 * @slot loading - Content shown while externally sourced suggestions are pending.
 * @slot empty - Content shown when filtering leaves no suggestions.
 * @slot footer - Persistent action content shown below the suggestion list.
 *
 * @csspart trigger-control - Default disclosure button; replace with the trigger slot.
 * @csspart clear-control - Default clear button; replace with the clear slot.
 * @csspart highlight - Moving pointer and keyboard highlight behind option rows.
 * @csspart error - Visible validation message.
 * @mashrole part trigger-control trigger trigger
 * @mashrole part clear-control clear clear
 * @mashrole part highlight indicator highlight
 * @mashnode highlight indicator viewport
 * @mashnode error error root
 * @mashnode variant variant root
 * @csspart root - The complete combobox realization.
 * @csspart label - The optional visible label.
 * @csspart input-group - The input, value, and adjacent actions.
 * @csspart chips - The selected-value chip collection.
 * @csspart control - The native editable combobox input.
 * @csspart value - Optional authored value or chip presentation.
 * @csspart trigger - The optional popup trigger.
 * @csspart icon - Optional symbolic content.
 * @csspart clear - The optional clear action.
 * @csspart backdrop - The optional layer behind the popup.
 * @csspart positioner - The owner of anchor-relative popup placement.
 * @csspart popup - The floating suggestion surface.
 * @csspart arrow - The popup-to-anchor connector.
 * @csspart status - The live result-count announcement.
 * @csspart loading - The authored pending-results content.
 * @csspart empty - The authored empty-result content.
 * @csspart viewport - The natively scrollable suggestion viewport.
 * @csspart listbox - The semantic listbox of suggestions.
 * @csspart list - Alias for the semantic suggestion list.
 * @csspart children - The authored suggestion collection.
 * @csspart footer - The authored action area below suggestions.
 *
 * @cssstate open - Matches `:state(open)` while suggestions are visible.
 * @cssstate present - Matches while the popup is rendered, including exit motion.
 * @cssstate entering - Matches while the popup is entering.
 * @cssstate active - Matches after enter motion settles.
 * @cssstate exiting - Matches while the popup is exiting.
 * @cssstate reduced-motion - Matches `:state(reduced-motion)` when the environment suppresses motion.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate readonly - Matches `:state(readonly)` while selection cannot change.
 * @cssstate multiple - Matches `:state(multiple)` while multiple values are selected.
 * @cssstate grid - Matches `:state(grid)` while suggestions use two-dimensional navigation.
 * @cssstate loading - Matches `:state(loading)` while externally sourced suggestions are pending.
 * @cssstate empty - Matches `:state(empty)` while no enabled suggestion is available.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 *
 * @fires {CustomEvent<{ value: string }>} ui-combobox-input - Emitted as the editable text changes.
 * @fires {CustomEvent<{ value: string; values: string[] }>} ui-combobox-change - Emitted after selection changes.
 * @fires {CustomEvent<{ value: string; values: string[] }>} ui-combobox-confirm - Emitted when the open suggestion surface closes with the current values.
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-combobox-open-change - Emitted after interaction changes suggestion visibility, including a portable reason.
 * @fires {CustomEvent<PresenceLifecycleEventDetail>} mash-presence-start - Announces combobox popup enter or exit presence.
 * @fires {CustomEvent<PresenceLifecycleEventDetail>} mash-presence-end - Announces completion or interruption of combobox popup presence.
 *
 * @mashrole part input-group group input-group
 * @mashrole slot arrow pointer arrow
 * @mashrole part arrow pointer arrow
 * @mashrole part list listbox listbox
 * @mashrole attribute values value values
 * @mashrole attribute grid grid-mode grid-mode
 * @mashrole slot footer footer footer
 * @mashrole state grid grid-mode grid-mode
 * @mashnode root root
 * @mashnode label label root
 * @mashnode input-group group root
 * @mashnode chips chips input-group
 * @mashnode control control input-group
 * @mashnode input input control
 * @mashnode value value input-group
 * @mashnode trigger trigger input-group
 * @mashnode icon icon input-group
 * @mashnode clear clear input-group
 * @mashnode backdrop backdrop root
 * @mashnode positioner positioner root
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode arrow pointer popup
 * @mashnode status status popup
 * @mashnode empty empty popup
 * @mashnode viewport viewport popup
 * @mashnode listbox listbox viewport
 * @mashnode children children listbox
 * @mashnode footer footer popup
 * @mashnode values value root
 * @mashnode size size root
 * @mashaxis size control-size
 * @mashnode grid-mode grid-mode root
 * @mashnode open open root
 * @mashnode present present popup
 * @mashnode entering entering popup
 * @mashnode active active popup
 * @mashnode exiting exiting popup
 * @mashnode reduced-motion reduced-motion popup
 * @mashnode invalid invalid control
 * @mashrole event ui-combobox-input input input
 * @mashrole event ui-combobox-change change values
 * @mashrole event ui-combobox-confirm confirm values
 * @mashrole event ui-combobox-open-change open open
 * @mashrole slot default children children
 */
export class UICombobox extends LitElement {
  static formAssociated = true;
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };
  static override properties = {
    items: { attribute: false },
    renderItem: { attribute: false },
    onCreate: { attribute: false },
    query: { type: String },
    hideSelected: { type: Boolean, attribute: "hide-selected", reflect: true },
    clearable: { type: Boolean, reflect: true },
    variant: { type: String, reflect: true },
    error: { type: String },
    value: { type: String, reflect: true },
    values: { converter: stringArrayConverter, reflect: true },
    multiple: { type: Boolean, reflect: true },
    grid: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readonly: { type: Boolean, reflect: true },
    filter: { attribute: "filter" },
    loading: { type: Boolean, reflect: true },
    loadingLabel: { type: String, attribute: "loading-label", reflect: true },
    placement: { type: String, reflect: true },
    align: { type: String, reflect: true },
    offset: { type: Number, reflect: true },
    collisionPadding: { type: Number, attribute: "collision-padding", reflect: true },
    popupPresent: { state: true },
    _resultCount: { type: Number, state: true },
    _activeOptionId: { type: String, state: true },
  };

  /** Data-backed options. Omit to author ui-option children; assignment preserves stable values. */
  declare items: readonly ComboboxItem[] | undefined;
  /** Render the content of data-backed options as a node or text, without replacing option semantics. */
  declare renderItem: ComboboxItemRenderer | undefined;
  /** Return a new item to append and select it, or undefined to decline creation. */
  declare onCreate: ((query: string) => ComboboxItem | void) | undefined;
  /** Current search text. With items, typing never changes the selected form value. */
  declare query: string;
  /** Remove selected options from a multiple-selection list. */
  declare hideSelected: boolean;
  /** Provide a clear action without requiring an authored slot. */
  declare clearable: boolean;
  /** Resting field boundary; both variants retain focus and error feedback. */
  declare variant: "bordered" | "borderless";
  /** Visible error, also exposed to assistive technology. */
  declare error: string;
  /** Current editable or selected value. */
  declare value: string;
  /** Selected values while `multiple` is active. */
  declare values: string[];
  /** Allows more than one option to be selected. */
  declare multiple: boolean;
  /** Uses grid roles and two-dimensional option-row navigation. */
  declare grid: boolean;
  /** Physical scale of the editable control; inherit follows data-mash-size. */
  declare size: ComboboxSize;
  /** Form key used for submission. */
  declare name: string;
  /** Accessible name for the editable input. */
  declare label: string;
  /** Hint shown while the input is empty. */
  declare placeholder: string;
  /** Whether suggestions are visible. */
  declare open: boolean;
  /** Prevents editing and form participation. */
  declare disabled: boolean;
  /** Prevents edits while preserving focus and submitted values. */
  declare readonly: boolean;
  /** Client-side label matching policy; `none` leaves filtering to the caller. */
  declare filter: ComboboxFilter;
  /** Marks externally sourced suggestions as pending. */
  declare loading: boolean;
  /** Text fallback for the authored loading slot. */
  declare loadingLabel: string;
  /** Preferred side of the suggestion popup before collision handling. */
  declare placement: AnchoredPlacement;
  /** Logical popup alignment along the selected side. */
  declare align: AnchoredAlign;
  /** Gap in CSS pixels between the popup and editable control. */
  declare offset: number;
  /** Minimum viewport-edge clearance in CSS pixels. */
  declare collisionPadding: number;
  /** Internal render-presence; public state remains the `open` contract. */
  declare protected popupPresent: boolean;
  declare private _resultCount: number;
  declare private _activeOptionId: string;

  readonly #collection = new ComboboxCollection(this);
  readonly #hoverMotion = new ReorderMotionController(this);
  #editing = false;
  #createOption: UIOption | undefined;
  readonly #internals: ElementInternals;
  readonly #listboxId = `ui-combobox-listbox-${++comboboxListId}`;
  #formDisabled = false;
  #defaultValue: string | undefined;
  #defaultValues: string[] | undefined;
  #fieldDescription = "";
  #fieldInvalid = false;
  readonly #collectionObserver = new MutationObserver(() => {
    this.#sync();
    this.#positioner.queue();
  });
  readonly #positioner = new AnchoredPositionController(this, {
    anchor: () => this.renderRoot.querySelector<HTMLElement>("[part~='input-group']"),
    popup: () => this.renderRoot.querySelector<HTMLElement>("[part~='popup']"),
    positioner: () => this.renderRoot.querySelector<HTMLElement>("[part~='positioner']"),
    config: () => this,
  });
  readonly #presence: PresenceLifecycleController<"entering" | "exiting">;

  constructor() {
    super();
    this.items = undefined;
    this.query = "";
    this.hideSelected = false;
    this.clearable = false;
    this.variant = "bordered";
    this.error = "";
    this.value = "";
    this.values = [];
    this.multiple = false;
    this.grid = false;
    this.size = "inherit";
    this.name = "";
    this.label = "Search options";
    this.placeholder = "";
    this.open = false;
    this.disabled = false;
    this.readonly = false;
    this.filter = "contains";
    this.loading = false;
    this.loadingLabel = "Loading options…";
    this.placement = "bottom";
    this.align = "start";
    this.offset = 4;
    this.collisionPadding = 4;
    this.popupPresent = false;
    this._resultCount = 0;
    this._activeOptionId = "";
    this.#internals = this.attachInternals();
    this.#presence = new PresenceLifecycleController(this, {
      target: () => this.renderRoot.querySelector<HTMLElement>("[part~='popup']"),
      present: () => this.popupPresent,
      setPresent: (present) => {
        this.popupPresent = present;
      },
      setState: (state, present) => this.#setPresenceState(state, present),
      onStart: (context) => this.#emitPresenceEvent("mash-presence-start", context),
      onFinish: (context) => this.#emitPresenceEvent("mash-presence-end", context),
      onSettle: (phase) => {
        if (phase === "absent") this.#positioner.stop();
        else this.#positioner.queue();
      },
    });
    this.addEventListener("ui-option-select", this.#onOptionSelect);
    this.addEventListener("ui-chip-remove", this.#onChipRemove);
    this.addEventListener("keydown", this.#onChipKeydown);
    this.addEventListener("click", this.#onComposedClick);
    this.addEventListener("pointermove", (event) => {
      if (!this.open || event.pointerType === "touch") return;
      const option = event
        .composedPath()
        .find((node) => node instanceof HTMLElement && node.localName === "ui-option") as
        UIOption | undefined;
      if (
        option &&
        option.closest("ui-combobox, ui-autocomplete") === this &&
        !option.disabled &&
        !option.hidden &&
        option.id !== this._activeOptionId
      )
        this.#setActive(option, false);
    });
    this.addEventListener("focusout", () =>
      queueMicrotask(() => {
        if (!this.matches(":focus-within")) this.#setOpen(false, "outside");
      }),
    );
  }

  static override styles = [
    baseStyles,
    css`
      [part~="root"],
      [part~="label"],
      [part~="input-group"],
      [part~="chips"],
      [part~="value"],
      [part~="trigger"],
      [part~="icon"],
      [part~="clear"],
      [part~="arrow"],
      [part~="loading"],
      [part~="empty"],
      [part~="footer"] {
        display: contents;
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
    return [...this.querySelectorAll<UIOption>("ui-option")].filter(
      (option) => option.closest("ui-combobox, ui-autocomplete") === this,
    );
  }

  #chips(): Array<HTMLElement & { disabled?: boolean; value?: string }> {
    return [
      ...this.querySelectorAll<HTMLElement & { disabled?: boolean; value?: string }>("ui-chip"),
    ].filter((chip) => {
      const owner = chip.closest("ui-combobox, ui-autocomplete");
      const chipSlot = chip.slot === "chips" ? chip : chip.closest<HTMLElement>('[slot="chips"]');
      return owner === this && chipSlot?.parentElement === this;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultValue ??= this.value;
    this.#defaultValues ??= [...this.values];
    this.#collectionObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  override disconnectedCallback(): void {
    this.#collectionObserver.disconnect();
    this.#presence.destroy();
    this.#hoverMotion.destroy();
    this.#positioner.stop();
    this.ownerDocument.removeEventListener("pointerdown", this.#onDocumentPointerDown, true);
    super.disconnectedCallback();
  }

  #sync(): void {
    const options = this.#options();
    const selected = options.find(
      (option) => option.value === this.value && option !== this.#createOption,
    );
    const search = this.#editing
      ? this.query
      : selected
        ? ""
        : this.items
          ? this.query
          : this.value;
    const needle = search.trim().toLocaleLowerCase();
    for (const option of options) {
      if (option === this.#createOption) continue;
      const label = optionLabel(option).toLocaleLowerCase();
      option.selected = this.multiple
        ? this.values.includes(option.value)
        : option.value === this.value;
      const item = this.#collection.sources.get(option) ?? {
        value: option.value,
        label: optionLabel(option),
      };
      const matches =
        typeof this.filter === "function"
          ? this.filter(item, search)
          : !needle ||
            this.filter === "none" ||
            (this.filter === "starts-with" ? label.startsWith(needle) : label.includes(needle));
      option.hidden = !matches || (this.multiple && this.hideSelected && option.selected);
    }
    if (this.#createOption) {
      const text = search.trim();
      this.#createOption.hidden =
        !text ||
        options.some(
          (option) =>
            option !== this.#createOption && optionLabel(option).toLocaleLowerCase() === needle,
        );
      const label = `Create “${text}”`;
      if (this.#createOption.textContent !== label) this.#createOption.textContent = label;
    }
    this.#collection.chips(
      this.multiple ? this.values : [],
      options,
      this.#isDisabled,
      this.readonly,
    );
    for (const row of this.querySelectorAll<HTMLElement>("ui-option-row, ui-option-group")) {
      row.hidden = [...row.querySelectorAll<UIOption>("ui-option")].every(
        (option) => option.hidden,
      );
    }
    this._resultCount = options.filter((option) => !option.hidden && !option.disabled).length;
    if (this._resultCount === 0) this.#internals.states.add("empty");
    else this.#internals.states.delete("empty");
    if (this.loading) this.#internals.states.add("loading");
    else this.#internals.states.delete("loading");
    const active = options.find((option) => option.id === this._activeOptionId);
    if (active && (active.hidden || active.disabled)) this.#setActive(null);
    if (this.#isDisabled || !this.name) {
      this.#internals.setFormValue(null);
    } else if (this.multiple) {
      const formValue = new FormData();
      for (const value of this.values) formValue.append(this.name, value);
      this.#internals.setFormValue(formValue);
    } else {
      this.#internals.setFormValue(this.value);
    }
    if (this.error || this.#fieldInvalid) this.#internals.states.add("invalid");
    else this.#internals.states.delete("invalid");
    if (this.open) this.#internals.states.add("open");
    else this.#internals.states.delete("open");
    if (this.#isDisabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
    for (const state of ["readonly", "multiple", "grid"] as const) {
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("open") && this.open) this.popupPresent = true;
    if (changed.has("items") || changed.has("renderItem"))
      this.#collection.render(this.items, this.renderItem);
    if (changed.has("items") && this.#createOption) this.append(this.#createOption);
    if (changed.has("onCreate")) {
      this.#createOption?.remove();
      this.#createOption = undefined;
      if (this.onCreate) {
        this.#createOption = this.ownerDocument.createElement("ui-option");
        this.append(this.#createOption);
      }
    }
    if (changed.has("value") && (this.items || this.value !== this.query)) this.#editing = false;
    if (changed.has("value") && !this.#editing) this.query = "";
    if (this.#isDisabled || this.readonly) this.open = false;
    if (
      changed.size === 0 ||
      [...changed.keys()].some(
        (key) => !["_activeOptionId", "_resultCount", "popupPresent"].includes(String(key)),
      )
    )
      this.#sync();
  }

  protected override updated(changed: PropertyValues<this>): void {
    const input = this.renderRoot.querySelector<HTMLInputElement>("input");
    if (input)
      input.ariaActiveDescendantElement =
        this.#options().find((option) => option.id === this._activeOptionId) ?? null;
    this.#paintHighlight();
    if (changed.has("open")) {
      if (this.open) {
        this.#positioner.start();
        this.#positioner.queue();
        this.ownerDocument.addEventListener("pointerdown", this.#onDocumentPointerDown, true);
        this.#presence.enter("entering");
      } else {
        this.ownerDocument.removeEventListener("pointerdown", this.#onDocumentPointerDown, true);
        this.#presence.exit("exiting", changed.get("open") === true);
      }
    } else if (this.open || this.popupPresent) {
      this.#positioner.queue();
    }
  }

  #setPresenceState(state: PresenceState, present: boolean): void {
    if (present) this.#internals.states.add(state);
    else this.#internals.states.delete(state);
  }

  #emitPresenceEvent(
    type: "mash-presence-start" | "mash-presence-end",
    context: PresenceLifecycleContext<"entering" | "exiting">,
  ): void {
    const eventInit: CustomEventInit<PresenceLifecycleEventDetail> = {
      bubbles: true,
      composed: true,
      detail: {
        open: context.open,
        phase: context.phase,
        reducedMotion: context.reducedMotion,
        interrupted: context.interrupted,
      },
    };
    if (type === "mash-presence-start") {
      this.dispatchEvent(
        new CustomEvent<PresenceLifecycleEventDetail>("mash-presence-start", eventInit),
      );
      return;
    }
    this.dispatchEvent(
      new CustomEvent<PresenceLifecycleEventDetail>("mash-presence-end", eventInit),
    );
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }
  formResetCallback(): void {
    this.value = this.#defaultValue ?? "";
    this.values = [...(this.#defaultValues ?? [])];
    this.query = "";
    this.#editing = false;
    this.open = false;
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string") this.value = state;
    else if (state instanceof FormData) {
      this.values = state
        .getAll(this.name)
        .filter((value): value is string => typeof value === "string");
    }
  }

  #selectedValues(): string[] {
    if (this.multiple) return [...this.values];
    return this.value ? [this.value] : [];
  }

  #setOpen(open: boolean, reason: OverlayChangeReason): void {
    if (this.#isDisabled || (this.readonly && open) || this.open === open) return;
    this.open = open;
    if (!open) {
      this.#setActive(null);
      this.#editing = false;
      this.query = "";
    } else this.#sync();
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-combobox-open-change", {
        bubbles: true,
        composed: true,
        detail: { open, reason },
      }),
    );
    if (!open) {
      this.dispatchEvent(
        new CustomEvent<{ value: string; values: string[] }>("ui-combobox-confirm", {
          bubbles: true,
          composed: true,
          detail: { value: this.value, values: this.#selectedValues() },
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

  #onInput = (event: Event): void => {
    if (this.readonly || this.#isDisabled) return;
    this.#editing = true;
    this.query = (event.currentTarget as HTMLInputElement).value;
    if (!this.items) this.value = this.query;
    this.#setActive(null);
    this.#setOpen(true, "input");
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-combobox-input", {
        bubbles: true,
        composed: true,
        detail: { value: this.query },
      }),
    );
    this.#sync();
    this.#setActive(this.#visibleOptions()[0] ?? null, false);
  };

  #onOptionSelect = (event: Event): void => {
    if (this.readonly) return;
    const target = event.composedPath().find((node) => this.#options().includes(node as UIOption));
    if (!target) return;
    this.#commitOption(target as UIOption);
  };

  #commitOption(option: UIOption): void {
    if (this.#isDisabled || this.readonly || this.loading || option.disabled || option.hidden)
      return;
    if (option === this.#createOption) {
      const created = this.onCreate?.(this.query.trim());
      if (created === undefined) return;
      const record = itemRecord(created);
      if (!record.value || record.disabled) return;
      if (this.items) {
        if (!this.items.some((item) => itemRecord(item).value === record.value))
          this.items = [...this.items, created];
        this.#collection.render(this.items, this.renderItem);
      } else if (!this.#options().some((item) => item.value === record.value)) {
        const added = this.ownerDocument.createElement("ui-option");
        added.value = record.value;
        added.textContent = record.label;
        this.insertBefore(added, this.#createOption!);
      }
      option = this.#options().find(
        (item) => item !== this.#createOption && item.value === record.value,
      )!;
    }
    this.#editing = false;
    this.query = "";
    const selectedValue = option.value || optionLabel(option);
    if (this.multiple) {
      this.values = this.values.includes(selectedValue)
        ? this.values.filter((value) => value !== selectedValue)
        : [...this.values, selectedValue];
      this.value = "";
      this.#setOpen(true, "select");
    } else {
      this.value = selectedValue;
    }
    this.dispatchEvent(
      new CustomEvent<{ value: string; values: string[] }>("ui-combobox-change", {
        bubbles: true,
        composed: true,
        detail: { value: this.value, values: this.multiple ? [...this.values] : [this.value] },
      }),
    );
    if (!this.multiple) this.#setOpen(false, "select");
    this.#sync();
    this.#setActive(null);
    this.renderRoot.querySelector<HTMLInputElement>("input")?.focus();
  }

  #visibleOptions(): UIOption[] {
    return this.#options().filter((option) => !option.disabled && !option.hidden);
  }

  #visibleGridRows(): UIOption[][] {
    return [...this.querySelectorAll<HTMLElement>("ui-option-row")]
      .filter((row) => !row.hidden)
      .map((row) =>
        [...row.querySelectorAll<UIOption>("ui-option")].filter(
          (option) => !option.disabled && !option.hidden,
        ),
      )
      .filter((row) => row.length > 0);
  }

  #setActive(option: UIOption | null, scroll = true): void {
    for (const candidate of this.#options()) candidate.active = candidate === option;
    this._activeOptionId = option?.id ?? "";
    const viewport = this.renderRoot.querySelector<HTMLElement>('[part="viewport"]');
    if (scroll && option && viewport) {
      const rect = option.getBoundingClientRect(),
        view = viewport.getBoundingClientRect();
      if (rect.top < view.top) viewport.scrollTop -= view.top - rect.top;
      else if (rect.bottom > view.bottom) viewport.scrollTop += rect.bottom - view.bottom;
    }
    this.#paintHighlight();
  }

  #paintHighlight(): void {
    const highlight = this.renderRoot.querySelector<HTMLElement>('[part="highlight"]');
    const viewport = this.renderRoot.querySelector<HTMLElement>('[part="viewport"]');
    const option = this.#options().find((candidate) => candidate.id === this._activeOptionId);
    if (!highlight || !viewport) return;
    const fresh = Boolean(highlight.hidden);
    highlight.hidden = !option || !this.open || this.loading;
    if (!option || highlight.hidden) return;
    const rect = option.getBoundingClientRect(),
      outer = viewport.getBoundingClientRect();
    const scale = outer.width / viewport.offsetWidth || 1;
    highlight.style.width = `${rect.width / scale}px`;
    highlight.style.height = `${rect.height / scale}px`;
    this.#hoverMotion.move(
      highlight,
      (rect.left - outer.left) / scale + viewport.scrollLeft,
      (rect.top - outer.top) / scale + viewport.scrollTop,
      fresh,
    );
  }

  #moveActive(direction: 1 | -1): void {
    const options = this.#visibleOptions();
    if (options.length === 0) return;
    const current = options.findIndex((option) => option.id === this._activeOptionId);
    const next =
      current === -1
        ? direction === 1
          ? 0
          : options.length - 1
        : (current + direction + options.length) % options.length;
    this.#setActive(options[next] ?? null);
  }

  #moveGridActive(key: "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp"): void {
    const rows = this.#visibleGridRows();
    if (rows.length === 0) return;
    const currentOption = this.#options().find((option) => option.id === this._activeOptionId);
    const rowIndex = rows.findIndex((row) => currentOption != null && row.includes(currentOption));
    if (rowIndex === -1) {
      const initial = key === "ArrowUp" ? rows.at(-1)?.at(-1) : rows[0]?.[0];
      this.#setActive(initial ?? null);
      return;
    }

    const row = rows[rowIndex]!;
    const columnIndex = row.indexOf(currentOption!);
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const rtl = getComputedStyle(this).direction === "rtl";
      const logicalDirection = key === "ArrowRight" ? 1 : -1;
      const direction = rtl ? -logicalDirection : logicalDirection;
      const nextColumn = Math.max(0, Math.min(row.length - 1, columnIndex + direction));
      this.#setActive(row[nextColumn] ?? null);
      return;
    }

    const nextRowIndex = Math.max(
      0,
      Math.min(rows.length - 1, rowIndex + (key === "ArrowDown" ? 1 : -1)),
    );
    const nextRow = rows[nextRowIndex]!;
    this.#setActive(nextRow[Math.min(columnIndex, nextRow.length - 1)] ?? null);
  }

  #onChipRemove = (event: Event): void => {
    if (!this.multiple || this.#isDisabled || this.readonly) return;
    const chip = event
      .composedPath()
      .find(
        (node): node is HTMLElement => node instanceof HTMLElement && node.localName === "ui-chip",
      );
    const chipIndex = chip ? this.#chips().indexOf(chip) : -1;
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    if (chipIndex < 0 || !this.values.includes(value)) return;
    this.values = this.values.filter((selected) => selected !== value);
    this.dispatchEvent(
      new CustomEvent<{ value: string; values: string[] }>("ui-combobox-change", {
        bubbles: true,
        composed: true,
        detail: { value: this.value, values: [...this.values] },
      }),
    );
    queueMicrotask(() => {
      const chips = this.#chips().filter((candidate) => !candidate.disabled);
      const target = chipIndex < 0 ? undefined : chips[Math.min(chipIndex, chips.length - 1)];
      (target ?? this.renderRoot.querySelector<HTMLInputElement>("input"))?.focus();
    });
  };

  #focusChip(chip: HTMLElement): void {
    this.#setOpen(false, "keyboard");
    chip.focus();
  }

  #onChipKeydown = (event: KeyboardEvent): void => {
    const chip = event
      .composedPath()
      .find(
        (node): node is HTMLElement => node instanceof HTMLElement && node.localName === "ui-chip",
      );
    if (!chip || this.#isDisabled) return;
    const chips = this.#chips().filter((candidate) => !candidate.disabled);
    const index = chips.indexOf(chip);
    const input = this.renderRoot.querySelector<HTMLInputElement>("input");
    if (index < 0 || !input) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      input.focus();
      this.#setOpen(true, "keyboard");
      this.#moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const rtl = getComputedStyle(this).direction === "rtl";
    const direction = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
    const target = chips[index + direction];
    if (target) this.#focusChip(target);
    else input.focus();
  };

  #eventIsWithinSlot(event: Event, name: string): boolean {
    const path = event.composedPath();
    return [...this.querySelectorAll<HTMLElement>(`:scope > [slot="${name}"]`)].some((element) =>
      path.includes(element),
    );
  }

  #onComposedClick = (event: MouseEvent): void => {
    if (this.#eventIsWithinSlot(event, "label")) {
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    if (
      this.#eventIsWithinSlot(event, "trigger") ||
      event
        .composedPath()
        .some(
          (node) => node instanceof HTMLElement && node.getAttribute("part") === "trigger-control",
        )
    ) {
      event.preventDefault();
      this.#setOpen(!this.open, "trigger");
      this.renderRoot.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    if (
      (!this.#eventIsWithinSlot(event, "clear") &&
        !event
          .composedPath()
          .some(
            (node) => node instanceof HTMLElement && node.getAttribute("part") === "clear-control",
          )) ||
      this.#isDisabled ||
      this.readonly
    )
      return;
    event.preventDefault();
    if (!this.value && !this.query && this.values.length === 0) return;
    this.value = "";
    this.values = [];
    this.query = "";
    this.#editing = false;
    this.#setOpen(true, "clear");
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-combobox-input", {
        bubbles: true,
        composed: true,
        detail: { value: "" },
      }),
    );
    this.dispatchEvent(
      new CustomEvent<{ value: string; values: string[] }>("ui-combobox-change", {
        bubbles: true,
        composed: true,
        detail: { value: "", values: [] },
      }),
    );
    queueMicrotask(() => this.renderRoot.querySelector<HTMLInputElement>("input")?.focus());
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || this.#isDisabled || (this.readonly && event.key !== "Escape")) return;
    if (event.key === "Tab") {
      this.#setOpen(false, "keyboard");
      return;
    }
    const input = event.currentTarget as HTMLInputElement;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const rtl = getComputedStyle(this).direction === "rtl";
    const towardChips = rtl ? "ArrowRight" : "ArrowLeft";
    if (
      this.multiple &&
      !this.value &&
      ((event.key === "Backspace" && atStart) ||
        (event.key === towardChips && atStart && !event.shiftKey))
    ) {
      const last = this.#chips()
        .filter((chip) => !chip.disabled)
        .at(-1);
      if (last) {
        event.preventDefault();
        this.#focusChip(last);
        return;
      }
    }
    if (this.open && (event.key === "Home" || event.key === "End") && !event.shiftKey) {
      event.preventDefault();
      const options = this.#visibleOptions();
      this.#setActive((event.key === "Home" ? options[0] : options.at(-1)) ?? null);
      return;
    }
    if (event.key === "Escape") {
      if (this.open) event.preventDefault();
      this.#setOpen(false, "escape");
      return;
    }
    if (
      this.grid &&
      this._activeOptionId &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight")
    ) {
      event.preventDefault();
      this.#moveGridActive(event.key);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.#setOpen(true, "keyboard");
      if (this.grid) this.#moveGridActive(event.key);
      else this.#moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter" && this.open && this._activeOptionId) {
      const active = this.#options().find((option) => option.id === this._activeOptionId);
      if (!active) return;
      event.preventDefault();
      this.#commitOption(active);
    }
  };

  /** Opens the suggestion surface through the portable open-change contract. */
  show(): void {
    this.#setOpen(true, "imperative");
  }

  /** Dismisses the suggestion surface through the portable open-change contract. */
  dismiss(reason: OverlayChangeReason = "imperative"): void {
    this.#setOpen(false, reason);
  }

  /** Toggles the suggestion surface while retaining a transition reason. */
  toggle(reason: OverlayChangeReason = "imperative"): void {
    this.#setOpen(!this.open, reason);
  }

  protected override render(): TemplateResult {
    const selected = this.#options().find(
      (option) => option !== this.#createOption && option.value === this.value,
    );
    const text = this.#editing
      ? this.query
      : this.multiple
        ? ""
        : selected
          ? optionLabel(selected)
          : this.value;
    return html`
      <span part="root">
        <span part="label"><slot name="label"></slot></span>
        <span part="input-group">
          <span
            part="chips"
            role=${this.multiple && this.values.length > 0 ? "toolbar" : nothing}
            aria-label=${
              this.multiple && this.values.length > 0 ? `${this.label} selected values` : nothing
            }
            ><slot name="chips"></slot
          ></span>
          <span part="value"><slot name="value"></slot></span>
          <input
            part="control"
            type="text"
            role="combobox"
            .value=${text}
            placeholder=${this.placeholder}
            aria-label=${this.label}
            aria-description=${this.error || this.#fieldDescription || nothing}
            aria-invalid=${this.error || this.#fieldInvalid ? "true" : nothing}
            aria-controls=${this.open ? this.#listboxId : nothing}
            aria-expanded=${this.open ? "true" : "false"}
            aria-activedescendant=${this._activeOptionId || nothing}
            aria-autocomplete="list"
            aria-haspopup=${this.grid ? "grid" : "listbox"}
            aria-busy=${this.loading ? "true" : nothing}
            ?disabled=${this.#isDisabled}
            ?readonly=${this.readonly}
            @click=${() => this.#setOpen(true, "trigger")}
            @input=${this.#onInput}
            @keydown=${this.#onKeydown}
          />
          <span part="icon"><slot name="icon"></slot></span>
          <span part="trigger"
            ><slot name="trigger"
              ><button
                part="trigger-control"
                type="button"
                tabindex="-1"
                aria-label=${this.open ? "Close suggestions" : "Open suggestions"}
                ?disabled=${this.#isDisabled || this.readonly}
              >
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
                  <path
                    d="m6 8 4 4 4-4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg></button></slot
          ></span>
          <span part="clear"
            ><slot name="clear"
              >${
                this.clearable
                  ? html`<button
                      part="clear-control"
                      type="button"
                      aria-label="Clear selection"
                      ?disabled=${this.#isDisabled || this.readonly || (!this.value && !this.query && !this.values.length)}
                    >
                      <svg
                        viewBox="0 0 20 20"
                        width="20"
                        height="20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="m6 6 8 8m0-8-8 8"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>`
                  : nothing
              }</slot
            ></span
          >
        </span>
        <span part="error" ?hidden=${!this.error}>${this.error}</span>
        <span part="backdrop" ?hidden=${!this.popupPresent} .inert=${!this.open}
          ><slot name="backdrop"></slot
        ></span>
        <div part="positioner" ?hidden=${!this.popupPresent} .inert=${!this.open}>
          <div part="popup">
            <span part="arrow"><slot name="arrow"></slot></span>
            <span part="status" role="status" aria-live="polite">
              ${
                this.loading
                  ? this.loadingLabel
                  : `${this._resultCount} ${this._resultCount === 1 ? "result" : "results"} available`
              }
            </span>
            <span part="loading" ?hidden=${!this.loading}>
              <slot name="loading">${this.loadingLabel}</slot>
            </span>
            <span part="empty" ?hidden=${this.loading || this._resultCount !== 0}>
              <slot name="empty"
                >${this.multiple && this.hideSelected && this.values.length > 0 && !this.query ? "All options selected" : "No matches found"}</slot
              >
            </span>
            <div part="viewport" @scroll=${() => this.#paintHighlight()}>
              <span part="highlight" aria-hidden="true" hidden></span>
              <div
                part="listbox list"
                id=${this.#listboxId}
                role=${this.grid ? "grid" : "listbox"}
                aria-label=${this.label}
                aria-multiselectable=${this.multiple ? "true" : nothing}
                ?hidden=${this.loading}
              >
                <slot part="children" @slotchange=${() => this.#sync()}></slot>
              </div>
            </div>
            <span part="footer"><slot name="footer"></slot></span>
          </div>
        </div>
      </span>
    `;
  }
}
