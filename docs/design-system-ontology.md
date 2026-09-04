# Design System Ontology

This document keeps Mash from growing parallel vocabularies while components,
tokens, catalogue recipes, and examples evolve in different threads.

## Contract Surfaces

| Surface              | Meaning                                                                          | Source of truth                                                                    | Not this                                                        |
| -------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Semantic node        | Renderer-neutral identity, role, and parent relationship for meaningful anatomy. | Component JSDoc `@mashnode` / `@mashrole`, emitted through `custom-elements.json`. | A CSS selector, DOM requirement, or token name.                 |
| Attribute / property | Public configuration or reflected state.                                         | Component class `properties` and tests.                                            | A styling hook invented only for a recipe.                      |
| Slot                 | Authored light-DOM content owned by the caller.                                  | `@slot` docs and rendered shadow slots.                                            | Shadow anatomy or a guaranteed layout wrapper.                  |
| CSS part             | Renderer-owned shadow anatomy that a catalogue may style.                        | `@csspart` docs and `part` attributes.                                             | New behavior, state, or product meaning.                        |
| Custom state         | Behavior state exposed through `ElementInternals.states`.                        | Component internals and `@cssstate` docs.                                          | A presentational class or replacement for an attribute.         |
| Event                | Output or request from the component contract.                                   | Typed `CustomEvent` detail and tests.                                              | Analytics, routing, or app workflow state.                      |
| Reference token      | Primitive raw value such as a spacing step or color ramp entry.                  | `packages/tokens/src/reference`.                                                   | Something application or catalogue CSS should consume directly. |
| Semantic token       | Public role value such as control padding, body type, or focus ring color.       | `packages/tokens/src/semantic` and themes.                                         | Component API state.                                            |
| Catalogue recipe     | Opt-in visual pronunciation of public parts, states, and semantic tokens.        | `packages/*/src/catalogue/mash.css`.                                               | Headless component behavior or a second token system.           |
| Tailwind adapter     | Generated utility and variant vocabulary over tokens, slots, parts, and states.  | `scripts/build-tailwind-components.mjs` and token build output.                    | Hand-authored component contract.                               |
| Example utility      | Catalogue demo layout and product-like scaffolding.                              | `apps/catalog/src/utility-recipes.ts`.                                             | Reusable design-system requirement.                             |

`custom-elements.json` is machine-readable contract output, not prose to edit by
hand. Regenerate it from source JSDoc after any anatomy, event, state, or doc
change.

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

## Component Boundaries

| Component    | Owns                                                                                          | Does not own                                                           |
| ------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ui-label`   | Generated text, secondary segment, masking, highlighting, text alignment, type-preset sizing. | Action state, badge count, shortcut semantics, rich prose layout.      |
| `ui-typeset` | Typography preset, tone, and flow over authored semantic HTML.                                | Markdown parsing, command execution, code editing, viewport scrolling. |
| `ui-kbd`     | Display of a keyboard shortcut or command chord.                                              | Shortcut execution, generic labels, status pills.                      |
| `ui-badge`   | Compact status, category, metadata, count, dot, icon indicator, and target annotation.        | Actions, general text styling, icon glyph sizing.                      |
| `ui-icon`    | Glyph identity, accessible label, glyph scale, and optional authored overlay lane.            | Badge status, button action, text label semantics.                     |
| `ui-button`  | Native button behavior, action activation, form behavior, loading/pressed/selected states.    | Navigation link semantics or product workflow state.                   |
| `ui-link`    | Native anchor destination and current/disabled presentation roles.                            | Button form behavior.                                                  |
| `ui-bubble`  | Conversation surface, alignment, variant, and reaction lane.                                  | Message records, sender identity, transcript virtualization.           |

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
