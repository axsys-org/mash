# mash

A standards-oriented, renderer-neutral component system with a Web Components reference renderer.

The goal is a design language that machines can read without scraping documentation prose. These
generated schemas carry it:

| Artifact                                    | Describes                                                                        | Generated from                        |
| ------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------- |
| `packages/tokens/dist/tokens.json`          | the token graph — names, values, provenance per theme                            | DTCG sources                          |
| `<package>/custom-elements.json`            | semantic node graphs plus their Web attributes, slots, parts, states, and events | TypeScript sources                    |
| `<package>/src/catalogue/mash.json`         | semantic-node recipes, layout, presentation, conditions, and token dependencies  | catalogue CSS + component manifests   |
| `packages/conformance/fixtures/*.json`      | shared SurfaceTrees and renderer-independent behavior scenarios                  | manifests + authored semantic actions |
| `adapters/gpui/contracts/mash-runtime.json` | standalone native contract, tokens, recipes, fixtures, and GPUI Base coverage    | all four contracts above              |

Every component package emits a manifest through the same analyzer config, so they are
interchangeable in shape. Each component declaration contains a renderer-neutral `mash` graph and
the Web bindings that realize it. Everything downstream — the catalog, editor tooling, React or
native adapters, Figma bridges, and coding agents — reads those schemas rather than scraping source
or documentation prose. See [the Mash component contract](docs/mash-contract.md) and its checked-in
[JSON Schema](docs/schema/component-contract-1.0.0.schema.json).

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

```bash
pnpm install
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

### Paper synchronization

The Interzone Paper foundation is tracked by the reviewed contract at
`packages/tokens/src/paper-contract.json`. It records the Paper content hash and
the semantic aliases Mash is expected to preserve. `pnpm run check:paper` compares
that contract with the generated token graph and fails when a Paper-aligned alias
drifts. See `docs/paper-sync.md` for the supervised design-to-code workflow and
the PR preview handoff; synchronized changes are recorded in `CHANGELOG.md`.

## The component layer

Components are Lit-based but expose no Lit-specific consumer API — they are custom elements, and
the tests drive them through the platform (`innerHTML`, attributes, events, `shadowRoot`) so the
suite would survive replacing Lit.

No decorators are used. Reactive properties are declared with `static properties`, which keeps the
TypeScript configuration free of decorator flags and keeps the emitted JavaScript a direct mirror
of the source.

### API vocabulary

| Surface               | Carries                                                  |
| --------------------- | -------------------------------------------------------- |
| semantic nodes        | renderer-neutral anatomy, identity, and parent topology  |
| attributes/properties | Web input bindings for configuration or controlled state |
| slots                 | Web content bindings                                     |
| `::part()`            | Web realization bindings for catalogue recipes           |
| `:state()`            | Web bindings for reflected runtime state                 |
| events                | Web output bindings for behaviour and value changes      |

Variant axes are semantic and orthogonal. `ui-button` has `variant` (emphasis), `size` (scale) and
`tone` (meaning); they compose freely, so a quiet critical button needs no special case. That works
because the Mash catalogue recipe resolves in two steps — tone rules set only `--_tone-*`, variant rules express
`--_background` in terms of `--_tone-*` — and custom properties substitute at use time.

### Component styling boundary

```css
--_foo-*   private implementation detail
```

Mash components expose **no public component-specific CSS custom properties**. Visual values come
from the shared DTCG semantic token graph, while an opt-in catalogue recipe maps those values onto
stable parts and reflected states. Layout and composition choices such as a card's inset or
full-bleed region are semantic attributes, slots, nodes, or recipe decisions—not ad hoc variables
on one Web Component. A private `--_foo-*` variable may still be used inside a renderer as an
implementation mechanism; it is not a Mash contract and must not be consumed outside that
renderer.

The same underscore convention marks internals in JavaScript, and the manifest build strips
`_`-prefixed members so they never reach the public schema.

### GPUI Base conformance

Mash tracks the 38 primitives published by
[GPUI Component Base](https://longbridge.github.io/gpui-component/base/) at the pinned
`b77f352589503a114cdf709507c0738a88e28364` revision. The checked-in
[`docs/gpui-base-parity.json`](docs/gpui-base-parity.json) maps each primitive to its Mash Web
realization, the upstream source inspected, covered behavior, browser fixtures, catalogue example,
and headless proof. `pnpm run check:gpui-base` rejects an aligned claim without all of that evidence.

Conformance is about the public interaction and semantic contract, not identical renderer
internals. GPUI may use a uniform list, native scene layer, or language-service entity where the Web
renderer uses authored elements, a shadow part, or provider slot. Both preserve the same Mash node
identity, state, inputs, outputs, and relationships; the renderer chooses its native mechanism and
the active catalogue chooses its visual treatment. The pinned registry currently passes strictly at
38 aligned, 0 partial, and 0 missing.

`adapters/gpui` is the first native consumer of that registry. It embeds all 82 Mash SurfaceTrees,
both visual catalogues, the full token graph, and the shared behavior fixtures. It re-exports
`gpui-base` as the unstyled behavior layer, exposes typed semantic node and event handles, validates
language-neutral event payloads, resolves catalogue conditions and private recipe parameters, and
applies a resolved Mash node recipe directly to any `gpui-base` primitive implementing
`gpui::Styled`. The adapter contains no DOM selectors and does not create a parallel component
namespace. Its generated support registry assigns all 100 catalogue presentation traits to exactly
one native realization owner: 65 common traits are applied generically through `gpui::Styled`; SVG,
motion, focus, input, generated-content, and other renderer-specific traits remain explicit
specialized-node obligations instead of being silently discarded.

The adapter now includes a runnable native catalogue for all 38 GPUI Base families and all 52 Mash
components mapped through them. `pnpm dev:gpui` opens the overview; a family slug such as
`pnpm dev:gpui -- tree` opens that interactive native example directly. The catalogue uses
`NativeBinding` for family scoping and semantic-node recipe application while GPUI Base retains
ownership of native behavior.

### Definition and registration are separate

```ts
import { UIButton } from "@mash/ui/button"; // defines nothing
import "@mash/ui/button/register"; // defines <ui-button>
import "@mash/ui/register"; // defines everything
```

Definition modules are side-effect free, which is what lets a bundler drop unused components.
`sideEffects` names only the registration modules, and `pnpm run check:exports` verifies that claim
against the emitted code — including transitively, since the `register.js` barrel registers
elements without containing a `define` call of its own.

### The manifest is a build artifact

`custom-elements.json` is treated like compiled output, not documentation. The analyzer config adds
the information and gates that make it trustworthy enough to build on:

- module paths are rewritten from `src/*.ts` to `dist/*.js`, so they match the `exports` map
- local union type aliases are expanded, so `variant` is `"primary" | "secondary" | "quiet"`
  rather than the meaningless-outside-this-repo name `ButtonVariant`
- every public Web surface is bound to a stable, renderer-neutral semantic node with an address,
  role, direction, structured value schema, and optional parent topology
- every binding records whether its semantic mapping was inferred or explicit, whether authored
  input is optional or required, and its typed default/fallback behavior
- event bindings identify which semantic node values their structured payload fields report
- `_`-prefixed internals are removed
- the build **fails** if a component lacks required metadata, maps a surface to an unknown role,
  emits invalid node topology, or publishes a component-specific CSS custom property

The manifest root embeds the versioned role registry and schema identifier. Each component embeds
its semantic nodes and a flat binding index; the same binding also appears on the CEM attribute,
slot, part, state, or event that realizes it on the Web. The graph is the portable contract. The CEM
surface is the Web adapter.

Shared names are the normal path: `title`, `open`, `value`, and the other registered roles require
no component-specific mapping. The anonymous slot maps to `content`, and event names normalize to
their shared action/state roles. Explicit `@mashrole` annotations exist only for actual name/meaning
mismatches or repeated-role topology. A missing slot resolves through its generated fallback
contract rather than through authored instance data in the manifest.

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

### The URL is the state

Every catalog route is a real address, and the controls are reflected in the query string:

```text
/components/ui-button?variant=quiet&size=small&theme=dark
/components/ui-tree-item?theme=dark&label=src
```

Configure a component, copy the address, paste it into a PR comment: whoever opens it sees exactly
what you saw. `apps/catalog/src/url-state.ts` is the whole mechanism — two pure functions over
`URL` and the app state, plus the calls in `main.ts`. Only values that differ from the component's
documented defaults are written, so links stay short; anything unrecognised (an unknown component,
an enum value that is not one of the documented options) falls back to the default rather than
throwing, because links outlive the code they were copied from.

Choosing a component pushes a history entry; nudging a control replaces one. Otherwise trying four
variants would cost four presses of Back to leave the page.

## Pull requests

```text
push branch
     ↓
open PR
     ├── GitHub Actions ── build and checks
     │                     browser tests (Chromium)
     │                     catalog build
     │                     visual regression (non-blocking scaffold)
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
Static files still win, so `/stage.html` and `/assets/*` are served directly.

Nothing account-specific is committed: no project id, no org id, no token, no deployment URL. The
git metadata the badge displays arrives as Vercel's own `VERCEL_*` build variables, read in exactly
one place (`buildInfo()` in `apps/catalog/vite.config.ts`) and frozen into the bundle by Vite's
`define`. Locally the badge reads `local development`.

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

A composed component's registration module registers what it composes:

```ts
import "@mash/shrine/confirm/register"; // also registers ui-card and ui-button
```

Definition modules stay pure either way — importing `@mash/shrine/confirm` registers
nothing.

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
