# BlockSuite Reference Taxonomy

This audit records what BlockSuite is, which patterns transfer to Mash, and
which boundaries must remain outside a portable component system. It examines
the local checkout at commit `5cb5cb68471ca692f3c162258f0087cb22fcb82d`
(2025-07-07).

BlockSuite is not mainly a Web Component library. It is a collaborative block
editor kernel, an extension runtime, and an AFFiNE editor implementation whose
views happen to use Lit. Its useful lesson for Mash is the contribution grammar,
not its document store.

## Scale

The audited AFFiNE UI source contains approximately 1,345 TypeScript files,
147,000 lines, and 244 direct custom-element registrations. The four framework
packages add approximately 33,850 non-test TypeScript lines.

The AFFiNE element registrations divide roughly into:

| Family     | Registered elements | Responsibility                                        |
| ---------- | ------------------: | ----------------------------------------------------- |
| Blocks     |                  94 | Atomic document model/view/service realizations       |
| Components |                  45 | Editor-oriented controls and surfaces                 |
| Widgets    |                  38 | Contextual editor UI with host lifecycle              |
| GFX        |                  31 | Canvas tools, geometry, rendering, and overlays       |
| Fragments  |                  22 | Document-attached UI outside the editor host          |
| Inlines    |                  13 | Rich-text marks, references, and embedded inline data |
| Foundation |                   6 | AFFiNE-wide host infrastructure                       |
| Rich text  |                   1 | Rich-text editor realization                          |

Counts describe this snapshot, not a compatibility target.

## Repository Layers

| Layer                          | Packages                                                                   | Actual responsibility                                                                                  | Mash treatment                                                |
| ------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Framework global               | `packages/framework/global`                                                | DI, disposal, errors, reactive helpers, geometry and freehand math                                     | Borrow lifecycle principles; keep graphics math separate      |
| Framework sync                 | `packages/framework/sync`                                                  | Yjs documents, awareness, blobs, primary and shadow persistence                                        | Host/editor infrastructure, never a Mash primitive dependency |
| Framework store                | `packages/framework/store`                                                 | CRDT block tree, schemas, history, snapshots, selections, adapters                                     | Reference for editor adapters only                            |
| Framework std                  | `packages/framework/std`                                                   | Editor composition root: views, commands, events, selection, clipboard, drag, inline editing, graphics | Architectural reference, not a runtime dependency             |
| AFFiNE all                     | `packages/affine/all`                                                      | Ordered extension bundles and editor presets                                                           | Reference for named feature profiles                          |
| AFFiNE model/shared/foundation | `model`, `shared`, `foundation`                                            | AFFiNE records and cross-feature services                                                              | Product domain, outside Mash                                  |
| AFFiNE UI                      | blocks, components, widgets, fragments, inlines, GFX, rich text, data view | The assembled editing product                                                                          | Composition and behavior reference                            |
| Playground                     | `packages/playground`                                                      | Real editor fixtures, history, mock services, comment app, inline tests, HMR                           | Reference for a stateful lab, not its visual shell            |
| Verification/docs              | `packages/integration-test`, `packages/docs`                               | Cross-package behavior and documentation                                                               | Reference for fixture organization                            |

## Complete Feature Package Inventory

### Blocks

`attachment`, `bookmark`, `callout`, `code`, `data-view`, `database`,
`divider`, `edgeless-text`, `embed`, `embed-doc`, `frame`, `image`, `latex`,
`list`, `note`, `paragraph`, `root`, `surface`, `surface-ref`, and `table`.

A block package typically contributes a schema, model role, view, service,
commands or toolbar items, interaction extensions, and effects. A block spec is
an ordered feature bundle rather than one custom element.

### Widgets

`drag-handle`, `edgeless-auto-connect`, `edgeless-dragging-area`,
`edgeless-selected-rect`, `edgeless-toolbar`, `edgeless-zoom-toolbar`,
`frame-title`, `keyboard-toolbar`, `linked-doc`, `note-slicer`,
`page-dragging-area`, `remote-selection`, `scroll-anchoring`, `slash-menu`,
`toolbar`, and `viewport-overlay`.

Widgets consume editor selection, geometry, model, commands, and lifecycle.
They are the closest analogue to Mash contextual widgets, but their concrete
host contracts are BlockSuite-specific.

### Fragments

`adapter-panel`, `doc-title`, `frame-panel`, and `outline`.

BlockSuite fragments attach to a document while living outside its editor view
lifecycle. Mash's durable HTML fragments are intentionally more portable: they
can exist in static or server-authored markup and acquire a host adapter only
when contextual behavior is needed.

### Inlines

`comment`, `footnote`, `latex`, `link`, `mention`, `preset`, and `reference`.

These combine text marks with document records and editor commands. Mash should
provide the visible primitives and command projections; a Foil/editor package
should own mark serialization and document references.

### Graphics

`brush`, `connector`, `group`, `link`, `mindmap`, `note`, `pointer`, `shape`,
`template`, `text`, and `turbo-renderer`.

These packages depend on canvas geometry and editing state. Their action and
selection descriptors are reusable ideas, while geometry, hit testing, and
rendering belong in a graphics/editor host.

### Shared AFFiNE Packages

`all`, `components`, `data-view`, `ext-loader`, `foundation`, `model`,
`rich-text`, and `shared` complete the AFFiNE assembly.

## Runtime Ontology

| BlockSuite term | Meaning in its runtime                                 | Mash equivalent or boundary                                          |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| Editor          | A block-spec assembly around a document                | Preset/editor tier owned by a host package                           |
| Block           | Atomic schema/model/view/service unit                  | Not a Mash primitive; render its controls with Mash                  |
| Widget          | Contextual UI mounted into editor lifecycle            | Mash contextual widget plus a host adapter                           |
| Fragment        | Document-attached UI outside the editor                | Durable fragment when markup-only; contextual widget when host-bound |
| Inline          | Rich-text mark or embedded inline record               | Host document model plus Mash visible fragments                      |
| GFX extension   | Canvas tool, model, geometry, or renderer              | Graphics host integration                                            |
| Extension       | `setup(container)` contribution                        | Registration that contributes commands, adapters, services, or views |
| Provider/scope  | Environment-specific service and extension assembly    | Optional contextual-host profile, not theme or component sizing      |
| Service         | Imperative editor capability                           | Narrow host-owned capability                                         |
| Command         | Named action in a synchronous chain                    | `CommandRegistry` descriptor and async execution boundary            |
| Selection       | Block/text/surface/cursor records tied to editor state | `SelectionManager` plus engine-specific adapters                     |
| Slot            | Usually an RxJS subject/event channel                  | Call it a channel; reserve slot for HTML projection                  |
| Schema          | Versioned block record constraints                     | Host document schema; Mash schema describes UI contracts only        |
| Adapter         | Snapshot/import/export or selection translation        | Renderer/host boundary with explicit ownership                       |
| Profile         | Page/mobile/preview extension bundle                   | Named environment bundle outside leaf components                     |

## Contribution Model

BlockSuite's strongest transferable pattern is that editor UI is contributed as
data. Toolbar descriptors carry stable IDs, ordering scores, predicates,
active/disabled state, content, and commands. Broad contributions resolve
first; more specific scopes can replace a command with the same ID.

That makes one action available through multiple surfaces:

- the floating text/block toolbar;
- block-specific and database tools;
- the edgeless canvas toolbar and overflow panels;
- the mobile keyboard toolbar;
- slash menus and nested groups;
- context menus and drag handles.

Mash now expresses this portable subset through `CommandRegistry`. It does not
copy BlockSuite's synchronous continuation-chain implementation. Renderers can
project resolved commands into `ui-toolbar`, `ui-menu`, `ui-toggle`,
`ui-button`, `ui-kbd`, gesture bindings, or a future palette.

## Selection Model

BlockSuite normalizes block, text, surface, and cursor selections so contextual
UI does not query unrelated DOM details independently. Its records are coupled
to block IDs, Yjs awareness, and editor history, which are not portable.

Mash adopts the record/adapter split:

- `SelectionManager` holds typed records by logical group;
- adapters observe a platform or editor engine;
- `DOMTextSelectionAdapter` is the native Range implementation;
- contextual widgets read snapshots without owning document mutation;
- remote presence, block IDs, and collaborative selection stay with the host.

## Toolbar Anatomy

BlockSuite's floating toolbar is an action projection over a normalized
selection, not an isolated toolbar component. It merges text, block, database,
table, hover, and canvas geometry actions. Its useful behavior includes:

- scope-sensitive action replacement;
- declarative availability, active, and disabled predicates;
- shared commands across pointer, keyboard, menu, and mobile surfaces;
- nested and overflow actions;
- viewport-aware virtual anchoring;
- deterministic ordering independent of import order;
- lifecycle disposal when selection or editor scope changes.

The edgeless toolbar adds quick and senior tool tiers, responsive overflow,
panels, and drag-out interactions. The keyboard toolbar projects the same
actions for touch/mobile use. Mash should share descriptors between these
surfaces while keeping each surface's focus and layout behavior in its own
primitive or fragment.

## Slash Menu And Drag Handle

The slash menu merges extension configuration, nested grouping, fuzzy filtering,
keyboard navigation, and command execution. It removes the typed slash through
the editor transaction before running the selected action. The transferable
parts are descriptors, filtering, grouping, and command dispatch; text mutation
belongs to the editor adapter.

The drag handle coordinates hit testing, selection, drag preview, autoscroll,
and block conversion. Mash can supply draggable, menu, tooltip, and visual
primitives. The editor owns block geometry, conversion, document mutation, and
history.

### Slash Execution Pipeline

The reference implementation's complete path is:

```text
"/" input -> preserve logical caret/range -> resolve contributed entries
          -> filter/group/rank -> anchored palette -> delete slash/query
          -> execute insertion command in one transaction -> mutate document
          -> resolve block flavor to view tag -> mount custom element
          -> restore block/text selection and focus
```

The menu is not the block registry and a block view is not its stored record.
The menu projects insertion commands; the command mutates a document; the host
then resolves the resulting record to a renderer. This separation is what lets
the same insertion appear in a slash palette, mobile panel, context menu, or
drag-out catalogue.

The audited insertion catalogue includes:

| Group             | Entries                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Basic text        | Text, headings 1-6, code, quote, divider, inline equation                                                 |
| Lists             | Bulleted, numbered, and to-do lists                                                                       |
| Inline styles     | Bold, italic, underline, strikethrough                                                                    |
| Documents         | New document and linked document                                                                          |
| Content and media | Table, image, bookmark/link, attachment, PDF, generic embed, YouTube, GitHub, Figma, Loom, block equation |
| Structured views  | Database table view, to-do view, and Kanban view                                                          |
| Canvas            | Frame, mind map, and references to existing frames or groups                                              |
| Date and time     | Today, tomorrow, yesterday, and now                                                                       |
| Block actions     | Move up, move down, copy, duplicate, and delete                                                           |
| Feature-gated     | Callout and dedicated todo contributions exist but are disabled by default in the audited starter profile |

Keyboard behavior covers wrapping Arrow navigation, Tab and Shift-Tab,
Command-P and Command-N, Enter, Escape, nested-menu Left and Right, IME
composition, and query updates against the preserved range. Pointer activation
prevents the editor selection from collapsing before the command consumes it.

### Toolbar Surface Taxonomy

BlockSuite does not have one toolbar. It has multiple projections over related
selection and command state:

| Surface                      | Distinct responsibility                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Floating text/block toolbar  | Type conversion, inline marks, links, colors, table/document creation, comments, copy, duplicate, delete      |
| Inline hover toolbar         | Link/reference preview, edit, copy, representation conversion, unlink, delete, and a protected hover bridge   |
| Code toolbar                 | Language, preview, copy, caption, comment, wrap, line numbers, duplicate, delete                              |
| Media/embed toolbar          | Replace, reload, download, display mode, size/card style, caption, comment, open, copy, duplicate, delete     |
| Database header toolbar      | Filter, sort, search, view options, view lifecycle, and row creation                                          |
| Edgeless permanent dock      | Selection/hand, frame, connector, link, pen, eraser, note, shape, mind map, and templates                     |
| Edgeless selection toolbar   | Group/release, alignment, distribution, arrange, connector creation, lock, layers, convert, duplicate, delete |
| Mobile keyboard toolbar      | A horizontally scrolling root plus nested full-height panels for the same editing families                    |
| Fullscreen/presentation bars | Viewport, frame order, fit/fill, navigation, fullscreen, and transient preview controls                       |

Useful common fields are a stable ID, ordering score, `when`, active and
disabled predicates, placement lane, label/icon/tooltip metadata, destructive
state, and an execution callback. The caution is equally important: the
reference binds some shared descriptors to Lit templates, duplicates desktop
and mobile catalogues, and uses separate overlay engines with inconsistent
focus behavior. Mash keeps descriptor data renderer-neutral and lets
`ui-toolbar`, `ui-menu`, gesture bindings, and future mobile projections own
their respective interaction semantics.

## Why The Playground Works

The playground feels complete because it is a real editor lab. It boots an
actual document/store, loads fixtures, mounts editor extensions, provides
history and mock services, and includes comments, inline examples, debug
surfaces, and HMR support. The polish follows from coherent state and behavior;
it is not a gallery shell around inert samples.

Mash's catalogue should use three distinct levels:

1. Primitive examples for isolated API and state inspection.
2. Composition examples proving neighboring components work together.
3. Stateful playgrounds with explicit mount/destroy adapters and real command,
   selection, history, menu, focus, and responsive behavior.

Product records or a collaborative store must not leak into levels 1 or 2.

## What Mash Implements From The Reference

| Reference pressure point              | Mash implementation                                                      |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Stable scoped actions                 | `CommandRegistry` modules and command IDs                                |
| Broad/specific overrides              | Wildcard and exact scopes with priority                                  |
| Shared toolbar/menu/keyboard commands | Completed `mash-command` routing                                         |
| Shared command discovery              | Ranked label, alias, group, description, and ID search                   |
| Declarative visibility and state      | `when`, `active`, and `disabled` predicates                              |
| Normalized selection channel          | `SelectionManager` groups and typed records                              |
| Native text selection                 | `DOMTextSelectionAdapter` with retained ranges                           |
| Stateful editor lab                   | Keyed blocks, slash insertion, transforms, drag reorder, history, rails  |
| Component-backed blocks               | Live table, checkbox, card, field, button, progress, and disclosure tags |
| Portable semantic topology            | Versioned `declaration.mash` CEM extension                               |
| Honest lifecycle ownership            | Explicit registration `destroy()` methods and scoped controller teardown |

The editing playground deliberately keeps its HTML-snapshot history and DOM
format mutations in catalogue code. A production editor adapter replaces those
two pieces while preserving the same command, selection, and component surfaces.

The playground's insertion definitions are command metadata, not a parallel
palette registry. `/table`, a plus handle, or a future command palette resolve
the same `block.insert.table` definition. Executing it removes the query before
mutation and mounts an actual `ui-table`. Other component-backed entries follow
the same rule. Block wrappers own stable local IDs, selection, focus, drag
geometry, and contextual actions; inserted Web Components retain their own
internal behavior.

## Target Foil Host Contract

The next adapter should replace catalogue DOM snapshots with structured,
versioned records while leaving components black-boxed:

```ts
interface BlockRecord<Props = unknown> {
  id: string;
  type: string;
  version: number;
  props: Props;
  children: readonly string[];
}

type EditIntent = InsertIntent | ReplaceIntent | MoveIntent | DeleteIntent | SetPropsIntent;

interface BlockDocumentAdapter {
  transact<Result>(label: string, operation: () => Result): Result;
  apply(intents: readonly EditIntent[]): void;
  get(id: string): BlockRecord | undefined;
  subscribe(listener: () => void): { destroy(): void };
}

interface InsertableDefinition<Props = unknown> {
  type: string;
  version: number;
  tagName: `${string}-${string}`;
  capabilities: readonly string[];
  defaults(): Props;
  validate(value: unknown): value is Props;
  migrate?(value: unknown, fromVersion: number): Props;
}
```

The host assigns structured state through properties and receives composed
`mash-command` or future block-intent events. It must not pass a central store
object into every component. An insertion session should retain a logical
`{ blockId, offset, revision }` anchor, apply typed intents transactionally,
await the selected custom element definition and mount signal, then execute a
declared focus effect.

Clipboard transport similarly needs a versioned
`application/x-mash-blocks+json` representation plus HTML and plain-text
fallbacks. `ui-clipboard` remains the visible copy-action primitive; it is not
the document serialization service. Simple rich-text tables and database views
also remain separate systems: `ui-table` can realize the former, while a future
record/property/view engine can project through `ui-data-table`.

## Reference Fixtures And Test Pressure

The starter fixtures cover preset, empty, database, embeds, heavy documents,
heavy whiteboards, linked and synced documents, multiple editors, pending
structures, version mismatches, and imported snapshots. Its debug shell exposes
history; Markdown, HTML, plain-text, PDF, PNG, snapshot, and Notion transfer;
readonly mode; serialized selections; editor modes; panels; themes; and
collaboration rooms. Those are editor-lab concerns, not primitive APIs.

The audited BlockSuite tree contains 64 test files and approximately 549 test
declarations. Mash contains 86 test files and approximately 481 declarations,
but previously had no app-level workflow test. The useful addition is one
representative contract crossing selection, slash discovery, component mount,
block action, and history restoration. Duplicating an end-to-end test for every
palette entry would add cost without exercising a new contract.

## What Mash Must Not Import

- Yjs documents, awareness, blob storage, or persistence into UI primitives.
- Block tree IDs, schema roles, or editor history into generic selections.
- A global event dispatcher where composed DOM events already cross boundaries.
- RxJS "slot" terminology or another parallel reactive runtime.
- Static active-editor globals that break HMR, tests, multiple editors, or realms.
- Host-coupled services that absorb store, view, events, and selection.
- Extension array order as hidden z-index or behavioral policy.
- One Web Component for every editor implementation detail.

## Pressure Points Found In BlockSuite

- Provider registrations can be snapshotted at construction, making later
  extensions invisible and duplicate package instances identity-sensitive.
- Setup is ordered and not transactional; some widget layering relies on array
  order.
- Several active-dispatcher and effect flags are static globals.
- Some event targeting uses `closest()` instead of `composedPath()`.
- Some Subjects, awareness listeners, timers, and subscriptions are not safe
  across reconnect or teardown.
- The command chain lacks a clear async cancellation and transaction contract.
- Toolbar icon buttons partially recreate native button behavior.
- UI families overlap and popup lifecycle logic is repeated.
- The extension surface has sparse direct tests relative to its size.

These are reasons to extract the grammar, not clone the runtime.

## Implementation Sequence

1. Use the current command and selection APIs as the portable contextual core.
2. Add editor-engine adapters that expose immutable selection/capability
   snapshots and execute mutations in host transactions.
3. Render one descriptor set through floating toolbar, context menu, keyboard,
   slash palette, and narrow-screen action sheet projections.
4. Add virtual-rectangle anchors to the shared overlay engine for selections,
   canvas bounds, and remote cursors.
5. Move the catalogue playground onto a real fragment AST/editor adapter while
   leaving collaboration and persistence optional.
6. Add an import/export adapter package for Foil/Markdown fragments, separate
   from components and tokens.
7. Test one adapter contract matrix and a small number of representative visual
   workflows instead of duplicating every product journey.

## License Boundary

The audited BlockSuite checkout is Mozilla Public License 2.0. This work uses it
as an architectural and behavioral reference. No BlockSuite source was copied.
Direct source reuse would require file-level MPL compliance and should be an
explicit dependency/licensing decision, not an accidental implementation path.
