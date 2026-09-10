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
