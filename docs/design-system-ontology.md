# Design System Ontology

This document keeps Mash from growing parallel vocabularies while components,
tokens, catalogue recipes, and examples evolve in different threads.

## Contract Surfaces

| Surface              | Meaning                                                                           | Source of truth                                                                                     | Not this                                                        |
| -------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Semantic node        | Renderer-neutral identity, role, and parent relationship for meaningful anatomy.  | Component JSDoc `@mashnode` / `@mashrole`, emitted as `declaration.mash` in `custom-elements.json`. | A CSS selector, DOM requirement, or token name.                 |
| Attribute / property | Public configuration or reflected state.                                          | Component class `properties` and tests.                                                             | A styling hook invented only for a recipe.                      |
| Slot                 | Authored light-DOM content owned by the caller.                                   | `@slot` docs and rendered shadow slots.                                                             | Shadow anatomy or a guaranteed layout wrapper.                  |
| CSS part             | Renderer-owned shadow anatomy that a catalogue may style.                         | `@csspart` docs and `part` attributes.                                                              | New behavior, state, or product meaning.                        |
| Custom state         | Behavior state exposed through `ElementInternals.states`.                         | Component internals and `@cssstate` docs.                                                           | A presentational class or replacement for an attribute.         |
| Event                | Output or request from the component contract.                                    | Typed `CustomEvent` detail and tests.                                                               | Analytics, routing, or app workflow state.                      |
| Reference token      | Primitive raw value such as a spacing step or color ramp entry.                   | `packages/tokens/src/reference`.                                                                    | Something application or catalogue CSS should consume directly. |
| Semantic token       | Public role value such as control padding, body type, or focus ring color.        | `packages/tokens/src/semantic` and themes.                                                          | Component API state.                                            |
| Catalogue recipe     | Opt-in visual pronunciation of public parts, states, and semantic tokens.         | `packages/*/src/catalogue/mash.css`.                                                                | Headless component behavior or a second token system.           |
| Tailwind adapter     | Generated utility and variant vocabulary over tokens, slots, parts, and states.   | `scripts/build-tailwind-components.mjs` and token build output.                                     | Hand-authored component contract.                               |
| Example utility      | Catalogue demo layout and product-like scaffolding.                               | `apps/catalog/src/utility-recipes.ts`.                                                              | Reusable design-system requirement.                             |
| Fragment preset      | Reusable authored HTML arrangement over several primitives.                       | Curated examples, docs, and future Foil fragment registries.                                        | A new primitive or a product workflow in disguise.              |
| Command              | Named semantic action independent of toolbar, menu, gesture, or keyboard trigger. | `CommandRegistry` modules and completed `mash-command` events.                                      | A button instance or direct editor mutation.                    |
| Selection            | Normalized contextual state supplied by a platform or editor adapter.             | `SelectionManager` records and adapter contracts.                                                   | Browser focus or a document model.                              |
| Service              | Narrow imperative capability owned by one host scope.                             | Contextual host integration code.                                                                   | A styling primitive, global singleton, or dependency bag.       |
| Extension / profile  | Registration contribution and a named environment bundle of contributions.        | Host packages and preset composition.                                                               | Theme, density, size, or component variant.                     |

`custom-elements.json` is machine-readable contract output, not prose to edit by
hand. Regenerate it from source JSDoc after any anatomy, event, state, or doc
change.

The versioned extension grammar, addressing, sizing axes, and validation rules
are defined in [`mash-contract.md`](mash-contract.md). Runtime commands and
selections are deliberately adjacent to, but not embedded inside, one custom
element's anatomy tree.

## Contextual Runtime

Contextual UI follows one directional contract:

```text
editor/platform state -> adapter snapshot -> selection/capability context
                       -> command resolution -> toolbar/menu/gesture projection
user action            -> mash-command -> host execution -> transaction/history
```

The host owns records, permissions, mutations, transactions, undo history,
persistence, and collaboration. Mash owns action descriptions, normalized
selection channels, accessible interaction primitives, composed command events,
semantic topology, tokens, and catalogue recipes. A contextual widget may retain
a selection while focus moves into its controls, but it must not infer or mutate
an editor's private model.

## Composition Tiers

Use the smallest tier that owns the actual repeated contract.

| Tier              | Owns                                                                 | Examples                                                                                 | Escalate when                                                                 |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Primitive         | A reusable behavior, accessibility, state, event, and anatomy model. | `ui-input`, `ui-toolbar`, `ui-menu`, `ui-virtual-list`, `ui-reveal`.                     | The same interaction machine must work across renderers.                      |
| Anatomy child     | A required child role within one primitive family.                   | `ui-tab`, `ui-option`, `ui-table-row`, `ui-virtual-item`.                                | It needs to stand alone outside the parent family.                            |
| Durable fragment  | Authored composition of primitives and native HTML.                  | Comment composer, command scope, message thread, issue-list toolbar, code-block toolbar. | State, validation, or focus policy recurs beyond one authored arrangement.    |
| Contextual widget | A fragment bound to an external host, selection, or model lifecycle. | Floating format bar, drag handle, slash menu, outline rail, provider surface.            | The host binding needs a reusable renderer-neutral lifecycle or event schema. |
| Preset/editor     | A named assembly of fragments, widgets, and primitives.              | Page editor, canvas editor, issue workspace, settings console.                           | Multiple products need the same assembly as a versioned contract.             |

DOM slots are authored placement points. Event slots, streams, observers, and
model update channels are integration mechanisms. Do not call them the same
surface in Mash docs: DOM slots belong to markup and styling anatomy; event
channels belong to state synchronization.

## Durable HTML Fragments

Mash should be useful inside plain markup hosts: Markdown, server templates,
static pages, CMS entries, and Foil-style authored documents. In that setting a
fragment is content-shaped HTML, not an application component.

A durable fragment may include:

- custom-element tags with stable attributes and authored slots;
- native HTML semantics such as `form`, `section`, `fieldset`, `output`, `pre`,
  and headings;
- local `data-*` hooks for progressive enhancement;
- catalogue utility classes that speak in semantic tokens.

A durable fragment must not require:

- framework-only components, render callbacks, context providers, or build-time
  transforms;
- private shadow selectors or undocumented DOM topology;
- copied reference-token values;
- product records, routing, analytics, or persistence to live inside a Mash
  primitive.

Promote a fragment to a component only when the behavior contract itself recurs:
focus policy, keyboard navigation, form submission, measured presence,
virtualization, selection, validation, or event detail. Keep ordinary app
arrangements such as comment composers, search rows, message shells, and
settings groups as authored fragments until that threshold is crossed.

Catalogue examples should therefore prove composition before they prove chrome.
A primitive-only matrix is useful for API inspection, but every mature component
family should also have at least one fragment example that combines neighboring
contracts without private selectors or copied token values.

## Sizing Axes

Do not flatten every `size` into one global scale. The word is already used by
different contracts, so every component must document which axis it means.

| Axis           | Values                                                                                                                                                   | Components                                                                            | Rule                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Type preset    | `caption2`, `caption1`, `subheadline`, `callout`, `body`, `title3`, `title2`, `title1`, `largeTitle`, plus role aliases like `label`, `heading`, `code`. | `ui-label`, `ui-typeset`, text recipes.                                               | Follows the typography system. It must not decide control geometry.                                              |
| Control size   | `xsmall`, `small`, `medium`, `large`, with short aliases only where already public.                                                                      | `ui-button`, `ui-clipboard`, `ui-checkbox`, `ui-switch`, future control-like actions. | Defines the visual control box and immediate internal spacing. It may read type tokens but is not a type preset. |
| Density        | `mini`, `compact`, `regular`, optionally `spacious`.                                                                                                     | Menus, tables, lists, command rows, dense examples.                                   | Defines repeated-row rhythm and information density. It is not a button size.                                    |
| Indicator size | Component-specific inner measures such as checkbox marks, switch thumbs, status dots, and glyph badges.                                                  | `ui-checkbox`, `ui-radio`, `ui-switch`, `ui-badge`, `ui-icon`.                        | May align to control size but remains internal anatomy.                                                          |
| Glyph size     | Icon optical size.                                                                                                                                       | `ui-icon` and icon slots.                                                             | Does not imply badge, button, or label size.                                                                     |
| Identity size  | Avatar and identity-token surface size.                                                                                                                  | `ui-avatar`.                                                                          | Does not imply text, badge, or control size.                                                                     |
| Scrollbar size | Scrollbar affordance thickness.                                                                                                                          | `ui-scroll-area`.                                                                     | Belongs to viewport chrome, not content scale.                                                                   |
| Layout size    | Numeric or bounded layout measure.                                                                                                                       | `ui-resizable-panel`, `ui-virtual-item`, panel/content/dialog bounds.                 | Data or layout constraint, never a semantic visual tier by itself.                                               |

Current consolidation direction:

- Keep component-specific semantic tokens when the role is genuinely different,
  even if the value overlaps today. `buttonInlineSmall` and `controlInlineSmall`
  can share a value without becoming the same role.
- Rename only when the role is wrong, not merely because values match.
- Treat `layout.dimension.control` as the accessible/default hit target tier and
  `layout.dimension.controlMedium` as a compact visual control box tier until a
  formal rename separates those concepts.
- Catalogue controls may group aliases for demo UX, but that grouping is not the
  ontology.

## Focus Ownership

Visible focus belongs to the keyboard-reachable control that will act on the
next key press. Overlay popups may receive programmatic focus for containment,
Escape handling, pointer-open menus, and non-modal dismissal, but they should
not paint a browser or operating-system ring themselves. Pointer-open overlays
should not return focus to the trigger after selection; keyboard-open overlays
should, because the trigger remains the user's navigation anchor.

## Component Boundaries

| Component        | Owns                                                                                                 | Does not own                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ui-label`       | Generated text, secondary segment, masking, highlighting, text alignment, type-preset sizing.        | Action state, badge count, shortcut semantics, rich prose layout.       |
| `ui-typeset`     | Typography preset, tone, and flow over authored semantic HTML.                                       | Markdown parsing, command execution, code editing, viewport scrolling.  |
| `ui-kbd`         | Display of a keyboard shortcut or command chord.                                                     | Shortcut execution, generic labels, status pills.                       |
| `ui-badge`       | Compact status, category, metadata, count, dot, icon indicator, and target annotation.               | Actions, general text styling, icon glyph sizing.                       |
| `ui-icon`        | Glyph identity, accessible label, glyph scale, and optional authored overlay lane.                   | Badge status, button action, text label semantics.                      |
| `ui-button`      | Native button behavior, action activation, form behavior, loading/pressed/selected states.           | Navigation link semantics or product workflow state.                    |
| `ui-link`        | Native anchor destination and current/disabled presentation roles.                                   | Button form behavior.                                                   |
| `ui-input`       | Single-line native text entry, form value, validity, focus/selection forwarding, Enter/focus events. | Affixes, masking chrome, command rows, suggestions, multiline drafting. |
| `ui-input-group` | Prefix/control/suffix anatomy around one authored control.                                           | Labels, validation, text editing, masking, or search behavior.          |
| `ui-textarea`    | Multiline native text editing, form value, validity, focus/selection forwarding.                     | Comment composers, markdown formatting, attachments, code editing.      |
| `ui-bubble`      | Conversation surface, alignment, variant, and reaction lane.                                         | Message records, sender identity, transcript virtualization.            |

Badge indicators annotate a slotted target through `variant`, `count`, `max`,
and `position`. `ui-icon` may expose an overlay slot for authored composition,
but status/count meaning belongs to the slotted component, not the icon.

## Motion And Presence

The system has one low-level animation waiter, `MotionLifecycleController`, and
one shared presence state machine, `PresenceLifecycleController`. Both remain
visual-recipe agnostic.

Current roles:

- `ui-motion` is a scene/lane primitive for arbitrary authored content.
- `ui-reveal` owns measured disclosure presence: clipping and block/inline size.
- `ui-collapsible` and `ui-accordion-item` own disclosure trigger semantics and
  delegate body presence to `ui-reveal`.
- Shared overlays own focus, dismissal, placement, and top-layer presence
  through the internal overlay engine.
- `ui-toast` owns announcement, timer pause/resume, and shared exit presence.

Next convergence moves:

1. Keep interaction delays separate from motion durations. Hover intent,
   submenu grace, typeahead reset, and toast timers are behavior timing, not
   animation timing.
2. Give select, combobox, and autocomplete popup presence without forcing them
   into the overlay subclass hierarchy.
3. Move drawer, menu, overlay, toast, and reveal CSS toward shared presence
   recipe names while allowing family-specific transforms.

## Test Ontology

The current audit found 77 test/spec files and 438 `it`/`test` cases across
component, token, integration, and visual suites.

Keep tests that lock public contract:

- native behavior, focus, keyboard, ARIA, form participation, and validity;
- public attributes/properties, custom states, events, and event detail;
- slots, parts, and stable shadow anatomy;
- token boundary rules, generated utility variants, and catalogue opt-in;
- lifecycle presence where interruption or exit timing affects users.

Reduce or consolidate tests that create maintenance drag:

- repeated exact pixel checks for every component size alias;
- broad umbrella tests that duplicate component-local contract tests;
- product workflow journeys in visual specs when one smoke path is enough;
- CSS-value assertions that would be better as token-conformance tables or a
  small screenshot baseline;
- real sleeps for timers and animation lifecycles when deterministic WAAPI or
  lifecycle hooks can be used.

Recommended staging:

1. Keep the current focused component tests for new contracts.
2. Add one generated size-axis conformance suite instead of per-component pixel
   snapshots.
3. Split broad visual specs by contract family, and demote product-like journeys
   to one smoke test plus manual examples.
4. Add lint-style checks that reject reference-token usage in recipes, unknown
   semantic icons, unpaired named slots/parts, and ambiguous new `size` docs.
