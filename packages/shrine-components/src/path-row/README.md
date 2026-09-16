# Path row

`sh-path-row` is a real destination with an independent, optional preview. It is
not a tree item and owns no namespace reads, routing, cache, hierarchy or data.

```html
<sh-path-row href="/debug/app" label="app" previewable preview-label="Preview /app">
  <ui-icon slot="icon" name="object.folder" size="small" label=""></ui-icon>
  <span slot="meta">Applications.</span>
  <section slot="preview">Complete authored record content.</section>
</sh-path-row>
```

The native anchor uses `href`, `target` and `rel` unchanged. An absent relationship
for `_blank` defaults to `noopener noreferrer`. Native modifier-click, middle
click and keyboard link activation remain browser behavior. `label` falls back to
`href`; the noninteractive `label` and `meta` slots preserve authored markup and
text. Both wrap and have full-text tooltips; neither may contain another control.
The `icon` slot is decorative. Interactive content belongs in `preview`.

`previewable` defaults **false**. Opt in with the positive Boolean attribute or
property. `open` defaults false and reflects. Activating the separate Mash button
changes `open` and emits bubbling, composed `sh-path-row-toggle` with `{ open }`.
Programmatic property changes are silent. `previewLabel` / `preview-label` is a
complete accessible name; without it, the name is `Preview ${label || href}`.
The button forwards `aria-expanded` to its native control; the preview is a named
region. No invalid cross-shadow ID reference is manufactured. Preview content
stays mounted but natively hidden while closed. Closing returns focus only if it
was inside that preview; removing previewability returns owned focus to the link.

Stable styling parts are `root`, `row`, `link`, `icon`, `label`, `meta`, `toggle`,
`toggle-control`, `disclosure`, `disclosure-root`, `disclosure-glyph`,
`disclosure-source`, `preview`, and `guide`. `has-icon` and `has-meta` custom states
describe occupied lanes. The sibling controls never overlap. The Mash recipe
owns 28px desktop / 44px coarse minimum targets, 16px stock disclosure geometry,
12px path labels, 11px wrapping summaries, and a logical preview guide. Long prose
grows the row instead of disappearing. The component itself has only structural
box sizing and the native hidden rule; visual styling is opt-in through the Mash
catalogue.

## Design intent

For a person inspecting a namespace, path identity leads and authored meaning
stays adjacent. The visual vocabulary is paths, records, slots, lore and values;
graphite/chalk/nickel surfaces, quiet seams, a four-pixel rhythm and Mash type keep
navigation subordinate to the data. Inline preview is the distinctive action.
Cards, invented tree levels and a combined navigate/expand click target would
obscure that boundary. RTL, reduced motion and forced colors remain native/token
adaptations, not separate skins.
