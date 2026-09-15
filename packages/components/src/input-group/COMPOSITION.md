# Compact controls

Keep the form and its validation/navigation logic outside the group. The existing
native or Mash input remains the editing, selection and form-submission owner.

```html
<form>
  <ui-input-group size="small" typography="code" touch-target>
    <ui-input slot="control" name="path" label="Namespace path"></ui-input>
    <ui-button slot="suffix" type="submit" size="small" variant="ghost" touch-target>
      <ui-icon slot="prefix" name="navigation.forward" size="small"></ui-icon>
      Open
    </ui-button>
  </ui-input-group>
</form>
```

- `size` uses the input size scale (`inherit`, `default`, `compact`, `small`,
  `medium`, `large`). Unsized controls inherit it; explicit child sizes win.
- `typography="code"` changes only the input to Mash's code font. Labels and
  action icons retain the normal control typography. The default is `body`.
- `touch-target` opts the primary input into a real 44px minimum target on coarse
  pointers. Interactive prefix/suffix controls opt in independently. There are
  no invisible hit-area extensions; a 44px adorned input normally yields a 46px
  shell including its thin border. In extremely narrow containers the lanes
  wrap rather than shrinking the input underneath adjacent actions.
- `invalid` marks the group visually. Native/Mash input validity is also picked
  up automatically. Set `ui-input.invalid` for an authored semantic error on
  the actual editing control; it composes with field/native validity and sets
  native `aria-invalid`, but does not itself reject form submission. Disabling
  the input suspends its invalid semantics without erasing the authored flag.
- Absent or directly slotted `[hidden]` adornments reserve no separator or lane.
  Changing `hidden`/`slot` or reconnecting does not replace the input or actions.

Text `ui-button` controls can independently opt into `touch-target`. Fine-pointer
sizes and normal variant/tone/loading/disabled behavior remain intact; coarse
targets grow to at least 44px and constrained labels wrap. Existing buttons
without this attribute keep their original sizing. Put icons in `prefix` rather
than painting another label-layout recipe at the application boundary.

Quiet `ui-link` navigation uses the same inherited control scale. Set `size`
explicitly for a dense breadcrumb or navigation row: `small` is 24px, `compact`
28px, `medium` 32px, and `large` 32px with larger typography/padding, matching the
button tokens. Native link targets remain at least 44px on coarse pointers;
`variant="inline"` always remains prose-sized. Sizes do not change native href,
keyboard activation, disabled suppression or current-page semantics.
