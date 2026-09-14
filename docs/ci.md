# CI and deployment

Tests execute in local/CI browsers. They inspect production-built catalogue files served on localhost; they do not execute on the deployed site. Vercel runs `build:vercel`, which builds the catalogue and browser distribution, then publishes that distribution. It does not run the test commands. Component emission excludes test files and fixture helpers; CI also rejects test/spec files in the emitted package and site directories.

## What runs where

| Check                                                                 | Pull requests                               | Main / manual CI      |
| --------------------------------------------------------------------- | ------------------------------------------- | --------------------- |
| Build, types, lint, tokens, exports, reproducibility                  | Yes                                         | Yes                   |
| Component behavior and package integration                            | Yes                                         | Yes                   |
| Every catalogue example                                               | Light, plus targeted dark-theme regressions | Light and dark        |
| Focus, forms, drag, lifecycle, menus, charts and preview interactions | Yes                                         | Yes                   |
| Screenshot reference capture                                          | No                                          | Yes, non-blocking     |
| Cross-browser matrix                                                  | Manual when needed                          | Main and release tags |

The production catalogue runner uses two workers in CI and one locally. Contexts and pages remain isolated. `pnpm test:catalogue:full` restores both complete theme sweeps locally; `pnpm test:stories` remains the separate application-workspace suite. No retries or wider assertion timeouts were introduced by this cleanup.

The screenshot job has no established required pixel baseline. It produces review artifacts, not a passing visual-parity certificate, so repeating its build and browser setup on every PR provided little value.

## Removed duplication

Six generic registration/default-slot cases duplicated the full example registration sweep and package import checks. Component-specific behavior and semantic assertions remain. Compact geometry checks now use one theme; actual theme-boundary and inverse-state tests still run in both themes. The second full example/theme traversal is retained for main/manual validation instead of every PR.

The baseline browser job on PR #52 took 8m02s: the catalogue suite accounted for 5m37s, integration for about 19s, with the rest in dependency/build/browser setup and component tests. Test count alone obscured where time was spent. The cleanup measurement is recorded after its CI run completes.

## Stack audit

The pre-cleanup integrated heads, #50 and #52, passed CI and Vercel. Historical draft checks belong to older commits: #29–31 have stale color assertions; #32–49 fail frozen installation because patch configuration and pnpm lockfile metadata disagree. Re-running those unchanged heads cannot apply fixes from newer branches. They need the applicable fixes when the stack is restacked for merging; this cleanup does not rewrite those historical branches or certify their old heads.

The unused legacy stage, inspector, embedded playgrounds, and obsolete study implementation were removed along with their dependencies. The current component catalogue and Stories retain their independent implementations. Removing those dormant files reduces installation and maintenance work; they were already outside the active browser import graph, so this is not presented as a runtime bundle-size saving.
