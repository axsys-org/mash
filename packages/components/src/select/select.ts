import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import {
  AnchoredPositionController,
  type AnchoredAlign,
  type AnchoredPlacement,
} from "../internal/anchored-position.js";
import { baseStyles } from "../internal/base-styles.js";
import type { OverlayChangeReason, OverlayOpenChangeDetail } from "../internal/overlay.js";
import { stringArrayConverter } from "../internal/string-array.js";
import type { UIOption } from "../option/option.js";

let selectListId = 0;

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
 * @slot backdrop - Optional renderer-specific backdrop content.
 * @slot arrow - Optional connector between the popup and its anchor.
 * @slot scroll-up - Optional action that reveals earlier options.
 * @slot scroll-down - Optional action that reveals later options.
 *
 * @csspart root - The complete select realization.
 * @csspart label - The optional visible label.
 * @csspart trigger - The native listbox trigger button.
 * @csspart value - The selected-value presentation inside the trigger.
 * @csspart icon - Optional symbolic content inside the trigger.
 * @csspart backdrop - The optional layer behind the popup.
 * @csspart positioner - The owner of anchor-relative popup placement.
 * @csspart popup - The floating option surface.
 * @csspart arrow - The popup-to-anchor connector.
 * @csspart scroll-up - The action that reveals earlier options.
 * @csspart scroll-down - The action that reveals later options.
 * @csspart listbox - The semantic option list.
 * @csspart list - Alias for the semantic option list.
 * @csspart children - The authored option collection.
 *
 * @cssstate open - Matches `:state(open)` while choices are visible.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate readonly - Matches `:state(readonly)` while selection cannot change.
 * @cssstate multiple - Matches `:state(multiple)` while multiple values are selected.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 *
 * @fires {CustomEvent<{ value: string; values: string[] }>} ui-select-change - Emitted after selection changes.
 * @fires {CustomEvent<OverlayOpenChangeDetail>} ui-select-open-change - Emitted after interaction changes list visibility, including a portable reason.
 *
 * @mashrole slot arrow pointer arrow
 * @mashrole part arrow pointer arrow
 * @mashrole slot scroll-up scroll-backward scroll-start
 * @mashrole part scroll-up scroll-backward scroll-start
 * @mashrole slot scroll-down scroll-forward scroll-end
 * @mashrole part scroll-down scroll-forward scroll-end
 * @mashrole part list listbox listbox
 * @mashrole attribute values value values
 * @mashnode root root
 * @mashnode label label root
 * @mashnode trigger trigger root
 * @mashnode value value trigger
 * @mashnode icon icon trigger
 * @mashnode backdrop backdrop root
 * @mashnode positioner positioner root
 * @mashnode placement placement positioner
 * @mashnode align align positioner
 * @mashnode offset offset positioner
 * @mashnode collision-padding collision-padding positioner
 * @mashnode popup popup positioner
 * @mashnode arrow pointer popup
 * @mashnode scroll-start scroll-backward popup
 * @mashnode scroll-end scroll-forward popup
 * @mashnode listbox listbox popup
 * @mashnode children children listbox
 * @mashnode values value root
 * @mashnode open open root
 * @mashnode invalid invalid trigger
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
    values: { converter: stringArrayConverter, reflect: true },
    multiple: { type: Boolean, reflect: true },
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
  };

  /** Value of the selected option. */
  declare value: string;
  /** Selected values while `multiple` is active. */
  declare values: string[];
  /** Allows more than one option to be selected. */
  declare multiple: boolean;
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

  readonly #internals: ElementInternals;
  readonly #listboxId = `ui-select-listbox-${++selectListId}`;
  #formDisabled = false;
  #defaultValue: string | undefined;
  #defaultValues: string[] | undefined;
  #typeahead = "";
  #typeaheadTimer: number | undefined;
  #fieldDescription = "";
  #fieldInvalid = false;
  readonly #collectionObserver = new MutationObserver(() => {
    this.#sync();
    this.#positioner.queue();
  });
  readonly #positioner = new AnchoredPositionController(this, {
    anchor: () => this.renderRoot.querySelector<HTMLElement>("[part~='trigger']"),
    popup: () => this.renderRoot.querySelector<HTMLElement>("[part~='popup']"),
    positioner: () => this.renderRoot.querySelector<HTMLElement>("[part~='positioner']"),
    config: () => this,
  });

  constructor() {
    super();
    this.value = "";
    this.values = [];
    this.multiple = false;
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
      [part~="value"],
      [part~="icon"],
      [part~="arrow"],
      [part~="scroll-up"],
      [part~="scroll-down"] {
        display: contents;
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
    this.#defaultValues ??= [...this.values];
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
    for (const option of this.#options()) {
      option.selected = this.multiple
        ? this.values.includes(option.value)
        : option.value === this.value;
    }
    if (this.#isDisabled || !this.name) {
      this.#internals.setFormValue(null);
    } else if (this.multiple) {
      const formValue = new FormData();
      for (const value of this.values) formValue.append(this.name, value);
      this.#internals.setFormValue(formValue);
    } else {
      this.#internals.setFormValue(this.value);
    }
    if (this.open) this.#internals.states.add("open");
    else this.#internals.states.delete("open");
    if (this.#isDisabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
    for (const state of ["readonly", "multiple"] as const) {
      if (this[state]) this.#internals.states.add(state);
      else this.#internals.states.delete(state);
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (
      changed.has("value") ||
      changed.has("values") ||
      changed.has("multiple") ||
      changed.has("name") ||
      changed.has("open") ||
      changed.has("disabled") ||
      changed.has("readonly")
    )
      this.#sync();
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
    this.values = [...(this.#defaultValues ?? [])];
  }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string") this.value = state;
    else if (state instanceof FormData) {
      this.values = state
        .getAll(this.name)
        .filter((value): value is string => typeof value === "string");
    }
  }

  #setOpen(open: boolean, reason: OverlayChangeReason): void {
    if (this.#isDisabled || (this.readonly && open) || this.open === open) return;
    this.open = open;
    if (!open) this.#setActive(null, false);
    this.dispatchEvent(
      new CustomEvent<OverlayOpenChangeDetail>("ui-select-open-change", {
        bubbles: true,
        composed: true,
        detail: { open, reason },
      }),
    );
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
    if (this.multiple) {
      this.values = this.values.includes(option.value)
        ? this.values.filter((value) => value !== option.value)
        : [...this.values, option.value];
    } else {
      this.value = option.value;
      this.#setOpen(false, "select");
    }
    this.dispatchEvent(
      new CustomEvent<{ value: string; values: string[] }>("ui-select-change", {
        bubbles: true,
        composed: true,
        detail: { value: this.value, values: this.multiple ? [...this.values] : [this.value] },
      }),
    );
  }

  #visibleOptions(): UIOption[] {
    return this.#options().filter((option) => !option.disabled && !option.hidden);
  }

  #setActive(option: UIOption | null, focus = true): void {
    for (const candidate of this.#options()) candidate.active = candidate === option;
    if (focus) option?.focus();
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

  #onTriggerKeydown = (event: KeyboardEvent): void => {
    if (this.readonly && event.key !== "Escape") return;
    if (event.key === "Escape") {
      this.#setOpen(false, "escape");
      return;
    }
    if (!this.open && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
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
        this.#setOpen(false, "select");
        return;
      }
      const direction: 1 | -1 = event.key === "ArrowUp" ? -1 : 1;
      this.#setOpen(true, "keyboard");
      queueMicrotask(() => this.#focusInitial(direction));
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
      queueMicrotask(() =>
        this.renderRoot.querySelector<HTMLButtonElement>("button[part~=trigger]")?.focus(),
      );
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.#matchTypeahead(event.key, false);
    }
  };

  #onSlotChange = (): void => this.#sync();

  #onComposedClick = (event: MouseEvent): void => {
    const path = event.composedPath();
    const label = this.querySelector<HTMLElement>(":scope > [slot='label']");
    if (!label || !path.includes(label)) return;
    this.renderRoot.querySelector<HTMLButtonElement>("button[part~='trigger']")?.focus();
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
    const selected = this.#options().filter((option) =>
      this.multiple ? this.values.includes(option.value) : option.value === this.value,
    );
    const selectedText = selected.map(optionLabel).join(", ");
    return html`
      <span part="root">
        <span part="label"><slot name="label"></slot></span>
        <button
          part="trigger"
          type="button"
          role="combobox"
          aria-label=${this.label}
          aria-description=${this.#fieldDescription || nothing}
          aria-invalid=${this.#fieldInvalid ? "true" : nothing}
          aria-controls=${this.open ? this.#listboxId : nothing}
          aria-expanded=${this.open ? "true" : "false"}
          ?disabled=${this.#isDisabled}
          aria-readonly=${this.readonly ? "true" : nothing}
          @click=${() => this.#setOpen(!this.open, "trigger")}
          @keydown=${this.#onTriggerKeydown}
        >
          <span part="value">
            <slot name="value">${selectedText || this.placeholder}</slot>
          </span>
          <span part="icon"><slot name="icon"></slot></span>
        </button>
        <span part="backdrop" ?hidden=${!this.open}><slot name="backdrop"></slot></span>
        <div part="positioner" ?hidden=${!this.open}>
          <div part="popup">
            <span part="scroll-up"><slot name="scroll-up"></slot></span>
            <span part="arrow"><slot name="arrow"></slot></span>
            <div
              part="listbox list"
              id=${this.#listboxId}
              role="listbox"
              aria-label=${this.label}
              aria-multiselectable=${this.multiple ? "true" : nothing}
            >
              <slot part="children" @slotchange=${this.#onSlotChange}></slot>
            </div>
            <span part="scroll-down"><slot name="scroll-down"></slot></span>
          </div>
        </div>
      </span>
    `;
  }
}
