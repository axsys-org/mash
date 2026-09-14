# Changelog

All notable Mash and Paper-foundation changes are recorded here. Entries are
written when a change is reviewed and synchronized; this file is not generated
from resolved token values.

## Unreleased

### Component rebuild

- Normal package imports now define the component set automatically; component
  subpaths also define their elements. Removed registration setup from catalog
  examples and replaced family navigation with a flat searchable list.
- Separated hover, pressed, persistent selection, and inverse surface pairs.
  Corrected status text/fill contrast in both themes and prevented material
  gamut settings from changing semantic action colors.
- Expanded portable examples across all 112 component pages, removed over 2,200 lines
  of oversized examples, and split the public recipe into focused CSS modules.
  Menus use opaque surfaces by default with deliberate material opt-in.

- Added charts, messages, attachments, conversation markers and scrolling,
  persistent alerts, ratings, command lists, and steppers. Charts load a themed
  SVG/canvas renderer on demand and support a slotted data alternative.
- Added five tab treatments, owner-controlled closing, platform-aware keyboard
  hints, native menu links, and focused sorting/editing examples. Icon-only
  button labels now reach the native accessible control.
- Rebuilt the catalog navigation, example toolbar, usage code, API, and token
  sections. Retired the application stage from production and moved its recipe
  code alongside the retained prototypes.

- Rebased the shared palette, typography, spacing, and corners onto Mash's
  neutral light/dark foundations. `check:foundations` verifies the reviewed
  semantic aliases.
- Added inherited control sizing and public row, stack, grid, and panel layouts.
  The default button is bordered; filled actions use `variant="primary"`.
- Replaced eight control pages with focused examples and a stage that loads
  only their displayed imports. Removed the toolbar application demos and
  their automatic runtime imports from the base stage.
- Added blocking production-catalog tests for example dependencies, theme
  restoration, alignment, and keyboard behavior. The remaining rebuild work
  and migration notes are in `docs/component-rebuild.md`.

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
