# Goo ownership and the first renderer profile

Mash supplies a reproducible visual realization for Goo. Goo interprets content,
measures it on the server and resolves its layout. Renderers paint the resulting
boxes, lines and baselines. A new renderer should not need to translate Goo roles
into another layout system or reproduce Goo's wrapping and adjacency rules.

The first implementation is `@mash/goo-profile`, profile `mash-goo` version 1.
It supports the current native server-rendered Goo primitives with pinned fonts
and matching CSS. Its [package documentation](../packages/goo-profile/README.md)
covers the schema, exact measurement arithmetic, artifact inventory and hashes.

## Ownership contract

| Concern                                                                | Owner               | Contract                                                              |
| ---------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------- |
| Content, roles, view choice and visibility                             | Goo                 | Renderers preserve the supplied content and meaning.                  |
| Subjects, occurrences and encounter lifetimes                          | Goo                 | Rendered instances retain the identities supplied by Goo.             |
| Font files, glyph metrics and primitive geometry                       | Mash profile        | One immutable revision supplies the server and every painter.         |
| Intrinsic measurement, wrapping and layout                             | Goo on the server   | Preparation resolves sizes, lines, rows, gaps and positions once.     |
| Native elements, pixels, accessibility and immediate editing mechanics | Renderer            | Paint and interact with prepared content through the target platform. |
| Accepted selection, dirty encounters and guarded transitions           | Goo runtime/session | Browser events express intent; accepted state comes back from Goo.    |
| Durable records, permission checks and action execution                | Reaver host         | The renderer never acquires a second execution or persistence model.  |

A component may manage its caret, hover feedback, keyboard traversal or local
camera. Those implementation details do not make it authoritative for Goo's
selection, visibility or document state. Initial rendering and hydration must
converge to the declared state without creating user actions.

Identity also has separate levels: a domain subject, an occurrence in a view, a
live encounter and a component's internal parts are different things. Reordering
a view must not discard a surviving encounter's draft. A replaced encounter must
not receive a late result from the previous lifetime.

## Server preparation is the portable boundary

The pipeline is:

```text
Goo source and accepted state
    -> Goo semantic compilation
    -> server measurement using the pinned Mash profile
    -> Goo layout and explicit text lines
    -> prepared boxes, baselines and control references
    -> HTML, SVG, canvas or another painter
```

Preparation takes a real available width, text scale and direction. It carries
the selected profile's ID, contract version and content revision. A changed
width, font realization, text scale or content requires a new preparation for
that context. A camera transform can scale an already prepared scene without
changing its intrinsic coordinates.

HTML uses `.goo-surface` with native `.goo-*` elements and explicit text-line
spans. CSS supplies the matching fonts and control anatomy; the browser does not
choose different line breaks. Other renderers consume resolved line positions
and alphabetic baselines and load the same font bytes. They can use their own
paint and accessibility APIs without reconstructing CSS line boxes.

Reaver's JSON `render` response exposes `display` alongside the HTML and existing
prepared inspection. Its version-1 paint transport contains:

| Field               | Meaning                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `profile`           | Matched profile ID, version and revision                                                           |
| `context`           | Available width, text scale and `ltr`/`rtl` direction                                              |
| `coordinates`       | `absolute-css-px`                                                                                  |
| `width`, `height`   | Prepared surface extent                                                                            |
| `nodes`             | Flat preorder records with identity, parent, kind, slot, payload and absolute box                  |
| `nodes[].textStyle` | Exact font identity/hash, size, leading, tracking and insets                                       |
| `nodes[].lines`     | Static text, absolute line box, `textX`, `baseline` and `prefixAdvance`; empty for editable inputs |

A line box describes the measured text advance plus any prefix, rather than the
entire available wrapping width. `baseline` is an already resolved physical y
coordinate. A painter can place text directly at `textX` and `baseline`.

Editable inputs keep their original value in `payload`, along with `config`,
the allocated `box` and resolved `textStyle`. The renderer's native control paints
and edits that value within the server-allocated box, including tabs, caret,
selection and composition. Static prepared lines would become stale while the
user types, so input nodes intentionally have none. Button and avatar labels
remain static text with explicit prepared lines.

Goo's public preparation entry point accepts semantic content and context.
Prepared output is renderer input, not a second way for callers to inject an
unchecked semantic plan. The existing measurement validation, content identity
and encounter lifetime rules remain in force at this boundary.

## What version 1 guarantees

The profile includes text, action buttons, inputs, code, avatars, presence,
progress bars and media primitives. Server geometry and CSS typography come from
one authored profile. The fonts are fixed-weight ASCII subsets of Inter and
Roboto Mono; the bundle includes exact glyph advances, vertical font metrics and
SIL Open Font License notices. Browser font-metric overrides pin the same ascent,
descent and line gap used for portable baselines.

Supported measured content is printable ASCII plus tab, CR and LF. Goo performs
the established normalization before measuring. Browser font fallback is not a
supported way to extend that coverage. Pinned font bytes alone do not establish
Unicode layout: a later capability must specify shaping, fallback selection,
bidi, clusters, line-break opportunities and matching prepared glyph output as
one versioned contract.

Version 1 preserves the existing server's binary64 measurement values and
operation order. It removes an old default CSS line-height mismatch by generating
CSS from those values. The profile does not automatically cover every Mash Web
Component, tree renderer or document editor. Adding one requires an explicit
measurement, interaction and lifecycle binding with conformance fixtures.

## Updating Mash and Reaver together

From the Mash checkout, build and validate the package:

```sh
pnpm goo:profile
pnpm check:goo-profile
node packages/goo-profile/scripts/build.mjs --check
```

Edit `packages/goo-profile/source/profile.json` for measurement changes.
Non-measurement decoration lives in `source/paint.css`. Font replacement must
update the pinned font files, exact metrics and licenses together. Generated
artifacts belong in `dist/`; never edit those outputs manually.

From the Reaver checkout, import the built bundle explicitly. These examples
assume sibling `mash` and `reaver` directories:

```sh
python3 extras/mounts/goo/scripts/sync-mash-profile.py --mash-root ../mash
python3 extras/mounts/goo/scripts/sync-mash-profile.py --check --mash-root ../mash
```

The import verifies the complete asset inventory and revision before replacing
Reaver's vendored bundle. It generates native Foil profile and font constants
from that bundle. Review and commit the vendored assets and generated constants
with the integration change; Reaver must not depend on a developer's adjacent
Mash checkout at runtime.

A standalone Reaver checkout verifies its committed inputs without Mash or a
network connection:

```sh
python3 extras/mounts/goo/scripts/sync-mash-profile.py --check
```

The profile package's tests check deterministic builds, independently
reproducible revisions, schema rejection, corrupt fonts and glyph-metric
agreement with the actual font tables. Reaver's verification checks the vendored
artifact set and the constants generated from it. A browser conformance check
must also compare actual native SSR geometry against prepared dimensions using
the matched CSS and loaded fonts.

## Extending the profile

Keep Goo's semantic language and planner authoritative. Add a new primitive by
specifying its intrinsic measurement and platform realization, then verify that
the server-prepared dimensions match the painted result. Add another painter by
consuming the existing prepared boundary first. A new painter must not need its
own copy of the semantic adjacency table or a browser measurement round trip.

The profile version identifies the contract shape and capability; its content
revision identifies the complete fonts, metrics, CSS and schema artifact set.
Carry that revision with prepared results so a host can reject a mismatched
realization instead of silently painting with unrelated assets.
