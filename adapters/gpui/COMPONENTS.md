# Mash GPUI component contract

## Scope

- Surface: native Mash primitives for GPUI.
- Workflow: new shared primitive family.
- Primary packet: primitive boundary.
- Confidence: high.

The web Custom Elements Manifest is Mash's canonical component schema. This
crate implements that schema with native Rust builders; it does not attempt to
run Web Components or introduce a second visual token system.

## Initial native surface

| Web contract   | GPUI implementation | Native composition                                       |
| -------------- | ------------------- | -------------------------------------------------------- |
| `ui-button`    | `MashButton`        | label, semantic variant, size, disabled, click callback  |
| `ui-badge`     | `MashBadge`         | label, semantic tone, size                               |
| `ui-path`      | `MashPath`          | path, title, icon, size, current, selected               |
| `ui-avatar`    | `MashAvatar`        | fallback, optional source, size                          |
| `ui-tree`      | `MashTree`          | accessible label and `MashTreeItem` children             |
| `ui-tree-item` | `MashTreeItem`      | path/title label, child items, controlled state, actions |
| `sh-myth`      | `MashMyth`          | kind, title, path, `MashLimb` children                   |
| `sh-limb`      | `MashLimb`          | one `MashSlot` and one `MashPail`                        |
| `sh-slot`      | `MashSlot`          | field label                                              |
| `sh-pail`      | `MashPail`          | field value                                              |

## Component decisions

- **Shared versus local:** These types are Mash primitives, not a Shrine screen
  implementation. Product copy, routing, persistence, and loading belong in a
  caller-owned GPUI view.
- **Tokens:** Each primitive takes `MashTheme`; all visual values resolve from
  the generated Mash token table. No component stores a palette.
- **Slots:** DOM slots become explicit typed children. A native Myth uses
  `MashLimb::field("status", "active")`; a tree uses nested
  `MashTreeItem::child` calls.
- **State:** `current`, `selected`, and `expanded` remain values supplied by
  the parent. `MashTreeItem` callbacks announce select/toggle intent; they do
  not own application state.
- **Images:** `MashAvatar` delegates source failure to GPUI's image fallback,
  retaining the caller-provided initials or symbol.

## Verification

- `pnpm check:gpui` compiles every native component and the live foundations
  example against the GPUI revision pinned by `gpui-component`.
- The foundations example renders the complete initial family in both native
  and WebAssembly hosts.
- Web component browser tests and manifests remain the source-side contract
  verification. Native interaction-level tests are the next slice once the
  GPUI action model is exercised in a product view.

## Route-outs

- Token naming and new semantic roles remain design-system work in
  `packages/tokens` and Paper.
- Keyboard traversal, focus rings, and screen-reader behavior are platform
  accessibility work; GPUI must use its native action/focus facilities rather
  than inherit Web ARIA rules literally.
