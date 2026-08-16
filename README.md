# mash

A standards-oriented Web Components design system.

The goal is a design language that machines can read without scraping documentation prose. Two
generated schemas carry it:

| Artifact                                   | Describes                                                    | Generated from     |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------ |
| `packages/tokens/dist/tokens.json`         | the token graph — names, values, provenance per theme        | DTCG sources       |
| `packages/components/custom-elements.json` | component schemas — attributes, slots, parts, states, events | TypeScript sources |

Everything downstream — the catalog, editor tooling, future React wrappers, Figma bridges, coding
agents — reads those two files rather than the source.

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
| `pnpm build`            | Tokens → components → manifest, in dependency order               |
| `pnpm dev`              | Watch everything and serve the catalog                            |
| `pnpm test`             | Component tests in a real browser (Vitest Browser Mode, Chromium) |
| `pnpm test:integration` | Composed-behaviour tests (Playwright)                             |
| `pnpm check`            | Formatting, types, lint and package export checks                 |
| `pnpm clean`            | Remove build output                                               |

Cross-browser runs: `BROWSERS=chromium,firefox,webkit pnpm --filter @mash/ui test`, and
`ALL_BROWSERS=1 pnpm test:integration`. CI runs the matrix on `main` and tags.

## The token layer

Tokens are authored in the current [DTCG](https://tr.designtokens.org/) format, in three layers.

```text
reference   color.reference.violet.600     literal values, authored in OKLCH
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
--ref-color-violet-600 /* primitive — inspectable, not the public API */
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
  --color-action: var(--ref-color-violet-600);
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
--color-action  →  color.action (theme)  →  color.reference.violet.600 (reference)
                                         →  oklch(0.5500 0.2100 285.00)
```

Adding a component or a token makes it appear in the catalog with no catalog changes.

## Testing

Component tests run in a real browser via Vitest Browser Mode with Playwright. jsdom is not used
as a correctness environment: shadow DOM, slot assignment, `:state()`, focus delegation,
`ElementInternals` form association and custom property inheritance are either absent or
approximated there, so a green jsdom suite would prove very little.

`tests/integration` covers what only appears once components are combined with each other and with
the environment — themes nested inside themes, a form spanning several shadow roots, RTL, reduced
motion, forced colors, keyboard-only interaction.

## Layout

```text
packages/tokens        DTCG sources, Style Dictionary config, generated CSS + schemas
packages/components    ui-button, ui-card, tsc build, custom-elements.json
apps/catalog           Vite development catalog
tests/integration      Playwright composed-behaviour tests
scripts/               repo-level checks
```

One package per layer, not one per component.

## Notes on tool choices

Every tool here solves a stated problem, and a few choices are worth recording because the obvious
alternative was rejected:

- **tsc, not a bundler**, for the component package. The canonical artifact is native ES modules.
  A bundled CDN build could be added later as a secondary distribution.
- **oxlint, not ESLint.** `typescript-eslint` peers on `typescript <6.1`, and this repo compiles
  with TypeScript 7. Pinning a second compiler just to lint would be exactly the unnecessary build
  infrastructure this system is trying to avoid.
- **No composite DTCG typography tokens.** They compile either to a lossy CSS `font` shorthand that
  silently drops letter-spacing, or to an expanded form that loses per-field type information.
  Typography is authored as groups of individual tokens instead, and the generated CSS stays obvious.
- **No unit conversion in the token build.** A dimension authored as `0.75rem` comes out as
  `0.75rem`. Nobody should have to reverse-engineer a transform chain to explain a computed value.
