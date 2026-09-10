# Sidebar

`ui-sidebar` coordinates a desktop rail, temporary peek, and a mobile drawer. It composes Mash's scroll area, resize handle, gesture binding, and drawer. Navigation stays application-owned: slot a tree, links, menus, buttons, or your own content. No provider, component-family registration, or additional dependencies are required.

```ts
import "@mash/ui/sidebar";
import "@mash/ui/catalogue/mash.css";
// Import registrations for the controls your authored navigation uses.
```

```html
<div data-mash-catalogue="mash" style="height:36rem">
  <ui-sidebar persist="false" data-mash-size="default">
    <strong slot="header">Workspace</strong>
    <nav slot="navigation" aria-label="Workspace">
      <a href="/home">Home</a>
      <a href="/inbox">Inbox</a>
    </nav>
    <span slot="footer">Your account</span>
    <strong slot="content-header">Home</strong>
    <main>Your application content</main>
  </ui-sidebar>
</div>
```

Give the layout a definite height. Header and footer remain fixed; navigation and application content scroll independently. `data-mash-size="compact"` coordinates authored controls through the existing size context. Add `mash-sidebar-nav` to tree-based navigation for the quiet row recipe.

## State and layout

| Attribute / property           | Default              | Behavior                                                                                                           |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `open`                         | `undefined`          | Optional controlled desktop state; use `open="false"` to pin it closed.                                            |
| `default-open` / `defaultOpen` | `true`               | Initial uncontrolled state, used if no preference is stored.                                                       |
| `side`                         | `left`               | Physical `left` or `right` edge, including resize and drawer direction.                                            |
| `variant`                      | `sidebar`            | `sidebar`, `floating` navigation card, or `inset` content card.                                                    |
| `collapsible`                  | `offcanvas`          | `none` keeps a static column without mobile conversion or a toggle.                                                |
| `peek`                         | `none`               | `hover` or `click` reveals collapsed navigation over the content.                                                  |
| `rail`, `bordered`             | `true`               | Set `"false"` to hide the resize handle or standard panel border.                                                  |
| `width`, `width-mobile`        | `16rem`, `18rem`     | Preferred desktop and mobile widths.                                                                               |
| `min-width`, `max-width`       | `160`, `360`         | Desktop resize limits in CSS pixels.                                                                               |
| `mobile-breakpoint`            | `768`                | **Available host width**, not window width; embedded workspaces adapt independently. `0` disables conversion.      |
| `shortcut`                     | `auto`               | Focus-scoped `[` on the left or `]` on the right. A custom key is accepted; `none` or a null property disables it. |
| `persist`                      | `true`               | Optional desktop cookie persistence; set `"false"` for ephemeral workspaces.                                       |
| `storage-key`                  | `mash-sidebar-state` | Use a distinct key for each independently persisted sidebar.                                                       |

Boolean options with a true default accept the literal `"false"`. Mobile and peek have independent temporary state and never overwrite the desktop preference. Cookies last seven days; storage restrictions do not prevent use. The component reads the cookie on connection. If server rendering, the application can instead read that preference and supply controlled state.

The `expanded`, `mobile`, `mobileOpen`, and `peeking` getters expose effective state. `show()`, `hide()`, and `toggle()` target the current desktop/mobile mode; `showPeek()` and `dismissPeek()` target the temporary desktop reveal.

```ts
sidebar.open = applicationState.navigationOpen;
sidebar.addEventListener("ui-sidebar-open-change", (event) => {
  const { open, mode } = event.detail;
  if (mode !== "desktop") return;
  applicationState.navigationOpen = open;
  sidebar.open = open;
});
```

`ui-sidebar-open-change` is a cancellable, bubbling, composed request with `{ open, mode, reason }`. Calling `preventDefault()` refuses it. With controlled desktop state, the application must update `open`; the component does not overwrite it. `ui-sidebar-resize` reports a committed `{ width }` in CSS pixels. The `width` property also follows live dragging.

## Composition and accessibility

The slots are `header`, `navigation`, `footer`, `trigger`, `content-header`, and the default application content. The default trigger is an accessible icon button. An authored `slot="trigger"` control receives `aria-expanded`; its click uses the same toggle binding.

The resize separator supports arrow keys, pointer drag, click to collapse, and dragging beyond the minimum to collapse. Bare-key toggling ignores editable fields and only affects the innermost focused sidebar. Peek does not move the content; Escape and outside presses dismiss it. Mobile uses the existing modal drawer, focus trapping, and focus return. Authored light-DOM elements retain their identities and values through layout changes.

Navigation behavior remains with its owner. For example, handle `ui-tree-toggle` by applying `event.detail.expanded` to the matching tree item, and handle `ui-tree-select` by updating application selection and content. Keep row action menus, counts, and alerts in their existing slots rather than inventing another navigation component hierarchy.

## Styling

The public `--mash-sidebar-width` and `--mash-sidebar-width-mobile` properties override preferred widths visually. Prefer the `width` property when the user should be able to resize afterward.

Use CSS parts for presentation: `root`, `rail-viewport`, `panel`, `header`, `navigation`, `viewport`, `scroll-content`, `scrollbar`, `scroll-track`, `scroll-thumb`, `footer`, `inset`, `toolbar`, `content-header`, `content`, `trigger`, `trigger-icon`, `trigger-glyph`, `trigger-source`, `rail`, `resize`, `resize-grip`, `edge`, `drawer`, `drawer-backdrop`, `drawer-positioner`, `drawer-popup`, `drawer-title`, `drawer-content`, and `close`. The manifest contains their descriptions. CSS states include `expanded`, `mobile`, `mobile-open`, `peeking`, and `resizing`.

Motion uses the shared enter/exit tiers and respects reduced motion. Touch navigation uses native scrolling. All visual rules remain in the Mash catalogue stylesheet; the component owns behavior and projection.
