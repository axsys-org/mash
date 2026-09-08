# Mash: inventory and GPUI parity cut plan

Audited 2026-09-08. **This completes the structural inventory, not the visual
rebuild. No family is certified as matching GPUI yet.**

Mash has enough machinery to build coherent interfaces, but its public examples
do not reliably demonstrate that machinery on its own. The immediate problem is
ownership: component styling, reusable composition, catalog scaffolding, and
application behavior are spread across layers that can compensate for one
another. Splitting large files alone would preserve that problem.

The target is the appearance and interaction states of
[GPUI Kit's component examples](https://gpui-kit.com/component/button/), translated
into ergonomic Web Components. Future Grove/namespace projection remains a
reason to preserve semantic boundaries; it is not a prerequisite for getting
the base library visually coherent. Stage fullscreen comes **after** clean
reference parity, as requested.

## What was counted

The census uses freshly rebuilt CEMs and token output plus the current working
tree, including the pre-existing uncommitted catalog/editor/study changes.
Counts refer to declarations, not distinct semantic concepts or tested states.

| Surface                                            |           Count |
| -------------------------------------------------- | --------------: |
| Base custom elements, including supporting anatomy |              93 |
| Shrine custom elements                             |               8 |
| Public attributes / slots / CSS parts              | 472 / 300 / 615 |
| Custom states / events                             |       275 / 121 |
| Manifest examples                                  |             116 |
| Curated examples, spread over component owners     |        184 / 68 |
| Family-example redirects                           |              24 |
| Reference / semantic / themed tokens               |  263 / 206 / 82 |
| Catalog chrome / stage utility aliases             |        84 / 603 |
| GPUI component-navigation reference entries        |              71 |

The UI says **81 components** because navigation hides supporting anatomy. That
is not the complete public element count.

- [Element, example, token-family and file tables](audit/inventory.md): every
  scoped file and every public element; all 184 curated example names.
- [Machine-readable inventory](audit/inventory.json): complete public API names,
  semantic node/binding/axis records, all 116 manifest example names, literal
  dependency mentions, all 551 token values/aliases/consumers, 687 utility
  aliases, and package exports.
- [GPUI reference map](audit/reference-map.md): all 71 navigation entries,
  candidate Mash owners, missing surfaces, and proof questions.

Refresh with `pnpm build` then `node scripts/inventory-design-system.mjs`.
The inventory is evidence, not a second runtime registry. Test-file mentions are
not test coverage; selector lines are not visual coverage; lack of literal token
use is not proof of dead code. Generated Tailwind uses are indirect. Interpolated
examples have lower-bound tag/class counts and retain their source location for
inspection. The utility count excludes selector-pair recipes and body-layout
objects; those remain visible in the file census.

## Findings, in cut order

### 1. The existing checks defend a different visual target

`check-design-ontology.mjs` literally banned case-insensitive references to GPUI,
parity, and another toolkit across tracked text files. This pass removes that
word ban while retaining the size-axis and dimension-family checks.
`portable-ui-contract.md` now names the new visual target without changing the
semantic/renderer split.

The legacy Paper reference remains in
`packages/tokens/src/paper-contract.json`; `check:paper` enforces 42 color alias
relationships. Typography describes a Paper Dynamic Type scale; menu dimensions
describe Apple regular/compact/mini measures. These are **migration inputs, not
the new approval authority**. Replace the values, provenance documentation and
assertions together when the reference theme is captured. A passing Paper check
must never be presented as GPUI approval.

### 2. Copied examples omit dependencies supplied by the stage

`apps/catalog/src/app.ts`'s `belowStage()` prints the selected component's one
registration import, token CSS, and recipe CSS. `stage.ts` registers the entire
UI and Shrine packages, imports application runtimes, and `app.ts` expands
application-local class aliases through `applyStageUtilityRecipes()`.

For toolbar, the page therefore displays a study application but tells the user
to import only `@mash/ui/toolbar/register`. That module only registers the toolbar.
It does not register the buttons, inputs, menus, fields or other elements in the
displayed code. The named `example-study-*` classes and `data-study-*` behavior
also depend on undisclosed catalog files. This is a concrete copy/paste contract
failure, even though the in-catalog preview renders.

**Cut:** make each base example reproducible with exactly its displayed imports,
CSS and minimal event handler. Run the copied fixture in a clean document that
does not import the catalog runtime or register everything. Supply public layout
recipes or explicit short local CSS when needed. An app demo can have its own
bundle, but cannot be the introductory component example.

### 3. Toolbar is the clearest case of misfiled applications

The toolbar implementation is 163 lines and owns a useful, bounded focus model.
Its manifest example is two formatting toggles. The curated layer replaces it
with five examples, four of which are application/editor demonstrations.

| Current toolbar example   | Disposition                                                                       | What replaces its role on the component page                     |
| ------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Spaced repetition studio  | Move to application stories with study markup, scheduler, persistence and runtime | A short toolbar with buttons and a disabled item                 |
| Editing playground        | Move with editing blocks, history, runtime and media                              | Horizontal/vertical focus navigation and a labelled toggle group |
| Edgeless block canvas     | Move with canvas markup and runtime                                               | No canvas required to demonstrate toolbar behavior               |
| BlockSuite editor factory | Move with its loader and editor dependency bundle                                 | No editor factory required to demonstrate toolbar behavior       |
| Docked editor tools       | Keep only after reducing to a bounded composition                                 | One edge placement recipe plus the same toolbar contract         |

The inline Editing playground declaration alone spans 232 lines and mentions 34
distinct custom-element tags. The study, canvas and BlockSuite entries are short
only because they import much larger markup. Judge expanded dependencies, not
just local line count.

Toolbar needs focused fixtures for horizontal/vertical orientation, disabled
controls, Home/End, wrapping, RTL, and text-entry caret boundaries. Grouped
controls must also be exercised: the current item collection checks direct
children and direct slotted triggers, so supported group composition should be
proved rather than assumed. Product persistence and document transactions do
not belong in those fixtures.

### 4. Example and stage code have become an application platform

| Concentration                                | Lines at census | Proposed cut                                                                   |
| -------------------------------------------- | --------------: | ------------------------------------------------------------------------------ |
| `apps/catalog/src/examples.ts`               |           5,887 | Per-family focused fixtures; move product compositions out                     |
| `apps/catalog/src/stage.ts`                  |           3,586 | Preview mount/dispose, theme and event inspection only; fixture-owned handlers |
| `apps/catalog/src/utility-recipes.ts`        |           1,814 | Separate catalog chrome, public composition rules, and story-only CSS          |
| `packages/components/src/catalogue/mash.css` |           6,054 | Shared foundations plus family recipes behind the same public import           |
| `apps/catalog/src/app.ts`                    |           1,038 | Catalog rendering and honest dependency/export display                         |

The Issue tracker workspace under `ui-table` is a 386-line example; roughly the
second half of `stage.ts` contains its state/filter/selection/command plumbing.
Move it with `linear-workspace-state.ts`, not merely into another examples file.
The Kanban board and Composable workbook are integration stories or secondary
stress fixtures, not substitutes for drag geometry and cell-contract examples.

Retain an application story only when it exercises a named integration and its
dependencies are explicit. Archive redundant stories after the replacement
fixture is checked. Preserve current local work during those moves.

### 5. Layout and materials need reusable owners

The 603 stage aliases are not all bad. They are evidence of repeated needs:
aligned rows, text/value/action lanes, shrinkable content, grouped controls,
panel insets and restrained surfaces. Some also override component parts with
important utilities, hardcoded measures and shadows. Those patches can conceal
missing defaults or missing public customization hooks.

Start with a small shared layout vocabulary: row, stack, grid, inline group,
fill, and bounded scroll region. Prefer native HTML and CSS for pure layout.
For recurring semantic compositions, identify the meaningful lanes and assign
each inset, gap and boundary once. Avoid creating a custom element for every
flex declaration.

The Message reference demonstrates why this matters: it provides a repeatable
row and avatar/header/content/footer arrangement while leaving message data and
actions to callers. Mash currently supplies message-row layout through bubble
examples and stage classes. Bubble presence alone does not close that gap.
[GPUI Message](https://gpui-kit.com/component/message/)

Materials currently travel through DTCG colors/effects/blur, generated Tailwind
material/vibrancy utilities, inherited `--_mash-component-*` roles, recipe
selectors, P3/HDR overrides, and demo controls. This is much more policy than a
base component comparison needs. Establish the reference's opaque base, inset
and popup surfaces first. Keep optional translucent treatments isolated and
verify nested surface reset, text contrast and overlay inheritance before
claiming they compose. Do not globally delete the token/recipe boundary to make
one screenshot easier.

### 6. “Same size” and “same meaning” have too many spellings

Buttons accept short and long size names, both quiet and ghost, and status
variants alongside semantic tones. Menus have a separate density vocabulary;
avatars, glyphs and layout measures consume different axes. Some of that
separation is legitimate, but callers currently need to know too much to align
a toolbar, field and popup.

Keep one documented spelling per public axis in new examples. Write an explicit
legacy-to-canonical mapping before removing aliases. Define the shared control
frame, type, icon, padding and gap for each tier; test a mixed control row rather
than sizing each component independently. Preserve distinct roles where their
meaning differs, even if values coincide today. Do not merge tokens merely
because their resolved values are equal.

The observed GPUI button gallery uses a dark neutral primary in light mode,
compact control frames and focused variant/icon groups. Mash's live toolbar
story still uses blue action emphasis, dense small chrome text and a large
multi-panel study scene. This is an observed visual mismatch, not a measured
pixel-difference score. [Button reference](https://gpui-kit.com/component/button/)

### 7. Public parts exist; ergonomic composition is not yet proven

The parts check passes all 101 elements, 615 declared parts, 221 named slots and
1,095 recipe references. It checks documented names and generated adapters, not
whether a consumer can compose neighboring controls without a private fix.
Class-only selectors are skipped when they cannot be tied to a tag.

Preserve the CEM, registration split, semantic topology and typed events. Review
each family for duplicated wrapper parts, nested forwarding, empty-slot behavior
and which element owns sizing. A useful stable `root`, `control`, `label`,
`prefix`, `suffix`, `content`, `actions`, `viewport` or `popup` part should be
easy to identify. Do not flatten all anatomy into generic divs or expose more
parts just to satisfy a single demo.

The non-element runtime is also inventoried: command, selection, block and
component-policy modules; drag geometry/controllers; gesture handling; overlay,
anchoring, motion and presence helpers; icon registry and generated icon source.
Keep reusable interaction mechanics. Defer block/projection policy redesign to
the Grove/host boundary. Their existence does not demonstrate visual readiness.

### 8. The checks can preserve bloat while missing visual regressions

`check-catalogue-conformance.mjs` currently requires named compositions and
specific neighbors—for example Motion, KBD and Gesture in the spinner section.
This locks example architecture into a source-text check. Update those
requirements in the same cut that replaces the demo, keeping actual icon,
slot, event and private-token constraints.

Visual infrastructure exists, but snapshots are ignored and the CI visual step
is non-blocking. The canonical spec has six states; additional visual specs
cover interactions and whole compositions. None supplies a reviewed GPUI
reference baseline. Passing build, parts and token checks is useful evidence,
but cannot establish visual parity.

## Ownership decisions for the rebuild

| Surface                          | Decision                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| DTCG reference values            | Rebase on captured GPUI reference; retain provenance                                 |
| Semantic tokens                  | Retain role-based layer; consolidate redundant aliases only with consumer evidence   |
| Base typography/control geometry | One measured scale across neighboring component families                             |
| Theme/surface recipes            | One owner for each shared surface and state treatment                                |
| Optional materials               | Separate capability; never a prerequisite for a basic example                        |
| CSS parts and semantic topology  | Retain; prune only with explicit consumer migration                                  |
| Pure layout                      | Public CSS/HTML recipes; introduce a semantic component only for a repeated contract |
| Base component examples          | Small, dependency-complete, independently mountable fixtures                         |
| Application stories              | Separate entries and bundles, with explicit integration purpose                      |
| Shrine components                | Keep in their package and separate from base parity acceptance                       |
| Grove/namespace projection       | Preserve boundaries; no speculative projection implementation in this cleanup        |
| Stage fullscreen                 | Deferred until all accepted base/reference fixtures pass                             |

## Ordered work ledger

These are concrete follow-up cuts, not claims of completed implementation.
The inherited repository instructions name `bd`, but that executable is absent
in this environment; this checked-in ledger records remaining work instead.

| ID      | Cut                                          | Completion evidence                                                                                                                                                |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MASH-01 | Inventory and authority correction           | This audit, complete census/reference map, removed terminology ban, updated portable contract                                                                      |
| MASH-02 | Capture reference foundations                | Dated light/dark reference captures and measured typography, control tiers, radii, colors, borders, icons and popup treatment; supersede Paper-only assertions     |
| MASH-03 | Remove stage dependencies from base fixtures | Clean-document copy/paste proof; move the four toolbar apps and table workspace with their runtimes; update demo-preserving checks                                 |
| MASH-04 | Prove the first coherent control row         | Button, icon, label, input, input-group, toggle, separator, toolbar and tooltip align in both themes and supported tiers                                           |
| MASH-05 | Consolidate surfaces and overlays            | Card/group-box candidate, menu/select/combobox, popover/hover-card, dialog/sheet and notification use measured shared treatments; preserve focus/keyboard behavior |
| MASH-06 | Close composition gaps                       | Reference-map decisions for Message, List, DescriptionList, Attachment, Alert, Sidebar and shell rows; reusable authored layout without story-specific patches     |
| MASH-07 | Complete remaining reference families        | Forms/pickers, disclosure/navigation, tables/tree, scrolling/resizing, media/feedback/motion; explicitly resolve chart/plot/dock and other missing families        |
| MASH-08 | Finish cleanup and enforce acceptance        | Remove migrated aliases/dead stories only after consumer review; committed reviewed baselines and blocking visual acceptance                                       |
| MASH-09 | Add stage fullscreen                         | Expand/collapse with preserved state, resize, focus restoration and Escape behavior, after base parity is complete                                                 |

Each implementation cut must reduce the number of places that own a decision.
Do not create a parallel “GPUI mode” while leaving the default library unresolved.
Retain the existing public recipe entrypoint while reorganizing its internals.

## What counts as clean parity

For every accepted reference family, link the exact reference page/story and
record the selected settings. Match light/dark, supported sizes, disabled,
selected, focus, hover, open, error and loading states where applicable. Compare
matching content and bounds, not different product mockups. Pin captures so the
live upstream site cannot silently redefine a passing baseline.

GPUI's design guidance emphasizes shared semantic scale, parent-owned spacing,
consistent popup surfaces and repeated alignment. Treat those relationships as
joint acceptance criteria: a button and input can each look plausible while
their combined row still fails. [GPUI design guides](https://gpui-kit.com/docs/design-guides)

For Web verification, record browser, OS, viewport, device scale and font setup.
Allow documented glyph-rasterization differences across native/WASM/Web paths;
do not use that allowance to excuse wrong geometry, colors or states. Check
narrow bounds, long labels, missing slots, RTL, keyboard flow and reduced motion.
The copied fixture must work with only its declared dependencies. New baselines
require visual review, not automatic acceptance of whatever Mash rendered.

## Validation performed in this pass

- `pnpm build` rebuilt all three packages and generated fresh manifests/tokens.
- Ontology, parts, token-consumer, catalogue-conformance and Paper checks passed.
  Paper passing is recorded only as the legacy baseline.
- Live Mash toolbar rendering and GPUI Button/Message references were inspected.
- Inventory totals reconcile with 101 unique elements, 300 example declarations,
  551 tokens and 71 reference entries; source files and redirect owners resolve.
- Changed audit scripts pass lint; all changed/new files pass formatting checks.
- Runtime component behavior, tokens and existing example files were not changed
  by this audit. No pixel-parity or full interaction-suite pass is claimed.

Only the obsolete terminology ban, the portable-contract introduction, and the
new audit tooling/artifacts change in this pass. Existing uncommitted work is
part of the observed baseline and remains outside this change.
