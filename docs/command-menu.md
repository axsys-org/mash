# Command menus

`ui-command` is the shared searchable list. Compose it with `ui-dialog`, `ui-gesture-binding`, `ui-tabs`, `ui-select`, and `ui-kbd`; no separate command-menu component family or runtime is required.

## Items and ownership

Author `ui-command-item` rows directly, or assign `items` with unique values:

```ts
import "@mash/ui/command-palette";

const menu = document.querySelector("ui-command")!;
menu.items = [
  {
    value: "new",
    label: "New document",
    description: "Blank page",
    group: "Actions",
    icon: "action.add",
    shortcut: "Primary+N",
    keywords: ["create", "file"],
  },
  { value: "notes", label: "Team notes", group: "Pages" },
];
menu.suggestions = ["notes"];
menu.addEventListener("ui-command-select", (event) => {
  // Route event.detail.value into the application's existing command owner.
});
```

Groups preserve first appearance. Suggested values appear once at the top while the query is empty, then return to their groups during search. Change `suggestionsLabel` to label recent actions. Assign a new array when the source data changes. Data row elements retain their identity by value. Omit `items` to return to authored rows; the adapter only removes its own collection.

Every query word matches the label, description, or keywords. Supply `filter(item, query)` for custom matching or externally filtered results. Data filters receive the original object; authored filters receive the row. `renderItem(item)` returns a Node or string for custom text, leaving the icon and shortcut accessories intact. Strings become text, never parsed HTML. Row content should describe the action; put independent interactive controls in the filters or footer slot.

Selection emits `{ value, item }` for data and `{ value, item: undefined }` for authored rows. An optional item `onSelect()` runs before this event. The application owns execution, async state, and dialog dismissal. An existing `CommandRegistry` can supply rows by mapping `id` to `value` and route selection back through `registry.execute`; the palette does not install another command registry.

## Search and keyboard

`query` is assignable. User typing and clearing emit `ui-command-query-change` with `{ query }`; programmatic assignments do not emit it. Up/Down wrap around available rows, Enter activates, and disabled rows remain visible but cannot run. IME confirmation does not activate an action. Pointer and keyboard use the same highlight. `highlight(value)` reveals a row within the list without scrolling the containing page. Set `searchable = false` for a focusable quick-action list with Home/End navigation.

Shortcut caps are display-only. Install bindings explicitly with `ui-gesture-binding`, sharing the command owner already used by other surfaces. `Primary+K` resolves to the platform modifier. Bind to a workspace for local shortcuts, or assign the document's root element to the binding's `target` for document-wide shortcuts. Remove/disable the binding with the surface lifecycle.

## Dialog composition

Place the command inside `ui-dialog` and its opener in `slot="trigger"`. The dialog handles focus containment, Escape, scroll locking, presence motion, and returning focus. Use `dialog.show()` and `dialog.dismiss()` for programmatic open and close. Set `menu.escapeClears = false` to let the first Escape dismiss even with a query; inline menus default to clearing the query. Dismiss on selection unless the workflow needs to remain open. This is application policy, not a second overlay implementation.

Give the dialog an accessible label. A command-style shell can visually hide its title through `::part(title)` (set `display: block` before applying visually hidden geometry; overlay lanes default to `display: contents`), remove padding from `::part(popup)`, and style the nested command root to remove its extra border. Keep the list constrained relative to the viewport, leaving search and footer visible.

## Composition and appearance

- `search-prefix` / `search-suffix`: icons, search context, or an Escape hint.
- `filters`: existing tabs, selects, or a compact filter row; these retain their own keyboard handling.
- `empty`: an explanation or an actionable recovery control.
- `footer`: a few keyboard hints or contextual actions.
- `size="default"` / `size="compact"`: per-instance override of inherited `data-mash-size` context, coordinating 36/28 px rows, search, icons, and type.
- CSS parts `root`, `search-row`, `search`, `filters`, `list`, `highlight`, `empty`, and `footer` expose the surface; row parts expose `icon`, `text`, `label`, `description`, and `shortcut`.

The row highlight uses the same motion controller as sorting and comboboxes, follows shared duration/easing tokens, and respects reduced motion. Filtering never starts a network request. The optional adapter materializes the provided collection; applications should cap or page large remote result sets, as demonstrated by the load/search/jump example.
