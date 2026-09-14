# Number fields

`ui-number-field` keeps a native numeric editor, one pair of step buttons and a stable-width control surface. The existing `control`, `decrement`, `increment` and `label` parts remain. `group`, `prefix` and `suffix` let applications style the shared surface and decorate the number without mixing units into its submitted value.

```html
<ui-number-field label="Width" name="width" value="320" min="0" max="1920">
  <span slot="suffix">px</span>
</ui-number-field>
```

Use `mash-number-stacked` to place both step buttons at the trailing edge. `data-mash-size` on a surrounding layout controls height. Set the host width directly when the layout needs a smaller or wider field; the number itself no longer determines width.

Typing preserves native drafts, including incomplete negative, decimal and exponent forms. Input events expose the numeric draft (`NaN` when empty or incomplete); consumers should check validity before using it. A committed finite edit clamps to the configured range. Empty required fields block submission, while optional empty fields submit an empty string. `placeholder` describes an empty value. Form reset restores the initial value.

Arrow keys and the buttons share native step-grid alignment, decimal precision and the cancellable `ui-number-field-step` request. Shift + Arrow changes ten steps. A button is disabled when its step would make no change. No-op steps emit no input/change events. Native duplicate spinner controls are hidden.

`readonly` preserves selection and form submission while preventing edits. `disabled`, including a disabled fieldset, prevents editing and removes the value from submission. Form data is synchronized before semantic input/change listeners run.
