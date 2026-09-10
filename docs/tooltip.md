# Tooltips

`ui-tooltip` extends Mash’s existing anchored overlay. It uses the shared collision resolver, presence lifecycle, semantic timing tokens, and CSS parts. No provider, portal package, or extra registration family is needed.

```html
<ui-tooltip label="Save your changes">
  <ui-button slot="trigger">Save</ui-button>
</ui-tooltip>

<ui-tooltip placement="right" offset="8" open-delay="0">
  <ui-button slot="trigger">Details</ui-button>
  A short explanation
</ui-tooltip>
```

The default slot accepts passive text, markup, icons, and `ui-kbd`. When it contains no meaningful content, `label` supplies the visible text. Keep an icon-only trigger’s accessible name on the control itself; the tooltip adds a description without replacing that name. Descriptions are linked to native triggers and the native controls inside Mash’s shadow roots, and cleaned up when the tooltip disconnects.

## Placement and interaction

- `placement`: `top` (default), `right`, `bottom`, or `left`. Shared positioning flips and clamps near viewport edges.
- `align`: `start`, `center` (default), or `end`.
- `offset`: distance from the anchor, default `8` pixels.
- `open-delay`: pointer hover delay, default `200` ms. Keyboard focus opens immediately.
- `close-delay`: pointer transfer grace period, default `300` ms. Focus leaving closes immediately.
- `follow-cursor="x"` or `"y"`: tracks one axis while preserving the other trigger edge. Keyboard focus resets to the element anchor. Touch movement is not tracked.
- `trigger`: `hover` (including focus, default), `click`, or `manual`.
- `open`, `show()`, `dismiss()`, `toggle()`: existing overlay state and imperative methods.
- `forceOpen`: JavaScript property accepting `true`, `false`, or `undefined`. A Boolean pins visibility and ignores automatic/imperative requests. `undefined` returns to automatic interaction, closing a previously pinned tooltip until the next interaction. Changing policy cancels pending hover timers. `disabled` takes precedence over forced opening.

`ui-tooltip-open-change` emits `{ open, reason }` for internal interaction and imperative requests. Direct assignments and forced state are application-owned and do not echo change events. A tooltip never takes focus; Escape dismisses an automatic tooltip while preserving trigger focus.

## Styling and composition

Use `::part(popup)` for the content surface, shape, wrapping width, colors, and typography. Use `::part(description)` for content layout, `::part(positioner)` for the positioning boundary, and `::part(backdrop)` for layer order. Keep placement geometry owned by the positioner. Tooltips remain in their owning DOM; this is not a document-level portal that bypasses all ancestor clipping.

The default recipe uses an inverse surface and readable 13 px text (or the inherited size context), an 80 ms entrance and a 60 ms dismissal. Presence uses the shared animation lifecycle and reduced-motion handling. The tooltip itself accepts pointer hover during the close grace period, so a user can move onto and read its content.

Tooltips contain no independent actions. Use a popover for links, buttons, or editable content. For a disabled control, a focusable wrapper may explain why the action is unavailable; keep the wrapped control disabled. A dialog continues to own focus containment when a tooltip describes one of its controls.
