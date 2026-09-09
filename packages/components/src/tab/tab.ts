import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * One selectable tab inside `ui-tabs`.
 *
 * Give every tab a `value` that matches a `ui-tab-panel`. The tabs parent owns
 * which value is selected and wires panel identifiers; this element owns the
 * native focusable tab control and portable activation event.
 *
 * @tag ui-tab
 * @summary A selectable tab within a tablist.
 *
 * @example Selected project tab
 * <ui-tabs value="billing">
 *   <ui-tab value="billing" selected>Billing migration</ui-tab>
 *   <ui-tab-panel value="billing" selected>Project overview</ui-tab-panel>
 * </ui-tabs>
 *
 * @slot - Visible tab label.
 *
 * @cssprop --mash-tab-max-inline-size - Maximum tab width before the label truncates.
 * @csspart root - The tab and its optional close action.
 * @csspart close - The optional close button.
 * @mashnode root root
 * @mashnode close control root
 * @fires {CustomEvent<{ value: string }>} ui-tab-close - Requests that the owner remove this tab and its panel.
 * @csspart control - The native button carrying the tab role.
 * @csspart label - The authored tab label.
 *
 * @cssstate selected - Matches `:state(selected)` while active.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 *
 * @fires {CustomEvent<{ value: string }>} ui-tab-select - Emitted when the tab is activated.
 *
 * @mashnode control control
 * @mashnode label label control
 * @mashnode position position control
 * @mashnode set-size set-size control
 * @mashrole slot default label label
 */
export class UITab extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    label: { type: String, reflect: true },
    closable: { type: Boolean, reflect: true },
    value: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    controls: { type: String, reflect: true },
    position: { type: Number, reflect: true },
    setSize: { type: Number, attribute: "set-size", reflect: true },
  };

  /** Full accessible label, required when the visible label contains only an icon. */
  declare label: string;
  /** Full name shared by the control, tooltip, close action, and overflow chooser. */
  get accessibleLabel(): string {
    return this.label || this.textContent?.trim() || this.value;
  }

  /** Show a close action; listen to ui-tab-close to remove the authored tab and panel. */
  declare closable: boolean;
  /** Stable value matched to a panel in the containing tabs. */
  declare value: string;
  /** Whether this tab is currently selected. */
  declare selected: boolean;
  /** Prevents selection. */
  declare disabled: boolean;
  /** Identifier of the panel this tab controls. */
  declare controls: string;
  /** One-based position assigned by the owning tab set. */
  declare position: number;
  /** Total tab count assigned by the owning tab set. */
  declare setSize: number;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.label = "";
    this.closable = false;
    this.value = "";
    this.selected = false;
    this.disabled = false;
    this.controls = "";
    this.position = 0;
    this.setSize = 0;
    this.#internals = this.attachInternals();
  }

  static override styles = [
    baseStyles,
    css`
      [part="root"] {
        display: inline-flex;
        position: relative;
        max-inline-size: 100%;
      }
      [part="label"] {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];

  /** Request closure without taking ownership of the authored collection. */
  requestClose(): void {
    if (!this.closable || this.disabled) return;
    this.dispatchEvent(
      new CustomEvent("ui-tab-close", {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { value: this.value },
      }),
    );
  }

  #close = (event: Event): void => {
    event.stopPropagation();
    this.requestClose();
  };

  #keydown = (event: KeyboardEvent): void => {
    if (event.key !== "Delete" || !this.closable || this.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    this.requestClose();
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("selected") && !changed.has("disabled")) return;
    if (this.selected) this.#internals.states.add("selected");
    else this.#internals.states.delete("selected");
    if (this.disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  #select = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent<{ value: string }>("ui-tab-select", {
        bubbles: true,
        composed: true,
        detail: { value: this.value },
      }),
    );
  };

  protected override render(): TemplateResult {
    return html`
      <span part="root"
        ><button
          part="control"
          type="button"
          role="tab"
          aria-label=${this.accessibleLabel}
          title=${this.accessibleLabel}
          aria-selected=${this.selected ? "true" : "false"}
          aria-controls=${this.controls || undefined}
          aria-posinset=${this.position || undefined}
          aria-setsize=${this.setSize || undefined}
          tabindex=${this.selected ? "0" : "-1"}
          ?disabled=${this.disabled}
          @keydown=${this.#keydown}
          @click=${this.#select}
        >
          <slot part="label" @slotchange=${() => this.requestUpdate()}></slot>
        </button>
        ${
          this.closable
            ? html`<button
                part="close"
                type="button"
                tabindex="-1"
                aria-label=${`Close ${this.accessibleLabel}`}
                ?disabled=${this.disabled}
                @click=${this.#close}
              >
                ×
              </button>`
            : nothing
        }
      </span>
    `;
  }
}
