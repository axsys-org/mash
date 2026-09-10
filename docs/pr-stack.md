# Review stack

Use each row's base when opening its PR. Merge from the bottom dependency upward, then retarget or restack the next branch after its base lands. Keep prerequisite branches available until their dependents have been updated.

The existing `codex/component-rebuild` branch is preserved at `5ca546a`; no published history was rewritten. The older reconstruction checkpoints remain intact and some are still large. Their branch boundaries make incremental review possible; they are not newly validated standalone releases.

The mixed final checkpoint was reconstructed as four commits: button disclosure accessibility, Calendar styling, Motion catalogue examples, and preview positioning. The reconstructed tree exactly matches `5ca546a` before the test cleanup. Autocomplete remains its own existing commit.

| PR                                               | Branch                                 | PR base                                |
| ------------------------------------------------ | -------------------------------------- | -------------------------------------- |
| [#30](https://github.com/axsys-org/mash/pull/30) | `codex/stack/rebuild-checkpoint`       | `stack/design-system-convergence`      |
| [#31](https://github.com/axsys-org/mash/pull/31) | `codex/stack/foundations`              | `codex/stack/rebuild-checkpoint`       |
| [#32](https://github.com/axsys-org/mash/pull/32) | `codex/stack/catalogue`                | `codex/stack/foundations`              |
| [#33](https://github.com/axsys-org/mash/pull/33) | `codex/stack/showcase`                 | `codex/stack/catalogue`                |
| [#34](https://github.com/axsys-org/mash/pull/34) | `codex/stack/preview-windows`          | `codex/stack/showcase`                 |
| [#35](https://github.com/axsys-org/mash/pull/35) | `codex/stack/catalogue-coverage`       | `codex/stack/preview-windows`          |
| [#36](https://github.com/axsys-org/mash/pull/36) | `codex/stack/navigation`               | `codex/stack/catalogue-coverage`       |
| [#37](https://github.com/axsys-org/mash/pull/37) | `codex/stack/application-stories`      | `codex/stack/navigation`               |
| [#38](https://github.com/axsys-org/mash/pull/38) | `codex/stack/autocomplete`             | `codex/stack/application-stories`      |
| [#39](https://github.com/axsys-org/mash/pull/39) | `codex/stack/button-disclosure`        | `codex/stack/autocomplete`             |
| [#40](https://github.com/axsys-org/mash/pull/40) | `codex/stack/calendar`                 | `codex/stack/button-disclosure`        |
| [#41](https://github.com/axsys-org/mash/pull/41) | `codex/stack/motion`                   | `codex/stack/calendar`                 |
| [#42](https://github.com/axsys-org/mash/pull/42) | `codex/stack/preview-stability`        | `codex/stack/motion`                   |
| [#43](https://github.com/axsys-org/mash/pull/43) | `codex/stack/test-streamline`          | `codex/stack/preview-stability`        |
| [#44](https://github.com/axsys-org/mash/pull/44) | `codex/stack/icon-layout`              | `codex/stack/test-streamline`          |
| [#45](https://github.com/axsys-org/mash/pull/45) | `codex/stack/commons-polish`           | `codex/stack/icon-layout`              |
| [#46](https://github.com/axsys-org/mash/pull/46) | `codex/stack/composition-geometry`     | `codex/stack/commons-polish`           |
| [#47](https://github.com/axsys-org/mash/pull/47) | `codex/stack/story-composition`        | `codex/stack/composition-geometry`     |
| [#48](https://github.com/axsys-org/mash/pull/48) | `codex/stack/character-picker`         | `codex/stack/story-composition`        |
| [#49](https://github.com/axsys-org/mash/pull/49) | `codex/stack/study-workspace`          | `codex/stack/character-picker`         |
| [#50](https://github.com/axsys-org/mash/pull/50) | `codex/stack/review-readiness`         | `codex/stack/study-workspace`          |
| [#52](https://github.com/axsys-org/mash/pull/52) | `codex/stack/shared-preview-prototype` | `codex/stack/review-readiness`         |
| [#53](https://github.com/axsys-org/mash/pull/53) | `codex/stack/ci-cleanup`               | `codex/stack/shared-preview-prototype` |

The first base, `stack/design-system-convergence`, already predates this stack and has its own unmerged history against `main`. Its prerequisite PR is [#29](https://github.com/axsys-org/mash/pull/29). Review it first, then proceed down the table. PRs #29–49 retain their draft status. PR #50 is the integrated review checkpoint; no merges were performed.

## Test cleanup

- Browser discovery fell from 674 to 381 cases by removing overlapping first-example sweeps. The all-example sweep still checks both themes, registration, content, errors, and overflow.
- Ten compact-layout cases and focused interaction regressions remain. Public copy/import formatting is checked once.
- The visual command runs six canonical screenshot cases instead of rerunning the complete browser suite in a second CI job.
- Component build configuration excludes tests and fixture helpers. The inspected preview assets contain no test-runner imports. This cleanup reduces CI and maintenance work; it does not claim a smaller application bundle.
- Validation: 25 representative catalogue cases passed; test types, lint, formatting, and discovery passed. Test-only changes do not require rebuilding production assets.

## Subsequent changes

Put one behavior or cohesive feature and its meaningful regressions in each commit. Start dependent work from the preceding stack branch and push it separately. Prefer extending the existing test owner over adding another generic sweep. Repeat behavioral checks across themes only when the theme affects the behavior under test; preserve accessibility, focus, state retention, lifecycle, and actual composition regressions.

## Character picker

The Characters story adds compact and expanded views, cursor insertion, emoji and symbol search, persistent favorites and recents, code points, skin tones, and font previews. It loads only on its own route and adds no dependencies. Its emitted JS and CSS total about 11KB gzipped, excluding shared components.

Validation: production catalogue build, TypeScript, lint, formatting, token and catalogue checks, and five browser cases covering state, insertion, keyboard use, mobile layout, both themes, and route cleanup.

## Study workspace

`codex/stack/study-workspace` is based on `codex/stack/character-picker` and adds **Recall** at `/stories/study`.

- Decks and subdecks, daily limits, four note types (question/answer, forward/reverse, cloze, typed answer), tags, images, audio, card appearance templates, and a paginated card browser with bulk move, suspend, reset, and delete.
- Due and custom study sessions, keyboard reveal/grading, sibling burying, review undo, persistent schedules, activity history, and review forecasts. The compact interval scheduler uses 1- and 10-minute learning steps; successful answers start at 1 or 4 days and later intervals grow according to recall. It does not claim adaptive retention optimization.
- Source pages share the existing Notebook data and full page/canvas editor. A card links to a stable block identity; source edits update its answer while preserving its card identity and schedule. Missing sources retain the last saved answer. Detaching makes the answer independently editable.
- JSON backups include notes, media, schedules, and review history. CSV/TSV imports add notes; JSON replacement requires confirmation. Source notebooks export separately through their existing editor. Native archive packages, cloud synchronization, arbitrary HTML templates, and image occlusion are outside this local story's implemented scope.
- No added dependencies. The study-specific production assets are about 21.6 KB gzip (JavaScript and CSS combined, excluding shared components). The full document editor is imported only when opened; card browser rendering is limited to 60 rows per page.
- Validation: 16 production browser/model checks pass, including notebook regressions and shared source updates, plus manual custom-session completion and deck-limit checks. Catalogue/test types, lint, formatting, token consumers, and catalogue conformance pass. The unavailable `bd` executable prevents recording separate tracker items; the implementation boundaries above remain explicit follow-up scope.

## Integrated review checkpoint

PR #50 removes the Stories attribution and repairs the checks against the current catalogue. The pinned pnpm 10 toolchain needs patch metadata in its own lockfile format; the emitted preview document is now `fixture.html`. Browser assertions use rendered color values and current composed controls, and accessibility inspection targets the selected example iframe.

Two behavior fixes accompany that maintenance: resizing the first preview no longer anchors to a later example, and virtual chat history preserves the requested message while custom rows finish layout. Existing regressions cover preview resizing, deep links, unread positioning, and prepending.

Use the checks and Vercel deployment attached to the latest #50 commit for integrated validation. Historical draft heads still carry older configurations and failed checks; they must receive the applicable fixes and pass again as they are restacked for merging. A green integration checkpoint does not certify every older head independently.

Review candidates linked in Linear: AXI-64 (slider geometry), AXI-68 (combobox composition), AXI-78 (motion catalogue), and AXI-79 (study workspace). Broad catalogue and parity work remains open.

## Shared preview prototype

PR #52 is a separate draft on top of #50. Tabs and Chart can use one document with isolated, lazily mounted example roots through `?preview=shared`. It preserves the default preview for comparison and does not alter the public component API. Implementation and behavioral checks are separate commits; measurement scope and reproduction instructions are in `docs/catalogue-preview.md`.

## Catalogue and CI cleanup

PR #53 removes unreachable legacy catalogue controllers and their dependencies in a separate first commit, then trims redundant PR checks. Current Stories remain. The checked scope, baseline timing, and historical failure diagnosis are recorded in `docs/ci.md`.

## Scrollbar patterns

`codex/stack/scrollbar-patterns` builds on `codex/stack/ci-cleanup` (#53). It removes the catalogue wordmark, adds quiet scrollbar and edge-fade recipes, and expands Scroll Area to six compositions. The existing native viewport, drag and keyboard machinery remains shared; no dependencies are added. Public styling and orientation usage are documented in `docs/scroll-area.md`.

## Hover and color patterns

`codex/stack/hover-color-patterns` builds on `codex/stack/scrollbar-patterns`. Separate commits cover shared select fixes, hover tracking on Motion, and composed color editing with four formats. No dependency changes. API and lifecycle details are in `docs/hover-and-color.md`.

## Number field rehabilitation

`codex/stack/number-field-rehab` builds on `codex/stack/hover-color-patterns`. Component behavior and recipes are separate from the expanded catalogue examples. It fixes draft editing, decimal stepping, limit controls and stable sizing; adds unit slots, a stacked recipe and read-only state; and documents the form contract in `docs/number-field.md`.

## Switch and motion patterns

`codex/stack/switch-motion-patterns` builds on `codex/stack/number-field-rehab`. Timing tokens and Motion utilities, switch behavior/recipes, and catalogue examples are separated for review. Shared gesture recognition handles thumb dragging; native CSS handles motion and label weight with no new dependencies. Usage is documented in `docs/switch-and-motion.md`.

## Coordinated size context

`codex/stack/size-context` builds on `codex/stack/switch-motion-patterns`. Semantic size tokens and native CSS contexts add opt-in default/compact steps, per-component pins, coordinated popup rows, segmented controls, typography, and spacing. The toolbar catalogue demonstrates live resizing and nested boundaries. No new runtime or dependencies; usage is in `docs/size-context.md`.

## Sidebar composition

`codex/stack/sidebar-patterns` builds on `codex/stack/size-context`. It adds a responsive sidebar using the existing drawer, scroll area, resize handle, and gesture primitives. Shared overlay slot traversal, the sidebar component and recipe, and the interactive catalogue examples are separate review units. No added dependencies; state, slots, persistence, and CSS parts are documented in `docs/sidebar.md`.

The lead example composes pinned conversations, project navigation, command search, account preferences, and the existing composer. Selection spans the complete row, actions stay inside it, and scroll fades follow the scroll area's native boundary states. The remaining examples cover surfaces, direction, resizing, peek, mobile, loading, controlled state, and dialog composition.

## Combobox patterns

Branch `codex/stack/combobox-patterns` builds on `codex/stack/sidebar-patterns`.

- Shared combobox behavior: optional data items and row rendering, separate search and selected IDs, automatic shared chips, custom filtering, creation, hidden picks, field actions, validation presentation, and coordinated sizes.
- Existing authored options, autocomplete, form association, grid navigation, positioning, and presence contracts remain in use. No new dependencies or component-family registration.
- Catalogue: consolidated single/multiple, custom people rows, creation, hidden selections, variants, sizes, long lists, validation, forms, and authored parts, plus the existing async, grid, pinned-selection, and overflow patterns.
- Validation: production catalogue and IIFE build; full quality check; 16 focused component/form tests and five production browser interaction cases; all 15 examples inspected in light and dark with no field/popup overflow or page errors. Browser startup contention required serial reruns, without relaxing assertions.
- Commits separate the pre-render checkbox lifecycle guard, the reusable combobox contract/recipe, and catalogue examples/documentation.

## Command menu patterns

Branch `codex/stack/command-patterns` builds on `codex/stack/combobox-patterns`.

- Extends the existing command list with optional data rows, stable values, grouped suggestions/recents, custom rendering and matching, user query events, and a filters slot. Authored command rows and application-owned command execution remain supported.
- The public recipe coordinates default/compact sizes, inline descriptions, readable shortcut caps, and a moving highlight through the shared motion controller. Dialogs, shortcut bindings, tabs, selects, avatars, and draggable sections reuse existing primitives. No dependencies added.
- Twelve consolidated examples cover editable document actions, grouped data, descriptions and disabled actions, recents, tabs/sorting, a changeable global dialog shortcut, custom people rows, CSS parts and sizes, and existing load/reorder workflows.
- Validation: production catalogue/IIFE builds; full local quality check; focused component/workflow and production browser tests; all twelve examples loaded in light and dark without page errors or missing icons, plus narrow-screen review. Remote CI and Vercel status must be checked on the eventual PR head.
- Component behavior, recipe, API documentation and focused regressions form the first commit; catalogue compositions and production interaction coverage form the second. Usage and ownership details are in `docs/command-menu.md`.

## Tooltip patterns

Branch `codex/stack/tooltip-patterns` builds on `codex/stack/command-patterns`.

- Extends the existing tooltip with one-axis cursor following through the shared anchored positioner, explicit forced visibility, and accessible descriptions on native and Mash triggers. Keyboard focus opens immediately; Escape dismisses a hint before its containing dialog. Changing interaction policy cancels pending hover timers.
- Default placement is top/center with an 8 px offset and 200 ms hover delay. The recipe uses shared fast entrance/exit timing, inverse text, readable type, and public CSS parts. No new dependencies or provider family.
- Eleven examples cover action hints, placement/alignment/offset, rich content, both cursor axes, delays, forced state, custom parts, dialog layering, disabled controls, composed control triggers, and removal/restoration.
- Validation: production catalogue/IIFE builds, local quality checks, focused tooltip/shared-overlay regressions, production interaction tests, and light/dark/narrow preview review. Remote CI and deployment status remain tied to the eventual PR head.
- Component behavior and API documentation are separate from catalogue examples and browser coverage. Usage and ownership are documented in `docs/tooltip.md`.

## Message input and conversation patterns

Branch `codex/stack/message-patterns` builds on `codex/stack/tooltip-patterns`.

- Expands the existing application-owned composer instead of adding a competing text editor or chat component family. Textarea, buttons, selectors, attachments, tooltips, motion, scroller, and draggable rows retain their public contracts. No dependencies added.
- Adds suggestions and placeholder completion, first/last-line history recall, filtered and deduplicated local attachments, editable streaming drafts, Stop/Queue states, and a pointer/keyboard reorderable queue. Editing a queued item preserves an unfinished draft by swapping it into the queue.
- Eleven composer examples and a complete local conversation demonstrate control states, sizes, actions, CSS parts, send/stop/retry, copy/edit/regenerate, and streamed replies. Native PDF rendering is not bundled; document attachments retain their filename, size, and media slot.
- Recipes and ownership documentation form one review unit; the consolidated portable controller, catalogue examples, and production browser regressions form the next. See `docs/message-input.md` for application integration and cleanup.
- Validation: production catalogue/IIFE build, local quality checks, twelve focused production browser cases, and light/dark/narrow visual review. Remote CI and deployment status must be checked on the eventual PR head.

## Interaction contracts and keyboard caps

Branch `codex/stack/interaction-contracts` builds on `codex/stack/message-patterns`.

- Keyboard caps follow the shared default/compact control type scale, with readable modifier glyphs, consistent spacing, and per-instance size overrides. Removes local command/tooltip font overrides.
- `selectCollection` extends the existing selection module with stable anchors, toggles, visible ranges, select-all, and filtering retention. `ui-tree` gains opt-in managed single/multiple selection while preserving its owner-controlled default and expansion contract. See `docs/collection-selection.md`.
- Existing `ui-input` gains optional fixed-format masks, raw form values, display values, caret-aware editing, punctuation deletion, reset, and composition handling. No parallel input element. See `docs/formatted-input.md`.
- The composer moves from a catalogue script string into the typed public `@mash/ui/message-composer` controller. Delivery is supplied by the application; abortable sending and retry restore drafts. Existing controls, attachments, and drag mechanics remain in use. See `docs/message-input.md`.
- Portable examples import cached behavior modules on demand. Async setup finishes before previews become interactive; no dependency or component-family registration is added. New examples demonstrate size inheritance, masked form data, tree multiselection, and filtered list selection.
- Review units separate keyboard presentation, collection selection, masked editing, public composer/preview loading, and catalogue documentation.

Validation: production catalogue/IIFE build, full local quality check, focused component and production browser regressions, and light/dark/narrow visual review. One narrow-preview initialization timeout during concurrent local checks passed in an isolated rerun; assertions were not relaxed. Remote CI and deployment status remain tied to the eventual PR head.

Remaining coverage outside this chunk: a carousel primitive, independent plot scale/axis/mark composition, coordinated question flows, command virtualization, and the larger code-editor capabilities noted in the coverage audit. These are follow-up work, not implied by the new controllers.
