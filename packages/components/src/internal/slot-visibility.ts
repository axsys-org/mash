/** Hide an optional region when its slot has no meaningful authored content. */
export function hideEmptySlot(event: Event): void {
  const slot = event.currentTarget as HTMLSlotElement;
  const populated = slot
    .assignedNodes({ flatten: true })
    .some((node) => node.nodeType === Node.ELEMENT_NODE || Boolean(node.textContent?.trim()));
  if (slot.parentElement) slot.parentElement.hidden = !populated;
}
