# Size context

Import Mash's tokens and catalogue once. A normal HTML element owns the size context; CSS inheritance carries it through slotted content and shadow roots. No provider, component registration, observer, or rendering loop is needed for sizing.

```html
<section data-mash-catalogue="mash" data-mash-size="compact">
  <ui-toolbar label="Document actions">
    <ui-button>New document</ui-button>
    <ui-input label="Find documents" placeholder="Find documents…"></ui-input>
    <ui-button size="default">Publish</ui-button>
  </ui-toolbar>
  <ui-card size="default">
    <strong slot="title">Document details</strong>
    <ui-button slot="footer" size="compact">Close</ui-button>
  </ui-card>
</section>
```

The closest context wins. `size="default"` or `size="compact"` pins a Button, Input, Select, Combobox, Tabs, Accordion, Stepper, Badge, Card, or Switch, including that component's descendants. On other components or authored content, use `data-mash-size` directly. A supported per-instance `size` wins even when the same element also has a `data-mash-size` attribute.

| Role                            |        Default |        Compact |
| ------------------------------- | -------------: | -------------: |
| Bounded controls and menu rows  |           36px |           28px |
| Segmented tab item              |           28px |           24px |
| Segmented list padding per side |            4px |            2px |
| Control inline padding          |           12px |           10px |
| Menu item inline padding        |            8px |            6px |
| Related control and icon gap    |            8px |            4px |
| Standard control icon           |           16px |           14px |
| Display / title / subtitle      | 28 / 16 / 14px | 24 / 15 / 13px |
| Body / caption                  |      13 / 12px |      12 / 11px |

Values are authored in rem; this table assumes a 16px root. Existing extra-small/small/medium/large controls and unscoped catalogue geometry retain their existing heights. The named two-step ladder is opt-in. Explicit menu density and small/large icon choices remain independent axes; compact menus can still use their existing `density` override. Rich, multiline content can grow beyond a row's minimum height.

## Native state and composition

Set the initial attribute in HTML. To switch an uncontrolled region, update that same attribute. A controlled application simply writes its chosen state there; there is no hidden internal size state.

```ts
workspace.dataset.mashSize = "compact";
```

This preserves nodes, input values, focus, and component state. Changes take effect through the CSS cascade. Do not animate every descendant's dimensions: resizing should settle immediately and preserve readable text.

Custom compositions can consume the same resolved roles:

```css
.document-actions {
  display: flex;
  align-items: center;
  gap: var(--mash-size-gap);
  min-block-size: var(--mash-size-control);
  padding-inline: var(--mash-size-inline);
  font-size: var(--mash-size-body);
}
.document-title {
  font-size: var(--mash-size-display);
}
```

Available roles are `--mash-size-control`, `--mash-size-segment-item`, `--mash-size-segment-pad`, `--mash-size-inline`, `--mash-size-item-inline`, `--mash-size-gap`, `--mash-size-icon`, and the five type roles `display`, `title`, `subtitle`, `body`, `caption`. Their values reference the semantic `layout.size`, `space.size`, and `type.scale` token families. Supply fallbacks if authored content can also render outside a named size context. Component parts remain available for local visual composition.

Use default for ordinary forms and compact for dense toolbars or sidebars. A compact region need not force a detailed form to be compact: give its card a default size. The toolbar catalogue demonstrates nested boundaries, editable state, popup rows, and the type scale together.
