# Composition boundary audit

Audited 2026-09-10 at Mash revision `19b0e52` (the committed command-patterns layer).
This is a source and contract audit, not an implementation, visual review, or claim
of runtime parity. Uncommitted tooltip work in the active checkout was excluded.

## Decision

Keep Mash's existing interaction primitives and visual recipes. Repair the
semantic metadata, then prove one composition through multiple presentations
before broadening the application stories. The largest gaps are source versus
projection identity, named attachment contracts, host-owned draft/selection
continuity, and explicit action outcomes. Splitting every CSS part into a custom
element would add surface area without addressing those gaps.

Mash can realize Shrine structures, but its component anatomy is not itself the
Shrine namespace. A component's `disabled` state does not authorize an Action;
a component-local node ID does not identify a durable occurrence; a card is not
a Plate merely because it has a border.

## Scope and evidence

The [inventory](composition-inventory.csv) covers every tracked `ui-*` class
with an `@tag` declaration in `packages/components/src`, cross-checked against
the component integration map. It records source locations, declared fields,
slots, parts, states, events, sizing axes, binding counts, and topology findings.
Inherited effective APIs are not flattened. The field list contains explicit
`declare` statements, not every inherited field or public method. The snapshot
is review material and is not imported by the catalogue or component package.

| Source measure                                  | Count |
| ----------------------------------------------- | ----: |
| Component declarations                          |   107 |
| Declared anatomy nodes                          | 1,147 |
| Explicit renderer bindings                      |   434 |
| Documented slots                                |   318 |
| Documented CSS parts                            |   680 |
| Documented custom states                        |   278 |
| Documented events                               |   137 |
| Declarations without explicit renderer bindings |    18 |

Integration roles: 27 container, 21 structural, 20 content, 18 inline, 14 overlay,
6 behavior, and 1 unclassified (`ui-sidebar`). These are document insertion roles,
not the five Shrine concepts. Counts measure declarations, not quality or a need
to create more objects.

Deeper source tracing covered button/card/textarea, combobox/autocomplete/options,
color picker, typeset/icon, dock/tabs/sidebar, drag/motion, overlay positioning,
block operations, command resolution, selection, story loading, the community
composer, and the document/study models. Other controls received a metadata
inventory, not a new interaction test or full implementation review.

Reference documents read in the sibling `JShrine` repository:

- `docs/PRODUCT-SCHEMA.md`: five concepts, occurrence and projection identity,
  Slot contracts, Foundry, action attenuation, and hardening.
- `docs/SCHOOL-USER-STORIES.md`: complete school journeys and acceptance stories.
- `docs/HINTERLAND-TRANSITION-USER-STORIES.md`: complete continuation and boundaries.
- Selected `docs/LOCUS-FLOW-CASE-STUDY.md` sections: changing extent, shared
  preview/editing environment, teacher settings, and acceptance stories.
- Selected `docs/AGENT-SIGHT-TRACE-CASE-STUDY.md` incident journey.

Those are product requirements; their existence does not prove a runtime
implementation. This audit does not propose using `sh-*` or `shrine-*` components.

## Ownership and mapping

| Layer               | Existing Mash contribution                                             | Required boundary                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Durable source      | `BlockNode` and story-local record IDs provide local stable references | Shrine supplies canonical occurrence identity; a fixture adapter can supply explicit local references. Do not derive identity from a route, DOM ID, or component tag. |
| Block               | One primitive or an authored fragment can realize content/behavior     | Keep meaning and typed values separate from DOM and component construction. One Block can use multiple controls.                                                      |
| Slot                | Authored HTML slots, option children, structured card regions          | A semantic attachment also needs role, admissible content, ordering/cardinality, and attachment intent. HTML projection alone does not establish that contract.       |
| Plate               | Dock panels, cards, dialogs, resizable regions, scroll areas           | Host supplies source reference, projection instance, mode, selection, and interaction limits. Layout components retain their generic APIs.                            |
| Scene               | Dock/resizable/sidebar arrangements and story mounts                   | Host coordinates root context, focus, selection, overlay ownership, and projection lifecycle. No universal desktop primitive is required.                             |
| Glyph               | Icon sources, SVG, text output, native rendering                       | Terminal output can use native nodes. A layered `ui-icon` is a composition; its whole anatomy is not necessarily one terminal Glyph.                                  |
| Foundry realization | Semantic tokens, catalogue recipes, parts, sizing and motion           | Presentation adapts within the admitted context. It cannot widen observation/action or supply canonical source identity.                                              |
| Action/Flow/Trace   | Command routing, local models, local history and drafts                | Host/runtime owns admission, revisions, consequences, refusals, provenance, and continuation. UI state is a projection of that work.                                  |

The Web distinctions should remain explicit: attributes/properties carry inputs;
custom states expose derived interaction state; slots accept caller content;
parts expose styling; events report interactions or requests. None should be a
catch-all carrier for application records or services.

## Findings

### C01 — Metadata has concrete integrity defects (P0, small fixes)

- [Separator anatomy](../../packages/components/src/separator/separator.ts),
  lines 23–25, declares `frame -> root -> frame`. `prefix` also reaches that
  cycle. The rendered composition has `frame` enclosing the visible rule, so
  this is a metadata defect, not evidence that the separator's DOM is cyclic.
- [Button anatomy](../../packages/components/src/button/button.ts) declares
  node ID `dropdownCaret`, which violates the lowercase/hyphen identifier
  pattern in [the published schema](../mash-contract.schema.json).
- [The block integration map](../../packages/components/src/block/component-policy.ts)
  has 106 entries and omits `ui-sidebar`, whose declaration is present in
  [sidebar.ts](../../packages/components/src/sidebar/sidebar.ts).

The [manifest plugin](../../scripts/cem-plugins.mjs), `createCaptureMashSemantics`,
checks duplicate IDs, missing targets, and known binding/axis kinds. It does not
check ancestry cycles or the schema's identifier pattern. The existing
[component policy test](../../packages/components/src/block/component-policy.test.ts)
compares the map against a generated manifest; a fresh manifest containing the
sidebar should expose the mismatch. That test was not run here, and this audit
makes no claim about current remote CI results.

**Disposition:** repair these three source declarations/map entries, extend the
existing metadata validation, and keep this in one small contract-fix commit.
Do not turn the audit into hundreds of new component tests.

### C02 — Anatomy, inputs, outputs, and renderer bindings need disambiguation (P1)

The [semantic contract](../mash-contract.md) correctly distinguishes meaning from
Web bindings, but its node schema contains only `id`, `role`, and `parent`.
[Button](../../packages/components/src/button/button.ts) mixes `label`, `size`,
`disabled`, and `activate` into one topology; [textarea](../../packages/components/src/textarea/textarea.ts)
similarly mixes `control`, `value`, `input`, and `change`. A consumer cannot safely
interpret each entry as a compositional child or independently projectable Block.

There are 18 declarations with no explicit bindings, including dock, dock-panel,
message, tabs, and command. Across slots/parts/states, 937 documented names have
no explicit same-name/same-kind `@mashrole` entry in their own declaration. Many
have same-named nodes or inherited behavior; this is **not 937 broken APIs**.
It means a portable consumer must currently infer mappings unless a formal
convention supplies them. The capture plugin emits explicit tags only.

For example, [card](../../packages/components/src/card/card.ts) maps its authored
slots, but its documented parts are not explicitly bound. Combobox and its
[autocomplete subclass](../../packages/components/src/autocomplete/autocomplete.ts)
repeat substantial anatomy metadata, creating another drift point as the base
implementation evolves.

**Disposition:** define which entries are anatomy, input/state, and action/output;
make same-name binding rules explicit or generate the bindings deterministically;
support explicit overrides and inherited contract resolution. Extend CEM rather
than creating a competing component registry. Preserve ergonomic aliases during
migration. A valid topology is still not proof of portable behavior.

### C03 — Source, projection, and anatomy addresses are separate identities (P1)

The contract's `<tag>#<node>` address identifies anatomy within a component type.
[BlockNode](../../packages/components/src/block/block.ts) has one `id`, while
[dock layouts](../../packages/components/src/dock/layout.ts) use panel names and
layout-group IDs. None of these alone says which occurrence is being shown, which
of its simultaneous projections is selected, or which semantic Slot was targeted.

[Dock](../../packages/components/src/dock/dock.ts) already snapshots layout without
copying application content. [Tabs](../../packages/components/src/tabs/tabs.ts)
already reorder authored elements using the drag and reorder-motion controllers.
Preserving a DOM element is useful, but it is weaker than restoring the same work
after unmount, reload, or a change of presentation.

**Disposition:** the projection adapter should carry distinct source references,
projection-instance identity, and anatomy/attachment paths. Resolve source
identity from the host; do not invent a second namespace authority in Mash.
Keep panel names as layout keys and map them to host projection records.

### C04 — Named attachment semantics are absent from the document envelope (P1)

[BlockNode/BlockDefinition](../../packages/components/src/block/block.ts) use
nested `children` and a `container` capability. Operations identify `parentId`
and an index. The envelope cannot directly express several named Slots, Slot
cardinality/compatibility, or multiple appearances of one referenced source.
Its `BlockCapability` values (`editable`, `media`, etc.) describe features,
not authorization grants; the shared word must not imply otherwise.

[Card](../../packages/components/src/card/card.ts) is a good Web composition:
structured title/description/actions/content slots, sensible defaults, and a
header override. Those slot names do not yet carry machine-readable semantic
attachment restrictions. CSS parts cannot fill that gap because they only style
renderer-owned anatomy.

**Disposition:** first consume the host's semantic attachment description in a
small adapter. Only version the generic document envelope if a non-Shrine document
use case also needs it. Define move/reference/copy as distinct intents; validate
attachment in the model before reflecting the result into HTML. Preserve unknown
source structure in the host and show a bounded fallback/refusal. Do not simply
weaken the current strict block validator, which deliberately rejects unknown types.

### C05 — Draft and selection continuity are not a shared projection contract (P1)

The [community composer](../../apps/catalog/src/stories/community-composer.ts)
already reads an external draft and disposes its listeners, a useful foundation.
It still assembles its own file picker/drop behavior and attachment chips, and
[Draft](../../apps/catalog/src/stories/community-state.ts) stores `expanded` with
message text, attachment IDs, and quote identity. That prevents a clean distinction
between shared draft content and independently sized projections.

[SelectionManager](../../packages/components/src/selection/selection.ts) supplies
grouped selection, but the DOM text adapter includes a live `Range`, rectangles,
and text. It is intentionally view state. The document story also has block/text
selection and canvas selection local to its own controllers. A remount needs a
model-backed anchor and revision mapping, not a saved DOM `Range`.

**Disposition:** keep draft identity/content in a host session; keep extent,
viewport, hover, and focus per projection. Add explicit selection capture/remap/
restore at the adapter boundary. Reuse `ui-file-upload`, `ui-chip`/`ui-attachment`,
and existing gesture/command mechanisms where their contracts fit; do not extract
one monolithic composer component as the first move.

### C06 — Commands need a host bridge for semantic action outcomes (P1)

[CommandRegistry](../../packages/components/src/command/command.ts) already
resolves conditions, routes completed gestures, and supports cancellation and
execution policies. `execute()` returns a boolean; `when`/`disabled` are local
conditions. That is a useful UI API, not capability admission or a durable receipt.
Only the studio story currently imports this registry directly; document and
community workflows mostly dispatch through story-local handlers.

Combobox's [items/renderItem/onCreate properties](../../packages/components/src/combobox/combobox.ts)
are valid Web conveniences. Renderer callbacks and DOM Nodes must remain adapter
facilities rather than entering serializable Block props or portable recipes.

**Disposition:** project the same host-resolved action set into buttons, menus,
keyboard, and contextual tools. Carry target/context and expected revision to
host execution, then surface success, conflict, refusal, pending approval, or
failure from its result. Let ordinary controls work without any Shrine runtime.
Do not make CSS state or scope-name matching an authorization mechanism.

### C07 — Stage ownership and overlay lifetime need an integration proof (P1)

Dock provides stable authored panels; sidebar composes drawer, scroll area,
resizing, and gestures. These should remain usable pieces of a Scene. They do not
supply source context, resumable Flow ownership, or a complete Stage contract.

[Sidebar](../../packages/components/src/sidebar/sidebar.ts) reads/writes a cookie
by default (`persist`, `storageKey`, `#persist`). This is an explicit exception to
the general host-owned persistence rule. It supports disabling persistence, so a
host-owned arrangement can already avoid a second preference store. Its keyboard
binding uses a contextual guard; this audit does not claim a global shortcut bug.

The shared [anchored-position controller](../../packages/components/src/internal/anchored-position.ts)
accepts an element anchor (and optional point geometry), and overlays own local
focus/dismissal. A cross-projection text/graph selection needs an explicit anchor
adapter and owner lifetime. A stale source disappearing must not leave an active
popup or move focus into a detached subtree. Pure placement geometry is already
reusable; a new positioning engine is unnecessary.

**Disposition:** keep desktop open/width/layout preferences in the host for the
new story (`persist="false"` for sidebar). Specify overlay owner, focus return,
selection retention, and context invalidation across detach/reparent/close.
Extract only the minimal shared surface-lifecycle behavior demonstrated by the proof.

### C08 — Existing document continuity is valuable, but not the published block model (P1)

[Documents](../../apps/catalog/src/stories/documents-model.ts) uses a separate
`DocumentBlock` with text/marks, comments, frame geometry, and presentation color.
[Study notes](../../apps/catalog/src/stories/study-model.ts) reference document and
block IDs; [study.ts](../../apps/catalog/src/stories/study.ts) resolves those
references against the notebook. This is useful reuse, not independent copied
answers. It is not yet a shared reactive projection session over `BlockDocument`.

The current document store reads localStorage, and notebook history belongs to
the story. Content and canvas geometry share a record. These are acceptable
fixture choices, but a second simultaneous view or host adapter should not have
to reproduce that model or infer whether geometry changed content meaning.

**Disposition:** preserve the working documents/study path. Extract a small host
interface around records, subscriptions, draft operations, and selection;
provide an explicit adapter/migration decision between the generic envelope and
story model. Keep geometry keyed by projection where views may differ. No
wholesale editor rewrite or new persistence engine is justified by this audit.

### C09 — Glyph, text, and rendering cost need correct granularity (P2)

[Typeset](../../packages/components/src/typeset/typeset.ts) styles authored
semantic HTML; it is not a text model. [Icon](../../packages/components/src/icon/icon.ts)
has primary/secondary/badge/fallback composition, so the layered component is not
itself guaranteed to be a terminal Glyph. Browser shaping can realize many
semantic characters into terminal output without one custom element per character.

Sizing already uses inherited CSS context and separate semantic axes. Motion
already has [timing](../../packages/components/src/motion/timing.ts), presence,
and [reorder](../../packages/components/src/internal/reorder-motion.ts) helpers.
[Stories](../../apps/catalog/src/stories.ts) dynamically load individual entries;
[chart](../../packages/components/src/chart/chart.ts) dynamically loads its renderer.
The chart package currently depends on ECharts; this is an existing specialized
renderer, not evidence that the library is dependency-free.

**Disposition:** keep metadata/build-time validation out of startup, preserve
per-component imports and story lazy loading, and subscribe only live projections.
Measure host continuity on mount/unmount. Do not keep every hidden renderer alive
to preserve drafts, introduce a wrapper per character/part, or add an observer per
metadata node. No performance benchmark was run in this audit.

## Keep, refine, or extract

| Surface                                               | Decision                                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Button, input, textarea, switch, slider, number field | Keep behavior/form primitives; clarify input/output bindings. Do not split native interaction state machines into arbitrary parts. |
| Combobox, autocomplete, select, option, chips         | Keep owner/child contracts and authored/data modes; consolidate inherited metadata and keep callbacks local to the Web adapter.    |
| Card, message, toolbar, attachment                    | Use as fragment building blocks; refine attachment roles and default/override behavior when a real composition needs it.           |
| Color picker                                          | Keep existing composed slider/select/input behavior and exported parts; no need to rebuild channel controls.                       |
| Dock, tabs, resizable, sidebar, scroll area           | Keep layout/interaction ownership; connect source/projection references and host persistence above them.                           |
| Dialog, menu, popover, tooltip, command palette       | Keep focus/navigation primitives; prove contextual ownership and invalidation when their containing projection moves.              |
| Motion, draggable, gesture, selection, commands       | Reuse controllers/channels. Add semantic adapters around them, not duplicate engines inside stories.                               |
| Icon, typeset, image, chart                           | Keep renderer boundaries; do not equate all visible anatomy with terminal Glyphs or introduce per-character elements.              |
| Composer, feedback panel, settings arrangement        | Extract authored fragments plus narrow mount/update/dispose adapters after shared state ownership is demonstrated.                 |
| Block records and document/story stores               | Reconcile explicitly; do not silently declare one existing format the complete Shrine schema.                                      |

## Ordered follow-up work

These are audit backlog items, not implemented changes. `bd` was unavailable in
the audit environment, so they are recorded here rather than claiming tracker
issues were created. Stable C01–C09 IDs above provide references for follow-up.

1. **Metadata integrity (C01):** fix separator ancestry, button identifier, and
   sidebar classification. Extend existing validation for these failure modes.
   Complete when a freshly generated manifest satisfies the schema and topology
   checks and the existing component integration check covers all shipped tags.
2. **Binding and identity contract (C02–C04):** write the minimal distinction
   between anatomy, fields/actions, source references, projection instances, and
   named attachments; decide generated/inherited binding rules. Complete when
   two projections of one source have unambiguous selection and attachment paths
   without hand-authored duplicate component registries.
3. **Feedback composer proof (C05–C07):** mount one shared draft inline and
   expanded/detached, reusing Mash controls. Close/reopen the view, retain the
   draft and logical selection, keep each projection's extent independent, and
   invalidate actions/overlays when context changes. Include a refused submission
   with the draft intact. Demonstrate this before building the larger school story.
4. **Document/teacher journey (C08):** connect the existing document references,
   anchored feedback, role previews, and host action outcomes. Keep fixtures
   explicitly simulated until a runtime supplies authority and committed history.
5. **Breadth and performance (C09):** extend the proven adapter to further stories;
   check lazy mounting, cleanup, accessible focus, and rendering cost as each new
   renderer becomes involved.

Keep implementation commits separated by those concerns. The audit itself is a
standalone documentation commit based on `19b0e52`, suitable for cherry-picking
onto a later stack tip without moving the concurrent feature branch.

## Verification and limits

- Source inventory covers all 107 `@tag ui-*` declarations and compares their
  tags against all 106 integration entries; there are no unexplained extra entries.
- Cross-checked reported cycle and identifier mismatch against source and the
  schema/plugin, rather than treating a regex count as a runtime failure.
- CSV parses; referenced Mash source/doc paths are checked for existence.
- Documentation-only change: no component API, dependency, story runtime, build
  configuration, or CI suite changed. No browser tests or production build run.
- Native rendering, real authorization, cross-device restoration, accessibility
  equivalence, and live reprojection performance remain unproven by this audit.
