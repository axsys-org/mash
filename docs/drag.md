# Drag behavior

Mash exposes drag movement in two layers:

- `@mash/ui/drag` is a side-effect-free TypeScript controller and geometry toolkit.
- `<ui-draggable>` is the optional declarative Web Component adapter.

Neither layer owns sorting, dropping, persistence, or application commands. Those behaviors consume
the reported position and remain free to decide what a movement means.

## Imperative controller

Importing the controller touches no registry, document, or window. Browser listeners are attached
only when a controller is constructed and are removed by `destroy()`.

```ts
import { createDraggable } from "@mash/ui/drag";

const controller = createDraggable(document.querySelector(".workspace-window"), {
  handle: document.querySelector(".workspace-window__titlebar"),
  containment: "viewport",
  snap: {
    gravity: 12,
    targets: [
      { kind: "grid", step: 8 },
      { kind: "line", axis: "x", value: 320, source: "left" },
    ],
  },
  autoScroll: true,
});

controller.destroy();
```

The safe default positioner writes `--ui-drag-x` and `--ui-drag-y`; it never replaces an authored
`transform`. A direct `translate` writer and a `left`/`top` writer are available as explicit opt-ins.
HTML and SVG targets are both accepted.

## Declarative adapter

```html
<ui-draggable containment="parent" snap-step="8" auto-scroll>
  <ui-toolbar slot="handle" label="Move inspector">Inspector</ui-toolbar>
  <ui-card title="Properties">...</ui-card>
</ui-draggable>
```

The `handle` slot is optional; without one, the full host starts pointer movement. Runtime states are
available as both reflected attributes and `:state()` names: `dragging`, `moving`, `snapped`, and
`auto-scrolling`.

## Controlled ownership

Add `controlled` when a workflow, route, document model, or application state owns the committed
position. The controller will calculate and emit candidate positions without writing them. The owner
feeds accepted values back through `x` and `y`.

```js
draggable.addEventListener("ui-drag-move", (event) => {
  draggable.x = event.detail.position.x;
  draggable.y = event.detail.position.y;
});
```

Both `ui-drag-start` and `ui-drag` are cancelable. `ui-drag-move-start`, `ui-drag-move`, and
`ui-drag-end` report committed movement.

## Snap targets

The typed target union covers the behaviors provided by PlainDraggable without accepting ambiguous
object shapes:

- `grid` — independent X/Y steps and an optional origin
- `point` — one point matched to a corner or center of the moving rectangle
- `line` — one X or Y line matched to an explicit source edge or center
- `rect` — edges and centers of a supplied rectangle
- `element` — edges and centers measured from a live element

Each target can override the shared attraction gravity.

## PlainDraggable relationship

The behavior and test matrix were informed by
[PlainDraggable](https://github.com/anseki/plain-draggable), which is MIT licensed. Mash does not
ship PlainDraggable as a dependency: its published ESM performs document work at import time,
installs global interaction state, and mutates transforms and body styles. The Mash implementation
uses modern Pointer Events, pointer capture, owner-document coordinates, typed snap variants, local
lifecycle ownership, CSS state handles, and preserved ES-module output.
