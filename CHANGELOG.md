# Changelog

All notable Mash and Paper-foundation changes are recorded here. Entries are
written when a change is reviewed and synchronized; this file is not generated
from resolved token values.

## Unreleased

### Renderer-neutral contracts

- Added portable catalogue presentation and layout recipes with semantic conditions, token
  provenance, and private parameter cascades.
- Added canonical SurfaceTree and behavior fixtures plus a Web runner covering all published
  components.
- Normalized state and event intent, typed payloads, and request/report relationships without
  exposing renderer-specific event types.

### GPUI adapter

- Added the first `mash-gpui` adapter on the pinned `gpui-base` revision, with embedded SurfaceTrees,
  themes, catalogue recipes, semantic handles, and shared conformance fixtures.
- Added direct Mash recipe application for every GPUI `Styled` primitive and an exhaustive native
  owner registry for all catalogue presentation traits.
- Added native realization snapshots so GPUI implementations run against the same semantic node
  topology and event intents as the Web conformance runner.
- Added a runnable native catalogue covering all 38 pinned GPUI Base families and their 52 mapped
  Mash components, plus an application-facing `NativeBinding` API for scoped semantic-node recipes.
- Added a locked Rust 1.95 toolchain, native tests, generated-contract staleness checks, and a Linux
  CI job using the upstream GPUI system dependencies.

### Catalogue conformance

- Added light/dark geometry checks for every catalogue page plus compact audits for overlays,
  scrolling, toolbars, trees, color picking, and the Shrine triptych.
- Reorganized structural primitives into composed examples and fixed empty slot previews, bounded
  scroll regions, meter realization, and responsive shell behavior.

### Paper foundation sync

- Added the reviewed Interzone foundation contract at
  `packages/tokens/src/paper-contract.json`.
- Added `pnpm run check:paper` and the matching CI guardrail so Paper aliases
  cannot drift from Mash's generated token graph.
- Added the supervised Paper → Mash → catalog-preview handoff in
  `docs/paper-sync.md`.
- Kept event-driven branch/PR automation deferred until Paper exposes a stable
  change event and conflict-resolution boundary.

### Shrine primitives

- Added the reusable `ui-path` preview primitive for raw paths and pretty titles,
  including small/medium presentations, icon slots, state, and overflow rules.
- Added compositional `ui-tree` and `ui-tree-item` primitives for deeply nested
  Shrine namespaces and explicit empty intermediate nodes.
