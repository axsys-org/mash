# Review stack

Use each row's base when opening its PR. Merge from the bottom dependency upward, then retarget or restack the next branch after its base lands. Keep prerequisite branches available until their dependents have been updated.

The existing `codex/component-rebuild` branch is preserved at `5ca546a`; no published history was rewritten. The older reconstruction checkpoints remain intact and some are still large. Their branch boundaries make incremental review possible; they are not newly validated standalone releases.

The mixed final checkpoint was reconstructed as four commits: button disclosure accessibility, Calendar styling, Motion catalogue examples, and preview positioning. The reconstructed tree exactly matches `5ca546a` before the test cleanup. Autocomplete remains its own existing commit.

| PR                                               | Branch                             | PR base                            |
| ------------------------------------------------ | ---------------------------------- | ---------------------------------- |
| [#30](https://github.com/axsys-org/mash/pull/30) | `codex/stack/rebuild-checkpoint`   | `stack/design-system-convergence`  |
| [#31](https://github.com/axsys-org/mash/pull/31) | `codex/stack/foundations`          | `codex/stack/rebuild-checkpoint`   |
| [#32](https://github.com/axsys-org/mash/pull/32) | `codex/stack/catalogue`            | `codex/stack/foundations`          |
| [#33](https://github.com/axsys-org/mash/pull/33) | `codex/stack/showcase`             | `codex/stack/catalogue`            |
| [#34](https://github.com/axsys-org/mash/pull/34) | `codex/stack/preview-windows`      | `codex/stack/showcase`             |
| [#35](https://github.com/axsys-org/mash/pull/35) | `codex/stack/catalogue-coverage`   | `codex/stack/preview-windows`      |
| [#36](https://github.com/axsys-org/mash/pull/36) | `codex/stack/navigation`           | `codex/stack/catalogue-coverage`   |
| [#37](https://github.com/axsys-org/mash/pull/37) | `codex/stack/application-stories`  | `codex/stack/navigation`           |
| [#38](https://github.com/axsys-org/mash/pull/38) | `codex/stack/autocomplete`         | `codex/stack/application-stories`  |
| [#39](https://github.com/axsys-org/mash/pull/39) | `codex/stack/button-disclosure`    | `codex/stack/autocomplete`         |
| [#40](https://github.com/axsys-org/mash/pull/40) | `codex/stack/calendar`             | `codex/stack/button-disclosure`    |
| [#41](https://github.com/axsys-org/mash/pull/41) | `codex/stack/motion`               | `codex/stack/calendar`             |
| [#42](https://github.com/axsys-org/mash/pull/42) | `codex/stack/preview-stability`    | `codex/stack/motion`               |
| [#43](https://github.com/axsys-org/mash/pull/43) | `codex/stack/test-streamline`      | `codex/stack/preview-stability`    |
| [#44](https://github.com/axsys-org/mash/pull/44) | `codex/stack/icon-layout`          | `codex/stack/test-streamline`      |
| [#45](https://github.com/axsys-org/mash/pull/45) | `codex/stack/commons-polish`       | `codex/stack/icon-layout`          |
| [#46](https://github.com/axsys-org/mash/pull/46) | `codex/stack/composition-geometry` | `codex/stack/commons-polish`       |
| [#47](https://github.com/axsys-org/mash/pull/47) | `codex/stack/story-composition`    | `codex/stack/composition-geometry` |
| [#48](https://github.com/axsys-org/mash/pull/48) | `codex/stack/character-picker`     | `codex/stack/story-composition`    |

The first base, `stack/design-system-convergence`, already predates this stack and has its own unmerged history against `main`. Its prerequisite PR is [#29](https://github.com/axsys-org/mash/pull/29). Review it first, then proceed down the table. All 20 PRs are drafts; no merges were performed.

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
