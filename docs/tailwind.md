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

| Utility                     | Purpose                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `stack`                     | Vertical flex group with semantic stack spacing                   |
| `inline-group`              | Centered inline flex group with semantic inline spacing           |
| `cluster`                   | Wrapping inline group                                             |
| `surface*`                  | Default, raised, or sunken semantic surface and foreground        |
| `type-*`                    | Complete body, label, heading, or code typography role            |
| `duration-*`                | Semantic transition duration only                                 |
| `motion-*`                  | Semantic transition duration and easing                           |
| `focus-visible:focus-ring`  | Accessible semantic focus outline                                 |
| `animate-fade-in/out`       | Surface-timed fades that automatically disable for reduced motion |
| `backdrop-blur-progressive` | Six-stage, masked backdrop blur with a semantic overlay scrim     |

Compose these with Tailwind's ordinary layout utilities. For example, `transition-colors
motion-control` selects the properties with Tailwind and the timing with the token contract.

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
