# @mash/goo-profile

`mash-goo` version 1 is the first shared Goo renderer profile. It packages pinned
fonts, their exact ASCII advance tables, typography and primitive geometry for
server-side measurement, together with matching CSS for native server-rendered
Goo HTML. It has no Web Components or browser measurement dependency.

Goo retains semantic interpretation, adjacency, wrapping, row allocation and
layout planning. A renderer consumes Goo's resolved boxes, static text lines and
baselines. It must not reinterpret semantic roles to run a second layout
algorithm. Mash supplies the leaf measurements and browser realization; Reaver
retains accepted interaction state and action execution.

Editable inputs retain their initial value and allocated box. Their native
control owns text editing and painting; prepared output supplies no static lines
for a value that changes while the user types.

The first profile deliberately preserves the frozen Goo reference's numbers and
floating-point operation order. It is an ASCII capability, not a Unicode shaping
engine. It does not claim compatibility for Mash's independent `ui-*` controls or
for the tree components; those need separate bindings and conformance fixtures.

## Build and consume

```sh
pnpm --filter @mash/goo-profile build
pnpm --filter @mash/goo-profile test
```

The public exports are `profile.json`, `profile.css`, `profile.schema.json`,
`metrics.json`, `assets.json` and `fonts/*`. All generated files live together in
`dist/`. Deploy the CSS and flat font files in the same directory; the CSS uses
relative URLs and can itself be renamed. Font license notices must accompany the
font files. No network fonts or installed system fonts participate.

The CSS styles an embeddable `.goo-surface` and its `.goo-*` descendants. It does
not style the host page. Include it once before painting Goo content. The surface
supplies `--goo-text-scale` and `dir`; the server supplies concrete widths and
margins. Fonts must be available before inspecting browser dimensions or exposing
a completed view. A renderer unable to load a matching font should fail visibly,
rather than treat fallback font output as a valid prepared layout.

The browser stylesheet uses the existing Goo HTML classes and native elements:

| Kind           | Element                            | Realization                                        |
| -------------- | ---------------------------------- | -------------------------------------------------- |
| group          | `div.goo-group`                    | Server-prepared `.goo-row` children                |
| text           | `div.goo-text`                     | Role style and explicit `.goo-ascii-line` children |
| button         | `button.goo-button`                | Native activation; host binds Goo action intent    |
| input          | `input.goo-input`                  | Native editing; host owns encounter/draft policy   |
| code           | `pre.goo-code`                     | Explicit server-prepared lines                     |
| avatar / media | `div.goo-avatar` / `div.goo-media` | Image container or labelled primitive              |
| presence       | `div.goo-presence`                 | Fixed-size indicator                               |
| bar            | `div.goo-bar`                      | Host-provided progress semantics and fill          |

Names, labels, disabled states, values, input slots and action references belong
to semantic rendering and interaction binding. The stylesheet does not infer
those from the DOM or execute actions.

## Source of truth

`source/profile.json` is the authored measurement and binding contract.
`source/fonts/metrics.json` and the accompanying TTFs are frozen together.
`source/paint.css` contains non-measurement colours and decoration. The build
emits typography, padding and primitive heights from the measurement contract;
there is no separately authored copy of those numbers in CSS.

The build validates the published JSON Schema, verifies each TTF's SHA-256,
compares its units-per-em and all 95 ASCII glyph advances against its cmap/hmtx
font tables, then creates the matched artifacts. `node scripts/build.mjs --check`
verifies that the existing distribution exactly matches current source inputs.

### Measurement conventions

- Coordinates use CSS pixels and binary64 arithmetic.
- Select a kind-specific text style first, then a role style, then the default.
  Roles are the first slash-delimited part of the Goo slot. Width caps, floors
  and fixed slots match the complete slot, preserving current Goo semantics.
- A text style's `pixels` scales with text scale. Calculate line height as
  `(lineHeight * pixels) * textScale`, preserving that multiplication order.
  Tracking and both insets remain unscaled. Insets include both sides and any
  border. The CSS derives padding from the inset and `controlBorder`.
- A glyph advance is `(advance / unitsPerEm) * scaledPixels + tracking`.
  Preserve per-glyph accumulation order; do not replace it with a browser or
  platform text-width estimate. Kerning, ligatures, optical size and synthetic
  faces are disabled.
- Each face exposes positive `ascent` and `descent`, `lineGap` and `unitsPerEm`
  in `verticalMetrics`. These are verified against the pinned font's hhea
  table and explicitly applied through CSS font-metric overrides. All current
  line gaps are zero. A line's alphabetic baseline, relative to its top, is
  `leading / 2 + ((ascent - descent) / unitsPerEm) * scaledPixels / 2`.
  This lets canvas and SVG painters use the same prepared line positions
  without reconstructing CSS line boxes.
- Printable ASCII U+0020–U+007E, tab, LF and CR are supported. Goo normalizes CR
  and CRLF to LF and tabs to four spaces before measurement. The error prefix
  is `! `. A status marker contributes `markerPixels * scale + gap` to the
  first line; its gap is unscaled.
- Natural widths override text for input, avatar, presence, bar and media.
  Goo computes the preferred width as `ceil(min(cap, naturalWidth))`; fixed
  leaves have that minimum, while other leaves use `min(preferred, floor)`.
- Goo owns wrapping, including its fit tolerance, break opportunities and
  explicit line list. The browser preserves those lines. Media height is
  `max(minimum, width / aspectRatio)`; other non-text fixed heights are given
  directly. Text height is `insetY + lineCount * scaledLineHeight`.

The first profile corrects the old stylesheet's inherited default line height
from 1.5 to the server's existing 1.48. It also scopes resets to the Goo surface
and uses a logical status-marker margin for RTL. Neither correction changes
server measurements.

## Identity and integrity

The pair `(id, version)` identifies the contract shape and capability. `revision`
is an immutable content identity for one complete realization. A revision is
not a semantic-layout version and does not transfer planning authority to Mash.

`assets.json` has `formatVersion: 1`, profile `id`, `version`, `revision`, and a
sorted `files` array of `{path, sha256, bytes}` records. It lists every output
except itself. Verify these hashes before accepting an artifact set.

To independently reproduce the revision:

1. Read `profile.json` and remove its `revision` property.
2. Read the manifest's `files` and remove the `profile.json` record.
3. Canonically encode `{profile, files}` by sorting object keys recursively,
   preserving array order, and using compact JSON with no trailing newline.
   Numbers use ECMAScript JSON number serialization.
4. SHA-256 the UTF-8 bytes and prefix the hexadecimal digest with `sha256:`.

The hash covers fonts, metrics, licenses, generated CSS and the public schema as
well as profile data. Paths and byte counts are part of the digest. Reformatting
an emitted artifact changes its identity. The manifest is an integrity record,
not a signature; hosts must obtain it through their trusted dependency path.

Consumers should carry the revision alongside prepared output. A different
profile, text scale, content or layout constraint requires preparation under the
new context. Browser resizing must request a new Goo plan rather than reflow a
server line list locally.

## Font provenance

The font files are the existing Goo fixed-weight ASCII subsets of Inter and
Roboto Mono, copied byte-for-byte from Reaver's Goo subsystem. The original
sources were retrieved from Google Fonts on 2026-09-24. `metrics.json` records
both source-font and generated-font hashes. The source fonts were instantiated
with fonttools 4.66.0, with Inter optical size 14, layout features removed, and
only U+0020–U+007E retained. This package does not regenerate or download them.

Both font families are distributed under SIL Open Font License 1.1. The original
copyright notices and complete licenses are in `source/fonts/Inter-OFL.txt` and
`source/fonts/RobotoMono-OFL.txt` and are copied into the distribution.
