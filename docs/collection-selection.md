# Collection selection

`selectCollection` extends the existing `@mash/ui/selection` surface with stable-identity selection for lists, trees, and application collections. It is a pure transition function: the owner supplies the current values, range anchor, and visible enabled identities in display order. Focus, rendering, and data fetching remain with the owner.

```ts
import { selectCollection, SelectionManager } from "@mash/ui/selection";
import type { CollectionSelection } from "@mash/ui/selection";

let selection: CollectionSelection = { values: [], anchor: null };
const visible = ["notes", "draft", "review"];
selection = selectCollection(selection, visible, { type: "replace", value: "notes" });
selection = selectCollection(selection, visible, { type: "range", value: "review" });

const manager = new SelectionManager();
manager.setGroup(
  "documents",
  selection.values.map((id) => ({ id, kind: "item", data: null })),
);
```

Actions are `replace`, `toggle`, `range`, `all`, and `clear`. Ranges retain their anchor and can shrink when moving back. `range` accepts `additive: true`. Toggle and select-all retain hidden selections; replacement starts a new selection. Identities absent from the supplied order cannot be newly selected. If filtering removes the range anchor, the next range starts at its target. Remove deleted identities from owner state when removing records permanently.

## Trees

`ui-tree` retains its existing owner-controlled behavior by default (`selection-mode="request"`). Opt into `selection-mode="single"` or `"multiple"` for managed selection. Assign `selectedValues` to set it externally; listen for `ui-tree-selection-change` to receive `{ values, anchor, reason }` after user changes. Programmatic assignment is silent. Items need stable `value` identities.

Multiple selection separates focus from selection: arrows move focus, Space toggles, Shift extends a visible range, Command/Ctrl-click toggles, and Command/Ctrl+A selects visible enabled items. A folder disclosure expands without changing selection; Enter activates the folder. Expansion continues to use `ui-tree-toggle` and owner-assigned `expanded` state. The existing `ui-tree-select` request event remains available.

See **Tree → Multiple selection** and **Scroll area → Selection across a filtered list**. The latter composes an authored listbox with existing controls and uses the same public transition function. Both distinguish selected rows from keyboard focus, following the [ARIA tree selection guidance](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).
