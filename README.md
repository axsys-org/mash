# mash

A standards-oriented Web Components design system.

For Goo, Mash provides a pinned server renderer profile. See the
[Goo ownership contract and profile workflow](docs/goo-profile.md) for server
measurement, portable prepared output and paired Reaver updates.

The goal is a design language that machines can read without scraping documentation prose. Two
generated schemas carry it:

| Artifact                           | Describes                                                    | Generated from     |
| ---------------------------------- | ------------------------------------------------------------ | ------------------ |
| `packages/tokens/dist/tokens.json` | the token graph — names, values, provenance per theme        | DTCG sources       |
| `<package>/custom-elements.json`   | component schemas — attributes, slots, parts, states, events | TypeScript sources |

Every component package emits a manifest, all through the same analyzer config, so they are
interchangeable in shape. Everything downstream — the catalog, editor tooling, future React
wrappers, Figma bridges, coding agents — reads those schemas rather than the source.

## Architecture

```text
DTCG design tokens                         TypeScript Web Components
        │                                            │
        ▼                                            ▼
 Style Dictionary                                  tsc
        │                                            │
        ├── reference.css                           ├── ES modules (preserved graph)
        ├── semantic.css                            └── .d.ts + source maps
        ├── theme-light.css / theme-dark.css              │
        ├── tailwind.css (optional v4 adapter)             │
        ├── tokens.json  (graph + provenance)             ▼
        └── tokens.js / tokens.d.ts            Custom Elements Manifest
                                                          │
                                                          ▼
                                                custom-elements.json
                         │
                         ▼
              Vite catalog + browser tests
```

No bundler touches the published packages. `tsc` emits an ES module graph that mirrors `src/`
one-for-one, so the shipped JavaScript is readable and diffable. Vite exists only to serve the
development catalog.

## Quick start

With Nix, `nix develop` supplies Node 22 and the exact pnpm version from
`package.json`. Enter the shell before running the commands below. See
[Nix builds and downstream use](nix/README.md) for the reproducible workspace
package and flake checks.

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

```bash
pnpm dev
```

`pnpm dev` builds once, then watches tokens, components and the manifest alongside the catalog at
<http://localhost:5173>. Editing a token, a component or a JSDoc comment refreshes the catalog.

## Commands

| Command                 | What it does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `pnpm build`            | Every package, in workspace-dependency order                      |
| `pnpm dev`              | Watch everything and serve the catalog                            |
| `pnpm test`             | Component tests in a real browser (Vitest Browser Mode, Chromium) |
| `pnpm test:integration` | Composed-behaviour tests (Playwright)                             |
| `pnpm check`            | Formatting, types, lint and package export checks                 |
| `pnpm clean`            | Remove build output                                               |

The stages of `pnpm build` are also addressable one at a time, which is what CI names so that a
failure reads as `tokens` or `manifest` rather than as a line in one long log:

| Command                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `pnpm tokens`          | Style Dictionary — DTCG sources to CSS, JSON and TS            |
| `pnpm components`      | `tsc` for every component package                              |
| `pnpm cem`             | Custom Elements Manifest for every component package           |
| `pnpm build:catalog`   | The catalog and single-file browser distribution               |
| `pnpm preview:catalog` | Serve that build locally                                       |
| `pnpm test:browser`    | Alias for `pnpm test`, named for what it is                    |
| `pnpm test:visual`     | Screenshot the canonical states (see `tests/visual/README.md`) |

Cross-browser runs: `BROWSERS=chromium,firefox,webkit pnpm test`, and
`ALL_BROWSERS=1 pnpm test:integration`. CI runs the matrix on `main` and tags.

## The token layer

Tokens are authored in the current [DTCG](https://tr.designtokens.org/) format, in three layers.

```text
reference   color.reference.blue.500       Paper's primary action primitive
    ↓
semantic    space.controlInline            roles, theme-independent
    ↓
themes      color.action                   roles, theme-dependent
    ↓
components  var(--color-action)
```

Semantic colour lives in the **theme** files rather than in `semantic/`, because every semantic
colour is theme-dependent by definition — there is no theme-neutral value for `color.canvas`.
Each theme states the whole colour contract once, and the build fails if the themes ever disagree
about which names exist.

CSS names are stable and human-readable, and the layer a token belongs to is visible in its name:

```css
--ref-color-blue-500 /* primitive — inspectable, not the public API */
--color-action /* semantic — what components use */
--space-control-inline
--radius-control
```

Generated CSS is meant to be read. Each file carries its own rationale, and every token's
description is emitted above it:

```css
:root,
[data-theme="light"] {
  /* The accent tone. Primary buttons, links, selected state. */
  --color-action: var(--ref-color-blue-500);
}
```

Semantic and theme values resolve through `var()` into the primitives rather than being inlined, so
provenance is visible in the browser inspector as well as in `tokens.json`.

### Validation

`packages/tokens/scripts/validate.mjs` runs before every build and fails loudly on:

- malformed DTCG values (wrong shape for the declared `$type`, unknown types, missing `$type`)
- unresolved aliases, including semantic tokens pointing at missing primitives
- circular references
- layering violations — primitives holding aliases, or a token reaching across layers
- two tokens compiling to the same CSS custom property
- themes that define different sets of tokens

After the build, the generated CSS is re-checked against itself: every `var()` it emits must be
defined by one of the generated stylesheets.

### Tailwind v4 application styling

`@mash/tokens/tailwind.css` is an optional generated adapter for layout and lightweight styling
that does not rise to the level of a component. It exposes semantic colours, spacing, sizing,
radii, blur and motion as unprefixed Tailwind vocabulary, plus a small set of stack, surface,
typography, focus and animation fragments. Reference variables remain in the imported CSS cascade
so semantic aliases resolve and provenance stays inspectable, but they never become Tailwind
theme values or utilities. Importing the adapter is the explicit opt-in to the semantic names.

```css
@layer theme, base, mash.catalogue, components, utilities;

@import "tailwindcss/preflight.css" layer(base); /* optional normalization */
@import "tailwindcss/utilities.css" layer(utilities);
@import "@mash/tokens/tailwind.css";
@import "@mash/ui/tailwind.css"; /* generated part, slot, and state variants */
@import "@mash/shrine/tailwind.css"; /* optional Shrine anatomy */
```

The adapter intentionally omits Tailwind's default theme. Preflight is an application choice: the
catalogue opts into it instead of carrying a parallel reset stylesheet. Mash remains the only
design-value source; Tailwind contributes normalization, its utility compiler, and static layout
vocabulary.

The component adapters are generated from each package's Custom Elements Manifest. A declaration
of `part="prefix"`, `slot="prefix"`, or `:state(has-prefix)` therefore yields the Tailwind variants
`part-prefix:*`, `slot-prefix:*`, and `state-has-prefix:*` without maintaining a second anatomy
list. See [docs/tailwind.md](docs/tailwind.md) for the utility contract and component boundary.

### Foundation contract

Mash's reviewed foundation aliases live in `docs/reference/foundations.json`.
`pnpm run check:foundations` compares them with the generated token graph. Palette,
type, geometry, and component recipes are rebuilt together on the component rebuild
branch. See [the rebuild contract](docs/component-rebuild.md) for composition,
example requirements, migration notes, and the remaining reference review.

## The component layer

Components are Lit-based but expose no Lit-specific consumer API — they are custom elements, and
the tests drive them through the platform (`innerHTML`, attributes, events, `shadowRoot`) so the
suite would survive replacing Lit.

No decorators are used. Reactive properties are declared with `static properties`, which keeps the
TypeScript configuration free of decorator flags and keeps the emitted JavaScript a direct mirror
of the source.

### API vocabulary

| Surface               | Carries                            |
| --------------------- | ---------------------------------- |
| attributes/properties | semantic configuration             |
| slots                 | content composition                |
| CSS custom properties | design-language inputs             |
| `::part()`            | intentional styling escape hatches |
| `:state()`            | internal runtime state             |
| events                | behavioural outputs                |

Every component publishes at least one stable CSS part. Every named slot also
publishes a same-named part, so authored content and the region that presents it
share one vocabulary. Composed components forward the parts of nested
primitives when consumers need to style through the outer shadow boundary.
`pnpm run check:parts` rejects missing slot parts, stale catalogue selectors,
recipe selectors that target undeclared parts, and missing generated Tailwind
variants for any public part, named slot, or custom state.

Variant axes are semantic and orthogonal. `ui-button` has `variant` (emphasis), `size` (scale) and
`tone` (meaning); they compose freely, so a quiet critical button needs no special case. That works
because the CSS resolves in two steps — tone rules set only `--_tone-*`, variant rules express
`--_background` in terms of `--_tone-*` — and custom properties substitute at use time.

### Public vs private CSS properties

```css
--foo-*    public, part of the component's contract
--_foo-*   private implementation detail
```

`ui-button` deliberately exposes **no** public CSS custom properties: it is built entirely from
shared semantic tokens, and restyling buttons means changing the design language rather than
overriding one component. `ui-card` exposes exactly one, `--card-padding`, because full-bleed
content is a genuine independent axis that the shared tokens cannot express.

The same underscore convention marks internals in JavaScript, and the manifest build strips
`_`-prefixed members so they never reach the public schema.

### Import and use

```ts
import "@mash/ui";
import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
```

A normal package import defines the complete component set. Write the elements in markup;
there is no registration list or family setup. `@mash/shrine` also makes the base UI elements
available. Optional component imports such as `@mash/ui/button` define their elements too,
while exporting the same classes and types as the package entry.

The package metadata preserves these effects through production bundling. Internal definition
modules and headless helpers remain free of registration effects.

Headless pointer movement follows the same rule. `@mash/ui/drag` exposes typed containment,
snapping, auto-scroll, and positioning without registering an element or touching the document at
import time; `<ui-draggable>` is the optional markup adapter. See [docs/drag.md](docs/drag.md).

### The manifest is a build artifact

`custom-elements.json` is treated like compiled output, not documentation. The analyzer config adds
four things that make it trustworthy enough to build on:

- module paths are rewritten from `src/*.ts` to `dist/*.js`, so they match the `exports` map
- local union type aliases are expanded, so `variant` is `"primary" | "secondary" | "quiet"`
  rather than the meaningless-outside-this-repo name `ButtonVariant`
- `_`-prefixed internals are removed
- the build **fails** if a component lacks a tag name, a description, or a described attribute

## The catalog

`apps/catalog` imports the real workspace packages — there is no parallel component implementation.
It derives its content from the two generated schemas:

- the component list, API tables, slots, parts, states and events come from `custom-elements.json`
- the controls are derived from attribute types: a literal union becomes a segmented picker, a
  boolean becomes a toggle, a string becomes a text field
- **tokens used** is read from the rendered element's own adopted stylesheets, then traced through
  `tokens.json` to the primitive holding the value

That last one is the beginning of the provenance explorer:

```text
--color-action  →  color.action (theme)  →  color.reference.blue.500 (reference)
                                         →  oklch(0.6711 0.1572 251.18)
```

Adding a component or a token makes it appear in the catalog with no catalog changes.

### Preview routes

Component pages show their examples directly in one scroller. Theme and example links are shareable:

```text
/components/ui-button?theme=dark&example=Theme%20boundaries
/components/ui-tabs?preview=shared&example=Dynamic%20tabs
```

The current catalogue is routed by `apps/catalog/src/main.ts` and rendered by `showcase.ts`.
Tabs and Chart offer an opt-in shared preview document; see [Catalogue preview](docs/catalogue-preview.md)
for loading boundaries, measurements, and production review commands.

## Pull requests

See [CI and deployment](docs/ci.md) for test scope, production boundaries, and full validation commands.

```text
push branch
     ↓
open PR
     ├── GitHub Actions ── build and checks
     │                     browser tests (Chromium)
     │                     catalog build
     │
     └── Vercel ────────── preview deployment
                                ↓
                          designer opens the catalog, navigates to the changed
                          component, changes theme/variant/size/state, copies
                          the URL into a review comment
```

The two halves answer different questions and are deliberately independent:

- **CI** answers _should this commit merge?_
- **the preview** answers _what does this commit look like?_

A failing browser test does not prevent the preview from existing. Vercel builds from its own Git
integration and does not wait on GitHub Actions, which is the point — a preview is most useful
precisely when something is not yet right.

### For reviewers

Open the Vercel **View deployment** link on the PR. The masthead shows which commit you are
looking at:

```text
PR #184 · feat/tree-item          a83cf4d
```

Review the actual browser component, not a screenshot of one. When something is wrong, copy the
address (or press **copy link** next to the component name) and paste it into your comment:

> selected tree item is too low contrast here:
> `<preview-url>/components/ui-tree-item?theme=dark&selected=true`

### Deployment

`vercel.json` at the repository root is the whole configuration:

```jsonc
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm -w run build:vercel",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/components/:path*", "destination": "/index.html" }],
}
```

Two details in there are load-bearing, and both are consequences of the same fact:

**The Vercel project's Root Directory is `apps/catalog`.** `vercel.json` is read from the repository
root, but the commands in it **run in the Root Directory**. So:

- `pnpm -w` targets the workspace root explicitly. Without it, `pnpm run build:vercel` looks only
  at `apps/catalog/package.json` — which has no such script — and a bare `pnpm run build` is worse,
  because it silently resolves to the catalog's own `vite build` and tries to bundle against
  packages that have not been built yet.
- `outputDirectory` is `dist`, resolved relative to the Root Directory — so `apps/catalog/dist`.

Install still covers the whole workspace: pnpm walks up to `pnpm-workspace.yaml` and links all
seven projects, which is what makes `@mash/tokens` and `@mash/ui` resolve from source.

`build:vercel` wraps the deterministic `build:catalog` and then publishes the browser IIFE when
Vercel identifies the build as a deployed environment. Local builds and ordinary GitHub Actions
runs skip the publish step, so they need no Blob credentials and have no external side effects.

`build:catalog` itself is `pnpm --filter "@mash/catalog..." run build`. The trailing `...` selects
the catalog **and its workspace dependencies**, so one command builds tokens → `@mash/ui` →
`@mash/shrine` → catalog and browser IIFE in dependency order from a completely cold tree. That
ordering is a real dependency — both outputs consume generated token CSS, and the catalog imports
each package's `custom-elements.json`, which do not exist until those packages are built — and it
belongs in the dependency graph rather than in a sequence of commands someone has to remember to
chain.

If Vite is ever run against a cold tree anyway, a `buildStart` guard in `apps/catalog/vite.config.ts`
names the missing artifacts and the command to fix it, instead of failing with a bare "failed to
resolve import" for a specifier that is spelled correctly.

The CI `Catalog build` job runs this exact command from this exact directory, so a mismatch between
what CI proves and what Vercel does surfaces on the PR rather than in the deployment log.

The preview therefore always contains the PR's exact `packages/tokens`, `packages/components` and
`apps/catalog`; there is no second token pipeline, no second component build, and no preview-only
application. Designers review the same artifacts consumers get.

### Single-file browser distribution

Every catalog build also emits `dist/mash.js`: a classic IIFE containing Lit, every element in
`@mash/ui` and `@mash/shrine`, and all token CSS. Loading it registers the elements and installs the
tokens without a package manager, import map, or separate stylesheet:

```html
<script defer src="https://example.public.blob.vercel-storage.com/mash.js"></script>

<ui-button>Save</ui-button>
<shrine-confirm></shrine-confirm>
```

The package ES module graphs remain the canonical distribution. The IIFE is a secondary,
all-inclusive browser distribution for markup-first consumers; its exported classes are also
available on `globalThis.Mash`.

Vercel production, preview, and custom-environment builds publish an immutable,
deployment-specific object to a connected public Blob store, cached for one year. Separate paths
mean concurrent previews cannot overwrite one another, and rolling Vercel back keeps the deployment
paired with its original browser bundle.

Each Vercel deployment includes `/mash-blob.json`, which records its exact Blob URL and a
ready-to-copy `<script>` tag. Use that immutable URL for review and version pinning.

Connect a **public** Vercel Blob store to the project for Production and Preview before deploying.
New connections use Vercel OIDC, which provides short-lived `VERCEL_OIDC_TOKEN` and `BLOB_STORE_ID`
credentials to the build. Upgrade an older token-based connection to OIDC in the Blob store's
Projects settings. The publisher retains `BLOB_READ_WRITE_TOKEN` support only as a compatibility
fallback. A public Blob remains public even when Vercel Deployment Protection protects the catalog.

The rewrite exists because `/components/ui-button` is a real address the app routes client-side.
Static files still win, so `/fixture.html`, `/shared-fixture.html`, and `/assets/*` are served directly.

**If the design system is not meant to be public, turn on Vercel Deployment Protection** for the
project. The catalog is a static bundle with no backend, no secrets and no runtime APIs, so access
control belongs at the deployment platform rather than in the application — there is deliberately
no application-level authentication to configure or bypass.

## Testing

Component tests run in a real browser via Vitest Browser Mode with Playwright. jsdom is not used
as a correctness environment: shadow DOM, slot assignment, `:state()`, focus delegation,
`ElementInternals` form association and custom property inheritance are either absent or
approximated there, so a green jsdom suite would prove very little.

`tests/integration` covers what only appears once components are combined with each other and with
the environment — themes nested inside themes, a form spanning several shadow roots, RTL, reduced
motion, forced colors, keyboard-only interaction.

`tests/visual` photographs six canonical states through the catalog's **production** build, each
reached by its deep link — so the URL contract is part of what is under test. It is a scaffold: the
mechanism works, but screenshot baselines are not portable across operating systems, so no baselines
are committed yet and the CI job is non-blocking. `tests/visual/README.md` explains the constraint
and how to promote it to a required check.

Pull requests run Chromium only. `.github/workflows/cross-browser.yml` runs Chromium, Firefox and
WebKit on `main`, on `v*` tags, and on demand — three engines on every push to every branch buys a
signal that is almost always identical to the one Chromium already gave, at three times the wall
clock.

## Layout

```text
packages/tokens             DTCG sources, Style Dictionary config, generated CSS + schemas
packages/components         @mash/ui — ui-button, ui-card
packages/shrine-components  @mash/shrine — composed components built on @mash/ui
apps/catalog                Vite catalog — dev tool and PR preview deployment
tests/integration           Playwright composed-behaviour tests
tests/visual                Playwright screenshot baselines (scaffold)
scripts/                    repo-level checks and shared build config
.github/workflows/          ci.yml (every PR) and cross-browser.yml (main, tags)
vercel.json                 how Vercel builds the catalog from the monorepo
```

One package per layer, not one per component.

## Component packages

```text
@mash/tokens
   └── @mash/ui          primitives: ui-button, ui-card
        └── @mash/shrine  patterns: shrine-confirm
```

`@mash/ui` holds the primitives — the elements that own colour, spacing and
interaction, built directly from the semantic tokens. `@mash/shrine` holds patterns
composed from those primitives: it owns the layout _between_ parts and nothing else.
`shrine-confirm` adds no colours, radii or control styling of its own, and a test
asserts the host stays transparent so that stays true.

Both packages share one architecture, and both generate their manifest through the
same analyzer config in `scripts/cem-plugins.mjs`. That sharing is deliberate: a
consumer reading two manifests should not have to know which package emitted which.
If one expanded union types and the other did not, the schema would stop being a
contract and become a per-package dialect.

Adding another component package means: create it, declare its workspace
dependencies, and add it to the catalog's `sources` list in `apps/catalog/src/schema.ts`.
Build order, export checks and CI pick it up on their own — `pnpm -r` sequences by the
dependency graph, and `check-exports` discovers packages rather than reading a list.

Import `@mash/shrine` to use Shrine compositions with their base components already available.

## Notes on tool choices

Every tool here solves a stated problem, and a few choices are worth recording because the obvious
alternative was rejected:

- **tsc, not a bundler**, for the component package. The canonical artifact is native ES modules.
  The bundled `mash.js` browser build is a secondary distribution and does not change that package
  shape.
- **oxlint, not ESLint.** `typescript-eslint` peers on `typescript <6.1`, and this repo compiles
  with TypeScript 7. Pinning a second compiler just to lint would be exactly the unnecessary build
  infrastructure this system is trying to avoid.
- **No composite DTCG typography tokens.** They compile either to a lossy CSS `font` shorthand that
  silently drops letter-spacing, or to an expanded form that loses per-field type information.
  Typography is authored as groups of individual tokens instead, and the generated CSS stays obvious.
- **No unit conversion in the token build.** A dimension authored as `0.75rem` comes out as
  `0.75rem`. Nobody should have to reverse-engineer a transform chain to explain a computed value.
