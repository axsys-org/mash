import { LitElement, html, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * The content panel paired with a `ui-tab` in `ui-tabs`.
 *
 * Its `value` identifies the matching tab. The tabs parent sets `selected`;
 * applications should not hide panels themselves because that can desynchronise
 * the tab's accessible state from its content.
 *
 * @tag ui-tab-panel
 * @summary Content associated with a selected tab.
 *
 * @example Project panel
 * <ui-tabs value="billing">
 *   <ui-tab value="billing" selected>Billing migration</ui-tab>
 *   <ui-tab-panel value="billing" selected>Project overview</ui-tab-panel>
 * </ui-tabs>
 *
 * @slot - Panel content.
 *
 * @csspart root - The semantic tabpanel container.
 * @csspart content - The authored panel content.
 *
 * @cssstate selected - Matches `:state(selected)` while this panel is visible.
 *
 * @mashnode root root
 * @mashnode content content root
 */
export class UITabPanel extends LitElement {
  static override properties = {
    value: { type: String, reflect: true },
    selected: { type: Boolean, reflect: true },
    label: { type: String, reflect: true },
  };

  /** Stable value matched to a tab in the containing tabs. */
  declare value: string;
  /** Whether this panel is currently visible. */
  declare selected: boolean;
  /** Accessible label supplied by the matching tab. */
  declare label: string;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.value = "";
    this.selected = false;
    this.label = "Tab panel";
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("selected")) return;
    if (this.selected) this.#internals.states.add("selected");
    else this.#internals.states.delete("selected");
  }

  protected override render(): TemplateResult {
    return html`<div part="root" role="tabpanel" aria-label=${this.label} ?hidden=${!this.selected}>
      <slot part="content"></slot>
    </div>`;
  }
}
