# Mash component contract

Mash separates what a component **means** from how one renderer exposes it. A title, scroll
viewport, confirmation action, or open state is a semantic node. An HTML slot, CSS part, reflected
state, attribute, or DOM event is a Web binding to that node—not the node itself.

This distinction lets another renderer preserve the same anatomy and behaviour without copying DOM
syntax. GPUI might realize a `title` node as a child view and Swift might realize it as a view-builder
argument; neither needs to invent an HTML slot.

## Where the contract lives

Every package's `custom-elements.json` contains two Mash extensions:

- root `mash` metadata identifies the schema and semantic role registry;
- each custom-element declaration's `mash` property contains that component's node graph and Web
  bindings.

The current schema is
`https://mash.axsys.dev/schema/component-contract-1.0.0.json`, checked into this repository as
[`docs/schema/component-contract-1.0.0.schema.json`](schema/component-contract-1.0.0.schema.json).
The embedded `version` is `1.0.0`.

The Custom Elements Manifest remains the authoritative description of the published Web API. The
Mash extension supplies the portable semantics that CEM does not express by itself.

## Semantic nodes

A semantic node has:

- `id`: a stable component-local identifier;
- `address`: its globally addressable `mash://<component>/node/<id>` identity;
- `role`: shared meaning such as `title`, `content`, `viewport`, `confirm`, or `open`;
- `family`: the role's broader taxonomy, such as `content`, `scroll`, `action`, or `state`;
- `ownership`: whether the node is `authored`, `controlled`, `reported`, or only `realized`
  by the renderer;
- `parent`, when present: the address of its semantic parent;
- `bindings`: every renderer surface that realizes or communicates with that node.

Roles may repeat in one component. Triptych, for example, has separate sidebar, main, and inspector
`content` nodes. Stable IDs and parent addresses preserve that topology; a consumer must not collapse
nodes merely because their roles match.

Every component has exactly one parentless node. All other nodes point into that root, producing a
complete SurfaceTree even when the Web implementation does not need a wrapper element for the root.

One node can have several bindings. A title slot and title part are two views of the same title
node. A controlled open node can group its input attribute with its reflected state and change
event. A semantic node may also exist without a Web binding when the topology itself matters to
other renderers.

Ownership is derived from those bindings in v1: a slot makes a node `authored`; paired attribute
and state bindings make it `controlled`; a node with an event and neither of those ownership forms
is `reported`; otherwise the node is `realized`. It describes which side supplies the value, not
where a renderer stores it.

## Renderer bindings

The v1 manifest embeds Web bindings because it extends a Custom Elements Manifest. Each binding
contains:

- `address`: `mash://<component>/binding/<kind>/<name>`;
- `nodeAddress`: the semantic node it realizes;
- `renderer`: `web` in this schema version;
- `kind`: `attribute`, `slot`, `part`, `state`, or `event`;
- `name`: the renderer's public name; the anonymous slot uses an empty string;
- `role`, `family`, and `shared`: the resolved semantic classification;
- `mapping`: whether the role/node mapping followed the shared inference rules or required an
  explicit source annotation;
- `availability`: whether authored input is optional or required, or whether the renderer provides
  the surface;
- `direction`: how information crosses the component boundary;
- `value`: a structured, language-independent value schema;
- `default`: a typed attribute default, or an explicit statement that no value default exists;
- `fallback`: what an omitted authored slot uses—empty content, a literal, one authored binding, or
  an ordered chain of authored bindings.
- `reports`, on event bindings: payload paths and the semantic nodes whose values those fields
  report.

Directions have precise meanings:

| Direction     | Web binding  | Meaning                                                 |
| ------------- | ------------ | ------------------------------------------------------- |
| `input`       | attribute    | Configuration or controlled state enters the component. |
| `content`     | slot         | Authored child content enters a semantic node.          |
| `realization` | part         | A renderer exposes the realized anatomy to a catalogue. |
| `state`       | custom state | The renderer reflects current component state.          |
| `output`      | event        | Behaviour or a value change leaves the component.       |

Bindings use structured values instead of TypeScript strings. Primitive values name their kind,
including the platform-independent `form-data` payload marker; enums carry `choices`; arrays carry
`items`; nullable values carry their non-null `value`; records carry `fields`; events carry a typed
`detail`; and intentionally unresolved platform or source types use `reference`. Published shared
Mash types are expanded before export, so an adapter does not need to parse TypeScript to discover
an event payload or configuration axis.

Event reporting is inferred from the structured payload. When a top-level record field has the same
stable ID as a non-event semantic node, the event binding records a `reports` relation from that
field path to the node. Compound events can therefore report several controlled values without
collapsing the event or inventing renderer-specific callback names.

Ordinary mappings need no source annotation. A surface named `title` infers the shared `title` role
and node, the anonymous slot infers `content`, and event names normalize through the shared event
vocabulary. `@mashrole` is reserved for a real mismatch or for selecting one of several same-role
nodes. The generated `mapping` field makes that distinction reviewable instead of requiring a
consumer to inspect JSDoc.

Fallback resolution is equally deterministic. An explicit fallback wins; otherwise a slot uses a
same-node attribute with the same name, then a sole same-node attribute, then an anonymous slot on
the same node. Every applicable source is retained as an ordered chain rather than truncating the
runtime precedence at the first source. If none exists, omitted authored content is empty. Literal
fallbacks and exceptional cross-node chains are declared with `@mashfallback` because Custom
Elements Manifest does not serialize the children of an HTML `<slot>`.

The declaration repeats bindings in a flat `bindings` array for indexing and within each node for
local traversal. Addresses, rather than array positions, are identity.

## Headless definitions and visual catalogues

Component definitions own behaviour: native semantics, form participation, accessibility
relationships, keyboard and focus rules, reflected state, events, and only the structural CSS
required to make those mechanics work. They do not own a product's colour, typography, spacing,
elevation, or motion language.

Visual treatment lives in separately imported catalogue recipes. The Mash recipes target stable
parts, states, attributes, and shared DTCG semantic tokens. A different catalogue can map the same
semantic graph to another visual language, and a native renderer can map it to native drawing and
layout primitives. "Headless" therefore means visual policy is optional; it does not mean a Web
implementation must omit CSS needed for correct layout or interaction.

Each shipped catalogue has two synchronized artifacts:

- `catalogue/mash.css` is the Web realization;
- `catalogue/mash.json` accounts for every semantic node, marks whether it has a direct recipe or
  remains contract-only, marks its layout as constrained or unconstrained, indexes every
  realization rule by node address, and records the exact DTCG token IDs used by that node.
  Layout-bearing rules also carry normalized logical grouping, alignment, distribution, spacing,
  overflow, positioning, and dimension constraints.

`node scripts/build-catalogue-contract.mjs` generates the JSON from the Web recipe and
`check:mash` rejects stale output or a selector that targets an undocumented part. Native adapters
can therefore consume node-level token dependencies and layout constraints without inspecting a
browser stylesheet. The Web declarations remain alongside that portable description as one
renderer realization. Layout is attached directly to semantic nodes; Mash deliberately does not
publish generic Frame or Stack elements merely to carry it.

Every component contract is normalized into one rooted SurfaceTree. Authored slots are nodes in
that tree, and a conforming Web component exposes a documented part for each authored slot so a
catalogue can realize its layout without adding component-owned visual policy. Other renderers bind
the same node to their own child/content handle.

Public component-specific CSS custom properties are not part of the v1 contract. Renderer-private
variables such as `--_foo` may exist as implementation details. User-controlled axes belong in the
semantic graph and token system rather than in an undocumented per-element styling channel.
The contract check also rejects visual declarations such as color, border, padding, typography,
shadow, and motion inside component shadow CSS; only interaction-critical structural mechanics stay
with a definition.

## Semantic layout vocabulary

Layout recipes use logical rather than physical coordinates. `block`, `inline`, and `depth` survive
writing-direction changes and map cleanly onto Web layout, GPUI layout, Swift layout containers, and
other renderers. Grouping is expressed as `flow`, `grid`, `overlay`, `contents`, or `none`; flow and
grid groups may declare an axis and wrapping. Alignment and distribution use semantic values such as
`leading`, `center`, and `trailing`, never CSS-only `left` and `right`.

Each node may independently declare min, preferred, and max dimensions on both logical axes, plus
gap, four logical inset edges, overflow, and positioning. Fixed layout measures must reference DTCG
tokens. Intrinsic values such as `auto`, `max-content`, percentages, and viewport-relative values
remain portable recipe values because they describe a relationship rather than an authored length.

The token graph supplies semantic grouping gaps and reusable layout dimensions—including zero,
glyph, control, compact, panel, dialog, readable measure, content, record, and workspace measures.
The recipe determines whether one of those values acts as a minimum, preferred value, maximum, gap,
or inset for a particular semantic node.

## Versioning

The schema URL and embedded version identify the exact contract shape. Releases follow SemVer:

- a **major** version changes or removes existing fields, directions, value meanings, or address
  rules;
- a **minor** version adds backward-compatible roles, value forms, or optional fields;
- a **patch** version clarifies validation without changing the accepted contract.

Consumers should select a parser by the embedded schema URL, reject unsupported major versions,
and preserve unknown additive fields when forwarding a newer compatible contract. Component node
and binding addresses are public identities: renaming or repurposing one is a breaking component
contract change even when the JSON Schema version itself does not change.

## Conformance boundary

Today the JSON Schema validates serialized shape, while the manifest generator validates
shared-role membership, address uniqueness, and parent existence. Browser tests exercise the Web
implementation's covered behaviour. The catalogue renders the real packages and recipes, so it is
an evidence and review surface rather than a second implementation.

Cross-renderer behaviour conformance is still manual. A GPUI, React, or Swift adapter can consume
the node graph and preserve its roles, inputs, state, outputs, and topology, but the repository does
not yet run one renderer-neutral behaviour fixture suite against every adapter. Until that exists,
matching addresses and schema validation prove contract alignment—not identical focus, keyboard,
accessibility, or event behaviour on another platform.
