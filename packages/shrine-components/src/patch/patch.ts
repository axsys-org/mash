import type {
  Basis,
  Camera,
  CompatibilityResult,
  HitResult,
  IntentArgs,
  OperationReceipt,
  PatchEventDetailMap,
  PatchIntent,
  PatchSurfaceAPI,
  Point,
  PortTarget,
  ProjectedRegion,
  SceneSnapshot,
  Target,
} from "./contract.js";
import type { CapturedActivation, PatchAdapter, ProjectionFrame } from "./adapter.js";
import { bindAdapter, offerFor } from "./adapter.js";
import { SceneIndex, immutable, targetKey, validateScene } from "./scene.js";
import { Painter, mapDOM, type OwnedDOM, svg } from "./render.js";
import {
  add,
  sub,
  inverse,
  fitCamera,
  union,
  zoom,
  same,
  deformation,
  pathBounds,
} from "./geometry.js";
import { Gestures } from "./gestures.js";
function axisAligned(root: Element): boolean {
  for (
    let e: Element | null = root;
    e;
    e =
      e.assignedSlot ??
      e.parentElement ??
      (e.getRootNode() instanceof ShadowRoot ? (e.getRootNode() as ShadowRoot).host : null)
  ) {
    const transform = getComputedStyle(e).transform;
    if (transform !== "none") {
      const m = new DOMMatrixReadOnly(transform);
      if (!m.is2D || Math.abs(m.b) > 1e-8 || Math.abs(m.c) > 1e-8 || m.a <= 0 || m.d <= 0)
        return false;
    }
  }
  return true;
}
function eventFor<K extends keyof PatchEventDetailMap>(
  name: K,
  detail: PatchEventDetailMap[K],
): CustomEvent {
  return new CustomEvent(name, {
    detail: immutable(structuredClone(detail)),
    bubbles: true,
    composed: true,
  });
}
interface Pending {
  intent: PatchIntent;
  state: "submitted" | "accepted" | "unknown";
  origins: Map<string, Point>;
  dismissed?: boolean;
}
/**
 * Server-resolved Goo surface; semantic owners and transport remain in Goo.
 * @tag goo-patch
 * @summary Realizes resolved patch geometry with coherent projection admission.
 * @slot - Server-owned node and connection occurrences.
 * @slot controls - Ordinary Goo outline, connection table and offered controls.
 * @csspart root - The transformed world frame; do not alter resolved geometry.
 * @csspart background - The dedicated background interaction plane.
 * @csspart wires - Decorative resolved wire SVG.
 * @csspart overlay - Pointer-transparent gesture feedback.
 * @csspart navigation - Native camera and selection controls.
 * @csspart controls - Server-owned ordinary Goo controls slot.
 * @csspart status - Polite discrete feedback.
 * @fires goo-patch-selection - Proposes occurrence selection to the owning Goo port.
 * @fires goo-patch-intent - Activates a previously captured Goo binding.
 * @fires goo-patch-query - Requests an ordinary Goo compatibility or contextual presentation.
 * @fires goo-patch-viewport - Reports the debounced local camera viewport.
 * @fires goo-patch-diagnostic - Reports a bounded presentation diagnostic.
 * @example Server-owned patch
 * <goo-patch aria-label="Patch surface"><p slot="controls">Awaiting a server projection.</p></goo-patch>
 * @mashnode root root
 * @mashnode content content root
 * @mashrole slot default content content
 * @mashrole slot controls control root
 */
export class GooPatch extends HTMLElement implements PatchSurfaceAPI {
  index?: SceneIndex;
  dom?: OwnedDOM;
  painter?: Painter;
  adapter?: PatchAdapter;
  readonly pending = new Map<string, Pending>();
  readonly origins = new Map<string, Point>();
  selection: readonly Target[] = [];
  private camera: Camera = { tx: 0, ty: 0, scale: 1 };
  private seeded = false;
  private retired = false;
  private suspended = false;
  private inconsistent = false;
  private listeners?: AbortController;
  private stopAdapter?: () => void;
  private resize?: ResizeObserver;
  private deferred?: ProjectionFrame;
  private viewportTimer?: ReturnType<typeof setTimeout>;
  private viewportEpoch = 0;
  readonly gestures = new Gestures(this);
  get basis(): Basis {
    if (!this.index) throw new Error("invalid-scene");
    const { surface, encounter, viewSeq, sourceRev, layoutRev } = this.index.scene.header;
    return { surface, encounter, viewSeq, sourceRev, layoutRev };
  }
  get editable(): boolean {
    return (
      !!this.index &&
      !this.retired &&
      !this.suspended &&
      !this.inconsistent &&
      !!this.adapter?.live(this.basis)
    );
  }
  get installedScene(): SceneSnapshot | undefined {
    return this.index?.scene;
  }
  connectedCallback(): void {
    if (this.index && !this.retired) this.resume();
  }
  disconnectedCallback(): void {
    this.suspend();
  }
  connectedMoveCallback(): void {
    /* DOM relocation does not retire an encounter. */
  }
  attachAdapter(adapter: PatchAdapter): void {
    this.stopAdapter?.();
    this.adapter = adapter;
    this.stopAdapter = bindAdapter(this, adapter);
    this.availability();
  }
  /** Explicit hydration boundary: constructors/connection callbacks never read parser-incomplete children. */
  hydrate(adapter?: PatchAdapter): string {
    if (adapter) this.attachAdapter(adapter);
    const script = [...this.querySelectorAll<HTMLScriptElement>("script[data-patch-scene]")].find(
      (s) => s.closest("goo-patch") === this,
    );
    try {
      if (!script || script.textContent.length > 16 * 1024 * 1024) throw new Error();
      return this.admit({
        scene: JSON.parse(script.textContent),
        dom: { kind: "complete" },
        coveredOperationIds: [],
        prepare: () => ({ proposed: this, commit: () => {} }),
      });
    } catch {
      this.diagnostic("invalid-scene");
      return "rejected";
    }
  }
  admit(frame: ProjectionFrame): "installed" | "duplicate" | "rejected" | "deferred" {
    const old = this.index?.scene.header,
      h = frame.scene?.header;
    if (
      !frame.dom ||
      !["complete", "delta"].includes(frame.dom.kind) ||
      (frame.dom.kind === "delta" &&
        (!Number.isSafeInteger(frame.dom.baseViewSeq) || frame.dom.baseViewSeq < 0))
    ) {
      this.diagnostic("invalid-scene");
      return "rejected";
    }
    if (
      this.retired ||
      !h ||
      (old && (h.surface !== old.surface || h.encounter !== old.encounter)) ||
      (this.adapter && !this.adapter.live(h))
    ) {
      this.diagnostic("target-retired");
      return "rejected";
    }
    if (
      old &&
      h.viewSeq <= old.viewSeq &&
      !(this.inconsistent && h.viewSeq === old.viewSeq && frame.dom.kind === "complete")
    ) {
      if (h.viewSeq === old.viewSeq) return "duplicate";
      this.diagnostic("stale-frame", false);
      return "rejected";
    }
    if (
      frame.dom.kind === "delta" &&
      (!old || old.viewSeq !== frame.dom.baseViewSeq || this.inconsistent)
    ) {
      this.diagnostic("missing-base");
      return "rejected";
    }
    let next: SceneIndex, prepared: ReturnType<ProjectionFrame["prepare"]>;
    try {
      next = new SceneIndex(validateScene(frame.scene));
      if (
        !Array.isArray(frame.coveredOperationIds) ||
        frame.coveredOperationIds.length > 20000 ||
        frame.coveredOperationIds.some((id) => typeof id !== "string" || id.length > 4096)
      )
        throw new Error();
      if (frame.retiredTargets !== undefined) {
        if (!Array.isArray(frame.retiredTargets) || frame.retiredTargets.length > 20000)
          throw new Error("invalid-scene");
        for (const target of frame.retiredTargets) {
          const fields =
            target.kind === "node"
              ? ["node", "lifetime"]
              : target.kind === "port"
                ? ["node", "nodeLifetime", "port", "lifetime"]
                : target.kind === "connection"
                  ? ["connection", "lifetime"]
                  : target.kind === "connection-part"
                    ? ["connection", "connectionLifetime", "part", "lifetime"]
                    : [];
          if (
            !fields.length ||
            fields.some((key) => {
              const value = (target as unknown as Record<string, unknown>)[key];
              return typeof value !== "string" || !value.length || value.length > 4096;
            })
          )
            throw new Error("invalid-scene");
        }
      }
      if (this.adapter?.composing()) {
        this.deferred = frame;
        return "deferred";
      }
      prepared = frame.prepare(next.scene);
      mapDOM(prepared.proposed, next.scene);
    } catch {
      this.diagnostic("invalid-scene");
      return "rejected";
    }
    const focused = this.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)
      : null;
    try {
      // No await in this presentation batch. Unexpected mutation failures fail closed.
      prepared.commit();
      const dom = mapDOM(this, next.scene);
      this.ensurePainter();
      this.index = next;
      this.dom = dom;
      for (const id of frame.coveredOperationIds) this.pending.delete(id);
      for (const [id, p] of this.pending)
        for (const key of p.origins.keys()) {
          const original =
            p.intent.args.kind === "move-nodes"
              ? p.intent.args.nodes.find((n) => n.target.node === key)?.target
              : undefined;
          if (!original || !next.region(original)) p.origins.delete(key);
          if (!p.origins.size && p.intent.args.kind === "move-nodes") this.pending.delete(id);
        }
      this.gestures.reconcile(frame.retiredTargets ?? []);
      this.painter!.install(next, dom);
      this.inconsistent = false;
      this.origins.clear();
      this.rebuildOrigins();
      this.setSelection(this.selection);
      this.seedCamera();
      this.painter!.camera(this.camera);
      if (focused && !focused.isConnected) {
        if (this.adapter?.focusRemoved) this.adapter.focusRemoved();
        else this.painter!.navigation.focus({ preventScroll: true });
      }
      this.resume();
      this.availability();
      return "installed";
    } catch {
      this.inconsistent = true;
      this.cancelGesture("projection-failed");
      this.diagnostic("projection-failed");
      this.availability();
      return "rejected";
    }
  }
  flushDeferred(): void {
    const frame = this.deferred;
    this.deferred = undefined;
    if (frame) this.admit(frame);
  }
  private ensurePainter(): void {
    if (!this.painter) {
      this.painter = new Painter(this.shadowRoot ?? this.attachShadow({ mode: "open" }));
      if (!this.hasAttribute("role")) this.setAttribute("role", "region");
      if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby"))
        this.setAttribute("aria-label", "Patch surface");
    }
  }
  resume(): void {
    if (this.retired || !this.index || !this.isConnected) return;
    this.suspended = false;
    if (!this.listeners) {
      this.listeners = new AbortController();
      this.gestures.listen(this.listeners.signal);
      this.resize = new ResizeObserver(() => {
        this.seedCamera();
        this.noticeViewport();
      });
      this.resize.observe(this);
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) this.cancelGesture("hidden");
        },
        { signal: this.listeners.signal },
      );
      window.addEventListener("blur", () => this.cancelGesture("blur"), {
        signal: this.listeners.signal,
      });
    }
    this.seedCamera();
    this.availability();
  }
  suspend(): void {
    this.suspended = true;
    this.cancelGesture("suspended");
    this.listeners?.abort();
    this.listeners = undefined;
    this.resize?.disconnect();
    clearTimeout(this.viewportTimer);
    this.viewportTimer = undefined;
  }
  retire(): void {
    this.retired = true;
    this.suspend();
    this.deferred = undefined;
    this.stopAdapter?.();
    this.stopAdapter = undefined;
    this.pending.clear();
    this.origins.clear();
    this.drawPreviews();
    this.availability();
  }
  private availability(): void {
    this.toggleAttribute("data-editing-unavailable", !this.editable);
    if (this.painter && !this.editable)
      this.painter.status.textContent = this.inconsistent
        ? "Presentation unavailable; requesting repair."
        : "Editing unavailable.";
    else if (this.painter && this.painter.status.textContent === "Editing unavailable.")
      this.painter.status.textContent = "";
  }
  emit<K extends keyof PatchEventDetailMap>(name: K, detail: PatchEventDetailMap[K]): void {
    this.dispatchEvent(eventFor(name, detail));
  }
  diagnostic(code: string, repair = true): void {
    const messages: Record<string, string> = {
      "invalid-scene": "Invalid presentation.",
      "stale-frame": "Older presentation ignored.",
      "missing-base": "Presentation base missing.",
      "target-retired": "Target no longer available.",
      "binding-unavailable": "Editing unavailable.",
      "projection-failed": "Presentation failed; repair required.",
      "outcome-unknown": "Outcome unknown; reconciling.",
    };
    const message = messages[code] ?? code;
    if (this.painter) this.painter.status.textContent = message;
    this.emit("goo-patch-diagnostic", { code, message });
    if (repair) this.adapter?.repair(code);
  }
  mapping(): {
    left: number;
    top: number;
    sx: number;
    sy: number;
    width: number;
    height: number;
  } | null {
    const r = this.getBoundingClientRect(),
      width = this.clientWidth,
      height = this.clientHeight;
    if (width <= 0 || height <= 0 || r.width <= 0 || r.height <= 0) return null;
    if (!axisAligned(this)) return null;
    return {
      left: r.left + (this.clientLeft * r.width) / this.offsetWidth,
      top: r.top + (this.clientTop * r.height) / this.offsetHeight,
      sx: r.width / this.offsetWidth,
      sy: r.height / this.offsetHeight,
      width,
      height,
    };
  }
  viewport(p: Point): Point | null {
    const m = this.mapping();
    return m ? { x: (p.x - m.left) / m.sx, y: (p.y - m.top) / m.sy } : null;
  }
  world(p: Point): Point | null {
    const v = this.viewport(p);
    return v ? inverse(v, this.camera) : null;
  }
  effectiveScale(): number {
    const m = this.mapping();
    return this.camera.scale * (m ? Math.min(m.sx, m.sy) : 1);
  }
  pick(clientPoint: Point): HitResult | null {
    const p = this.world(clientPoint);
    try {
      return p && this.index ? this.index.pick(p, this.effectiveScale()) : null;
    } catch {
      this.inconsistent = true;
      this.cancelGesture("invalid-scene");
      this.diagnostic("invalid-scene");
      this.availability();
      return null;
    }
  }
  project(targets: readonly Target[]): readonly ProjectedRegion[] {
    return targets.flatMap((target) => {
      let bounds = this.index?.region(target);
      if (bounds && this.index) {
        if (target.kind === "node" || target.kind === "port") {
          const n = this.index.node(target)!,
            origin = this.origins.get(n.key);
          if (origin) bounds = { ...bounds, ...add(bounds, sub(origin, n.rect)) };
        } else {
          const connection = this.index.connections.get(target.connection)!;
          const offsets = new Map<string, Point>();
          for (const endpoint of connection.endpoints) {
            const origin = this.origins.get(endpoint.port.node);
            if (origin)
              offsets.set(
                endpoint.port.node,
                sub(origin, this.index.nodes.get(endpoint.port.node)!.rect),
              );
          }
          if (offsets.size)
            bounds = union(
              connection.segments
                .filter((segment) => target.kind === "connection" || segment.part === target.part)
                .map((segment) => pathBounds(deformation(connection, segment, offsets))),
            );
        }
      }
      return bounds ? [{ target, bounds, space: "world" as const }] : [];
    });
  }
  reveal(targets: readonly Target[]): "revealed" | "unrealized" {
    const regions = this.project(targets),
      m = this.mapping();
    if (regions.length !== targets.length || !m) return "unrealized";
    const r = union(regions.map((r) => r.bounds)),
      c = this.camera;
    const left = r.x * c.scale + c.tx,
      top = r.y * c.scale + c.ty,
      right = left + r.width * c.scale,
      bottom = top + r.height * c.scale;
    this.setCamera({
      ...c,
      tx: c.tx + (left < 0 ? -left : right > m.width ? m.width - right : 0),
      ty: c.ty + (top < 0 ? -top : bottom > m.height ? m.height - bottom : 0),
    });
    return "revealed";
  }
  fit(targets?: readonly Target[]): void {
    if (!this.index) return;
    const m = this.mapping();
    if (!m) return;
    const r = targets ? union(this.project(targets).map((p) => p.bounds)) : this.index.scene.extent;
    const c = fitCamera(
      r,
      m.width,
      m.height,
      32,
      this.index.scene.policy.minScale,
      this.index.scene.policy.maxScale,
    );
    if (c) this.setCamera(c);
  }
  private seedCamera(): void {
    if (this.seeded || !this.index || !this.mapping()) return;
    const initial = this.index.scene.initialCamera,
      m = this.mapping()!;
    const c =
      "kind" in initial
        ? fitCamera(
            this.index.scene.extent,
            m.width,
            m.height,
            initial.paddingPx,
            this.index.scene.policy.minScale,
            this.index.scene.policy.maxScale,
          )
        : initial;
    if (c) {
      this.seeded = true;
      this.setCamera(c);
    }
  }
  getCamera(): Camera {
    return { ...this.camera };
  }
  setCamera(c: Camera): void {
    if (!this.index || ![c.tx, c.ty, c.scale].every(Number.isFinite) || c.scale <= 0) return;
    const { minScale, maxScale } = this.index.scene.policy;
    this.camera = { ...c, scale: Math.max(minScale, Math.min(maxScale, c.scale)) };
    this.painter?.camera(this.camera);
    this.noticeViewport();
    this.gestures.cameraChanged();
  }
  zoomAt(p: Point, factor: number): void {
    if (!this.index) return;
    const { minScale, maxScale } = this.index.scene.policy;
    this.setCamera(
      zoom(this.camera, p, Math.max(minScale, Math.min(maxScale, this.camera.scale * factor))),
    );
  }
  private noticeViewport(): void {
    if (this.viewportTimer || this.retired || this.suspended) return;
    this.viewportTimer = setTimeout(() => {
      this.viewportTimer = undefined;
      const m = this.mapping();
      if (!m || !this.index) return;
      this.emit("goo-patch-viewport", {
        basis: this.basis,
        viewportEpoch: ++this.viewportEpoch,
        visibleWorldRect: {
          ...inverse({ x: 0, y: 0 }, this.camera),
          width: m.width / this.camera.scale,
          height: m.height / this.camera.scale,
        },
        scale: this.camera.scale,
      });
    }, 100);
  }
  setSelection(targets: readonly Target[]): void {
    this.selection = immutable(structuredClone(targets));
    if (!this.dom) return;
    const keys = new Set(targets.map(targetKey));
    for (const [key, el] of this.dom.nodes) {
      const n = this.index!.nodes.get(key)!;
      el.decorate(
        keys.has(targetKey({ kind: "node", node: key, lifetime: n.lifetime })),
        this.origins.has(key),
      );
    }
    const parts = new Map<string, Set<string>>();
    for (const target of targets)
      if (target.kind === "connection-part") {
        const selected = parts.get(target.connection) ?? new Set();
        selected.add(target.part);
        parts.set(target.connection, selected);
      }
    this.painter?.selectedConnections(
      new Set(
        targets.flatMap((target) => (target.kind === "connection" ? [target.connection] : [])),
      ),
      parts,
    );
  }
  requestSelection(
    targets: readonly Target[],
    mode: "replace" | "add" | "toggle",
    gestureId: string = crypto.randomUUID(),
  ): void {
    if (!this.editable) return;
    this.emit("goo-patch-selection", { basis: this.basis, targets, mode, gestureId });
  }
  cancelGesture(reason: string): void {
    this.gestures.cancel(reason);
  }
  receiveCompatibility(result: CompatibilityResult): void {
    this.gestures.compatibility(result);
  }
  receiveReceipt(receipt: OperationReceipt): void {
    if (
      this.retired ||
      !this.index ||
      receipt.surface !== this.basis.surface ||
      receipt.encounter !== this.basis.encounter
    )
      return;
    const p = this.pending.get(receipt.operationId);
    if (!p) return;
    if (receipt.outcome === "rejected") {
      this.pending.delete(receipt.operationId);
      if (this.painter)
        this.painter.status.textContent = `Rejected${receipt.explanationRef && this.adapter?.describeExplanation?.(receipt.explanationRef) ? `: ${this.adapter.describeExplanation(receipt.explanationRef)}` : "."}`;
      this.rebuildOrigins();
    } else if (receipt.outcome === "accepted") {
      p.state = "accepted";
      if (this.painter) this.painter.status.textContent = "Accepted; awaiting presentation.";
    } else if (p.state !== "accepted") {
      p.state = "unknown";
      this.diagnostic("outcome-unknown", false);
      this.adapter?.reconcileOperation(receipt.operationId);
    }
  }
  dismissPending(operationId: string): void {
    const pending = this.pending.get(operationId);
    if (pending?.state !== "unknown") return;
    pending.dismissed = true;
    pending.origins.clear();
    this.rebuildOrigins();
  }
  capture(kind: IntentArgs["kind"], targets: readonly Target[]): CapturedActivation | null {
    if (!this.editable || !this.index || this.pending.size >= 64) {
      this.diagnostic("binding-unavailable", false);
      return null;
    }
    const key = offerFor({ kind } as IntentArgs),
      offer = this.index.scene.offers[key];
    const capture = offer
      ? this.adapter!.capture(offer, immutable(this.basis), immutable(structuredClone(targets)))
      : null;
    if (!capture) this.diagnostic("binding-unavailable", false);
    return capture;
  }
  submit(args: IntentArgs, captured: CapturedActivation, basis: Basis, gestureId: string): void {
    if (!this.editable || this.pending.has(captured.operationId)) return;
    const intent = immutable({ args: structuredClone(args), ...captured, basis, gestureId });
    const origins = new Map<string, Point>();
    if (args.kind === "move-nodes")
      for (const n of args.nodes) origins.set(n.target.node, n.proposedOrigin);
    this.pending.set(intent.operationId, { intent, state: "submitted", origins });
    this.rebuildOrigins();
    this.emit("goo-patch-intent", intent);
  }
  busy(target: Target): boolean {
    for (const p of this.pending.values()) {
      const a = p.intent.args;
      if (
        a.kind === "move-nodes" &&
        (target.kind === "node" || target.kind === "port") &&
        a.nodes.some((n) => n.target.node === target.node)
      )
        return true;
      if (
        (a.kind === "reconnect" || a.kind === "disconnect") &&
        (target.kind === "connection" || target.kind === "connection-part") &&
        a.connection.connection === target.connection
      )
        return true;
    }
    return false;
  }
  rebuildOrigins(): void {
    const before = new Map(this.origins);
    this.origins.clear();
    for (const p of this.pending.values())
      for (const [key, o] of p.origins) this.origins.set(key, o);
    for (const [key, o] of this.gestures.origins) this.origins.set(key, o);
    this.paintOrigins(before);
    this.drawPreviews();
  }
  paintOrigins(before: ReadonlyMap<string, Point>): void {
    if (!this.index || !this.dom) return;
    const dirty = new Set<string>();
    for (const key of new Set([...before.keys(), ...this.origins.keys()])) {
      const a = before.get(key),
        b = this.origins.get(key);
      if (a && b && same(a, b)) continue;
      const n = this.index.nodes.get(key);
      if (!n) continue;
      this.painter!.node(this.index, this.dom, key, b ?? n.rect);
      this.dom.nodes.get(key)!.decorate(
        this.selection.some(
          (t) => t.kind === "node" && t.node === key && t.lifetime === n.lifetime,
        ),
        !!b,
      );
      for (const c of this.index.incident.get(key) ?? []) dirty.add(c);
    }
    for (const key of dirty) this.painter!.connection(this.index, this.dom, key, this.origins);
    if (dirty.size || before.size || this.origins.size) this.index.preview(this.origins);
  }
  anchor(target: PortTarget): Point | null {
    const base = this.index?.anchor(target);
    const n = this.index?.node(target),
      origin = this.origins.get(target.node);
    return base && n ? (origin ? add(base, sub(origin, n.rect)) : base) : null;
  }
  drawPreviews(): void {
    if (!this.painter) return;
    this.painter.overlay.replaceChildren();
    const line = (a: Point | null, b: Point | null): void => {
      if (!a || !b) return;
      const path = svg("path");
      path.setAttribute("d", `M ${a.x} ${a.y} L ${b.x} ${b.y}`);
      this.painter!.overlay.append(path);
    };
    for (const p of this.pending.values()) {
      if (p.dismissed) continue;
      const a = p.intent.args;
      if (a.kind === "connect") line(this.anchor(a.from), this.anchor(a.to));
      else if (a.kind === "reconnect") {
        const c = this.index?.connections.get(a.connection.connection),
          e = c?.endpoints.find((e) => e.key !== a.endpoint);
        if (e) line(this.anchor(e.port), this.anchor(a.to));
      }
    }
    const wire = this.gestures.wire;
    if (wire) line(this.anchor(wire.from), wire.to);
    const guides = this.gestures.guides,
      extent = this.index?.scene.extent;
    if (guides && extent) {
      if (guides.x !== undefined)
        line({ x: guides.x, y: extent.y }, { x: guides.x, y: extent.y + extent.height });
      if (guides.y !== undefined)
        line({ x: extent.x, y: guides.y }, { x: extent.x + extent.width, y: guides.y });
    }
    const box = this.gestures.box;
    if (box) {
      const r = svg("rect");
      for (const [k, v] of Object.entries(box)) r.setAttribute(k, String(v));
      this.painter.overlay.append(r);
    }
  }
}
