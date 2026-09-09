# Complex component example parity

Audit date: 2026-09-08. Baseline: `ca7a0ee`. This is a source audit of the live
example registry, component implementations, existing tests, and the supplied
documentation/source snapshot (`48336016a3074fbb8af619014b18565ef747f512`). It is
not a visual sign-off. No component below has established exact visual parity.

The target is an executable demonstration for every relevant documented behavior
and visual variant. Equivalent web-native composition is acceptable when the
interaction and result are complete. An available option, named slot, registered
renderer, or passing render check is not an executable demonstration.

## Immediate conclusions

| Surface          | Current live examples              | Assessment                                                                                                                   |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Chart            | 12 configurations                  | Core chart types present; customization and interaction breadth substantially incomplete.                                    |
| Data table       | 6 examples                         | Selection/editing foundation present; large-data, column, and application compositions incomplete.                           |
| Static table     | 1 example                          | Several supported structural and visual variants unshown.                                                                    |
| Editor           | 2 examples                         | Native source editing is useful; major documented editor capabilities absent.                                                |
| Color selector   | 2 examples                         | Working inline/popup selection; size, format, trigger, and composed workflows incomplete.                                    |
| Dock             | 1 example                          | Tabs/splits/persistence work; edge regions and free-position tiles absent.                                                   |
| List composition | 3 command examples                 | Search and basic item activation present; sectioned/loading/reorderable/large lists incomplete.                              |
| Scroll area      | 1 example                          | Implementation considerably exceeds what the catalogue demonstrates.                                                         |
| Virtual list     | 1 example                          | Authored-item windowing; not equivalent to bounded construction of a large data collection.                                  |
| Message scroller | Live conversation and long history | Useful measured virtualization and prepend anchor support; streaming and structural-update demonstrations remain incomplete. |

Counts describe the inspected registry only; they are not completion metrics.
`apps/catalog/src/examples/components.ts` merges pattern examples and then replaces
entire component arrays with `refinements`. Audit the final merged registry, not
every example literal found on disk.

## Chart and plot

Evidence: `apps/catalog/src/examples/data.ts`, `packages/components/src/chart/chart.ts`,
`packages/components/src/chart/renderer.ts`, and supplied Chart / Plot documentation.

The live set contains Line, Area, Stacked area, Bars, Horizontal bars, Positive and
negative, Pie, Donut, Radar, Candlestick, Flow, and Scatter · canvas. It supplies
readable fallback data tables and theme-aware rendering. Existing renderer imports
also support heatmaps, graphs, and treemaps, but none has a live example.

**P1 — supported options need deliberate examples and comparison:**

- Lines: smooth/linear/step-after, dots on/off, stroke treatment, controlled ticks,
  multiple series, legend interaction, and time axes. The current Line uses the
  renderer default; a smooth Area is not a Line variant demonstration.
- Bars: all four growth directions, labels on/off, value-axis ticks, per-datum
  colors, gradients local to a bar versus the chart domain, corner treatments,
  grouped versus stacked, and positive/negative mixtures. One rounded horizontal
  series does not demonstrate all alignment/corner combinations.
- Areas: curve variants, layered versus stacked, fill/stroke opacity, meaningful
  zero/negative handling, and dense data.
- Pie/donut: pad angle, labels, inner/outer radius, slice border and custom colors.
  Both current examples explicitly hide labels.
- Radar: single versus multiple series, per-element labels, shape/grid/axis
  customization, and fill/stroke differences.
- Candlestick: body/wick width, tick treatment, positive/negative color refinement,
  real time-series data, and pan/zoom controls.
- Flow: alignment choices, spacing/width, source-to-target gradient ribbons,
  throughput labels and multiple styled label lines, overflow-safe margins,
  and extreme value ranges. The current example has four nodes and no labels
  beyond renderer defaults.
- Shared states: point activation with a visible selected-data result, update/reset,
  empty data, malformed configuration/recovery, large datasets, narrow/wide
  resize, nested theme boundaries, and reduced motion.

**P1 — capability equivalence must be resolved, not assumed:**

- The supplied flow contract includes square-root size compression that retains
  original values for labels and keeps ribbon/node conservation. No adapter or
  example implements this. Merely transforming values would not prove equivalent
  labels or layout semantics.
- The supplied Plot documentation exposes composable scales, marks, stacking,
  arcs, and axes, including a custom chart assembled from them. Mapping that topic
  to the same twelve `ui-chart` screenshots does not demonstrate its authoring
  capability. Choose an explicit existing-renderer composition or a small public
  plot contract, then demonstrate the custom marks and scales without new dependencies.

Tests currently cover SVG theme/lifecycle, malformed JSON recovery, and retention
of zoom/legend state. Add user-visible tests for chart selection, option changes,
canvas resize, and the difficult flow cases. Capture each chart family in both
themes at ordinary and expanded stage widths; assess labels, ticks, gradients,
legends, and tooltip contrast rather than just presence of an SVG.

## Data table and static table

Evidence: `apps/catalog/src/examples/tables.ts`, the table entry in
`apps/catalog/src/examples/components.ts`, and `packages/components/src/data-table/`.

The live data-table set demonstrates row filtering/selection, cell selection,
ascending/descending source sorting, authored editing, three densities, and static
loading/empty states. The implementation explicitly leaves data mutation and
virtualization to consumers. This boundary is workable only with complete examples.

**P1 — implementation or composition gaps:**

- Column resizing and moving, fixed columns, per-column resizable/movable policy,
  width and alignment controls, and persistent user column layout.
- A genuinely virtualized large-data grid with fixed headers, accurate logical
  indices, keyboard navigation across unmounted rows, and selection/editing that
  survives scrolling. Four authored rows cannot verify this contract.
- Infinite loading or pagination with append/error/retry/end states, preserving
  position and selection.
- Row context actions with real edit/delete/duplicate behavior, mixed cell
  renderers, and focused financial/user-management style compositions.

**P1 — supported behavior missing from examples:**

- Column selection; rectangular selection and Shift extension; row/column title
  bands; disabled/non-selectable cells; programmatic selection; selection output
  that accurately reflects the chosen data after filtering/sorting.
- Sort reset to source order. The current example toggles only ascending and
  descending even though the documented behavior includes a default state.
- Transition between loading, loaded, empty, no-results, and failed/retry states,
  rather than two permanently separate placeholder tables.

**P2 — static table variants:** Footer totals, fixed/flexible widths, left/center/right
alignment, borderless treatment, custom padded cells, row/column header scopes,
and caption placement. Existing semantic table parts already support much of this.

Unit tests cover controlled selection/ranges, keyboard requests, editing lifecycle,
and hidden-row filtering. Browser examples test edit/save/cancel and one ascending
sort. They do not demonstrate pointer resizing/moving, virtualized grid navigation,
pagination, or context actions. Keep those existing contracts and add interaction
tests for each newly completed workflow.

## Editor

Evidence: `apps/catalog/src/examples/refinements.ts`,
`packages/components/src/editor/editor.ts`, `packages/components/src/editor/syntax.ts`.

Source editor has find-next, literal replace-all, wrapping, reset, and selection
status; Read-only shows a one-line configuration. Native textarea behavior preserves
ordinary selection, typing, composition, and clipboard use.

**P1 — actual capability gaps:** Folding; visible whitespace; hard-tab versus spaces
policy; multiple cursors; rectangular selection and edits; edit-tracking decoration
ranges. `language` does not select a grammar: `sourceTokens` takes only the source
string and uses a fixed lexical expression. A language label alone does not establish
language-specific highlighting. Authored overlay slots and command events do not
implement completion, diagnostics, or code actions without a functioning provider.

**P1 — example/ergonomic gaps within existing behavior:** Show disabled and empty
states, line-number toggles, tab sizes, wrapped long lines, multiple-language samples,
case-sensitive search, previous/next/match counts, and read-only search. The current
read-only example has no search UI. The editable search field has no Enter/Shift+Enter
handlers, unlike the documented search workflow. A command event for Find does not
substitute for complete search UI in every editor composition.

Existing tests verify safe textual highlighting, indentation, literal search/replace,
selection events, and provider command dispatch. Extend browser coverage to selection
and caret alignment with wrapping/scrolling, keyboard search, read-only search, IME,
undo after programmatic edits, and each implemented advanced capability. Do not mark
advanced provider behavior complete from slot existence tests.

## Color selector

Evidence: the two color entries in `refinements.ts`,
`packages/components/src/color-picker/color-picker.ts`, and its existing tests.

Working controls include a pointer plane, keyboard-operated channel ranges, hex,
alpha, swatch preview/commit, inline mode, and an anchored popup. The older authored
channel example in `utility.ts` is overwritten by refinements and is not live.

**P1 — demonstrations:** Sizes; icon-only and labelled triggers; anchor placements;
larger curated/featured palettes; explicit translucent colors over a checkerboard;
RGB/HSL/hex representations that stay synchronized; preview versus commit/cancel;
clear/reset; disabled state; invalid hex recovery; theme editor with several linked
colors; add/remove palette entries; and validation with actionable feedback.

The current two examples do not establish size parity or a polished palette layout.
Resolve sizes through documented public styling or an explicit component API; do not
silently hardcode one-off stage dimensions. Keyboard channel controls are present;
the plane has pointer handlers only, so explain and test the equivalent keyboard path.

Tests verify normalization, authored slots, swatch preview/commit, clear, and browser
plane/hex input. Add alpha round-trip, popup positioning at constrained edges, keyboard
channel interaction, invalid input recovery, and disabled prevention assertions.

## Dock and resizable workspace

Evidence: `packages/components/src/dock/{dock.ts,layout.ts}`,
`packages/components/src/dock-panel/dock-panel.ts`, the Workspace panels example in
`refinements.ts`, and the supplied Dock documentation plus runnable dock source.

Implemented: stable authored panels, draggable tabs, nested split groups, close/reopen,
keyboard and pointer separators, group maximization, validated versioned layout
restoration, and an example preserving edited text through movement.

**P1 — missing capabilities:** Collapsible left/right/bottom dock regions independent
of center splits, edge sizes/toggles, and free-position tiles. A center split with a
panel placed on its left is not a persistent collapsible edge dock. The current
layout model accepts only `tabs` and `split`, so tile behavior cannot be demonstrated.

**P1 — expand demonstrations:** Multiple initial workspaces, all split edges,
empty/closed-all recovery, nested groups, tab overflow, per-panel close policy,
maximize/restore controls, authored tab/toolbar content, invalid/older saved state
fallback, nested scrolling, and material/theme refinements. Provide human-usable
space for the panels and test the exact same workspace in the expanded stage.

Existing tests verify imperative movement, stable content, restore validation,
reordering/adjacent close, and keyboard separator resize. Browser coverage uses
authored split/save/restore controls. Add real drag/drop to every edge, pointer resize,
tab overflow, focus retention, maximization, and closed-all recovery before claiming
complete workspace interaction parity.

## Lists, scroll areas, and virtual collections

Evidence: `apps/catalog/src/examples/{navigation,patterns,utility}.ts`,
`packages/components/src/command-palette/`, `packages/components/src/scroll-area/`,
and `packages/components/src/virtual-list/`.

**P1 — list compositions:** The supplied List topic maps to `ui-command`, whose
live examples are Commands, Command dialog, and Selectable list. Missing visible
compositions include section headings/footers, inline item actions, checked versus
selected versus confirmed state, loading/retry, custom empty state, infinite
append, drag/drop reorder, scroll-to-selected, and substantial file/contact lists.
Native content lists can remain native HTML; demonstrate complete behavior rather
than requiring another component registration system.

**P1 — virtual list capability:** `UIVirtualList.#syncVisibleRange` enumerates all
authored elements, rebuilds offsets, and visits every item on each update. Its binary
search does not make the full scroll operation logarithmic. `UIVirtualItem.realize`
removes shadow rendering for offscreen content, but every authored host and its
light-DOM content still exists. This does not establish the supplied large-collection
memory/rendering behavior. Measure DOM construction, scroll cost, and retained content
before presenting it as the solution for very large data collections. The measured
message-history engine is a useful existing implementation to evaluate for reuse.

**P1 — virtual list examples:** Horizontal cards, different item sizes, top/center/end/
nearest targeting, both-axis multi-column rows with fixed header, append/prepend,
selection across the visible window, and size changes. The current Members example
does not expose these behaviors. Existing three tests cover range/extent and targeting;
add large collection bounds and dynamic-size/axis acceptance without asserting that
all authored hosts disappear when the present implementation deliberately retains them.

**P2 — scroll-area examples:** Vertical/horizontal/both axes; always/hover/scrolling
visibility; sizes; stable gutter; custom track/thumb; pointer/keyboard scrollbar
navigation; detents and target navigation; snapping; RTL; short/no-overflow content;
nested scroll and reduced motion. Most already exist in the public implementation and
twelve unit tests. The single Notes example hides this breadth from users.

**P1 — message-history examples:** Token-by-token streaming with remeasurement,
append while following versus reading old messages, unread navigation, custom latest
control, empty/reload, prepend while reading, deletion/reordering, delayed media
heights, and editable/composed rows. The current virtual history anchor and bounded
row tests are valuable but do not cover every structural update or streaming case.

## Evidence and catalogue acceptance

`docs/reference/components.json` is a useful topic inventory, not a current proof
matrix. At this baseline it still maps Dock to `ui-resizable`; Editor names Source
instead of Source editor / Read-only; Color names Color instead of Color selector /
Popover and palette. The Plot mapping reuses chart types without exposing plot
composition. Reconcile these records with the final runtime registry, retaining
unimplemented requirements as open entries.

The general `example-variants.spec.ts` checks page errors, registered elements, an
attached target, and document horizontal overflow in light/dark. It neither compares
reference geometry nor asserts completion of each interaction. A short/clipped
internal viewport can pass. The inspected stage code also clamps iframe body height
to 1200 pixels and creates isolated frames per example; independently verify content
reachability and overlay room in the revised stage, including zoom and expansion.

For each requirement, record its live section, public configuration, interaction
assertion, and compared light/dark capture. Mark it complete only after the demo is
reachable, usable with pointer and keyboard, visually compared, and its visible
outcome verified. Consolidate related controls within a useful stage without hiding
the variants behind an example menu. Keep Stories outside this work until these
component-level gaps are closed.
