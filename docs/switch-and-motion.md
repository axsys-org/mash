# Switch and motion patterns

## Switch

`ui-switch` accepts `label` or slotted label content. Set `checked` from application state and listen to `ui-switch-change` for user changes. Property assignment remains silent. Form data is updated before that event; disabled fieldsets remove the switch from submission.

```html
<ui-switch label="Notifications" checked></ui-switch>
<ui-switch size="compact" label="Quiet hours"></ui-switch>
```

Omitted size inherits the nearest `data-mash-size` context. `compact`/`small` and `default`/`medium` pin the physical size. Existing aliases and `label-side` remain supported.

The native control handles clicking and Space. Thumb dragging uses Mash's gesture controller, commits once on release, supports right-to-left layout, and restores the previous state on cancellation. Disconnecting removes gesture bindings. The recipe adds hover stretch and press compression; reduced motion makes state changes immediate. Disabled on and off remain visually distinguishable.

## Motion tiers

Set `pace` on an existing `ui-motion` scene. `inherit` remains the default for existing authored timing roles.

| Pace     | Enter  | Exit   | Use                                |
| -------- | ------ | ------ | ---------------------------------- |
| fast     | 80 ms  | 60 ms  | Hover, fades, small feedback       |
| moderate | 160 ms | 120 ms | Short travel and precise placement |
| slow     | 240 ms | 160 ms | Larger entering surfaces           |

Durations are semantic tokens (`--duration-fast-enter`, `--duration-fast-exit`, and corresponding moderate/slow roles). CSS settling curves provide restrained spatial overshoot for slow entry; exits use a non-overshooting curve. These are native CSS timing recipes, not a physical spring solver.

```html
<ui-motion motion="scale" pace="slow" state="entering">
  <ui-card>Ready to share</ui-card>
</ui-motion>
```

The existing `mash-motion-end` event remains the completion signal. Check `detail.interrupted` before removing content so reopening cannot be undone by an old exit. Reduced motion also completes this lifecycle.

For authored native animations, `motionTiming(tier, phase, element)` from `@mash/ui/motion` resolves the same tokens into `KeyframeAnimationOptions`, respecting reduced motion. `exitFallbackMs(tier, element)` gives the resolved exit duration plus a 100 ms guard for consumers that defer unmounting.

## Label weight

The `mash-weight` recipe reserves the emphasized text width while the visible label changes weight. It works with the current font and requires no runtime measurements. Variable fonts interpolate; other fonts use the available weights.

```html
<ui-switch>
  <span class="mash-weight" data-text="Notifications"><span>Notifications</span></span>
</ui-switch>
```

Keep `data-text` equal to the visible label when changing copy. Checked switches, hovered/focused buttons, or an authored `data-weight-active` attribute apply emphasis. The hidden measurement copy is excluded from accessibility output.
