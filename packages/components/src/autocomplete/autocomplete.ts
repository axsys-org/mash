import { type TemplateResult } from "lit";

import { UICombobox } from "../combobox/combobox.js";

/**
 * A suggestion-first alias of Mash's editable combobox contract.
 *
 * Autocomplete uses the same form, listbox, option, and keyboard mechanics as
 * `ui-combobox`; the distinct name communicates that callers should provide
 * suggestions as text changes rather than treating the field as a fixed
 * vocabulary. It intentionally preserves the combobox events for renderer
 * portability.
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
 * @slot label - Optional visible label content.
 * @slot chips - Selected-value chips used when `multiple` is active.
 * @slot value - Optional authored value presentation beside the input.
 * @slot trigger - Optional control that toggles the suggestion popup.
 * @slot icon - Optional symbolic content associated with the input.
 * @slot clear - Optional control that clears the current text.
 * @slot backdrop - Optional renderer-specific backdrop content.
 * @slot arrow - Optional connector between the popup and its anchor.
 * @slot loading - Content shown while externally sourced suggestions are pending.
 * @slot empty - Content shown when filtering leaves no suggestions.
 * @slot footer - Persistent action content shown below the suggestion list.
 *
 * @csspart root - The complete autocomplete realization.
 * @csspart label - The optional visible label.
 * @csspart input-group - The input, value, and adjacent actions.
 * @csspart chips - The selected-value chip collection.
 * @csspart control - The native editable combobox input.
 * @csspart value - Optional authored value presentation.
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
 * @csspart listbox - The semantic suggestion listbox.
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
 * @cssstate readonly - Matches `:state(readonly)` while text cannot change.
 * @cssstate multiple - Matches `:state(multiple)` while multiple values are selected.
 * @cssstate grid - Matches `:state(grid)` while suggestions use two-dimensional navigation.
 * @cssstate loading - Matches `:state(loading)` while externally sourced suggestions are pending.
 * @cssstate empty - Matches `:state(empty)` while no enabled suggestion is available.
 * @cssstate invalid - Matches `:state(invalid)` while the owning field reports an error.
 *
 * @fires {CustomEvent<{ value: string }>} ui-combobox-input - Emitted as the editable text changes.
 * @fires {CustomEvent<{ value: string; values: string[] }>} ui-combobox-change - Emitted after selection changes.
 * @fires {CustomEvent<{ value: string; values: string[] }>} ui-combobox-confirm - Emitted when the open suggestion surface closes with the current values.
 * @fires {CustomEvent<{ open: boolean; reason: string }>} ui-combobox-open-change - Emitted after interaction changes suggestion visibility.
 * @fires {CustomEvent<{ open: boolean; phase: string; reducedMotion: boolean; interrupted: boolean }>} mash-presence-start - Announces autocomplete popup enter or exit presence.
 * @fires {CustomEvent<{ open: boolean; phase: string; reducedMotion: boolean; interrupted: boolean }>} mash-presence-end - Announces completion or interruption of autocomplete popup presence.
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
 * @mashnode loading loading popup
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
export class UIAutocomplete extends UICombobox {
  protected override render(): TemplateResult {
    return super.render();
  }
}
