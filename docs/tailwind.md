# Tailwind v4 with Mash tokens

`@mash/tokens/tailwind.css` is the optional application-styling layer for work that does not need
a component: page layout, one-off grouping, light surface treatment, and small motion fragments.
It does not style Mash component internals, and Tailwind is not a second token authority.

## Setup

Import Tailwind's utility compiler first, then the Mash adapter:

```css
@layer theme, base, components, utilities;

@import "tailwindcss/preflight.css" layer(base); /* optional */
@import "tailwindcss/utilities.css" layer(utilities);
@import "@mash/tokens/tailwind.css";
```

The adapter imports the complete Mash token cascade. Light is the default; `data-theme="dark"`
and `data-theme="light"` keep working on the root or any nested subtree.

The adapter deliberately omits Tailwind's default theme. Preflight is optional normalization rather
than a design-value source; the Mash catalogue opts into it in both its shell and preview document.
Mash remains the only source of colors, spacing, radii, typography, blur, and motion values;
Tailwind contributes normalization, its utility compiler, and static layout vocabulary.

## Token-backed utilities

Public semantic tokens are exposed as ordinary, unprefixed Tailwind vocabulary. Importing the
adapter is the explicit opt-in:

```html
<div class="fixed inset-[0] bg-overlay">
  <section class="stack surface-raised rounded-container p-container-inline">
    <h2 class="type-heading">Archive project?</h2>
    <div class="inline-group">...</div>
  </section>
</div>
```

The generated mappings cover:

- semantic colours: `bg-surface`, `text-text-muted`, `border-border`, `bg-overlay`
- semantic spacing and sizing: `p-container-inline`, `gap-control-gap`, and the usual
  Tailwind width/min/max utilities
- semantic radii: `rounded-control`, `rounded-container`, `rounded-pill`
- semantic easing and blur: `ease-control`, `ease-surface`, `backdrop-blur-progressive-1`

Reference variables such as `--ref-color-blue-500` remain in the CSS cascade because the semantic
aliases resolve through them and their provenance should be inspectable. They are not registered as
Tailwind theme values or utilities. Applications use roles, so a theme change can restyle them
without changing markup.

## Curated fragments

The adapter also registers small, variant-aware CSS fragments:

| Utility                     | Purpose                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `stack`                     | Vertical flex group with semantic stack spacing                      |
| `inline-group`              | Centered inline flex group with semantic inline spacing              |
| `cluster`                   | Wrapping inline group                                                |
| `surface*`                  | Default, raised, or sunken semantic surface and foreground           |
| `type-*`                    | Complete Dynamic Type role, plus compatible label/heading/code roles |
| `duration-*`                | Semantic transition duration only                                    |
| `motion-*`                  | Semantic transition duration and easing                              |
| `focus-visible:focus-ring`  | Accessible semantic focus outline                                    |
| `animate-fade-in/out`       | Surface-timed fades that automatically disable for reduced motion    |
| `material-*`                | Five Paper-aligned translucent material thicknesses                  |
| `vibrant-label-*`           | Compositor-aware semantic label pronunciation                        |
| `vibrant-fill-*`            | Compositor-aware semantic fill pronunciation                         |
| `vibrant-separator`         | Compositor-aware separator pronunciation                             |
| `vibrant-accent-action`     | Compositor-aware action foreground                                   |
| `backdrop-blur-progressive` | Six-stage, masked backdrop blur with a semantic overlay scrim        |

Compose these with Tailwind's ordinary layout utilities. For example, `transition-colors
motion-control` selects the properties with Tailwind and the timing with the token contract.

## Environmental materials and vibrancy

`material-ultra-thin`, `material-thin`, `material-regular`, `material-thick`, and
`material-ultra-thick` combine a thickness-specific semantic tint with the same 15px material blur.
Thickness describes tint contribution and content separation; it does not increase blur and it does
not choose an accessibility mode. Vibrancy is selected once on the document root or any nested
subtree:

```html
<main data-vibrancy="auto">
  <nav class="material-thin">...</nav>
  <aside class="material-regular">...</aside>
</main>
```

`auto` is the default. In an ordinary environment it resolves labels, fills, separators, and actions
to their vibrant ingredients and chooses the theme compositor (`multiply` in light mode,
`plus-lighter` in dark mode). Backdrop chroma is independently tuned by
`effect.material.backdropSaturation.standard`; saturation is not treated as vibrancy.

Reduced transparency (where supported) or increased contrast replaces translucent materials with
`color.surfaceRaised`, selects opaque semantic ingredients, disables blend compositing, and removes
the backdrop filter. Forced-colour mode uses platform colours. `data-vibrancy="reduced"` selects the
solid treatment explicitly; `data-vibrancy="vibrant"` keeps vibrant ingredients and selects
`effect.material.backdropSaturation.enhanced` for contexts whose dynamic contrast has been verified.

Opaque labels are derived from two independent inputs: the theme's neutral label source
(`color.labelSource`, black in light mode and white in dark mode) and the semantic strength tokens
`opacity.labelPrimary` through `opacity.labelSeximal`. The first three strengths are also the
ordinary `color.text`, `color.textMuted`, and `color.textDisabled` aliases, so changing the source or
a strength updates every catalogue recipe without rewriting component CSS. Vibrant mode selects the
parallel resolved label colours and the renderer compositor instead of pretending opacity alone can
sample a live backdrop.

The `vibrant-label-*`, `vibrant-fill-*`, `vibrant-separator`, and `vibrant-accent-action` utilities
apply the renderer compositor to the exact element or part that owns the semantic colour. Do not put
blend mode on an entire material container: compositing is a foreground/fill pronunciation, not a
property of the surface tree.

Mash catalogue recipes automatically apply that compositor to exported semantic text leaves such as
labels, titles, descriptions, menu items, path segments, and tree labels when they are nested in a
`material-*` utility. Arbitrary authored content is intentionally not guessed: apply a
`vibrant-label-*` utility to the exact text element. This prevents a rich content slot from blending
its nested buttons, focus rings, and surfaces as one bitmap.

Material tint, blur, backdrop tuning, semantic colour ingredients, and renderer compositing are
separate axes. Changing the environment mode updates every material without changing component
markup. Opaque/vibrant ingredient tokens remain out of Tailwind's general colour namespace; curated
utilities expose only valid combinations. The catalogue exposes Auto, Vibrant, and Reduced controls
and persists explicit choices as `?vibrancy=` review links.

### Component recipe conformance

Every `ui-*` and `sh-*` catalogue recipe resolves its structure through four shared internal roles:
surface, boundary, divider, and shadow. A boundary outlines the component or an interactive control;
a divider separates regions inside that component. They are deliberately not interchangeable. The
opaque defaults resolve through `color.surface*`, the opacity-based `color.border*` aliases,
`color.separatorOpaque`, and `color.shadow`.

A `material-*` ancestor replaces inherited boundaries and dividers with vibrant separators and
pronounces inset fills through the material fill tiers. It does not automatically erase a nested
component's surface or shadow: controls, top-layer popups, and deliberately elevated children keep
their own separation. A composition can explicitly make a direct child transparent when the
material itself should own that child's backdrop and elevation, as the catalogue's material-card
examples do. The token-consumer check rejects catalogue recipes that bypass these shared structural
roles.

## Progressive backdrop blur

`backdrop-blur-progressive` adapts [OuterVale's “Blobby Navbar Blur”](https://codepen.io/OuterVale/pen/emJQXOx)
into a token-driven fragment. It owns the layered masks and blur radii, but deliberately does not
choose whether the effect is fixed, how tall it is, or where it sits in the stack:

```html
<div
  class="backdrop-blur-progressive fixed inset-x-[0] top-[0] z-overlay h-compact"
  aria-hidden="true"
>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
</div>
```

The six empty spans are decorative blur stages and must remain hidden from assistive technology.
Their strength comes from `blur.progressive.1` through `blur.progressive.6`; the scrim uses
`color.overlay`, and opacity transitions disable under reduced motion. The same semantic blur
tokens are also available through Tailwind's individual `backdrop-blur-progressive-*` utilities.

## Boundary

Use this layer for layout and lightweight visual treatment. If something needs behavior,
accessibility semantics, state ownership, or reusable anatomy, it belongs in `@mash/ui` instead.
Component-specific styling remains in the opt-in Mash catalogue recipe.

The catalogue itself demonstrates the split without parallel application stylesheets:

- `apps/catalog/src/utility-recipes.ts` composes semantic utilities for application chrome and
  example layout.
- `packages/*/src/catalogue/mash.css` owns shared component appearance through documented parts.
- component shadow CSS retains only browser behavior and interaction mechanics.

`pnpm run check:tokens` keeps that boundary honest: the catalogue CSS entrypoint may only import
Tailwind and the Mash adapter; authored application rules must use the semantic utility recipes.
