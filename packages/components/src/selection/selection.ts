/** A renderer-owned selection projected into a shared logical group. */
export interface SelectionRecord<Kind extends string = string, Data = unknown> {
  id: string;
  kind: Kind;
  data: Data;
}

export interface SelectionChange<RecordType extends SelectionRecord = SelectionRecord> {
  group: string;
  revision: number;
  previous: readonly RecordType[];
  current: readonly RecordType[];
  selections: readonly RecordType[];
}

export interface SelectionSubscription {
  destroy(): void;
}

/**
 * Stores text, block, table, canvas, or application selections by logical group.
 *
 * Adapters own platform observation. Consumers receive one normalized channel,
 * which keeps contextual widgets independent of a particular editor engine.
 */
export class SelectionManager<RecordType extends SelectionRecord = SelectionRecord> {
  readonly #groups = new Map<string, readonly RecordType[]>();
  readonly #listeners = new Set<(change: SelectionChange<RecordType>) => void>();
  #revision = 0;

  get revision(): number {
    return this.#revision;
  }

  get selections(): readonly RecordType[] {
    return [...this.#groups.values()].flat();
  }

  get groups(): readonly string[] {
    return [...this.#groups.keys()];
  }

  inGroup(group: string): readonly RecordType[] {
    return this.#groups.get(group) ?? [];
  }

  find<Kind extends string>(kind: Kind): (RecordType & SelectionRecord<Kind>) | undefined {
    return this.selections.find((selection) => selection.kind === kind) as
      (RecordType & SelectionRecord<Kind>) | undefined;
  }

  filter<Kind extends string>(kind: Kind): (RecordType & SelectionRecord<Kind>)[] {
    return this.selections.filter((selection) => selection.kind === kind) as (
      RecordType | SelectionRecord<Kind>
    )[] as (RecordType & SelectionRecord<Kind>)[];
  }

  setGroup(group: string, selections: readonly RecordType[]): void {
    if (!group.trim()) throw new Error("Selection groups require a non-empty name.");
    const previous = this.inGroup(group);
    const current = [...selections];
    if (
      previous.length === current.length &&
      previous.every((selection, index) => selection === current[index])
    ) {
      return;
    }
    if (current.length === 0) this.#groups.delete(group);
    else this.#groups.set(group, current);
    this.#revision += 1;
    this.#notify({
      group,
      revision: this.#revision,
      previous,
      current,
      selections: this.selections,
    });
  }

  clear(group?: string): void {
    if (group !== undefined) {
      if (!this.#groups.has(group)) return;
      this.setGroup(group, []);
      return;
    }
    for (const key of this.#groups.keys()) this.setGroup(key, []);
  }

  subscribe(
    listener: (change: SelectionChange<RecordType>) => void,
    emitInitial = false,
  ): SelectionSubscription {
    this.#listeners.add(listener);
    if (emitInitial) {
      listener({
        group: "",
        revision: this.#revision,
        previous: [],
        current: [],
        selections: this.selections,
      });
    }
    return {
      destroy: () => {
        this.#listeners.delete(listener);
      },
    };
  }

  #notify(change: SelectionChange<RecordType>): void {
    for (const listener of this.#listeners) listener(change);
  }
}

export interface DOMTextSelectionData {
  range: Range;
  text: string;
  collapsed: boolean;
  direction: "forward" | "backward" | "none";
  rect: DOMRectReadOnly;
  rects: readonly DOMRectReadOnly[];
}

export type DOMTextSelectionRecord = SelectionRecord<"text", DOMTextSelectionData>;

export interface DOMTextSelectionAdapterOptions {
  group?: string;
  id?: string;
  includeCollapsed?: boolean;
  retainWithin?: HTMLElement;
}

function nodeInside(surface: HTMLElement, node: Node | null): boolean {
  return node !== null && (node === surface || surface.contains(node));
}

function rangeInside(surface: HTMLElement, range: Range): boolean {
  return nodeInside(surface, range.startContainer) && nodeInside(surface, range.endContainer);
}

function copyRect(rect: DOMRect | DOMRectReadOnly): DOMRectReadOnly {
  return new DOMRectReadOnly(rect.x, rect.y, rect.width, rect.height);
}

function rangeRect(range: Range, rects: readonly DOMRectReadOnly[]): DOMRectReadOnly {
  const bounding = range.getBoundingClientRect();
  if (bounding.width > 0 || bounding.height > 0) return copyRect(bounding);
  return rects[0] ?? new DOMRectReadOnly();
}

function selectionDirection(selection: Selection, range: Range): DOMTextSelectionData["direction"] {
  if (selection.isCollapsed) return "none";
  const anchorAtStart =
    selection.anchorNode === range.startContainer && selection.anchorOffset === range.startOffset;
  const anchorAtEnd =
    selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
  if (anchorAtStart) return "forward";
  if (anchorAtEnd) return "backward";
  return "none";
}

/**
 * Bridges a native DOM Range into a SelectionManager without owning editing.
 *
 * The adapter snapshots a valid range before focus moves into a contextual
 * widget inside `retainWithin`, then restores or remeasures that range as the
 * widget executes commands. It never mutates the selected content itself.
 */
export class DOMTextSelectionAdapter<RecordType extends SelectionRecord = DOMTextSelectionRecord> {
  readonly manager: SelectionManager<RecordType>;
  readonly surface: HTMLElement;
  readonly group: string;
  readonly id: string;
  readonly includeCollapsed: boolean;
  readonly retainWithin: HTMLElement;

  #range: Range | null = null;
  #frame = 0;
  #destroyed = false;

  constructor(
    manager: SelectionManager<RecordType>,
    surface: HTMLElement,
    options: DOMTextSelectionAdapterOptions = {},
  ) {
    if (!surface.ownerDocument.defaultView) {
      throw new Error("A DOM text-selection surface must belong to a live document.");
    }
    this.manager = manager;
    this.surface = surface;
    this.group = options.group ?? "text";
    this.id = options.id ?? "dom-text";
    this.includeCollapsed = options.includeCollapsed ?? false;
    this.retainWithin = options.retainWithin ?? surface;

    surface.ownerDocument.addEventListener("selectionchange", this.#onSelectionChange);
    surface.addEventListener("input", this.#queueCapture);
    surface.addEventListener("keyup", this.#queueCapture);
    surface.addEventListener("pointerup", this.#queueCapture);
    this.retainWithin.addEventListener("pointerdown", this.#onRetainedPointerDown, true);
    surface.ownerDocument.addEventListener("scroll", this.#queueRetainedCapture, true);
    surface.ownerDocument.defaultView.addEventListener("resize", this.#queueRetainedCapture);
    this.capture();
  }

  get range(): Range | null {
    return this.#range?.cloneRange() ?? null;
  }

  capture(retainStored = false): DOMTextSelectionRecord | null {
    if (this.#destroyed) return null;
    const selection = this.surface.ownerDocument.getSelection();
    let range: Range | null = null;
    let direction: DOMTextSelectionData["direction"] = "none";

    if (selection && selection.rangeCount > 0) {
      const candidate = selection.getRangeAt(0);
      if (rangeInside(this.surface, candidate) && (this.includeCollapsed || !candidate.collapsed)) {
        range = candidate.cloneRange();
        direction = selectionDirection(selection, candidate);
      }
    }

    if (!range && retainStored && this.#range && this.#activeInsideRetention()) {
      if (rangeInside(this.surface, this.#range)) range = this.#range.cloneRange();
    }

    if (!range) {
      this.#range = null;
      this.manager.setGroup(this.group, []);
      return null;
    }

    this.#range = range.cloneRange();
    const rects = [...range.getClientRects()]
      .filter((rect) => rect.width > 0 || rect.height > 0)
      .map(copyRect);
    const record: DOMTextSelectionRecord = {
      id: this.id,
      kind: "text",
      data: {
        range: range.cloneRange(),
        text: range.toString().replace(/\s+/g, " ").trim(),
        collapsed: range.collapsed,
        direction,
        rect: rangeRect(range, rects),
        rects,
      },
    };
    this.manager.setGroup(this.group, [record as unknown as RecordType]);
    return record;
  }

  setRange(range: Range, focus = false): void {
    if (!rangeInside(this.surface, range)) {
      throw new Error("The supplied range is outside this text-selection surface.");
    }
    this.#range = range.cloneRange();
    const selection = this.surface.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range.cloneRange());
    if (focus) this.surface.focus({ preventScroll: true });
    this.capture(true);
  }

  restore(focus = false): boolean {
    if (!this.#range || !rangeInside(this.surface, this.#range)) return false;
    this.setRange(this.#range, focus);
    return true;
  }

  /** Discards both the retained range and its projected selection record. */
  clear(): void {
    this.#range = null;
    const selection = this.surface.ownerDocument.getSelection();
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (rangeInside(this.surface, range)) selection.removeAllRanges();
    }
    this.manager.clear(this.group);
  }

  destroy(): void {
    if (this.#destroyed) return;
    const view = this.surface.ownerDocument.defaultView;
    this.surface.ownerDocument.removeEventListener("selectionchange", this.#onSelectionChange);
    this.surface.removeEventListener("input", this.#queueCapture);
    this.surface.removeEventListener("keyup", this.#queueCapture);
    this.surface.removeEventListener("pointerup", this.#queueCapture);
    this.retainWithin.removeEventListener("pointerdown", this.#onRetainedPointerDown, true);
    this.surface.ownerDocument.removeEventListener("scroll", this.#queueRetainedCapture, true);
    view?.removeEventListener("resize", this.#queueRetainedCapture);
    if (this.#frame) view?.cancelAnimationFrame(this.#frame);
    this.clear();
    this.#destroyed = true;
  }

  #activeInsideRetention(): boolean {
    const active = this.surface.ownerDocument.activeElement;
    return active instanceof Element && this.retainWithin.contains(active);
  }

  #onSelectionChange = (): void => {
    this.#queue(true);
  };

  #queueCapture = (): void => {
    this.#queue(false);
  };

  #queueRetainedCapture = (): void => {
    this.#queue(true);
  };

  #onRetainedPointerDown = (event: PointerEvent): void => {
    const target = event.composedPath()[0];
    if (target instanceof Node && !nodeInside(this.surface, target)) this.capture(false);
  };

  #queue(retainStored: boolean): void {
    const view = this.surface.ownerDocument.defaultView;
    if (!view || this.#destroyed) return;
    if (this.#frame) view.cancelAnimationFrame(this.#frame);
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = 0;
      this.capture(retainStored);
    });
  }
}

export { selectCollection } from "./collection.js";
export type { CollectionSelection, CollectionSelectionAction } from "./collection.js";
