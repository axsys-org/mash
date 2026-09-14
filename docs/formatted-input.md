# Formatted inputs

Add `mask` to the existing `ui-input` when a text value has a fixed display format. `#` accepts a digit, `A` a Latin letter, and `*` a Latin letter or digit. Other characters are literals; a backslash escapes a mask token. In JavaScript strings, escape the backslash too.

```html
<ui-input
  name="phone"
  label="Phone"
  inputmode="tel"
  mask="(###) ###-####"
  value="4155550123"
></ui-input>
<ui-input name="reference" label="Reference" mask="AAA-####" value="ABC1234"></ui-input>
```

`value` and submitted `FormData` contain raw characters (`4155550123`); `displayValue` and `control.value` contain presentation (`(415) 555-0123`). Programmatic assignments, form reset, and restored form state use raw values. Inputs without a mask retain their existing contract. `formatInputMask` and `parseInputMask` are exported from `@mash/ui/input` for non-DOM formatting and parsing.

Native text editing supplies selection, insertion, and paste. The mask remaps caret offsets and handles deletion adjacent to punctuation. Composition remains untouched until it completes; the input handler also covers edits that bypass cancellable `beforeinput`, as described in the [native event guidance](https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event).

The mask controls presentation and accepted character positions. It does not validate phone numbers, dates, or reference ownership. Native `pattern`, `minlength`, and `maxlength` validate the displayed string; supply these when a complete formatted value is required. For numeric amounts, use `ui-number-field` and its locale-aware numeric contract instead of a fixed text mask.

See **Input → Formatted values** for middle editing, paste, raw form values, and reset.
