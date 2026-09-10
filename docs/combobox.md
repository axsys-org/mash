# Combobox

`ui-combobox` owns editing, selection, chips, keyboard navigation, and popup presence. It uses the same `ui-option`, `ui-chip`, anchored positioning, size context, and motion primitives as other Mash controls. No provider or additional dependency is needed.

```html
<div data-mash-catalogue="mash" data-mash-size="default">
  <ui-combobox
    id="framework"
    name="framework"
    label="Framework"
    placeholder="Select a framework…"
    clearable
  ></ui-combobox>
</div>
```

```ts
import "@mash/ui/combobox";
import "@mash/ui/catalogue/mash.css";

const combo = document.querySelector("ui-combobox")!;
combo.items = [
  { value: "next", label: "Next.js" },
  { value: "astro", label: "Astro" },
];
combo.addEventListener("ui-combobox-change", (event) => {
  // The detail contains value and values. Programmatic assignments emit no user event.
  console.log(event.detail);
});
```

## Data and authored rows

`items` accepts strings or objects with `value`, `label`, optional `disabled`, and application metadata. Assign a new array when the collection changes. `renderItem(item)` optionally returns a DOM node or string for a row; its enclosing public `ui-option` retains selection semantics and the accessible label. Construct user-provided content with `textContent`, not HTML interpolation.

Without `items`, author `ui-option`, `ui-option-group`, and `ui-option-row` children as before. For rich rows, set `aria-label` to the short selection label. Slotted labels, icons, indicators, empty/loading content, and footer actions remain application-owned. Do not put independent interactive controls inside an option; use the footer for those actions.

With `items`, `value` is the committed single selection and `query` is the search text. Typing emits `ui-combobox-input` with `{ value: query }` and does not alter the submitted selection. The field displays the selected **label**, while the form submits its **value**. Escape dismisses search and restores the selected label. The older authored-option mode retains editable/free-text value behavior for existing autocomplete consumers.

## Selection and filtering

| API                              | Behavior                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `multiple`, `values`             | Multiple selection uses a string array. Automatic removable chips appear unless the `chips` slot is authored.                                                                    |
| `filter`                         | `contains` (default), `starts-with`, `none`, or `(item, query) => boolean`. Custom filters receive original data records, or `{value, label}` for authored options.              |
| `onCreate(query)`                | Enables a final creation option for a nonempty query with no exact label match. Return an item to append and select it; return nothing to decline. This callback is synchronous. |
| `hide-selected` / `hideSelected` | In multiple mode, remove picked options from the suggestions. Removing a chip restores the row.                                                                                  |
| `clearable`                      | Adds a clear action with reserved space. Clears search and selections. The `clear` slot can replace it.                                                                          |
| `disabled`, `readonly`           | Disable interaction or retain a focusable, immutable selection. Disabled fieldsets also suppress form participation.                                                             |
| `error`                          | Visible error message plus accessible description and invalid state; `ui-field` context is also supported.                                                                       |
| `loading`, `loading-label`       | External pending state. The application owns fetching, cancellation, and retry.                                                                                                  |

Single selection submits one value; multiple selection submits repeated entries under `name`. Native form reset restores the values present when the element connected. The component never fetches, stores, or interprets application records.

## Sizes, parts, and interaction

`size="default"` pins 36px controls; `size="compact"` pins 28px. Omitted size follows `data-mash-size` through the CSS cascade. Field, chips, and option rows follow the same context. `variant="borderless"` removes the resting boundary while retaining hover, focus, and invalid feedback.

Customize `input-group`, `control`, `popup`, `viewport`, `highlight`, `error`, `trigger-control`, and `clear-control` through CSS parts. Use the `icon`, `trigger`, `clear`, `chips`, and `footer` slots to compose other controls. Popup positioning and enter/exit presence remain shared; highlight movement uses the existing reorder motion controller and respects reduced motion.

Typing highlights the first matching option. Arrow keys move through results; Enter commits; Home/End reach the ends of an open list; Escape and leaving the control dismiss it. Grid mode retains two-dimensional arrow navigation. An empty multiple field sends Left (Right in RTL) or Backspace to the last chip; Delete/Backspace then removes it. IME composition does not commit a selection. Scrolling an active row adjusts only the list viewport.
