import { richText } from "./documents-render.js";
import { bounds, intersects, type NotebookDocument, type Rect } from "./documents-model.js";
export interface CanvasOwner {
  document(): NotebookDocument;
  commit(label: string, edit: (doc: NotebookDocument) => void): void;
  select(ids: string[]): void;
  edit(id: string): void;
  announce(message: string): void;
}
const svgNS = "http://www.w3.org/2000/svg";
const svg = (tag: string, attributes: Record<string, string>) => {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
};
export class DocumentCanvas {
  #root: HTMLElement;
  #scene: HTMLElement;
  #lines: SVGSVGElement;
  #minimap: SVGSVGElement;
  #marquee: HTMLElement;
  #owner: CanvasOwner;
  #controller = new AbortController();
  #resize: ResizeObserver;
  #selection = new Set<string>();
  #viewport = { x: 60, y: 50, zoom: 0.75 };
  #tool = "select";
  #connectionStart: string | null = null;
  #space = false;
  #drag: {
    kind: "pan" | "move" | "resize" | "marquee";
    pointer: number;
    x: number;
    y: number;
    world: { x: number; y: number };
    pan: { x: number; y: number };
    frames: Map<string, Rect>;
    additive: boolean;
  } | null = null;
  constructor(root: HTMLElement, owner: CanvasOwner) {
    this.#root = root;
    this.#owner = owner;
    root.classList.add("documents-canvas");
    root.tabIndex = 0;
    root.setAttribute("role", "region");
    root.setAttribute(
      "aria-label",
      "Document canvas. Use arrow keys to move selected cards, Delete to remove, and plus or minus to zoom.",
    );
    root.innerHTML =
      '<div class="documents-scene"></div><div class="documents-marquee" hidden></div><svg class="documents-minimap" aria-label="Canvas overview" role="img"></svg><div class="documents-canvas-hint">Drag empty space to select · Space + drag to pan · Double-click a card to edit</div>';
    this.#scene = root.querySelector(".documents-scene")!;
    this.#lines = svg("svg", {
      class: "documents-connections",
      "aria-hidden": "true",
    }) as SVGSVGElement;
    this.#scene.append(this.#lines);
    this.#minimap = root.querySelector(".documents-minimap")!;
    this.#marquee = root.querySelector(".documents-marquee")!;
    const options = { signal: this.#controller.signal };
    root.addEventListener("pointerdown", this.#down, options);
    root.addEventListener("pointermove", this.#move, options);
    root.addEventListener("pointerup", this.#up, options);
    root.addEventListener("pointercancel", () => this.#cancel(), options);
    root.addEventListener("wheel", this.#wheel, { ...options, passive: false });
    root.addEventListener("keydown", this.#key, options);
    root.addEventListener(
      "keyup",
      (event) => {
        if (event.code === "Space") {
          this.#space = false;
          root.classList.remove("is-panning");
        }
      },
      options,
    );
    root.addEventListener(
      "blur",
      () => {
        this.#space = false;
      },
      options,
    );
    root.addEventListener(
      "dblclick",
      (event) => {
        const card = (event.target as Element).closest<HTMLElement>("[data-canvas-block]");
        if (card) this.#owner.edit(card.dataset.canvasBlock!);
      },
      options,
    );
    this.#minimap.addEventListener(
      "pointerdown",
      (event) => {
        event.stopPropagation();
        const total = bounds(this.#owner.document().blocks.map((b) => b.frame));
        const box = this.#minimap.getBoundingClientRect();
        const width = total.width + 80,
          height = total.height + 80;
        const scale = Math.min(box.width / width, box.height / height);
        const x =
          total.x - 40 + (event.clientX - box.left - (box.width - width * scale) / 2) / scale;
        const y =
          total.y - 40 + (event.clientY - box.top - (box.height - height * scale) / 2) / scale;
        this.#viewport.x = root.clientWidth / 2 - x * this.#viewport.zoom;
        this.#viewport.y = root.clientHeight / 2 - y * this.#viewport.zoom;
        this.#transform();
      },
      options,
    );
    this.#resize = new ResizeObserver(() => this.#map());
    this.#resize.observe(root);
  }
  get selected(): string[] {
    return [...this.#selection];
  }
  get zoom(): number {
    return this.#viewport.zoom;
  }
  tool(value: string): void {
    this.#tool = value;
    this.#connectionStart = null;
    this.#root.dataset.tool = value;
  }
  select(ids: string[]): void {
    this.#selection = new Set(ids);
    this.#scene.querySelectorAll<HTMLElement>("[data-canvas-block]").forEach((node) => {
      const selected = this.#selection.has(node.dataset.canvasBlock!);
      node.classList.toggle("is-selected", selected);
      node.setAttribute("aria-current", String(selected));
    });
    this.#owner.select(ids);
  }
  render(): void {
    const doc = this.#owner.document();
    for (const card of this.#scene.querySelectorAll("[data-canvas-block]")) card.remove();
    for (const block of doc.blocks) {
      const card = document.createElement("article");
      card.className = "documents-canvas-card";
      card.dataset.canvasBlock = block.id;
      card.dataset.color = block.color;
      card.style.cssText = `left:${block.frame.x}px;top:${block.frame.y}px;width:${block.frame.width}px;height:${block.frame.height}px`;
      card.tabIndex = 0;
      card.setAttribute(
        "aria-label",
        block.kind + ": " + (block.text.slice(0, 80) || "Empty block"),
      );
      const header = document.createElement("header");
      const label = document.createElement("span");
      label.textContent = block.kind === "table" ? "Collection" : block.kind;
      const edit = document.createElement("ui-button");
      edit.setAttribute("size", "xsmall");
      edit.setAttribute("variant", "ghost");
      edit.setAttribute("aria-label", "Edit " + (block.text.slice(0, 35) || "block"));
      edit.textContent = "Open";
      edit.addEventListener("click", () => this.#owner.edit(block.id), {
        signal: this.#controller.signal,
      });
      header.append(label, edit);
      const body = document.createElement("div");
      body.className = "documents-canvas-copy";
      body.dataset.kind = block.kind;
      if (block.kind === "image" && block.source) {
        const image = document.createElement("img");
        image.src = block.source;
        image.alt = block.text;
        image.draggable = false;
        body.append(image);
      } else if (block.kind === "table") {
        const title = document.createElement("strong");
        title.textContent = block.text || "Collection";
        body.append(title);
        for (const row of (block.rows ?? []).slice(0, 5)) {
          const line = document.createElement("p");
          line.textContent = row.title + " · " + row.status;
          body.append(line);
        }
      } else {
        richText(body, block.text || "Write something…", block.marks);
        if (block.kind === "todo")
          body.prepend(document.createTextNode(block.checked ? "✓ " : "○ "));
      }
      const resize = document.createElement("span");
      resize.className = "documents-canvas-resize";
      resize.dataset.resize = "";
      resize.setAttribute("aria-hidden", "true");
      card.append(header, body, resize);
      this.#scene.append(card);
    }
    this.#selection = new Set(
      [...this.#selection].filter((id) => doc.blocks.some((b) => b.id === id)),
    );
    this.#scene
      .querySelectorAll<HTMLElement>("[data-canvas-block]")
      .forEach((node) =>
        node.classList.toggle("is-selected", this.#selection.has(node.dataset.canvasBlock!)),
      );
    this.#drawConnections();
    this.#transform();
  }
  fit(): void {
    const total = bounds(this.#owner.document().blocks.map((b) => b.frame));
    const width = this.#root.clientWidth,
      height = this.#root.clientHeight;
    if (!width || !height) return;
    this.#viewport.zoom = Math.max(
      0.15,
      Math.min(1.4, Math.min((width - 100) / total.width, (height - 100) / total.height)),
    );
    this.#viewport.x = (width - total.width * this.zoom) / 2 - total.x * this.zoom;
    this.#viewport.y = (height - total.height * this.zoom) / 2 - total.y * this.zoom;
    this.#transform();
  }
  zoomBy(amount: number): void {
    this.#zoomAt(this.#root.clientWidth / 2, this.#root.clientHeight / 2, this.zoom * amount);
  }
  #zoomAt(x: number, y: number, zoom: number): void {
    const previous = this.zoom;
    zoom = Math.max(0.15, Math.min(2.5, zoom));
    this.#viewport.x = x - ((x - this.#viewport.x) * zoom) / previous;
    this.#viewport.y = y - ((y - this.#viewport.y) * zoom) / previous;
    this.#viewport.zoom = zoom;
    this.#transform();
  }
  #transform(): void {
    this.#scene.style.transform = `translate(${this.#viewport.x}px,${this.#viewport.y}px) scale(${this.zoom})`;
    this.#root.style.backgroundPosition = `${this.#viewport.x}px ${this.#viewport.y}px`;
    this.#root.style.backgroundSize = `${24 * this.zoom}px ${24 * this.zoom}px`;
    this.#map();
    this.#root.dispatchEvent(new CustomEvent("documents-zoom", { detail: this.zoom }));
  }
  #world(x: number, y: number): { x: number; y: number } {
    const box = this.#root.getBoundingClientRect();
    return {
      x: (x - box.left - this.#viewport.x) / this.zoom,
      y: (y - box.top - this.#viewport.y) / this.zoom,
    };
  }
  #down = (event: PointerEvent): void => {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target as Element;
    if (target.closest("ui-button,a,input")) return;
    const card = target.closest<HTMLElement>("[data-canvas-block]");
    const id = card?.dataset.canvasBlock;
    this.#root.focus({ preventScroll: true });
    if (this.#tool === "connect" && id) {
      event.preventDefault();
      if (!this.#connectionStart) {
        this.#connectionStart = id;
        this.select([id]);
        this.#owner.announce("Choose a second card to connect.");
      } else if (this.#connectionStart !== id) {
        const from = this.#connectionStart;
        this.#owner.commit("Connected blocks", (doc) => {
          if (!doc.connections.some((c) => c.from === from && c.to === id))
            doc.connections.push({ id: crypto.randomUUID(), from, to: id, label: "" });
        });
        this.#connectionStart = null;
      }
      return;
    }
    event.preventDefault();
    const pan = event.button === 1 || this.#space || this.#tool === "hand";
    let kind: "pan" | "move" | "resize" | "marquee" = pan
      ? "pan"
      : id
        ? target.closest("[data-resize]")
          ? "resize"
          : "move"
        : "marquee";
    if (id && !pan) {
      if (event.shiftKey) {
        if (this.#selection.has(id)) this.#selection.delete(id);
        else this.#selection.add(id);
      } else if (!this.#selection.has(id)) {
        const group = this.#owner.document().blocks.find((b) => b.id === id)?.group;
        this.#selection = new Set(
          group
            ? this.#owner
                .document()
                .blocks.filter((b) => b.group === group)
                .map((b) => b.id)
            : [id],
        );
      }
      this.select([...this.#selection]);
    }
    if (kind === "marquee" && !event.shiftKey) this.select([]);
    const frames = new Map<string, Rect>();
    for (const block of this.#owner.document().blocks)
      if (this.#selection.has(block.id) && (kind !== "resize" || block.id === id))
        frames.set(block.id, { ...block.frame });
    this.#drag = {
      kind,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      world: this.#world(event.clientX, event.clientY),
      pan: { x: this.#viewport.x, y: this.#viewport.y },
      frames,
      additive: event.shiftKey,
    };
    this.#root.setPointerCapture(event.pointerId);
  };
  #move = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    const dx = (event.clientX - drag.x) / this.zoom,
      dy = (event.clientY - drag.y) / this.zoom;
    if (drag.kind === "pan") {
      this.#viewport.x = drag.pan.x + event.clientX - drag.x;
      this.#viewport.y = drag.pan.y + event.clientY - drag.y;
      this.#transform();
      return;
    }
    if (drag.kind === "marquee") {
      const box = this.#root.getBoundingClientRect();
      this.#marquee.hidden = false;
      this.#marquee.style.cssText = `left:${Math.min(drag.x, event.clientX) - box.left}px;top:${Math.min(drag.y, event.clientY) - box.top}px;width:${Math.abs(event.clientX - drag.x)}px;height:${Math.abs(event.clientY - drag.y)}px`;
      return;
    }
    for (const [id, frame] of drag.frames) {
      const card = this.#scene.querySelector<HTMLElement>(`[data-canvas-block="${id}"]`)!;
      if (drag.kind === "move") {
        card.style.left = frame.x + dx + "px";
        card.style.top = frame.y + dy + "px";
      } else {
        card.style.width = Math.max(160, frame.width + dx) + "px";
        card.style.height = Math.max(100, frame.height + dy) + "px";
      }
    }
    this.#drawConnections();
  };
  #up = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointer !== event.pointerId) return;
    this.#drag = null;
    this.#marquee.hidden = true;
    if (drag.kind === "marquee") {
      const end = this.#world(event.clientX, event.clientY);
      const region = {
        x: Math.min(drag.world.x, end.x),
        y: Math.min(drag.world.y, end.y),
        width: Math.abs(end.x - drag.world.x),
        height: Math.abs(end.y - drag.world.y),
      };
      const ids = this.#owner
        .document()
        .blocks.filter((b) => intersects(b.frame, region))
        .map((b) => b.id);
      this.select(drag.additive ? [...new Set([...this.#selection, ...ids])] : ids);
      return;
    }
    if (drag.kind === "pan") return;
    const dx = (event.clientX - drag.x) / this.zoom,
      dy = (event.clientY - drag.y) / this.zoom;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    this.#owner.commit(drag.kind === "move" ? "Moved blocks" : "Resized block", (doc) => {
      for (const block of doc.blocks) {
        const frame = drag.frames.get(block.id);
        if (!frame) continue;
        block.frame =
          drag.kind === "move"
            ? { ...frame, x: Math.round(frame.x + dx), y: Math.round(frame.y + dy) }
            : {
                ...frame,
                width: Math.round(Math.max(160, frame.width + dx)),
                height: Math.round(Math.max(100, frame.height + dy)),
              };
      }
    });
  };
  #cancel(): void {
    this.#drag = null;
    this.#marquee.hidden = true;
    this.render();
  }
  #wheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const box = this.#root.getBoundingClientRect();
      this.#zoomAt(
        event.clientX - box.left,
        event.clientY - box.top,
        this.zoom * Math.exp(-event.deltaY * 0.008),
      );
    } else {
      this.#viewport.x -= event.deltaX;
      this.#viewport.y -= event.deltaY;
      this.#transform();
    }
  };
  #key = (event: KeyboardEvent): void => {
    if ((event.target as Element).closest("ui-button,input,textarea")) return;
    if (event.code === "Space") {
      event.preventDefault();
      this.#space = true;
      this.#root.classList.add("is-panning");
      return;
    }
    if (event.key === "Escape") {
      this.#cancel();
      this.#connectionStart = null;
      this.select([]);
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.zoomBy(1.15);
      return;
    }
    if (event.key === "-") {
      event.preventDefault();
      this.zoomBy(1 / 1.15);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      this.fit();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      this.select(this.#owner.document().blocks.map((b) => b.id));
      return;
    }
    if (event.key === "Enter" && this.#selection.size === 1) {
      this.#owner.edit([...this.#selection][0]!);
      return;
    }
    if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) &&
      this.#selection.size
    ) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      this.#owner.commit("Nudged blocks", (doc) => {
        for (const block of doc.blocks)
          if (this.#selection.has(block.id)) {
            block.frame.x +=
              event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
            block.frame.y += event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
          }
      });
    }
  };
  #drawConnections(): void {
    this.#lines.replaceChildren();
    const renderedFrame = (id: string): Rect | undefined => {
      const block = this.#owner.document().blocks.find((b) => b.id === id);
      const card = this.#scene.querySelector<HTMLElement>(`[data-canvas-block="${id}"]`);
      return block && card
        ? {
            x: parseFloat(card.style.left),
            y: parseFloat(card.style.top),
            width: parseFloat(card.style.width),
            height: parseFloat(card.style.height),
          }
        : block?.frame;
    };
    for (const c of this.#owner.document().connections) {
      const a = renderedFrame(c.from),
        b = renderedFrame(c.to);
      if (!a || !b) continue;
      const x1 = a.x + a.width,
        y1 = a.y + a.height / 2,
        x2 = b.x,
        y2 = b.y + b.height / 2;
      this.#lines.append(
        svg("path", { d: `M ${x1} ${y1} C ${x1 + 80} ${y1} ${x2 - 80} ${y2} ${x2} ${y2}` }),
      );
      if (c.label) {
        const label = svg("text", { x: String((x1 + x2) / 2), y: String((y1 + y2) / 2 - 8) });
        label.textContent = c.label;
        this.#lines.append(label);
      }
    }
  }
  #map(): void {
    const blocks = this.#owner.document().blocks,
      total = bounds(blocks.map((b) => b.frame));
    const margin = 40;
    this.#minimap.setAttribute(
      "viewBox",
      `${total.x - margin} ${total.y - margin} ${total.width + margin * 2} ${total.height + margin * 2}`,
    );
    this.#minimap.replaceChildren();
    for (const block of blocks)
      this.#minimap.append(
        svg("rect", {
          x: String(block.frame.x),
          y: String(block.frame.y),
          width: String(block.frame.width),
          height: String(block.frame.height),
          class: this.#selection.has(block.id) ? "selected" : "",
        }),
      );
    this.#minimap.append(
      svg("rect", {
        x: String(-this.#viewport.x / this.zoom),
        y: String(-this.#viewport.y / this.zoom),
        width: String(this.#root.clientWidth / this.zoom),
        height: String(this.#root.clientHeight / this.zoom),
        class: "viewport",
      }),
    );
  }
  destroy(): void {
    this.#controller.abort();
    this.#resize.disconnect();
  }
}
