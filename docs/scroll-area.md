# Scroll areas

Import `@mash/ui/scroll-area` and the existing Mash catalogue stylesheet. No additional runtime or styling dependency is needed.

```html
<div data-mash-catalogue="mash">
  <ui-scroll-area
    class="mash-scroll-quiet mash-scroll-fade"
    orientation="horizontal"
    mode="always"
    label="Months"
    style="width: 100%"
  >
    <div style="display: flex; width: max-content; gap: 8px; padding: 16px">
      <!-- Authored month cards -->
    </div>
  </ui-scroll-area>
</div>
```

- `orientation="vertical|horizontal|both"` constrains scrolling and scrollbar controls. The default remains `both` for existing consumers. Constrain the outer height for vertical scrolling.
- `mode="always"` keeps the scroll cue visible when content overflows. Existing `hover` and `scrolling` modes remain available.
- `mash-scroll-quiet` makes the thumb narrow at rest and wider on hover, focus, or dragging, using existing scrollbar geometry and motion tokens. Touch-primary devices use native scrollbars.
- `mash-scroll-fade` masks overflowing edges using existing scroll states. Reached edges and content that fits stay unmasked. Set `--mash-scroll-mask-size` to adjust the fade depth.
- Use `::part(viewport)` for inner viewport styling. Use `::part(block-scrollbar)`, `::part(block-track)`, `::part(block-thumb)` and their `inline-*` counterparts for shape and material. No viewport class forwarding or shadow-root access is needed.
- `gutter="stable"` reserves space for enabled axes. `scrollViewportTo` and `scrollToTarget` compose navigation with native scrolling; `scrollToTarget` respects reduced motion.

The catalogue includes vertical, horizontal, two-axis, visibility, shape and section-navigation examples, each with portable reference code. Native wheel, trackpad and touch input remain intact; custom thumbs reuse the component's existing pointer capture and keyboard behavior.
