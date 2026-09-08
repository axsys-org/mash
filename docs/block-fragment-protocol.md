# Block and Fragment Protocol

Mash blocks are versioned document records. Mash components are renderer
primitives. Durable fragments are authored HTML compositions of those
primitives. These are related layers, not synonyms.

Keeping the layers separate lets a paragraph, table, upload, or agent-produced
status group retain one stable record while Web, native, static HTML, and future
Foil renderers realize it differently.

## Record Envelope

`@mash/ui/block` exports the renderer-neutral contract:

```ts
interface BlockNode {
  id: string;
  type: string;
  version: number;
  props: Record<string, BlockValue>;
  children?: readonly BlockNode[];
}
```

- `id` is stable across rendering, selection, streaming, and persistence.
- `type` resolves through a `BlockCatalogue`; it is not a custom-element tag.
- `version` belongs to the block schema, not the application release.
- `props` are finite JSON values. DOM nodes, `File`, services, signals, and
  framework objects are rejected at the boundary.
- `children` are legal only when a definition declares the `container`
  capability.

Definitions add labels, search terms, placement, capabilities, and the component
tags used by a Web realization. They intentionally do not create DOM. Renderer
adapters own that projection. Document creation and every operation require the
catalogue, so schema validation cannot be accidentally bypassed.

## Stream Envelope

The protocol provides immutable `insert`, `update`, `replace`, `move`, and
`remove` operations. A `BlockStreamFrame` adds a document ID and monotonic
sequence number. Applying a frame rejects the wrong document, a stale or skipped
sequence, duplicate IDs, unknown block types, invalid props, and illegal child
topology before publishing the next revision.

This is the boundary for streamed agent output. Transport can be HTTP chunks,
newline-delimited JSON, a worker, or collaboration middleware; none of those
transports become a UI primitive.

## Component Integration Roles

Every shipped `ui-*` element is classified by `componentBlockIntegration`, and
every system-specific Shrine element is classified by
`shrineComponentBlockIntegration`. Manifest-backed tests fail when either
package adds a component without a role.

| Role         | Meaning in a block renderer                                                        |
| ------------ | ---------------------------------------------------------------------------------- |
| `content`    | Can be the primary visible realization of a document block.                        |
| `inline`     | Belongs inside prose or a larger authored fragment.                                |
| `container`  | Requires meaningful authored children or slots.                                    |
| `overlay`    | Must project through a trigger, anchor, dismissal, and layer policy.               |
| `structural` | Is valid only under an owning component, such as a table cell, tab, or menu item.  |
| `behavior`   | Binds host behavior or motion and is not independently insertable visible content. |

The role is not a permission to dump a bare custom element into a document.
Block definitions still provide the semantic record and a renderer adapter still
authors the required composition. For example, a table block uses one container
plus structural rows and cells; an overlay block will need an explicit anchored
fragment rather than arbitrary floating markup.

## File Boundary

`ui-file-upload` owns only local selection:

- one native picker and keyboard-accessible trigger;
- drag/drop state;
- native `accept` filtering plus byte and count limits;
- form participation and reset;
- one composed change event containing accepted files and typed rejections.

It does not upload, store, transform, or preview a file. The editing playground
creates temporary object URLs, realizes images through `ui-image`, uses native
audio/video playback, retains URLs for undo, and revokes them when the editor is
destroyed. A persistent host should exchange a `File` for an asset ID and put
only that serializable ID into block props.

## Current Web Adapter

The editing playground is the first broad Web adapter over this protocol. It
uses strict block descriptors for insertion and component dependency checks,
while its current document history remains an authored-HTML snapshot adapter.
That is deliberate progressive enhancement: the document is readable without
the controller, and command, selection, upload, and drag behavior upgrade it.

Moving persistence and history fully onto `BlockDocument` should happen with a
Foil/Markdown import-export adapter and migration policy. It should not make the
component package depend on one editor engine, collaboration runtime, or storage
service.
