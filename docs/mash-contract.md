# Mash Semantic Contract

Mash uses the Custom Elements Manifest (CEM) for Web API metadata and a
versioned `declaration.mash` extension for renderer-neutral meaning. This file
defines version 1 of that extension. Its JSON shape is published in
[`mash-contract.schema.json`](mash-contract.schema.json).

## Why A Second Layer Exists

A slot, CSS part, attribute, state, and event can all expose different Web
bindings for the same meaningful thing. For example, a menu's popup can be a
semantic node, a CSS part in the Web renderer, and a native presentation layer
in another renderer. Treating the Web binding as the meaning would make DOM
topology the portable contract.

Mash therefore separates:

| Layer              | Owns                                                | Example                               |
| ------------------ | --------------------------------------------------- | ------------------------------------- |
| Semantic node      | Stable identity, role, and parent relationship      | `popup` inside `positioner`           |
| Renderer binding   | How one renderer exposes a node                     | `part="popup"`, `slot="label"`        |
| Public state/input | Caller configuration and observable component state | `open`, `disabled`, `value`           |
| Runtime channel    | Host context outside one element's anatomy          | command registry, selection adapter   |
| Visual policy      | Theme, size values, material, and motion            | semantic tokens and catalogue recipes |

## Source Grammar

Component class JSDoc is the source of truth:

```text
@mashnode <id> <role> [parent-id]
@mashrole <binding-kind> <web-name> <role> <node-id>
@mashaxis <node-id> <axis-kind>
```

`@mashnode` declares one addressed semantic node. The optional third token is
its parent. `@mashrole` attaches a Web binding to a node. `@mashaxis` states
which sizing vocabulary a size-bearing node consumes.

The manifest generator writes this shape on each custom-element declaration:

```json
{
  "mash": {
    "schemaVersion": 1,
    "nodes": [
      { "id": "root", "role": "toolbar" },
      { "id": "actions", "role": "actions", "parent": "root" }
    ],
    "bindings": [{ "kind": "slot", "name": "default", "role": "actions", "node": "actions" }],
    "axes": []
  }
}
```

## Addressing

Within a component, node IDs are unique and parents must resolve within the
same declaration. The portable address of a node is `<tag-name>#<node-id>`, for
example `ui-menu#popup`. Composed components can forward a child's realization
through slots or parts, but forwarding does not change the child's semantic
address or create a duplicate node.

Node roles describe meaning and are allowed to recur. IDs describe identity
within one component and must not recur. A `label` node and a `value` node may
both use a broad `content` role when that is the honest semantic relationship;
their addresses remain distinct.

## Binding Kinds

| Kind        | Meaning                                 | Ownership rule                           |
| ----------- | --------------------------------------- | ---------------------------------------- |
| `attribute` | Reflected public configuration or state | The element owns parsing and reflection  |
| `slot`      | Authored light-DOM projection           | The caller owns the projected content    |
| `part`      | Renderer-owned shadow anatomy           | Styling only; it cannot add behavior     |
| `state`     | `ElementInternals.states` exposure      | Derived component state, not app storage |
| `event`     | Composed output or request              | Typed detail defines the boundary        |

HTML slots are not event streams, reactive subjects, service registries, or
dependency-injection scopes. Mash uses those precise names for runtime
channels so authored markup and host infrastructure cannot be conflated.

## Sizing Axes

Version 1 recognizes `control-size`, `density`, `type-preset`,
`indicator-size`, `glyph-size`, `identity-size`, `scrollbar-size`, and
`layout-size`. Equal values
do not make two axes equivalent. A glyph can currently measure the same as a
compact control and still need independent optical tuning later.

New axes require a schema and generator update. Components must not publish a
free-form `size` meaning and leave consumers to infer its vocabulary.

## Runtime Contracts

Commands and selections are not element anatomy, so they do not belong in a
custom element's node tree:

- `CommandRegistry` stores renderer-neutral action descriptors, evaluates them
  against host context and scopes, and routes completed `mash-command` events.
- `SelectionManager` stores normalized selections in logical groups.
- `DOMTextSelectionAdapter` observes a native `Range` and projects it into the
  manager without mutating editor content.
- The editor host owns models, mutations, transactions, history, persistence,
  collaboration, permissions, and domain records.

A toolbar, menu, keyboard binding, command palette, and mobile action sheet can
render the same resolved command set. Those projections remain fragments or
contextual widgets until their own interaction state machine recurs.

## Validation And Coverage

`scripts/cem-plugins.mjs` captures the three JSDoc tags and fails generation
when:

- a custom element has no semantic-node topology;
- a node ID is duplicated;
- a parent or binding target is missing;
- a binding kind or sizing axis is unknown.

As of this contract's introduction, both component manifests cover all 100
published custom elements with 1,071 semantic nodes and 473 renderer bindings.
That is topology coverage, not proof of behavioral equivalence in another renderer.
Keyboard, focus, form, event, and lifecycle behavior still require shared
fixtures per renderer.

The generated `custom-elements.json` files are build artifacts. Edit class
JSDoc, then regenerate the manifest; never patch generated topology by hand.
