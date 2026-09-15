# Standalone touch-ready inputs

Use an input directly when it needs no prefix or suffix. Its native editing
control remains the sole visual part, focus target and form-value owner.

```html
<ui-input name="query" label="Filter paths" type="search" size="small" touch-target></ui-input>
```

- `touchTarget` / `touch-target` is a reflected Boolean, off by default and
  independent of `size`, validation, readonly, disabled, mask and value.
- With the Mash catalogue, fine-pointer sizes remain unchanged: small 24px,
  compact 28px, medium 32px and large 44px.
- On coarse pointers, the native control and its layout footprint reserve at
  least `--layout-dimension-control-touch` (44px) in both axes. Larger input
  dimensions are preserved. There is no invisible hit extension or extra shell.
- Touch typography follows the same minimum as the input-group touch recipe.
  Typography, color, surface, boundary and focus remain owned by Mash tokens.
- Opting in or out does not replace the native input, discard focus/selection,
  change authored form values, or change editing and validation events.
- An adorned input still belongs in `ui-input-group`. Use the group's own
  `touch-target` for its input and responsive adornment layout; each interactive
  adornment opts in independently. Applying both input and group flags is safe
  and does not double the target dimensions.

Containers must allow enough room for the chosen minimum; use wrapping layout
for adjacent controls when space is narrower than their combined real targets.
