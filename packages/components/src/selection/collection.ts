/** Stable item identities; order belongs to the owning list or tree. */
export interface CollectionSelection {
  values: readonly string[];
  anchor: string | null;
}

export type CollectionSelectionAction =
  | { type: "clear" }
  | { type: "all" }
  | { type: "replace"; value: string }
  | { type: "toggle"; value: string }
  | { type: "range"; value: string; additive?: boolean };

/**
 * Applies list selection without owning rendering, focus, or the item collection.
 * Supply visible, enabled identities in display order. Hidden selections survive
 * toggling and select-all; replacement intentionally starts a new selection.
 * Project the returned values into SelectionManager when sharing across surfaces.
 */
export function selectCollection(
  state: CollectionSelection,
  order: readonly string[],
  action: CollectionSelectionAction,
): CollectionSelection {
  const visible = [...new Set(order)];
  if (action.type === "clear") return { values: [], anchor: null };
  if (action.type === "all")
    return {
      values: [...new Set([...state.values, ...visible])],
      anchor: state.anchor ?? visible[0] ?? null,
    };
  if (!visible.includes(action.value)) return state;
  if (action.type === "replace") return { values: [action.value], anchor: action.value };
  if (action.type === "toggle") {
    const values = new Set(state.values);
    if (values.has(action.value)) values.delete(action.value);
    else values.add(action.value);
    return { values: [...values], anchor: action.value };
  }
  const anchor = state.anchor && visible.includes(state.anchor) ? state.anchor : action.value;
  const start = visible.indexOf(anchor),
    end = visible.indexOf(action.value);
  const range = visible.slice(Math.min(start, end), Math.max(start, end) + 1);
  return { values: [...new Set([...(action.additive ? state.values : []), ...range])], anchor };
}
