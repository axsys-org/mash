import { html, type PropertyValues, type TemplateResult } from "lit";

import { UICheckable } from "../internal/checkable.js";

export type CheckboxSize =
  "xs" | "xsmall" | "sm" | "small" | "base" | "md" | "medium" | "lg" | "large";

/**
 * A native-form checkbox with a portable Mash behaviour contract.
 *
 * The definition contains form association, keyboard behaviour, reflected
 * state, and stable parts. It intentionally carries no visual recipe: import
 * `@mash/ui/catalogue/mash.css` to apply Mash's token-driven appearance, or
 * supply a different catalogue for another product or renderer.
 *
 * @tag ui-checkbox
 * @summary Selects an independent boolean option.
 *
 * @example Form option
 * <div class="demo button-showcase-row">
 *   <ui-checkbox name="updates" checked>Email me release notes</ui-checkbox>
 * </div>
 *
 * @example Sized options
 * <div class="demo button-showcase-row">
 *   <ui-checkbox size="xsmall">Extra small</ui-checkbox>
 *   <ui-checkbox size="small">Small</ui-checkbox>
 *   <ui-checkbox size="medium" checked>Medium</ui-checkbox>
 *   <ui-checkbox size="large">Large</ui-checkbox>
 * </div>
 *
 * @slot - Visible label for the option.
 * @slot indicator - Optional authored indicator content; the catalogue may also realize the empty indicator part.
 *
 * @csspart root - The native label wrapper.
 * @csspart control - The native checkbox receiving focus and input.
 * @csspart indicator - The independently styleable checked or indeterminate indicator.
 * @csspart label - The projected option label.
 *
 * @cssstate checked - Matches `:state(checked)` while selected.
 * @cssstate indeterminate - Matches `:state(indeterminate)` while partially selected.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 * @cssstate required - Matches `:state(required)` while selection is required.
 *
 * @fires {CustomEvent<{ checked: boolean, indeterminate: boolean }>} ui-checkbox-change - Emitted after user interaction changes selection.
 *
 * @mashnode root root
 * @mashnode control control root
 * @mashnode indicator indicator control
 * @mashnode label label root
 * @mashnode checked checked control
 * @mashnode indeterminate indeterminate control
 * @mashnode disabled disabled control
 * @mashnode required required control
 * @mashnode name name control
 * @mashnode value value control
 * @mashnode size size root
 * @mashaxis size indicator-size
 * @mashrole slot default label label
 */
export class UICheckbox extends UICheckable {
  static override properties = {
    ...UICheckable.properties,
    indeterminate: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
  };

  /** Displays a mixed state without treating the control as checked. */
  declare indeterminate: boolean;
  /** Semantic physical scale. Short control-size aliases are accepted. */
  declare size: CheckboxSize;

  protected readonly changeEventName = "ui-checkbox-change";
  protected readonly controlRole = null;
  #defaultIndeterminate: boolean | undefined;

  constructor() {
    super();
    this.indeterminate = false;
    this.size = "medium";
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#defaultIndeterminate ??= this.indeterminate;
  }

  protected override get checkableIndeterminate(): boolean {
    return this.indeterminate;
  }

  protected override renderCheckableParts(): TemplateResult {
    return html`<span part="indicator" aria-hidden="true"><slot name="indicator"></slot></span>`;
  }

  protected override checkableChangeDetail(): Record<string, unknown> {
    return { checked: this.checked, indeterminate: this.indeterminate };
  }

  protected override readCheckableState(control: HTMLInputElement): void {
    this.checked = control.checked;
    this.indeterminate = control.indeterminate;
  }

  protected override restoreCheckableState(state: string): void {
    this.indeterminate = state === "indeterminate";
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has("indeterminate")) this.syncCheckable();
  }

  override formResetCallback(): void {
    super.formResetCallback();
    this.indeterminate = this.#defaultIndeterminate ?? false;
  }

  protected override render(): TemplateResult {
    return this.renderCheckable();
  }
}
