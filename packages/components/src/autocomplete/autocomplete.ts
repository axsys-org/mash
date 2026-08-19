import { type TemplateResult } from "lit";

import { UICombobox } from "../combobox/combobox.js";

/**
 * A suggestion-first alias of Mash's editable combobox contract.
 *
 * Autocomplete uses the same form, listbox, option, and keyboard mechanics as
 * `ui-combobox`; the distinct name communicates that callers should provide
 * suggestions as text changes rather than treating the field as a fixed
 * vocabulary. It intentionally preserves the combobox events for renderer
 * parity.
 *
 * @tag ui-autocomplete
 * @summary An editable combobox intended for asynchronously supplied suggestions.
 *
 * @example Search projects
 * <ui-autocomplete name="project" label="Project">
 *   <ui-option value="billing">Billing migration</ui-option>
 * </ui-autocomplete>
 *
 * @slot - `ui-option` suggestions supplied by the caller.
 *
 * @csspart control - The native editable combobox input.
 * @csspart listbox - The semantic suggestion listbox.
 *
 * @cssstate open - Matches `:state(open)` while suggestions are visible.
 * @cssstate disabled - Matches `:state(disabled)` while unavailable.
 */
export class UIAutocomplete extends UICombobox {
  protected override render(): TemplateResult {
    return super.render();
  }
}
