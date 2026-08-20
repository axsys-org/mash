# Mash GPUI adapter

This crate binds Mash's renderer-neutral SurfaceTree and catalogue recipes to
the unstyled behavior primitives in `gpui-base`.

- `gpui-base` owns native input, focus, keyboard, overlays, scrolling, and accessibility.
- Mash owns semantic node identity, shared state/event handles, DTCG tokens, and visual recipes.
- `MashStyledExt::mash_node` applies one semantic node recipe directly to any
  `gpui-base` primitive implementing GPUI's `Styled` trait.

The checked-in `contracts/mash-runtime.json` contains all 82 component trees,
both catalogues, 204 tokens across light/dark themes, the 38 pinned GPUI Base
mappings, and the same cross-renderer behavior fixtures used by the browser
runner. It contains no DOM selectors or CSS declarations; private catalogue
parameters are compiled into portable recipe parameters before they reach Rust.

The generated presentation support registry covers every catalogue trait exactly once. The generic
adapter applies 65 common layout, sizing, spacing, edge, color, overflow, and type traits directly
through `gpui::Styled`. Thirty-five focus, motion, SVG, input, generated-content, and other
renderer-specific traits are assigned to named specialized native nodes, so unsupported work is
visible and testable instead of disappearing during translation.

`MashNodeHandle` exposes the same accepted values, defaults, fallbacks, availability, and semantic
channels as the shared fixtures. `MashEventHandle` adds request/report intent, typed detail
validation, and relations back to the state nodes an event requests or reports.
`MashAdapter::compare_renderer_snapshot` checks an authored native realization against that same
SurfaceTree topology and event-intent contract without pretending its GPUI mechanics are DOM
mechanics.

```rust
use gpui::ParentElement as _;
use mash_gpui::{base::Button, MashAdapter, MashRecipeContext, MashStyledExt, MashTheme};

let mash = MashAdapter::embedded();
let context = MashRecipeContext::new().value("tone", "critical");
let button = Button::new("delete")
    .mash_node(&mash, "ui-button", "control", MashTheme::Dark, &context)
    .child("Delete project");
```

Regenerate and verify the embedded adapter contract from the repository root:

```bash
pnpm build:gpui-contracts
pnpm check:gpui
```
