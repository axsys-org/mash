# Hover and color composition

## Following highlights

`ui-motion.trackHover({ highlight, items, axis, gap })` attaches nearest-item hover and keyboard-focus tracking to an authored scene. Use `mash-hover` on the scene and `mash-hover-highlight` on its underlay child. Items default to `[data-hover-item]`; the axis is `vertical`, `horizontal`, or `both`.

```js
const scene = document.querySelector("ui-motion");
scene.trackHover({
  highlight: scene.querySelector('[slot="underlay"]'),
  axis: "vertical",
  gap: 8,
});
```

Disabled and hidden items are skipped. Gap activation is off unless a maximum distance is supplied. The existing controls own activation and keyboard semantics. `data-hover-active` identifies the current item; `data-hover-index` identifies its index on the scene.

Movement reuses the controller shared by tabs and docking. Pointer work is coalesced into animation frames, geometry follows resize/content/scroll changes, and no frame loop runs while idle. The returned controller has `refresh()` for external transform changes and `destroy()` for early cleanup. Disconnecting the scene destroys the binding; call `trackHover` again when reusing a detached scene. Reduced motion removes positional travel.

## Color editing

`ui-color-picker` accepts HEX, RGB, HSL and OKLCH values. `format="hex|rgb|hsl|oklch"` selects the editor representation; the default is `hex`. `value` and existing change consumers keep canonical hex, including alpha. `formattedValue` gives the selected representation, and `parsedColor` supplies all four strings plus numeric sRGB channels. `ui-color-change` includes `{ value, formattedValue, parsed }`; `ui-color-format-change` includes `{ format }`.

```html
<ui-color-picker inline format="oklch" value="#6B97FF80"></ui-color-picker>
```

The editor composes Mash sliders, select, input and button controls. Their rails, thumbs, format menu and text field are exported as CSS parts. Existing hue, saturation, lightness, alpha, hex, palette, trigger and action slots remain available. Arrow keys edit the saturation/brightness plane; Shift increases the step.

Screen sampling appears only where the native EyeDropper API is available and can be disabled with `hide-eyedropper`. Cancellation preserves the color. An outstanding sampling request is aborted when the picker disconnects.

Colors are normalized to 8-bit sRGB. Out-of-gamut OKLCH channels are clipped; this is an sRGB editor, not a wide-gamut color-management system. Invalid edits restore the previous value and show inline feedback.

Catalogue additions: three hover compositions in Motion; Color formats, Fill control and Compact palette in Color Picker. Existing channel, contrast and palette-editing examples remain available.
