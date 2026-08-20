# Base UI parity

Mash uses Base UI as a behaviour and accessibility reference, not as a React
runtime dependency. Every port has one renderer-neutral semantic-node contract
and can have multiple visual catalogues.

The current upstream reference is commit `446df6e` (2026-08-19), following the
Base UI 1.7.0 release. That reference is intentionally pinned: a Mash
conformance claim must name the Base UI anatomy and behaviour snapshot it was
checked against.

## The contract

Each Mash primitive owns only:

- semantic HTML, keyboard behaviour, focus behaviour, ARIA, and form rules;
- reflected public state and bubbling composed events;
- semantic node anatomy and topology, realized on the Web through slots and
  stable CSS parts.

It does not own product colours, spacing, type, elevation, or motion. Structural
CSS required for behaviour remains part of the headless Web implementation;
visual policy belongs to a separately imported catalogue. The initial Mash
catalogue is `@mash/ui/catalogue/mash.css` and activates under
`[data-mash-catalogue="mash"]`.

Shrine patterns follow the exact same split. Import
`@mash/shrine/catalogue/mash.css` alongside the UI recipe when using
`sh-*`/`shrine-*` components. Their definition modules forward nested card,
badge, and button parts; a catalogue therefore styles the complete composed
surface without placing visual declarations back inside the component.

```html
<main data-mash-catalogue="mash">
  <ui-toggle pressed>Bold</ui-toggle>
  <ui-checkbox name="updates">Release notes</ui-checkbox>
  <ui-switch name="notifications" checked>Notifications</ui-switch>
</main>
```

The same contract is the source for React, GPUI, Swift, or other platform
renderers. Semantic nodes carry stable identity, role, and parent topology.
Attributes, slots, parts, states, and events are Web bindings to those nodes;
another renderer replaces those bindings while preserving inputs, authored
content, realized anatomy, reflected state, outputs, and relationships. See
[`mash-contract.md`](mash-contract.md) for the versioned schema and address rules.

## Translating Base UI into Mash

Base UI is a compound React API. Mash does not reproduce that API one custom
element per React part. It translates each public part into a portable semantic
node, then gives each renderer its own bindings to that node.

- Semantic parts such as Trigger, Value, Popup, Backdrop, Viewport, Arrow,
  Status, Empty, Item, and Indicator remain addressable Mash nodes.
- React/DOM mechanics such as Portal and Positioner map to portable overlay
  layer, anchor, placement, and viewport nodes. A Web renderer may realize a
  portal; GPUI or Swift may realize the same node through a native scene layer.
- React-only hooks, stores, render callbacks, and provider plumbing are
  implementation facilities, not new Mash component meaning.
- A Mash Web binding can be an authored slot, a realized CSS part, a reflected
  attribute/state, or an event. Those bindings point to the same node; they are
  not parallel sources of truth.

This is the practical equivalent of Base UI's direct access to each DOM node,
without making DOM topology the cross-platform contract.

## Conformance levels

A family is only called Base UI-conformant after all four levels pass:

1. **Family** — the interaction has a published Mash root and portable state,
   value, and event ownership.
2. **Anatomy** — every relevant Base UI part has been mapped to an addressed
   Mash node, including optional and empty-state anatomy.
3. **Behaviour** — keyboard, focus, ARIA, form, controlled-state, and dismissal
   fixtures pass for the Web renderer.
4. **Catalogue** — every realized semantic node is deliberately styled or
   deliberately left unconstrained by the active catalogue recipe.

Having a family root is Level 1 coverage. It is not, by itself, parity.

## Current coverage

Mash publishes a root for every stable family in that Base UI snapshot. Definition and
registration modules remain separately tree-shakeable. Anatomy and behaviour
coverage are still uneven, so the table below is a family inventory rather than
a blanket parity claim.

| Base UI family                                                | Mash contract                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Accordion                                                     | `ui-accordion`, `ui-accordion-item` with single/multiple policy and disclosure events  |
| Alert Dialog, Dialog, Drawer                                  | `ui-alert-dialog`, `ui-dialog`, `ui-drawer` on the shared modal focus engine           |
| Autocomplete, Combobox, Select                                | `ui-autocomplete`, `ui-combobox`, `ui-select`, `ui-option` with form/listbox contracts |
| Avatar, Button, Input, Progress, Separator                    | Existing Mash primitives                                                               |
| Checkbox, Checkbox Group, Radio, Switch, Toggle, Toggle Group | Form-aware independent and grouped selection contracts                                 |
| Collapsible, Tabs                                             | Explicit trigger/content and tab/panel slot anatomy                                    |
| Context Menu, Menu, Menubar, Navigation Menu                  | `ui-menu-item` command contract plus composite navigation semantics                    |
| Field, Fieldset, Form, Number Field, OTP Field, Meter         | Native label, validity, form, numeric, passcode, and measurement semantics             |
| Popover, Preview Card, Tooltip                                | Shared non-modal overlay mechanics with the appropriate focus policy                   |
| Scroll Area, Slider, Toolbar                                  | Native viewport, range, and composite-control interaction contracts                    |
| Toast                                                         | Individual live-region announcement with cancellable lifecycle state                   |

The first audited selection-family slice now exposes the complete portable
anatomy described below. The next large audits are the shared floating-surface
families, menus, toast, toolbar, and the custom scroll area. A mapped anatomy
still is not a blanket parity claim: every family must pass the upstream
keyboard, focus, controlled-state, and dismissal fixture matrix before it is
marked conformant.

### Selection-family map

The first compound pass maps the shared Select/Combobox/Autocomplete anatomy as
follows. “Renderer binding” means the Base UI part is real on the Web but is not
made into portable component meaning.

| Base UI snapshot part                  | Mash semantic node / realization                            | State             |
| -------------------------------------- | ----------------------------------------------------------- | ----------------- |
| Root                                   | `root`                                                      | mapped            |
| Label                                  | `label` attribute + `label` slot/part                       | mapped            |
| Input / Trigger                        | `control` / `trigger`                                       | mapped            |
| InputGroup                             | `input-group` node with role `group`                        | mapped            |
| Value / Icon / Clear                   | same-named slot/part nodes                                  | mapped            |
| Backdrop / Positioner / Popup / Arrow  | `backdrop`, `positioner`, `popup`, `arrow:pointer`          | mapped            |
| Portal                                 | Web overlay-layer binding; not a portable Mash content node | renderer binding  |
| List                                   | `listbox` node with `listbox` and `list` Web part aliases   | mapped            |
| Status / Empty                         | live `status` node + authored `empty` slot/part             | mapped            |
| Item / ItemText / ItemIndicator        | `ui-option` control, label/text aliases, indicator slot     | mapped            |
| Select ScrollUpArrow / ScrollDownArrow | logical `scroll-start` / `scroll-end` action nodes          | mapped            |
| Group / GroupLabel                     | `ui-option-group` root, label, and children nodes           | mapped            |
| Separator                              | shared `ui-separator` authored inside the list              | mapped            |
| Combobox Chips / Chip / ChipRemove     | `chips` collection + `ui-chip` label/remove anatomy         | mapped            |
| Combobox Row                           | `ui-option-row` + grid/gridcell semantics                   | mapped and tested |
| Combobox Collection                    | renderer data-to-authored-child adapter; renders no node    | renderer binding  |
| multiple / readOnly                    | reflected state, array values, repeated form entries        | mapped and tested |
| typeahead / active item                | roving focus or active descendant, per control kind         | mapped and tested |
| grid navigation                        | row/column movement with logical RTL horizontal direction   | mapped and tested |

`Collection` is deliberately not a custom element: in Base UI it is a render
function with no HTML realization, so React, Web Components, GPUI, and Swift
may each source data differently while emitting the same authored option/group/
row nodes. The family remains non-conformant until the broader Base UI
keyboard/focus matrix—including async collections, virtualization, controlled
reason details, and grid edge cases—is represented by shared fixtures.

### Shared overlay engine

`ui-dialog`, `ui-alert-dialog`, `ui-drawer`, `ui-popover`, `ui-menu`,
`ui-context-menu`, `ui-tooltip`, and `ui-preview-card` build on one internal
web interaction layer for trigger delegation, Escape, outside dismissal,
focus entry, modal focus containment, and focus return. Concrete elements own
their public event names and ARIA roles; the internal engine is deliberately
not exported as a product API.

The Mash catalogue supplies visual treatment through exposed parts. It does
not modify selection, form, overlay, or event meaning—so a React façade or
native renderer can implement the same contracts without carrying the web
recipe forward.

### Current conformance boundary

The JSON Schema validates manifest shape, and the generator checks shared-role
membership, unique addresses, and valid parent references. Browser tests provide
current evidence for the Web renderer's covered behaviour. Equivalent React,
GPUI, or Swift behaviour is currently reviewed manually; Mash does not yet run
one shared behaviour fixture suite against every renderer. Schema alignment
alone must not be reported as proof of identical focus, keyboard, accessibility,
or event behaviour.

### Input, tree, and toolbar boundaries

- `ui-input` is a native text-entry and form contract only. Use
  `ui-input-group` for prefix/control/suffix anatomy; its recipe owns the one
  outer inset so an affix cannot create duplicate input padding.
- `ui-tree-item` is a controlled record in a hierarchy. It requests expansion
  and selection through events; its parent persists reflected state. A recipe
  decides indentation, disclosure treatment, paths, file/folder glyphs, and
  selection colour.
- `ui-toolbar` owns Arrow-key focus behaviour, Home/End, RTL direction,
  native text-entry escape, and optional focus wrapping. Top/bottom/left/right
  docking belongs to layout CSS; `orientation` remains a keyboard-axis contract
  rather than a physical placement prop.

## Promotion rule

Add a new Mash primitive when an interaction contract recurs across products or
platform renderers. Keep domain records, workflow copy, analytics, and routing
in product wrappers. A catalogue may add a visual language; it may not alter the
component's meaning, topology, state, or event contract. Public
component-specific CSS custom properties are not a second contract channel:
visual parameterization belongs to shared tokens and catalogue recipes, while
component configuration belongs to semantic nodes and bindings.
