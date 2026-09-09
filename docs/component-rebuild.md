# Mash component rebuild

The rebuild branch is `codex/component-rebuild`. Existing working changes were
checkpointed at `7430e3b` before the rebuild. Behavior worth keeping stays in the
component layer: form association, keyboard navigation, filtering, selection,
overlay positioning, presence, and animation.

## Foundation and composition contract

The token graph remains authoritative. Reference values feed themed color roles
and semantic typography, spacing, shape, and dimensions. Component definitions
expose parts, slots, state, and behavior; the public recipe supplies appearance.
There are no component-local palette literals.

The base palette is opaque and neutral in both themes. The primary action uses
the strongest neutral contrast; semantic status colors remain separate. Material
and vibrancy machinery is retained for deliberate opt-in use. Menus now default to the same opaque popup surface; translucency requires an explicit material utility.

Controls share 6px corners, 12/14/16px text roles, and these dimensions:

| Size        | Button height | Input/select height |
| ----------- | ------------: | ------------------: |
| Extra small |          20px |                   — |
| Small       |          24px |                24px |
| Medium      |          32px |                32px |
| Large       |          32px |                44px |

`data-mash-size` sets the size context for a composition. Buttons, inputs, selects,
and comboboxes default to `size="inherit"`; explicit component sizes override the
context. Toggles follow their context. The default context is medium. Size remains
independent of meaning and emphasis.

```html
<div data-mash-catalogue="mash">
  <ui-toolbar label="Document tools" data-mash-size="small">
    <ui-button>New</ui-button>
    <ui-input label="Find in document" placeholder="Find"></ui-input>
    <ui-button variant="primary">Save</ui-button>
  </ui-toolbar>
</div>
```

```js
import "@mash/ui";
import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
```

Public layout classes are `mash-row`, `mash-stack`, `mash-grid`, `mash-wrap`,
`mash-fill`, and `mash-panel`. Parents own spacing; controls own their frame.
They use the same semantic roles as the part recipes and need no catalog runtime
or utility compiler. The public CSS entry imports separate foundation, control, layout, form, overlay, navigation, display, conversation, and environment recipes. Environment overrides run last.

## Examples must stand alone

All 112 component pages now use focused, portable examples: 84 directly authored pages and 28 child components demonstrated inside their owning composition. The catalogue contains 156 named examples. Each carries its recipe opt-in
and public layout. Usage shows normal package imports. `@mash/ui` defines the complete
base set; `@mash/shrine` also defines its base dependencies. Optional component imports
such as `@mash/ui/button` automatically define their elements as well. There is no
consumer registration list or family setup. The catalog navigation is flat and searchable.

Portable frames use those same package entrypoints, tokens, and public recipes.
They supply preview placement, without application listeners or hidden layout classes.
Theme and example deep links restore the preview.

The old toolbar application demos have been removed from its component examples.
Their implementation modules and the checkpoint preserve the useful application
work. The old application stage is excluded from the production build, and its
recipe map is isolated from catalog styling; reintegrating them requires a separate application showcase, with its full
dependencies and behavior shown. They are not base component teaching material.

The stage fullscreen change stays deferred until the component and example set
has completed visual review.

## Interaction and inverse roles

`surfaceHover` and `surfacePressed` are transient states on unfilled surfaces.
`neutral`, `neutralHover`, and `neutralPressed` are the filled neutral sequence.
`selection`, `selectionHover`, and `onSelection` describe persistent selection.
Options, toggles, trees, and data tables retain selection while hovered.

`surfaceInverse` pairs with `onSurfaceInverse` and `onSurfaceInverseMuted`.
Tooltips and slider values use this pair. Changing an ordinary surface cannot
silently change inverse text. Composed regions use an explicit nested `data-theme`
so all their controls, borders, surfaces, and state colors resolve together.

Status fills have matching hover, pressed, and foreground roles, including info.
The separate status `*Text` roles serve ordinary surfaces and tinted controls.
Every filled state and the strongest button tint is checked for 4.5:1 text contrast
in both themes. Wide-gamut material settings preserve semantic selection and action
colors; a material no longer overwrites the action or neutral role of its children.

## Migration notes

- The default button is now a bordered neutral control. Use `variant="primary"`
  for a filled primary action.
- The default size property on buttons, inputs, selects, and comboboxes is now
  `inherit`. Explicit sizes retain their meaning.
- Body and regular label text are now 14px. Menu corners are 6px and menu row
  corners are 4px. Applications should review layouts that assumed the old sizes.
- `check:foundations` replaces the former external-design synchronization check.
  Historical snapshots are retained under `docs/reference`.
- Existing deep links to removed component examples fall back to the new first
  example. Application modules are retained but are no longer toolbar demos.

## Expanded components and examples

The base set adds charts, messages, attachments, timeline markers, alerts, ratings,
conversation scrolling, command lists and items, and steppers and steps. Tabs now
cover five treatments, four sizes, vertical layout, overflow, adjacent controls,
and owner-managed closing. Keyboard hints format platform shortcuts. Menu items
support native destinations alongside commands, checkboxes, radio groups, and
submenus. Menus default to 26px rows; compact density remains explicit.

Data-table examples separate filtering and selection, sorting, cell selection,
editing, density, and loading/empty states. Calendar examples cover ranges,
month/year selection, and restrictions. Accordion examples cover a joined border,
four sizes, multiple open items, and independent nested disclosures. Chart examples
cover twelve arrangements with readable data alternatives and a lazy renderer;
see [chart-rendering.md](chart-rendering.md) for engine research and bundle costs.

Every example shows its own markup and any required JavaScript. Usage imports,
API attributes/properties/events/slots/parts, considerations, and token references
come from the public component contract. The catalogue frame adds preview placement.
It supplies no hidden application controller or private component styling.

## Review and remaining work

This rebuild does not certify complete feature or pixel parity. The source-derived
[capability checklist](reference/components.json) records 71 documentation topics
and their executable Mash examples. The structural census remains available in
[audit/inventory.md](audit/inventory.md). A topic mapping is coverage evidence,
not a claim that every reference feature has been implemented.

`bd` is unavailable in this workspace. This ledger records open work:

| Work                            | Status and required result                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MASH-R2: reference acceptance   | Opaque surfaces, shared dimensions, hover/pressed/selection/inverse states, menu density, and joined accordion treatment implemented. Complete direct comparison of every example and relevant interaction state in both themes.                                                                                                                                                             |
| MASH-R3: capability gaps        | Virtual message history now preserves visible anchors across prepends and measures variable-height rows. Nested dock tabs, splits, resizing, closing/reopening, maximization, and validated layout persistence are implemented. Collapsible edge docks and rich editor provider behavior remain open.                                                                                        |
| MASH-R4: API and example depth  | The showcase now lists base components only and displays their variants directly. Re-run the complete portability and variant sweep against this replacement shell. Check every feature listed in the 71-topic checklist against actual behavior, expand missing variants, and replace remaining illustrative actions with useful executable outcomes where they teach a component contract. |
| MASH-R5: chart state            | Twelve chart arrangements and SVG/canvas renderers are available. Theme and renderer changes preserve zoom and legend selection. Audit remaining interaction state for each supported chart type.                                                                                                                                                                                            |
| MASH-R6: visual baselines       | The blocking catalogue gate checks all named examples in both themes, composition geometry, dependency display, and focused interactions. Canonical screenshot baselines remain platform-specific and local. Establish reviewed Linux baselines before making the screenshot job blocking.                                                                                                   |
| MASH-R7: later application work | Preserve the isolated application source for the requested playground and story samples. Reintroduce it only after the component review, with its dependencies and behavior exposed. The showcase now supports state-preserving expansion and zoom; story applications remain deferred.                                                                                                      |

The relevant gates are `pnpm run build:catalog`, `pnpm run check`,
`pnpm run test:browser`, `pnpm run test:integration`, and
`pnpm run test:catalogue`. The last gate tests the production build rather than
the development server. Its focused behavior tests replace suites coupled to the
retired application stage. Geometry and render tests supplement visual review;
they do not certify pixel parity.

## Validation snapshot

On 2026-09-08, the production build and all static checks passed with 112
components, 666 public parts, 241 named slots, and 618 generated token variables.
The browser suites passed 412 base-component tests, 43 Shrine tests, and seven
token tests. Integration passed 21 tests. The full catalogue sweep passed 653
checks; the subsequent empty-slot alignment refinement passed all eight accordion
example/theme checks. Six local canonical screenshots were refreshed; selected component and catalogue
screenshots were manually reviewed. These are local references, not accepted cross-platform baselines.

## Showcase and conversation checkpoint — 2026-09-08

The component showcase now presents variants inline with lazy preview frames,
local reference code, search, theme switching that preserves live inputs, and
compact API details. The live conversation has a working multiline composer.
A separate 10,000-message history demonstrates bounded rendering, unread navigation,
and stable reading position while older messages arrive. Managed history rows
remain in light DOM so public component recipes style their contents.

The editor adds safe lexical highlighting and an interactive find/replace demo;
the color selector adds a saturation/value plane and native channel controls.
Avatar examples cover presence and image fallback; shimmer examples expose pause
and completion. Syntax colors now have dedicated semantic roles in both themes.
Docking has a working editable-panel example with split, save, restore, and reset
controls. These changes add no dependencies.

This is a steering checkpoint, not full parity acceptance. Resume with the
showcase-wide variant and visual audit, including missing variant coverage,
remaining editor and edge-dock capabilities, chart interactions, hover/inverse
states, and preview loading performance. Stories remain deferred.

Checkpoint validation: the component suites passed 417 base tests, 43 existing
composition tests, and seven token tests. The full replacement-showcase sweep
was interrupted after timeouts in chart/table cases; it is not recorded as a
pass and still needs investigation and a completed run. All ten focused showcase and interaction checks passed. The production build,
static checks, and 21 integration checks passed. The static census is 114
components, 690 public parts, 243 named slots, and 627 token variables.

Specific acceptance follow-ups include restoring avatar-group coverage after
example consolidation, checking same-tab drop ordering, and handling split
controls when every dock panel is closed. These remain on the parity audit.

## Example-depth and preview-window checkpoint — 2026-09-08

The acceptance target is exact or better coverage for each documented visual
variant and interaction. A mapped topic or successful render is insufficient.
Two source-backed inventories now track the work:

- [Controls, navigation, overlays, and display](audit/example-parity.md).
- [Charts, tables, editing, docking, lists, and scrolling](audit/complex-example-parity.md).

This batch replaces isolated stage boxes with one scrolling preview window per
component, with zoom and expansion that preserve mounted frames and drafts.
The composer is a reusable public recipe composed from a native form and Mash
controls. Compact, expanded, attached-context, and sending/error examples expose
real editing, local attachments, cancellation, and retry. The live conversation
uses that same pattern. Pagination now changes records; interactive accordion
panels preserve authored controls; avatar grouping is restored and demonstrates
adjustable member limits and overflow.

The next parity batch is tabs and menus: tab rearrangement and overflow selection,
working adjacent controls, menu action outcomes, custom rows, and missing overlay
variants. The complex-component inventory remains open in parallel with later
acceptance batches. No story application work should start before acceptance.

Validation for this checkpoint: the full production build and static gates pass.
All 20 focused browser checks pass, including local file attachment/removal,
multiline drafts, expansion, send cancellation, error recovery, same-frame
preview expansion/zoom, mobile bounds, and access to the calendar's final row.
Composer surfaces were visually reviewed in both themes. Complete catalogue
acceptance remains open; focused checks do not certify exact visual parity.

The four standalone composer patterns live on Textarea, while Message Scroller
keeps the complete live conversation. This corrects their initial placement:
each component example now contains the component it documents. After that
correction, 12 Textarea light/dark cases and three composer behavior checks
passed; the other changed pages had already passed 28 light/dark cases. Together
these cover 40 variant/theme cases. The initial misplaced-example failures are
resolved, not waived. The full catalogue-wide sweep remains a separate open gate.

## Navigation, controls, and chart parity batch — 2026-09-08

Tabs now support reversible order changes, pointer and keyboard reordering,
full-label overflow selection, stretched layouts, icon-only labels, and close /
reopen examples that retain authored edits. Panels stay mounted while tab controls
move. Gesture capture begins after the drag threshold; cancellation suppresses a
trailing activation and releases capture.

Keyboard hints now distinguish subtle, outlined, and plain treatments; Windows
separators remain visible. Punctuation, live command bindings, and shortcut help
are demonstrated. Buttons add icon arrangements, repeatable async actions,
cancellable progress with a generated CSV, and joined controls. Formatting and
file filters show actual toggle outcomes.

Menu and overlay examples add record operations, nested exports, persisted view
choices, rich rows, anchoring, context commands, validated forms, nested dismissal,
live settings, and async retry. Charts retain all twelve original types and add
five explorations for curves, axes, bar direction/stacking, semantic gradients,
flow alignment, and live data with SVG/canvas switching.

These implementations address inventory rows; they do not certify complete visual
parity. Matching reference captures and the catalogue-wide acceptance sweep remain
open. The next controls batch covers select/combobox states, validation, selection
controls, number/OTP inputs, and remaining display/overlay variants before the
larger table/editor/docking capability work. Story applications remain deferred.

Interaction acceptance exposed underlying defects as well as missing examples:
decorative checkbox indicators polluted accessible names, icon-only toggles did
not forward their labels, keyboard-focused submenus could be closed by a hover
timer, and context menus depended on a platform-generated keyboard event. Rich
menu rows now have an explicit variable-height treatment. The showcase also
measures open modal content, bounds it to available preview space, and returns to
its compact height after dismissal.

Validation completed 2026-09-09: production build and static gates pass. Across
focused runs, all 38 production checks and 52 component/overlay checks pass.
These cover the new chart controls in both themes, menus and nested dialogs,
button/toggle/keyboard outcomes, tab draft preservation, and mobile/desktop
preview bounds. The initial failures were repaired and rerun; one nested reopen
failure did not reproduce in five diagnostic repetitions or the final production
run. A separate textarea first-focus omission was fixed and regression-tested.

Representative tab, keyboard, chart, button, menu, and dialog surfaces were
visually inspected in both themes. Review also corrected an undefined progress
icon token, menu header spacing, and the unthemed loading flash in lazy frames.
Matching reference captures across the entire catalogue remain open. The next
bounded work is select/combobox and form-control states, followed by table range
selection/sorting examples and the larger editor/docking gaps in the inventory.
