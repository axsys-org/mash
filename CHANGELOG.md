# Changelog

All notable Mash and Paper-foundation changes are recorded here. Entries are
written when a change is reviewed and synchronized; this file is not generated
from resolved token values.

## Unreleased

### Paper foundation sync

- Added the reviewed Interzone foundation contract at
  `packages/tokens/src/paper-contract.json`.
- Added `pnpm run check:paper` and the matching CI guardrail so Paper aliases
  cannot drift from Mash's generated token graph.
- Added the supervised Paper → Mash → catalog-preview handoff in
  `docs/paper-sync.md`.
- Kept event-driven branch/PR automation deferred until Paper exposes a stable
  change event and conflict-resolution boundary.
- Rebased labels, neutral fills, inset surfaces, component boundaries, and
  separators onto the reviewed opacity-based Interzone hierarchy for both
  light and dark themes.
- Added shared surface, boundary, divider, and shadow pronunciation roles to
  every Web Component and Shrine catalogue recipe, including material-aware
  inheritance and a conformance guard against legacy structural aliases.

### Shrine primitives

- Added the reusable `ui-path` preview primitive for raw paths and pretty titles,
  including small/medium presentations, icon slots, state, and overflow rules.
- Added compositional `ui-tree` and `ui-tree-item` primitives for deeply nested
  Shrine namespaces and explicit empty intermediate nodes.

### Interaction primitives

- Added the side-effect-free `@mash/ui/drag` TypeScript controller with typed
  containment, point/line/grid/rectangle/element snapping, dedicated handles,
  controlled ownership, HTML/SVG positioning adapters, and edge auto-scroll.
- Added the optional `<ui-draggable>` adapter with semantic slots, parts,
  runtime states, cancelable proposals, and catalogue examples composed from
  existing Mash components.
