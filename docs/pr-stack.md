# Review stack

Use each row's base when opening its PR. Merge from the bottom dependency upward, then retarget or restack the next branch after its base lands. Keep prerequisite branches available until their dependents have been updated.

The existing `codex/component-rebuild` branch is preserved at `5ca546a`; no published history was rewritten. The older reconstruction checkpoints remain intact and some are still large. Their branch boundaries make incremental review possible; they are not newly validated standalone releases.

The mixed final checkpoint was reconstructed as four commits: button disclosure accessibility, Calendar styling, Motion catalogue examples, and preview positioning. The reconstructed tree exactly matches `5ca546a` before the test cleanup. Autocomplete remains its own existing commit.

| Branch                             | PR base                            |
| ---------------------------------- | ---------------------------------- |
| `codex/stack/rebuild-checkpoint`   | `stack/design-system-convergence`  |
| `codex/stack/foundations`          | `codex/stack/rebuild-checkpoint`   |
| `codex/stack/catalogue`            | `codex/stack/foundations`          |
| `codex/stack/showcase`             | `codex/stack/catalogue`            |
| `codex/stack/preview-windows`      | `codex/stack/showcase`             |
| `codex/stack/catalogue-coverage`   | `codex/stack/preview-windows`      |
| `codex/stack/navigation`           | `codex/stack/catalogue-coverage`   |
| `codex/stack/application-stories`  | `codex/stack/navigation`           |
| `codex/stack/autocomplete`         | `codex/stack/application-stories`  |
| `codex/stack/button-disclosure`    | `codex/stack/autocomplete`         |
| `codex/stack/calendar`             | `codex/stack/button-disclosure`    |
| `codex/stack/motion`               | `codex/stack/calendar`             |
| `codex/stack/preview-stability`    | `codex/stack/motion`               |
| `codex/stack/test-streamline`      | `codex/stack/preview-stability`    |
| `codex/stack/icon-layout`          | `codex/stack/test-streamline`      |
| `codex/stack/commons-polish`       | `codex/stack/icon-layout`          |
| `codex/stack/composition-geometry` | `codex/stack/commons-polish`       |
| `codex/stack/story-composition`    | `codex/stack/composition-geometry` |
| `codex/stack/character-picker`     | `codex/stack/story-composition`    |

The first base, `stack/design-system-convergence`, already predates this stack and has its own unmerged history against `main`. It must be reviewed and landed as a prerequisite.

## Test cleanup

- Browser discovery fell from 674 to 381 cases by removing overlapping first-example sweeps. The all-example sweep still checks both themes, registration, content, errors, and overflow.
- Ten compact-layout cases and focused interaction regressions remain. Public copy/import formatting is checked once.
- The visual command runs six canonical screenshot cases instead of rerunning the complete browser suite in a second CI job.
- Component build configuration excludes tests and fixture helpers. The inspected preview assets contain no test-runner imports. This cleanup reduces CI and maintenance work; it does not claim a smaller application bundle.
- Validation: 25 representative catalogue cases passed; test types, lint, formatting, and discovery passed. Test-only changes do not require rebuilding production assets.

## Subsequent changes

Put one behavior or cohesive feature and its meaningful regressions in each commit. Start dependent work from the preceding stack branch and push it separately. Prefer extending the existing test owner over adding another generic sweep. Repeat behavioral checks across themes only when the theme affects the behavior under test; preserve accessibility, focus, state retention, lifecycle, and actual composition regressions.
