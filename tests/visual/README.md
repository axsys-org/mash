# Visual regression

`pnpm test:catalogue` checks every named example in both themes, plus focused interaction and layout regressions. One all-example sweep owns registration, rendered content, errors, and overflow; compact-screen cases cover layouts that need extra checks.

`pnpm test:visual` only photographs the six canonical component states. It does not rerun the catalogue and story suites. `pnpm test:stories` runs the application stories separately.

Set `MASH_CAPTURE_AUDIT=1` when running `example-variants.spec.ts` to capture each example for a visual audit. Routine runs do not write these images.

```bash
pnpm build && pnpm build:catalog   # the suite serves apps/catalog/dist
pnpm test:visual
```

## The platform constraint

Screenshot baselines are **not portable across operating systems**. Linux, macOS and Windows
rasterise text with different hinting and antialiasing, and the same Chromium build on two
different platforms produces images that differ on essentially every glyph edge. No pixel
tolerance separates "the font renders differently" from "the button's padding changed", so there
is no threshold that makes one baseline work everywhere.

Rather than normalise this away — a font-embedding, `-webkit-font-smoothing`, device-scale-factor
rabbit hole that ends in screenshots that no longer look like the product — baselines are keyed by
platform:

```text
snapshots/linux/button-primary-dark.png
snapshots/darwin/button-primary-dark.png
```

A baseline that does not exist yet is **written** (`updateSnapshots: "missing"` in
`playwright.config.ts`). Playwright still reports the run that created it as a failure — it has
nothing to compare against and says so — so the first run on any platform is a red seeding run and
the second is green. That is why the CI job is `continue-on-error` while `snapshots/` is empty.

## Committing baselines

`snapshots/` is currently **not committed**, and the CI job that runs this suite is non-blocking.
That is the honest state of a scaffold: the mechanism works, the reference images do not exist.

To finish the job:

1. Run the `visual` job on `main` and download its `visual-snapshots` artifact.
2. Unpack it into `tests/visual/snapshots/` and commit — Linux is the platform CI runs on.
3. Remove `snapshots/` from the repository `.gitignore`.
4. Drop `continue-on-error: true` from the `visual` job in `.github/workflows/ci.yml`.

The separate `pnpm test:catalogue` gate is blocking. It checks every named example in both themes, portable imports, component geometry, navigation, and focused keyboard/interaction behavior. Screenshot comparisons remain a separate acceptance layer.

## Why these six

The temptation is the full cross product of variant × size × tone × theme. That produces hundreds
of images, all of which have to be re-approved whenever a shared token moves, and the review
degenerates into clicking accept. These are the states that would be embarrassing to break.
