import type {
  Basis,
  CompatibilityResult,
  ConnectionTarget,
  IntentArgs,
  NodeTarget,
  Point,
  PortTarget,
  Rect,
  Target,
} from "./contract.js";
import type { CapturedActivation } from "./adapter.js";
import type { GooPatch } from "./patch.js";
import { nodeTarget, portTarget, targetKey, sameBasis } from "./scene.js";
import { add, sub, bounds, intersects, same } from "./geometry.js";
interface Draft {
  phase:
    | "pressed"
    | "pan"
    | "camera-pinch"
    | "move-nodes"
    | "connect-drag"
    | "connect-armed"
    | "reconnect"
    | "box-select";
  candidate: "pan" | "move-nodes" | "connect-drag" | "box-select";
  id: string;
  basis: Basis;
  pointer?: number;
  start: Point;
  last: Point;
  worldStart: Point;
  touch: boolean;
  mode: "replace" | "add" | "toggle";
  capture?: CapturedActivation;
  from?: PortTarget;
  target?: Target;
  nodes?: { target: NodeTarget; baseOrigin: Point }[];
  grab?: Point;
  reconnect?: { connection: ConnectionTarget; topologyRef: string; endpoint: string };
  queryId?: string;
  compatibility?: CompatibilityResult;
  pinch?: { distance: number; scale: number; world: Point };
}
export class Gestures {
  readonly origins = new Map<string, Point>();
  wire?: { from: PortTarget; to: Point };
  box?: Rect;
  guides?: { x?: number; y?: number };
  private hover?: HTMLElement;
  draft?: Draft;
  private picker?: {
    queryId: string;
    from: PortTarget;
    worldPoint: Point;
    capture: CapturedActivation;
    basis: Basis;
    gestureId: string;
  };
  readonly timings = { lastFrameMs: 0, frames: 0 };
  private frame = 0;
  private lastTime = 0;
  private suppress?: { pointer: number; time: number };
  private pointers = new Map<number, Point>();
  private space = false;
  private selectTool = false;
  private boxCorner?: Point;
  constructor(readonly root: GooPatch) {}
  private own(e: Event): boolean {
    return (
      !e.defaultPrevented &&
      e.composedPath().find((n) => n instanceof Element && n.localName === "goo-patch") ===
        this.root
    );
  }
  private control(e: Event): HTMLElement | null {
    if (!this.own(e)) return null;
    for (const item of e.composedPath()) {
      if (item === this.root) break;
      if (!(item instanceof HTMLElement)) continue;
      if (
        item.matches(
          "[data-patch-anchor],[data-patch-handle],[data-patch-command],[data-patch-move],[data-patch-reconnect],[data-patch-disconnect]",
        )
      )
        return item;
      if (
        item.matches(
          "input,textarea,select,button,a,[contenteditable]:not([contenteditable=false]),[data-patch-native],[data-patch-scroll]",
        ) ||
        (item.localName.includes("-") &&
          !["goo-patch-node", "goo-patch-port", "goo-patch-connection"].includes(item.localName))
      )
        return null;
      if (item.matches("[data-patch-select],[data-patch-background]")) return item;
    }
    return null;
  }
  listen(signal: AbortSignal): void {
    const r = this.root;
    r.addEventListener("pointerdown", (e) => this.down(e), { signal });
    r.addEventListener("pointermove", (e) => this.move(e), { signal });
    r.addEventListener("pointerup", (e) => this.up(e), { signal });
    r.addEventListener(
      "pointercancel",
      (e) => {
        if (this.pointers.has(e.pointerId) || this.draft?.pointer === e.pointerId)
          this.cancel("pointercancel");
      },
      { signal },
    );
    r.addEventListener(
      "lostpointercapture",
      (e) => {
        if (this.draft?.pointer === e.pointerId) this.cancel("capture-lost");
      },
      { signal },
    );
    r.addEventListener("click", (e) => this.click(e), { signal });
    r.addEventListener(
      "keydown",
      (e) => {
        if (!this.own(e)) return;
        if (e.key === "Escape" && this.draft) {
          e.preventDefault();
          this.cancel("escape");
          return;
        }
        const control = this.control(e);
        if (!control) return;
        if (e.code === "Space" && control.matches("[data-patch-background],[data-patch-select]")) {
          this.space = true;
          e.preventDefault();
        }
      },
      { signal },
    );
    r.addEventListener(
      "keyup",
      (e) => {
        if (e.code === "Space") this.space = false;
      },
      { signal },
    );
    r.addEventListener("wheel", (e) => this.wheel(e), { signal, passive: false });
    r.addEventListener(
      "contextmenu",
      (e) => {
        const control = this.control(e);
        if (!control) return;
        const target = this.target(control) ?? r.pick({ x: e.clientX, y: e.clientY })?.target,
          p = r.world({ x: e.clientX, y: e.clientY });
        if (target && p && r.index?.scene.offers.context && r.editable) {
          e.preventDefault();
          r.emit("goo-patch-query", {
            kind: "context",
            target,
            worldPoint: p,
            basis: r.basis,
            queryId: crypto.randomUUID(),
          });
        }
      },
      { signal },
    );
  }
  private target(control: HTMLElement): Target | undefined {
    const index = this.root.index;
    if (!index) return undefined;
    const node = control.closest<HTMLElement>("goo-patch-node");
    const n = node && index.nodes.get(node.dataset.key!);
    const port = control.closest<HTMLElement>("goo-patch-port");
    const p = n && port && n.ports.find((p) => p.key === port.dataset.key);
    if (n && p) return portTarget(n, p);
    if (n) return nodeTarget(n);
    const connection = control.closest<HTMLElement>("goo-patch-connection");
    const c = index.connections.get(
      control.dataset.patchConnection ?? connection?.dataset.key ?? "",
    );
    return c ? { kind: "connection", connection: c.key, lifetime: c.lifetime } : undefined;
  }
  private mode(e: MouseEvent): Draft["mode"] {
    return e.ctrlKey || e.metaKey ? "toggle" : e.shiftKey ? "add" : "replace";
  }
  private down(e: PointerEvent): void {
    const control = this.control(e),
      r = this.root;
    if (!control || !r.index || (e.button !== 0 && e.button !== 1)) return;
    if (
      control.matches(
        "[data-patch-command],[data-patch-move],[data-patch-reconnect],[data-patch-disconnect]",
      )
    )
      return;
    const client = { x: e.clientX, y: e.clientY },
      world = r.world(client);
    if (!world) return;
    const background = control.hasAttribute("data-patch-background");
    if (this.draft) {
      if (
        e.pointerType === "touch" &&
        background &&
        ["pan", "pressed"].includes(this.draft.phase) &&
        this.draft.candidate === "pan"
      ) {
        this.pointers.set(e.pointerId, client);
        this.capture(e.pointerId);
        const pts = [...this.pointers.values()];
        if (pts.length === 2) {
          const a = r.viewport(pts[0]!)!,
            b = r.viewport(pts[1]!)!,
            mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const c = r.getCamera();
          this.draft.phase = "camera-pinch";
          this.draft.pinch = {
            distance: Math.hypot(a.x - b.x, a.y - b.y),
            scale: c.scale,
            world: { x: (mid.x - c.tx) / c.scale, y: (mid.y - c.ty) / c.scale },
          };
          e.preventDefault();
        }
        return;
      }
      return;
    }
    const target = this.target(control) ?? r.pick(client)?.target;
    const pan =
      e.button === 1 ||
      this.space ||
      (background && e.pointerType === "touch" && !e.shiftKey && !this.selectTool);
    const candidate = pan
      ? "pan"
      : control.hasAttribute("data-patch-handle")
        ? "move-nodes"
        : control.hasAttribute("data-patch-anchor")
          ? "connect-drag"
          : "box-select";
    if (!pan && !r.editable) return;
    // Chrome clicks select; box selection starts only on the dedicated plane.
    if (candidate === "box-select" && !background) return;
    const d: Draft = {
      phase: "pressed",
      candidate,
      id: crypto.randomUUID(),
      basis: r.basis,
      pointer: e.pointerId,
      start: client,
      last: client,
      worldStart: world,
      touch: e.pointerType === "touch",
      mode: this.mode(e),
      target,
    };
    if (candidate === "move-nodes") {
      if (target?.kind !== "node" || r.busy(target) || !r.index.node(target)?.draggable) return;
      const selected = r.selection.some((t) => targetKey(t) === targetKey(target))
        ? r.selection
        : [target];
      d.nodes = selected
        .filter(
          (t): t is NodeTarget => t.kind === "node" && !!r.index!.node(t)?.draggable && !r.busy(t),
        )
        .map((t) => ({
          target: t,
          baseOrigin: { x: r.index!.node(t)!.rect.x, y: r.index!.node(t)!.rect.y },
        }));
      d.capture =
        r.capture(
          "move-nodes",
          d.nodes.map((n) => n.target),
        ) ?? undefined;
      if (!d.capture) return;
      d.grab = sub(world, r.index.node(target)!.rect);
    }
    if (candidate === "connect-drag") {
      if (target?.kind !== "port" || !this.connectable(target)) return;
      d.from = target;
      d.capture = r.capture("connect", [target]) ?? undefined;
      if (!d.capture) return;
    }
    this.draft = d;
    this.pointers.set(e.pointerId, client);
    if (candidate === "connect-drag") this.queryCompatibility();
    if (background || pan) e.preventDefault();
  }
  private capture(id: number): void {
    try {
      this.root.setPointerCapture(id);
    } catch {
      /* Synthetic fixture pointers are not active platform pointers. */
    }
  }
  private move(e: PointerEvent): void {
    const d = this.draft;
    if (!d) {
      const control = this.control(e);
      if (control) {
        const hit = this.root.pick({ x: e.clientX, y: e.clientY });
        const port =
          hit?.target.kind === "port"
            ? this.root.dom?.ports.get(hit.target.node)?.get(hit.target.port)
            : undefined;
        if (port !== this.hover) {
          this.hover?.removeAttribute("data-hover");
          this.hover = port;
          port?.setAttribute("data-hover", "");
        }
      }
      return;
    }
    if (d.phase === "connect-armed" || (d.phase === "reconnect" && d.pointer === undefined)) {
      if (this.own(e)) {
        d.last = { x: e.clientX, y: e.clientY };
        this.schedule();
      }
      return;
    }
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.pointer === e.pointerId) d.last = { x: e.clientX, y: e.clientY };
    if (
      d.phase === "pressed" &&
      Math.hypot(d.last.x - d.start.x, d.last.y - d.start.y) >=
        (d.touch
          ? this.root.index!.scene.policy.touchDragThresholdPx
          : this.root.index!.scene.policy.dragThresholdPx)
    ) {
      d.phase = d.candidate;
      this.capture(e.pointerId);
    }
    if (d.phase !== "pressed") {
      e.preventDefault();
      this.schedule();
    }
  }
  cameraChanged(): void {
    if (
      this.draft &&
      ["move-nodes", "connect-drag", "connect-armed", "reconnect", "box-select"].includes(
        this.draft.phase,
      )
    )
      this.schedule();
  }
  private schedule(): void {
    if (!this.frame)
      this.frame = requestAnimationFrame((t) => {
        this.frame = 0;
        this.tick(t);
      });
  }
  /** One latest-input frame. Auto-pan continues even with no further pointer events. */
  private tick(time: number): void {
    const start = performance.now();
    this.renderFrame(time);
    this.timings.lastFrameMs = performance.now() - start;
    this.timings.frames++;
  }
  private renderFrame(time: number): void {
    const d = this.draft,
      r = this.root;
    if (!d || !r.index) return;
    const dt = this.lastTime ? Math.min(0.05, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    if (d.phase === "camera-pinch") {
      const pts = [...this.pointers.values()].map((p) => r.viewport(p));
      if (pts.length !== 2 || !pts[0] || !pts[1] || !d.pinch) return;
      const [a, b] = pts as [Point, Point],
        mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const policy = r.index.scene.policy;
      const scale = Math.max(
        policy.minScale,
        Math.min(
          policy.maxScale,
          (d.pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, d.pinch.distance),
        ),
      );
      r.setCamera({
        scale,
        tx: mid.x - d.pinch.world.x * scale,
        ty: mid.y - d.pinch.world.y * scale,
      });
      return;
    }
    if (d.phase === "pan") {
      const a = r.viewport(d.start),
        b = r.viewport(d.last);
      if (a && b) {
        const c = r.getCamera();
        r.setCamera({ ...c, tx: c.tx + b.x - a.x, ty: c.ty + b.y - a.y });
        d.start = d.last;
      }
      return;
    }
    if (
      !["move-nodes", "connect-drag", "box-select"].includes(d.phase) &&
      d.phase !== "connect-armed" &&
      d.phase !== "reconnect"
    )
      return;
    let auto = false;
    if (d.pointer !== undefined && ["move-nodes", "connect-drag", "box-select"].includes(d.phase)) {
      const m = r.mapping(),
        v = r.viewport(d.last),
        p = r.index.scene.policy;
      if (m && v && p.autoPanBandPx > 0) {
        const velocity = (x: number, size: number): number =>
          x < p.autoPanBandPx
            ? -Math.min(1, (p.autoPanBandPx - x) / p.autoPanBandPx)
            : x > size - p.autoPanBandPx
              ? Math.min(1, (x - size + p.autoPanBandPx) / p.autoPanBandPx)
              : 0;
        const vx = velocity(v.x, m.width),
          vy = velocity(v.y, m.height);
        auto = !!(vx || vy);
        if (auto) {
          const c = r.getCamera();
          r.setCamera({
            ...c,
            tx: c.tx - vx * p.autoPanMaxPxPerSecond * dt,
            ty: c.ty - vy * p.autoPanMaxPxPerSecond * dt,
          });
        }
      }
    }
    const world = r.world(d.last);
    if (!world) return;
    if (d.phase === "move-nodes" && d.nodes && d.target?.kind === "node") {
      const anchor = d.nodes.find((n) => n.target.node === (d.target as NodeTarget).node)!;
      let wanted = sub(world, d.grab!);
      wanted = this.snap(wanted, anchor.target);
      const delta = sub(wanted, anchor.baseOrigin);
      this.origins.clear();
      for (const n of d.nodes) this.origins.set(n.target.node, add(n.baseOrigin, delta));
      r.rebuildOrigins();
    } else if (d.phase === "box-select") {
      this.box = bounds([d.worldStart, world]);
      r.drawPreviews();
    } else if (d.from) {
      this.wire = { from: d.from, to: world };
      r.drawPreviews();
    }
    if (auto) this.schedule();
  }
  private snap(wanted: Point, target: NodeTarget): Point {
    const index = this.root.index!,
      policy = index.scene.policy,
      tolerance = policy.snapTolerancePx / this.root.effectiveScale();
    const candidates: { x: number[]; y: number[] } = { x: [], y: [] };
    if (policy.grid) {
      const g = policy.grid;
      candidates.x.push(g.origin.x + Math.round((wanted.x - g.origin.x) / g.step.x) * g.step.x);
      candidates.y.push(g.origin.y + Math.round((wanted.y - g.origin.y) / g.step.y) * g.step.y);
    }
    if (policy.alignmentSnap) {
      const rect = index.node(target)!.rect;
      for (const n of index.near({ ...rect, ...wanted }, tolerance)) {
        if (this.draft?.nodes?.some((x) => x.target.node === n.key)) continue;
        for (const x of [n.rect.x, n.rect.x + n.rect.width / 2, n.rect.x + n.rect.width])
          for (const own of [0, rect.width / 2, rect.width]) candidates.x.push(x - own);
        for (const y of [n.rect.y, n.rect.y + n.rect.height / 2, n.rect.y + n.rect.height])
          for (const own of [0, rect.height / 2, rect.height]) candidates.y.push(y - own);
      }
    }
    const choose = (v: number, values: number[]): number =>
      values
        .filter((n) => Math.abs(n - v) <= tolerance)
        .sort((a, b) => Math.abs(a - v) - Math.abs(b - v) || a - b)[0] ?? v;
    const snapped = { x: choose(wanted.x, candidates.x), y: choose(wanted.y, candidates.y) };
    this.guides = {
      ...(snapped.x !== wanted.x ? { x: snapped.x } : {}),
      ...(snapped.y !== wanted.y ? { y: snapped.y } : {}),
    };
    return snapped;
  }
  private up(e: PointerEvent): void {
    const d = this.draft;
    if (!d || !this.pointers.has(e.pointerId)) return;
    if (d.phase === "camera-pinch") {
      this.cancel("pinch-complete");
      this.suppress = { pointer: e.pointerId, time: performance.now() };
      return;
    }
    if (d.pointer !== e.pointerId) return;
    d.last = { x: e.clientX, y: e.clientY };
    if (d.phase === "pressed") {
      // Leave the ensuing native click to arm, select or open ordinary move controls.
      this.finish();
      return;
    }
    this.tick(performance.now());
    this.suppress = { pointer: e.pointerId, time: performance.now() };
    if (d.phase === "move-nodes" && d.nodes && d.capture) {
      const nodes = d.nodes.map((n) => ({
        ...n,
        proposedOrigin: this.origins.get(n.target.node) ?? n.baseOrigin,
      }));
      const changed = nodes.some((n) => !same(n.baseOrigin, n.proposedOrigin));
      this.finish(changed);
      if (changed) this.root.submit({ kind: "move-nodes", nodes }, d.capture, d.basis, d.id);
    } else if (d.phase === "connect-drag" || d.phase === "reconnect") this.completeWire(d.last);
    else if (d.phase === "box-select") {
      const box = this.box;
      this.finish();
      if (box)
        this.root.requestSelection(
          this.root.index!.scene.nodes.filter((n) => intersects(n.rect, box)).map(nodeTarget),
          d.mode,
          d.id,
        );
    } else this.finish();
  }
  private click(e: MouseEvent): void {
    if (
      this.suppress &&
      performance.now() - this.suppress.time < 500 &&
      (e as PointerEvent).pointerId === this.suppress.pointer
    ) {
      this.suppress = undefined;
      e.preventDefault();
      return;
    }
    const control = this.control(e),
      r = this.root;
    if (!control || !r.index) return;
    const cmd = control.dataset.patchCommand;
    if (cmd) {
      e.preventDefault();
      const c = r.getCamera(),
        m = r.mapping();
      if (cmd === "fit") r.fit();
      else if (cmd === "zoom-in" || cmd === "zoom-out") {
        if (m) r.zoomAt({ x: m.width / 2, y: m.height / 2 }, cmd === "zoom-in" ? 1.2 : 1 / 1.2);
      } else if (cmd === "select") {
        this.selectTool = !this.selectTool;
        this.boxCorner = undefined;
        control.setAttribute("aria-pressed", String(this.selectTool));
        r.painter!.status.textContent = this.selectTool
          ? "Select two corners, or drag an area."
          : "Selection tool off.";
      } else {
        r.setCamera({
          ...c,
          tx: c.tx + (cmd === "left" ? 80 : cmd === "right" ? -80 : 0),
          ty: c.ty + (cmd === "up" ? 80 : cmd === "down" ? -80 : 0),
        });
      }
      return;
    }
    const target = this.target(control);
    if (control.hasAttribute("data-patch-anchor") && target?.kind === "port") {
      e.preventDefault();
      if (this.draft?.from) this.completeWireTarget(target);
      else this.arm(target);
      return;
    }
    if (control.hasAttribute("data-patch-move") && target?.kind === "node") {
      const dx = Number(control.dataset.dx ?? 0),
        dy = Number(control.dataset.dy ?? 0);
      if (Number.isFinite(dx) && Number.isFinite(dy)) this.moveBy([target], { x: dx, y: dy });
      return;
    }
    if (control.hasAttribute("data-patch-reconnect") && target?.kind === "connection") {
      this.reconnect(target, control.dataset.patchReconnect!);
      return;
    }
    if (control.hasAttribute("data-patch-disconnect") && target?.kind === "connection") {
      this.disconnect(target, control.dataset.endpoint);
      return;
    }
    if (control.hasAttribute("data-patch-handle") && target) {
      const worldPoint = this.root.index!.region(target)!;
      r.emit("goo-patch-query", {
        kind: "context",
        target,
        worldPoint,
        basis: r.basis,
        queryId: crypto.randomUUID(),
      });
      return;
    }
    if (control.hasAttribute("data-patch-select") && target) {
      r.requestSelection([target], this.mode(e));
      return;
    }
    if (control.hasAttribute("data-patch-background")) {
      const client = { x: e.clientX, y: e.clientY },
        point = r.world(client);
      if (!point) return;
      if (this.selectTool) {
        if (!this.boxCorner) {
          this.boxCorner = point;
          r.painter!.status.textContent = "Choose the opposite corner.";
        } else {
          const box = bounds([this.boxCorner, point]);
          r.requestSelection(
            r.index.scene.nodes.filter((n) => intersects(n.rect, box)).map(nodeTarget),
            this.mode(e),
          );
          this.boxCorner = undefined;
        }
        return;
      }
      const hit = r.pick(client);
      r.requestSelection(hit ? [hit.target] : [], this.mode(e));
    }
  }
  private connectable(t: PortTarget): boolean {
    return !!this.root.index
      ?.node(t)
      ?.ports.some((p) => p.key === t.port && p.lifetime === t.lifetime && p.connectable);
  }
  arm(from: PortTarget): void {
    const r = this.root;
    if (!this.connectable(from)) return;
    const capture = r.capture("connect", [from]);
    if (!capture) return;
    this.finish();
    const point = r.anchor(from)!;
    this.draft = {
      phase: "connect-armed",
      candidate: "connect-drag",
      id: crypto.randomUUID(),
      basis: r.basis,
      start: point,
      last: point,
      worldStart: point,
      touch: false,
      mode: "replace",
      from,
      capture,
    };
    this.wire = { from, to: point };
    this.queryCompatibility();
    r.drawPreviews();
  }
  reconnect(connection: ConnectionTarget, endpoint: string): void {
    const r = this.root,
      c = r.index?.connections.get(connection.connection);
    if (!c || c.lifetime !== connection.lifetime || !c.reconnectable || r.busy(connection)) return;
    const e = c.endpoints.find((e) => e.key === endpoint),
      other = c.endpoints.find((e) => e.key !== endpoint);
    if (!e || !other) return;
    const capture = r.capture("reconnect", [connection, e.port]);
    if (!capture) return;
    this.finish();
    const point = r.anchor(e.port)!;
    this.draft = {
      phase: "reconnect",
      candidate: "connect-drag",
      id: crypto.randomUUID(),
      basis: r.basis,
      start: point,
      last: point,
      worldStart: point,
      touch: false,
      mode: "replace",
      from: other.port,
      capture,
      reconnect: { connection, topologyRef: c.topologyRef, endpoint },
    };
    this.wire = { from: other.port, to: point };
    r.drawPreviews();
  }
  disconnect(connection: ConnectionTarget, endpoint?: string): void {
    const r = this.root,
      c = r.index?.connections.get(connection.connection);
    if (
      !c ||
      c.lifetime !== connection.lifetime ||
      !c.disconnectable ||
      r.busy(connection) ||
      (endpoint !== undefined && !c.endpoints.some((e) => e.key === endpoint))
    )
      return;
    const capture = r.capture("disconnect", [connection]);
    if (capture)
      r.submit(
        {
          kind: "disconnect",
          connection,
          topologyRef: c.topologyRef,
          ...(endpoint !== undefined ? { endpoint } : {}),
        },
        capture,
        r.basis,
        crypto.randomUUID(),
      );
  }
  moveBy(targets: readonly NodeTarget[], delta: Point): void {
    const r = this.root;
    if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y) || same(delta, { x: 0, y: 0 }))
      return;
    const nodes = targets.flatMap((target) => {
      const n = r.index?.node(target);
      return n?.draggable && !r.busy(target)
        ? [{ target, baseOrigin: { x: n.rect.x, y: n.rect.y }, proposedOrigin: add(n.rect, delta) }]
        : [];
    });
    if (!nodes.length) return;
    const capture = r.capture(
      "move-nodes",
      nodes.map((n) => n.target),
    );
    if (capture) r.submit({ kind: "move-nodes", nodes }, capture, r.basis, crypto.randomUUID());
  }
  private completeWire(client: Point): void {
    const r = this.root,
      d = this.draft!,
      target = r.pick(client)?.target,
      point = r.world(client);
    if (target?.kind === "port") {
      this.completeWireTarget(target);
      return;
    }
    this.finish();
    if (d.from && point && !d.reconnect && r.index?.scene.offers.createPicker) {
      const capture = r.capture("create-from-port", [d.from]),
        queryId = crypto.randomUUID();
      if (capture)
        this.picker = {
          queryId,
          from: d.from,
          worldPoint: point,
          capture,
          basis: d.basis,
          gestureId: d.id,
        };
      r.emit("goo-patch-query", {
        kind: "create-picker",
        from: d.from,
        worldPoint: point,
        basis: d.basis,
        queryId,
        gestureId: d.id,
      });
    }
  }
  acceptChoice(queryId: string, choiceRef: string): void {
    const p = this.picker;
    this.picker = undefined;
    if (
      !p ||
      p.queryId !== queryId ||
      !this.root.index?.anchor(p.from) ||
      typeof choiceRef !== "string" ||
      !choiceRef
    )
      return;
    this.root.submit(
      { kind: "create-from-port", from: p.from, worldPoint: p.worldPoint, choiceRef },
      p.capture,
      p.basis,
      p.gestureId,
    );
  }
  private completeWireTarget(to: PortTarget): void {
    const d = this.draft!,
      r = this.root;
    if (!d?.from || !d.capture || !this.connectable(to)) return;
    const match = d.compatibility?.candidates.find((c) => targetKey(c.target) === targetKey(to));
    if (match?.status === "forbidden") {
      this.finish();
      r.painter!.status.textContent = `Connection unavailable${match.explanationRef && r.adapter?.describeExplanation?.(match.explanationRef) ? `: ${r.adapter.describeExplanation(match.explanationRef)}` : "."}`;
      return;
    }
    const args: IntentArgs = d.reconnect
      ? { kind: "reconnect", ...d.reconnect, to }
      : { kind: "connect", from: d.from, to };
    this.finish(true);
    r.submit(args, d.capture, d.basis, d.id);
  }
  private queryCompatibility(): void {
    const d = this.draft,
      r = this.root;
    if (!d?.from || !r.index?.scene.offers.compatibility) return;
    d.queryId = crypto.randomUUID();
    r.emit("goo-patch-query", {
      kind: "compatibility",
      from: d.from,
      basis: r.basis,
      queryId: d.queryId,
      gestureId: d.id,
    });
  }
  compatibility(result: CompatibilityResult): void {
    const d = this.draft,
      r = this.root;
    if (
      !d?.from ||
      result.queryId !== d.queryId ||
      result.gestureId !== d.id ||
      targetKey(result.from) !== targetKey(d.from) ||
      !sameBasis(result.basis, r.basis) ||
      !r.editable
    )
      return;
    this.clearCompatibility();
    d.compatibility = result;
    for (const candidate of result.candidates) {
      const port = r.dom?.ports.get(candidate.target.node)?.get(candidate.target.port);
      if (port && r.index?.anchor(candidate.target)) port.dataset.compatibility = candidate.status;
    }
  }
  reconcile(retired: readonly Target[]): void {
    const d = this.draft,
      r = this.root;
    if (!d) return;
    const targets = [
      ...(d.nodes?.map((n) => n.target) ?? []),
      ...(d.from ? [d.from] : []),
      ...(d.reconnect ? [d.reconnect.connection] : []),
    ];
    if (
      targets.some(
        (t) => !r.index?.region(t) || retired.some((x) => targetKey(x) === targetKey(t)),
      ) ||
      (d.reconnect &&
        r.index?.connections.get(d.reconnect.connection.connection)?.topologyRef !==
          d.reconnect.topologyRef)
    ) {
      this.cancel("target-retired");
      return;
    }
    this.clearCompatibility();
    if (d.from) this.queryCompatibility();
  }
  private clearCompatibility(): void {
    if (this.draft) this.draft.compatibility = undefined;
    for (const ports of this.root.dom?.ports.values() ?? [])
      for (const port of ports.values()) port.removeAttribute("data-compatibility");
  }
  private wheel(e: WheelEvent): void {
    const control = this.control(e);
    if (
      !control ||
      !control.matches("[data-patch-background],[data-patch-select],[data-patch-handle]") ||
      e.ctrlKey ||
      e.metaKey
    )
      return;
    const r = this.root,
      v = r.viewport({ x: e.clientX, y: e.clientY });
    if (!v) return;
    const factor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.clientHeight : 1;
    e.preventDefault();
    if (e.altKey) r.zoomAt(v, Math.exp(-e.deltaY * factor * 0.002));
    else {
      const c = r.getCamera(),
        m = r.mapping()!;
      r.setCamera({
        ...c,
        tx: c.tx - (e.deltaX * factor) / m.sx,
        ty: c.ty - (e.deltaY * factor) / m.sy,
      });
    }
    if (this.draft) this.schedule();
  }
  private finish(keepCapture = false): void {
    if (!keepCapture && this.draft?.capture)
      this.root.adapter?.discardCapture?.(this.draft.capture);
    this.clearCompatibility();
    this.draft = undefined;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastTime = 0;
    this.origins.clear();
    this.wire = undefined;
    this.box = undefined;
    this.guides = undefined;
    this.hover?.removeAttribute("data-hover");
    this.hover = undefined;
    for (const id of this.pointers.keys()) {
      if (this.root.hasPointerCapture(id)) this.root.releasePointerCapture(id);
    }
    this.pointers.clear();
    this.root.rebuildOrigins();
  }
  cancel(_reason: string): void {
    if (this.picker) this.root.adapter?.discardCapture?.(this.picker.capture);
    this.picker = undefined;
    this.finish();
    this.space = false;
    this.boxCorner = undefined;
  }
}
