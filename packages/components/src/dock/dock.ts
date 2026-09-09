import { LitElement, html, css, type TemplateResult, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { baseStyles } from "../internal/base-styles.js";
import {
  groups,
  removePanel,
  replaceGroup,
  validLayout,
  type DockLayout,
  type DockNode,
  type DockTabs,
  type DockSplit,
  type DockPlacement,
} from "./layout.js";
import { DragController, type DragEventDetail } from "../drag/drag.js";
import { ReorderMotionController } from "../internal/reorder-motion.js";
import { dockEdgePlacement } from "./drag-target.js";
import type { UIDockPanel } from "../dock-panel/dock-panel.js";
export type { DockLayout, DockNode, DockTabs, DockSplit, DockPlacement } from "./layout.js";

/**
 * A workspace of stable panels, rearrangeable tabs, and nested resizable splits.
 * The application owns panel content and persistence. Layout snapshots contain
 * identities and geometry only. Restoring a layout never constructs application content.
 * @tag ui-dock
 * @summary Arranges authored panels into movable tab groups and resizable splits.
 * @slot - Named ui-dock-panel elements.
 * @csspart root - Workspace boundary.
 * @csspart split - Nested split layout.
 * @csspart separator - Keyboard and pointer resize handle.
 * @csspart group - A tab group.
 * @csspart header - Group toolbar.
 * @csspart tabs - Tab strip.
 * @csspart tab - Panel tab.
 * @csspart selected - Selected tab.
 * @csspart action - Close, maximize, or restore action.
 * @csspart body - Active panel projection.
 * @csspart drop-target - Compact docking intent hint shown only over another group or a body edge.
 * @csspart drag-preview - Tab-sized pointer-following drag surface.
 * @mashnode drag-preview preview root
 * @csspart empty - Empty workspace prompt.
 * @mashnode root workspace
 * @mashnode split split root
 * @mashnode separator separator split
 * @mashnode group group split
 * @mashnode header header group
 * @mashnode tabs tabs header
 * @mashnode tab tab tabs
 * @mashnode selected selected tab
 * @mashnode action action header
 * @mashnode body body group
 * @mashnode drop-target target group
 * @mashnode empty empty root
 * @fires {CustomEvent<DockLayout>} ui-dock-change - A user or public method changes the layout.
 * @example Workspace
 * <ui-dock><ui-dock-panel name="notes" label="Notes">Write here</ui-dock-panel><ui-dock-panel name="preview" label="Preview">Preview here</ui-dock-panel></ui-dock>
 */
export class UIDock extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
    layout: { attribute: false },
    _zoom: { state: true },
    _drop: { state: true },
  };
  /** Accessible workspace name. */
  declare label: string;
  /** Versioned layout. Use restoreLayout for untrusted serialized snapshots. */
  declare layout: DockLayout;
  protected _zoom: string | null = null;
  protected _drop: { id: string; placement: DockPlacement; top: number } | null = null;
  #controllers = new Map<HTMLButtonElement, DragController>();
  #motion = new ReorderMotionController(this);
  #drag: {
    name: string;
    group: string;
    source: HTMLButtonElement;
    ghost: HTMLElement;
    offset: { x: number; y: number };
    target: { id: string; placement: DockPlacement; before?: string } | null;
    rects: Map<HTMLElement, DOMRect>;
    scroll: Map<HTMLElement, number>;
  } | null = null;
  #suppressClick = false;
  #known = new Set<string>();
  #observer = new MutationObserver(() => this.#syncPanels());
  #resize?: { split: DockSplit; start: number; ratio: number; extent: number };
  constructor() {
    super();
    this.label = "Workspace";
    this.layout = { version: 1, root: null };
  }
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        block-size: 28rem;
        min-inline-size: 0;
      }
      [part="root"] {
        block-size: 100%;
        overflow: hidden;
      }
      [part="split"] {
        display: grid;
        block-size: 100%;
        min-block-size: 0;
        min-inline-size: 0;
      }
      [part="group"] {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        position: relative;
        min-inline-size: 0;
        min-block-size: 0;
        block-size: 100%;
        overflow: hidden;
      }
      [part="header"] {
        display: flex;
        min-inline-size: 0;
      }
      [part="tabs"] {
        display: flex;
        flex: 1;
        min-inline-size: 0;
        overflow: auto;
        scrollbar-width: thin;
      }
      [part~="tab"] {
        white-space: nowrap;
        flex: none;
        touch-action: none;
        user-select: none;
      }
      [part~="tab"][data-dragging] {
        visibility: hidden;
      }
      [part="drag-preview"] {
        position: fixed;
        margin: 0;
        inset: auto;
        pointer-events: none;
        display: flex;
        align-items: center;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        max-inline-size: 16rem;
      }
      [part="body"] {
        min-inline-size: 0;
        min-block-size: 0;
        overflow: auto;
      }
      [part="separator"] {
        touch-action: none;
      }
      [part="drop-target"] {
        position: absolute;
        pointer-events: none;
        z-index: 2;
      }
    `,
  ];
  get #panels(): UIDockPanel[] {
    return [...this.querySelectorAll<UIDockPanel>(":scope > ui-dock-panel")];
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["name", "label", "closable"],
    });
  }
  override disconnectedCallback(): void {
    this.#observer.disconnect();
    for (const controller of this.#controllers.values()) controller.destroy();
    this.#controllers.clear();
    this.#motion.destroy();
    super.disconnectedCallback();
  }
  #syncPanels = (): void => {
    const panels = this.#panels;
    const known = new Set(panels.map((panel) => panel.name).filter(Boolean));
    let root = structuredClone(this.layout.root);
    for (const name of this.#known) if (!known.has(name)) root = removePanel(root, name);
    for (const panel of panels) {
      if (!panel.name) continue;
      panel.slot = `panel:${panel.name}`;
      if (!this.#known.has(panel.name)) {
        const first = groups(root)[0];
        if (first) {
          if (!groups(root).some((group) => group.panels.includes(panel.name)))
            first.panels.push(panel.name);
        } else root = { type: "tabs", id: "main", panels: [panel.name], active: panel.name };
      }
    }
    this.#known = known;
    if (JSON.stringify(root) !== JSON.stringify(this.layout.root))
      this.layout = { version: 1, root };
    else this.requestUpdate();
  };
  protected override firstUpdated(): void {
    this.#syncPanels();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    if (
      changed.has("layout") &&
      this._zoom &&
      !groups(this.layout.root).some((group) => group.id === this._zoom)
    )
      this._zoom = null;
  }
  protected override updated(): void {
    const tabs = [...this.renderRoot.querySelectorAll<HTMLButtonElement>("[data-panel]")];
    for (const [tab, controller] of this.#controllers) {
      if (tabs.includes(tab)) continue;
      controller.destroy();
      this.#controllers.delete(tab);
    }
    for (const tab of tabs) {
      if (this.#controllers.has(tab)) continue;
      const controller = new DragController(tab, {
        controlled: true,
        containment: false,
        threshold: 6,
        autoScroll: { target: tab.parentElement!, sensitivity: 28, speed: 240, minY: 0, maxY: 0 },
      });
      this.#controllers.set(tab, controller);
    }
  }
  #commit(root: DockNode | null): void {
    this.layout = { version: 1, root };
    this.dispatchEvent(
      new CustomEvent("ui-dock-change", {
        bubbles: true,
        composed: true,
        detail: this.getLayout(),
      }),
    );
  }
  /** A detached JSON-serializable snapshot, containing no application content. */
  getLayout(): DockLayout {
    return structuredClone(this.layout);
  }
  /** Validate and restore a saved layout against currently authored panel identities. */
  restoreLayout(snapshot: unknown): boolean {
    if (!validLayout(snapshot, this.#known)) return false;
    this.#commit(structuredClone(snapshot.root));
    return true;
  }
  /** Close a panel without destroying its authored content. */
  closePanel(name: string): boolean {
    const panel = this.#panels.find((item) => item.name === name);
    if (!panel?.closable) return false;
    this.#commit(removePanel(structuredClone(this.layout.root), name));
    return true;
  }
  /** Reopen a panel in an existing group, or create the first group. */
  openPanel(name: string, groupId?: string): boolean {
    if (!this.#known.has(name)) return false;
    let root = structuredClone(this.layout.root);
    const existing = groups(root).find((group) => group.panels.includes(name));
    if (existing) existing.active = name;
    else {
      const group = groups(root).find((item) => item.id === groupId) ?? groups(root)[0];
      if (group) {
        group.panels.push(name);
        group.active = name;
      } else root = { type: "tabs", id: "main", panels: [name], active: name };
    }
    this.#commit(root);
    return true;
  }
  /** Move or reorder a panel; edge placements create nested splits. */
  movePanel(
    name: string,
    targetId: string,
    placement: DockPlacement = "center",
    before?: string,
  ): boolean {
    if (!this.#known.has(name) || !groups(this.layout.root).some((group) => group.id === targetId))
      return false;
    if (
      placement === "center" &&
      before === name &&
      groups(this.layout.root)
        .find((group) => group.id === targetId)
        ?.panels.includes(name)
    )
      return true;
    let root = structuredClone(this.layout.root)!;
    const previousTarget = groups(root).find((group) => group.id === targetId)!;
    if (
      previousTarget.panels.length === 1 &&
      previousTarget.panels[0] === name &&
      placement !== "center"
    )
      return false;
    root = removePanel(root, name)!;
    const target = groups(root).find((group) => group.id === targetId);
    if (!target) return this.openPanel(name);
    if (placement === "center") {
      const index = before ? target.panels.indexOf(before) : -1;
      target.panels.splice(index < 0 ? target.panels.length : index, 0, name);
      target.active = name;
    } else {
      const addition: DockTabs = {
        type: "tabs",
        id: crypto.randomUUID(),
        panels: [name],
        active: name,
      };
      const split: DockSplit = {
        type: "split",
        id: crypto.randomUUID(),
        orientation: placement === "left" || placement === "right" ? "horizontal" : "vertical",
        ratio: 0.5,
        children:
          placement === "left" || placement === "top" ? [addition, target] : [target, addition],
      };
      root = replaceGroup(root, targetId, split);
    }
    this._zoom = null;
    this.#commit(root);
    return true;
  }
  #select(group: DockTabs, name: string): void {
    const root = structuredClone(this.layout.root);
    const target = groups(root).find((item) => item.id === group.id)!;
    target.active = name;
    this.#commit(root);
  }
  #tabKey(event: KeyboardEvent, group: DockTabs, name: string): void {
    if (
      event.altKey &&
      event.shiftKey &&
      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
      const rtl = getComputedStyle(this).direction === "rtl";
      const index = group.panels.indexOf(name);
      const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
      const destination =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? group.panels.length - 1
            : Math.max(0, Math.min(group.panels.length - 1, index + (forward ? 1 : -1)));
      const order = group.panels.filter((panel) => panel !== name);
      this.movePanel(name, group.id, "center", order[destination]);
      void this.updateComplete.then(() =>
        this.renderRoot.querySelector<HTMLElement>(`[data-panel="${CSS.escape(name)}"]`)?.focus(),
      );
      return;
    }
    if (
      event.altKey &&
      event.ctrlKey &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      event.preventDefault();
      this.movePanel(
        name,
        group.id,
        ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "top", ArrowDown: "bottom" } as const)[
          event.key as "ArrowLeft"
        ],
      );
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      this.closePanel(name);
      return;
    }
    const index = group.panels.indexOf(name);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % group.panels.length
        : event.key === "ArrowLeft"
          ? (index + group.panels.length - 1) % group.panels.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? group.panels.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    this.#select(group, group.panels[next]!);
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector<HTMLElement>(`[data-panel="${CSS.escape(group.panels[next]!)}"]`)
        ?.focus(),
    );
  }
  #startDrag = (event: CustomEvent<DragEventDetail>): void => {
    const source = event.detail.controller.target as HTMLButtonElement;
    if (!this.#controllers.has(source)) return;
    const group = source.closest<HTMLElement>("[data-group]")!;
    const rect = source.getBoundingClientRect();
    const ghost = this.ownerDocument.createElement("div");
    ghost.setAttribute("part", "drag-preview");
    ghost.setAttribute("popover", "manual");
    ghost.setAttribute("aria-hidden", "true");
    ghost.textContent = source.textContent?.trim() ?? "";
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    this.renderRoot.appendChild(ghost);
    ghost.showPopover();
    const tabs = [...this.#controllers.keys()];
    this.#drag = {
      name: source.dataset.panel!,
      group: group.dataset.group!,
      source,
      ghost,
      offset: { x: event.detail.pointer.x - rect.left, y: event.detail.pointer.y - rect.top },
      target: null,
      rects: new Map(tabs.map((tab) => [tab, tab.getBoundingClientRect()])),
      scroll: new Map(tabs.map((tab) => [tab.parentElement!, tab.parentElement!.scrollLeft])),
    };
    source.dataset.dragging = "";
    this.#suppressClick = true;
    this.#moveDrag(event);
  };

  #moveDrag = (event: CustomEvent<DragEventDetail>): void => {
    const drag = this.#drag;
    if (!drag || event.detail.controller.target !== drag.source) return;
    const pointer = event.detail.pointer;
    drag.ghost.style.left = `${pointer.x - drag.offset.x}px`;
    drag.ghost.style.top = `${pointer.y - drag.offset.y}px`;
    const group = [...this.renderRoot.querySelectorAll<HTMLElement>("[data-group]")].find(
      (element) => {
        const rect = element.getBoundingClientRect();
        return (
          pointer.x >= rect.left &&
          pointer.x <= rect.right &&
          pointer.y >= rect.top &&
          pointer.y <= rect.bottom
        );
      },
    );
    drag.target = null;
    this._drop = null;
    for (const tab of this.#controllers.keys())
      if (tab !== drag.source && !group?.contains(tab)) this.#motion.move(tab, 0, 0);
    if (!group) return;
    const id = group.dataset.group!;
    const body = group.querySelector<HTMLElement>('[part="body"]')!;
    const header = group.querySelector<HTMLElement>('[part="header"]')!;
    const model = groups(this.layout.root).find((item) => item.id === id)!;
    const groupBounds = group.getBoundingClientRect();
    const headerBottom = header.getBoundingClientRect().bottom;
    const overHeader = pointer.y <= headerBottom;
    const ghostTop = pointer.y - drag.offset.y - groupBounds.top;
    const aboveGhost = ghostTop - 36;
    const hintTop = Math.max(
      headerBottom - groupBounds.top + 8,
      Math.min(
        groupBounds.height - 40,
        aboveGhost > headerBottom - groupBounds.top + 8
          ? aboveGhost
          : ghostTop + drag.ghost.offsetHeight + 8,
      ),
    );
    const edge = overHeader ? null : dockEdgePlacement(pointer, body.getBoundingClientRect());
    if (edge && !(model.panels.length === 1 && model.panels[0] === drag.name)) {
      for (const tab of group.querySelectorAll<HTMLElement>("[data-panel]"))
        if (tab !== drag.source) this.#motion.move(tab, 0, 0);
      drag.target = { id, placement: edge };
      this._drop = { id, placement: edge, top: hintTop };
      return;
    }
    if (!overHeader && id === drag.group) {
      for (const tab of group.querySelectorAll<HTMLElement>("[data-panel]"))
        if (tab !== drag.source) this.#motion.move(tab, 0, 0);
      return;
    }
    const tabs = [...group.querySelectorAll<HTMLButtonElement>("[data-panel]")];
    const rtl = getComputedStyle(this).direction === "rtl";
    const before = tabs
      .filter((tab) => tab !== drag.source)
      .find((tab) => {
        const rect = drag.rects.get(tab)!;
        const scrollDelta =
          (drag.scroll.get(tab.parentElement!) ?? 0) - tab.parentElement!.scrollLeft;
        const middle = rect.left + scrollDelta + rect.width / 2;
        return rtl ? pointer.x > middle : pointer.x < middle;
      });
    drag.target = {
      id,
      placement: "center",
      before: overHeader ? before?.dataset.panel : undefined,
    };
    if (!overHeader) this._drop = { id, placement: "center", top: hintTop };
    const order = tabs.filter((tab) => tab !== drag.source);
    const insertion = overHeader && before ? order.indexOf(before) : order.length;
    order.splice(insertion, 0, drag.source);
    const first = drag.rects.get(tabs[0]!)!;
    let position = rtl ? first.right : first.left;
    for (const tab of order) {
      const rect = drag.rects.get(tab)!;
      const desired = rtl ? position - rect.width : position;
      if (tab !== drag.source) this.#motion.move(tab, desired - rect.left, 0);
      position += (rtl ? -1 : 1) * rect.width;
    }
  };

  #endDrag = (event: CustomEvent<DragEventDetail>): void => {
    const drag = this.#drag;
    if (!drag || event.detail.controller.target !== drag.source) return;
    this.#drag = null;
    this._drop = null;
    drag.ghost.remove();
    delete drag.source.dataset.dragging;
    this.#motion.reset();
    this.ownerDocument.defaultView?.requestAnimationFrame(() => {
      this.#suppressClick = false;
    });
    event.detail.controller.position = { x: 0, y: 0 };
    if (!event.detail.cancelled && drag.target) {
      const { id, placement, before } = drag.target;
      this.movePanel(drag.name, id, placement, before);
    }
    void this.updateComplete.then(() =>
      this.renderRoot
        .querySelector<HTMLElement>(`[data-panel="${CSS.escape(drag.name)}"]`)
        ?.focus(),
    );
  };

  #tabClick(group: DockTabs, name: string): void {
    if (this.#suppressClick) {
      this.#suppressClick = false;
      return;
    }
    this.#select(group, name);
  }

  #splitResize(event: PointerEvent, split: DockSplit): void {
    if (event.button !== 0) return;
    const handle = event.currentTarget as HTMLElement,
      box = handle.parentElement!.getBoundingClientRect();
    handle.setPointerCapture(event.pointerId);
    this.#resize = {
      split,
      start: split.orientation === "horizontal" ? event.clientX : event.clientY,
      ratio: split.ratio,
      extent: split.orientation === "horizontal" ? box.width : box.height,
    };
  }
  #resizeMove = (event: PointerEvent): void => {
    if (!this.#resize) return;
    const { split, start, ratio, extent } = this.#resize;
    split.ratio = Math.max(
      0.1,
      Math.min(
        0.9,
        ratio +
          ((split.orientation === "horizontal" ? event.clientX : event.clientY) - start) / extent,
      ),
    );
    this.requestUpdate();
  };
  #resizeEnd = (): void => {
    if (!this.#resize) return;
    this.#resize = undefined;
    this.#commit(structuredClone(this.layout.root));
  };
  #renderNode(model: DockNode): TemplateResult {
    if (model.type === "split")
      return html`<div
        part="split"
        style=${model.orientation === "horizontal" ? `grid-template-columns:minmax(0,${model.ratio}fr) 5px minmax(0,${1 - model.ratio}fr)` : `grid-template-rows:minmax(0,${model.ratio}fr) 5px minmax(0,${1 - model.ratio}fr)`}
      >
        ${this.#renderNode(model.children[0])}
        <div
          part="separator"
          role="separator"
          tabindex="0"
          aria-label="Resize panels"
          aria-orientation=${model.orientation === "horizontal" ? "vertical" : "horizontal"}
          aria-valuemin="10"
          aria-valuemax="90"
          aria-valuenow=${Math.round(model.ratio * 100)}
          style=${`cursor:${model.orientation === "horizontal" ? "col" : "row"}-resize`}
          @pointerdown=${(event: PointerEvent) => this.#splitResize(event, model)}
          @pointermove=${this.#resizeMove}
          @pointerup=${this.#resizeEnd}
          @pointercancel=${this.#resizeEnd}
          @keydown=${(event: KeyboardEvent) => {
            const decrease = model.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp",
              increase = model.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
            if (event.key !== decrease && event.key !== increase) return;
            event.preventDefault();
            model.ratio = Math.max(
              0.1,
              Math.min(0.9, model.ratio + (event.key === increase ? 0.05 : -0.05)),
            );
            this.#commit(structuredClone(this.layout.root));
          }}
        ></div>
        ${this.#renderNode(model.children[1])}
      </div>`;
    const active = this.#panels.find((panel) => panel.name === model.active);
    const placement = this._drop?.id === model.id ? this._drop.placement : null;
    return html`<div part="group" data-group=${model.id}>
      <div part="header">
        <div part="tabs" role="tablist" aria-label="Panel tabs">
          ${repeat(
            model.panels,
            (name) => name,
            (name) =>
              html`<button
                part=${name === model.active ? "tab selected" : "tab"}
                data-panel=${name}
                type="button"
                role="tab"
                aria-selected=${name === model.active}
                tabindex=${name === model.active ? 0 : -1}
                @click=${() => this.#tabClick(model, name)}
                @keydown=${(event: KeyboardEvent) => this.#tabKey(event, model, name)}
              >
                ${this.#panels.find((panel) => panel.name === name)?.label ?? name}
              </button>`,
          )}
        </div>
        <button
          part="action"
          type="button"
          aria-label=${this._zoom ? "Restore panels" : "Maximize panel"}
          @click=${() => {
            this._zoom = this._zoom ? null : model.id;
          }}
        >
          ⤢</button
        >${active?.closable ? html`<button part="action" type="button" aria-label=${`Close ${active.label}`} @click=${() => this.closePanel(model.active)}>×</button>` : ""}
      </div>
      <div part="body"><slot name=${`panel:${model.active}`}></slot></div>
      ${placement ? html`<div part="drop-target" style=${`top:${this._drop?.top ?? 0}px;${placement === "left" ? "left:8px;right:auto;translate:0 0" : placement === "right" ? "left:auto;right:8px;translate:0 0" : "left:50%;right:auto;translate:-50% 0"}`}>${{ left: "Split left", right: "Split right", top: "Split above", bottom: "Split below", center: "Join tabs" }[placement]}</div>` : ""}
    </div>`;
  }
  protected override render(): TemplateResult {
    const root = this._zoom
      ? (groups(this.layout.root).find((group) => group.id === this._zoom) ?? this.layout.root)
      : this.layout.root;
    return html`<div
      part="root"
      role="region"
      aria-label=${this.label}
      @ui-drag-start=${this.#startDrag}
      @ui-drag-move=${this.#moveDrag}
      @ui-drag-end=${this.#endDrag}
    >
      ${root ? this.#renderNode(root) : html`<div part="empty">No open panels</div>`}<slot
        hidden
        @slotchange=${this.#syncPanels}
      ></slot>
    </div>`;
  }
}
