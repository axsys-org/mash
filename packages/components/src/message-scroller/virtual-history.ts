export interface MessageRecord {
  id: string;
  [field: string]: unknown;
}
export type MessageRenderer = (message: MessageRecord, index: number) => HTMLElement;

/** Measured, keyed history window. Only the visible range and overscan own DOM. */
export class VirtualHistory {
  #items: readonly MessageRecord[] = [];
  #offsets = [0];
  #heights = new Map<string, number>();
  #rows = new Map<string, { element: HTMLElement; record: MessageRecord }>();
  #before = document.createElement("div");
  #after = document.createElement("div");
  #renderer: MessageRenderer = (item) => {
    const element = document.createElement("div");
    element.textContent = String(item.text ?? item.id);
    return element;
  };
  #frame = 0;
  #following = true;
  #estimate = 80;
  #overscan = 3;
  #readingAnchor?: { id: string; offset: number };
  #position = 0;
  #resize = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset.messageId!;
      const height = Math.ceil(entry.target.getBoundingClientRect().height);
      if (height > 0 && this.#heights.get(id) !== height) {
        this.#heights.set(id, height);
      }
    }
    // A remounted row can finish at its cached height after briefly rendering
    // smaller. Restore positioning even when the final measurement is unchanged.
    if (entries.length && !this.#frame)
      this.#frame = requestAnimationFrame(() => {
        this.#frame = 0;
        this.#rebuild(this.#readingAnchor ?? this.#anchor());
      });
  });
  constructor(
    private viewport: HTMLElement,
    private container: HTMLElement,
  ) {
    this.#before.setAttribute("aria-hidden", "true");
    this.#after.setAttribute("aria-hidden", "true");
    container.append(this.#before, this.#after);
  }
  #index(offset: number): number {
    let low = 0,
      high = this.#items.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (this.#offsets[middle + 1]! <= offset) low = middle + 1;
      else high = middle;
    }
    return Math.min(low, Math.max(0, this.#items.length - 1));
  }
  #anchor(): { id: string; offset: number } | undefined {
    const top = this.viewport.getBoundingClientRect().top;
    const visible = [...this.container.children].find(
      (element) =>
        element instanceof HTMLElement &&
        element.dataset.messageId &&
        element.getBoundingClientRect().bottom > top,
    ) as HTMLElement | undefined;
    if (visible)
      return { id: visible.dataset.messageId!, offset: top - visible.getBoundingClientRect().top };
    const index = this.#index(this.viewport.scrollTop);
    const item = this.#items[index];
    return item
      ? { id: item.id, offset: this.viewport.scrollTop - this.#offsets[index]! }
      : undefined;
  }
  update(
    items: readonly MessageRecord[],
    renderer: MessageRenderer | undefined,
    follow: boolean,
    estimate: number,
    overscan: number,
  ): void {
    const anchor = this.#readingAnchor ?? this.#anchor();
    const ids = new Set(items.map((item) => item.id));
    if (ids.size !== items.length) throw new Error("Message history requires unique stable IDs.");
    if (renderer && renderer !== this.#renderer) {
      this.#renderer = renderer;
      this.#rows.forEach((row) => row.element.remove());
      this.#rows.clear();
      this.#resize.disconnect();
    }
    this.#items = items;
    this.#following = follow;
    this.#estimate = Math.max(1, estimate || 80);
    this.#overscan = Math.max(0, Math.trunc(overscan || 0));
    for (const id of this.#heights.keys()) if (!ids.has(id)) this.#heights.delete(id);
    this.#rebuild(anchor);
  }
  #rebuild(anchor?: { id: string; offset: number }): void {
    this.#offsets = [0];
    for (const item of this.#items)
      this.#offsets.push(this.#offsets.at(-1)! + (this.#heights.get(item.id) ?? this.#estimate));
    const index = anchor ? this.#items.findIndex((item) => item.id === anchor.id) : -1;
    const top = this.#following
      ? Math.max(0, this.#offsets.at(-1)! - this.viewport.clientHeight)
      : index >= 0
        ? this.#offsets[index]! + anchor!.offset
        : this.viewport.scrollTop;
    this.#render(top);
    this.viewport.scrollTop = this.#following ? this.viewport.scrollHeight : top;
    if (!this.#following && anchor) {
      const row = this.#rows.get(anchor.id)?.element;
      if (row)
        this.viewport.scrollTop +=
          row.getBoundingClientRect().top -
          this.viewport.getBoundingClientRect().top +
          anchor.offset;
    }
    this.#position = this.viewport.scrollTop;
    this.#readingAnchor = this.#following ? undefined : anchor;
  }
  #render(top = this.viewport.scrollTop): void {
    const start = Math.max(0, this.#index(top) - this.#overscan);
    const end = Math.min(
      this.#items.length,
      this.#index(top + this.viewport.clientHeight) + this.#overscan + 1,
    );
    const active = new Set(this.#items.slice(start, end).map((item) => item.id));
    for (const [id, row] of this.#rows)
      if (!active.has(id)) {
        this.#resize.unobserve(row.element);
        row.element.remove();
        this.#rows.delete(id);
      }
    this.#before.style.height = `${this.#offsets[start] ?? 0}px`;
    this.#after.style.height = `${this.#offsets.at(-1)! - (this.#offsets[end] ?? 0)}px`;
    let previous: Element = this.#before;
    for (let index = start; index < end; index++) {
      const item = this.#items[index]!;
      let row = this.#rows.get(item.id);
      if (!row) {
        const element = document.createElement("div");
        element.dataset.messageId = item.id;
        element.setAttribute("part", "row");
        element.append(this.#renderer(item, index));
        row = { element, record: item };
        this.#rows.set(item.id, row);
        this.#resize.observe(element);
      } else if (row.record !== item) {
        row.element.replaceChildren(this.#renderer(item, index));
        row.record = item;
      }
      if (previous.nextElementSibling !== row.element) previous.after(row.element);
      previous = row.element;
    }
  }
  scroll(follow: boolean): void {
    // Our own positioning already rendered the requested window. Rendering it
    // again against estimates before custom rows finish layout loses that anchor.
    if (this.viewport.scrollTop === this.#position) return;
    this.#following = follow;
    this.#readingAnchor = this.#anchor();
    this.#render();
    this.#position = this.viewport.scrollTop;
  }
  latest(): void {
    this.#following = true;
    this.#rebuild();
  }
  reveal(id: string): boolean {
    const index = this.#items.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.#following = false;
    this.#rebuild({ id, offset: 0 });
    return true;
  }
  disconnect(): void {
    this.#resize.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#rows.clear();
    this.container.replaceChildren();
  }
}
