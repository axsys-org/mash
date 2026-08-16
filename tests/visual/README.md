# Visual regression

Six canonical component states, photographed through the catalog's production build.

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

Until then the suite proves that the deep links resolve and the components render, which is worth
having on its own.

## Why these six

The temptation is the full cross product of variant × size × tone × theme. That produces hundreds
of images, all of which have to be re-approved whenever a shared token moves, and the review
degenerates into clicking accept. These are the states that would be embarrassing to break.
