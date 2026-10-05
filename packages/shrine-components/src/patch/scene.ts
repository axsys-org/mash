import type {
  Basis,
  SceneSnapshot,
  NodeRecord,
  ConnectionRecord,
  PortTarget,
  Target,
  Rect,
  Point,
  HitResult,
  RouteSegment,
} from "./contract.js";
import {
  add,
  same,
  contains,
  pathBounds,
  flatten,
  distance,
  SpatialIndex,
  union,
  deformation,
  sub,
} from "./geometry.js";
export function immutable<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}
const fail = (): never => {
  throw new Error("invalid-scene");
};
const number = (n: number): void => {
  if (!Number.isFinite(n) || Math.abs(n) > 1e9) fail();
};
const str = (s: string): void => {
  if (typeof s !== "string" || !s.length || s.length > 4096) fail();
};
const bool = (b: boolean): void => {
  if (typeof b !== "boolean") fail();
};
const point = (p: Point): void => {
  number(p.x);
  number(p.y);
};
const rect = (r: Rect): void => {
  point(r);
  number(r.width);
  number(r.height);
  if (r.width < 0 || r.height < 0) fail();
};
function unique<T extends { readonly key: string }>(xs: readonly T[]): void {
  if (!Array.isArray(xs) || xs.length > 20000) fail();
  const keys = new Set();
  for (const x of xs) {
    str(x.key);
    if (keys.has(x.key)) fail();
    keys.add(x.key);
  }
}
const identity = (x: { key: string; lifetime: string; selectorRef: string }): void => {
  str(x.key);
  str(x.lifetime);
  str(x.selectorRef);
};
const option = (v: unknown, values: readonly unknown[]): void => {
  if (v !== undefined && !values.includes(v)) fail();
};
/** Validate at the trust boundary before any DOM mutation; endpoint epsilon 1e-7 CSS px. */
export function validateScene(input: unknown): SceneSnapshot {
  try {
    const encoded = JSON.stringify(input);
    if (!encoded || encoded.length > 16 * 1024 * 1024) fail();
    const s = JSON.parse(encoded) as SceneSnapshot;
    if (s.header.protocol !== 1 || !Number.isSafeInteger(s.header.viewSeq) || s.header.viewSeq < 0)
      fail();
    for (const k of ["surface", "encounter", "sourceRev", "layoutRev", "rendererEpoch"] as const)
      str(s.header[k]);
    rect(s.extent);
    unique(s.nodes);
    unique(s.connections);
    const p = s.policy;
    for (const k of [
      "minScale",
      "maxScale",
      "dragThresholdPx",
      "touchDragThresholdPx",
      "snapTolerancePx",
      "portTolerancePx",
      "touchPortTolerancePx",
      "wireTolerancePx",
      "autoPanBandPx",
      "autoPanMaxPxPerSecond",
    ] as const) {
      number(p[k]);
      if (p[k] < 0) fail();
    }
    if (p.minScale <= 0 || p.maxScale < p.minScale) fail();
    bool(p.alignmentSnap);
    if (p.grid) {
      point(p.grid.origin);
      point(p.grid.step);
      if (p.grid.step.x <= 0 || p.grid.step.y <= 0) fail();
    }
    if ("kind" in s.initialCamera) {
      if (s.initialCamera.kind !== "fit") fail();
      number(s.initialCamera.paddingPx);
      if (s.initialCamera.paddingPx < 0) fail();
    } else {
      number(s.initialCamera.tx);
      number(s.initialCamera.ty);
      number(s.initialCamera.scale);
      if (s.initialCamera.scale < p.minScale || s.initialCamera.scale > p.maxScale) fail();
    }
    for (const v of Object.values(s.offers)) str(v);
    const nodes = new Map(s.nodes.map((n) => [n.key, n]));
    for (const n of s.nodes) {
      identity(n);
      rect(n.rect);
      number(n.z);
      bool(n.draggable);
      if (!["node", "proxy"].includes(n.presentation)) fail();
      unique(n.ports);
      for (const p of n.ports) {
        identity(p);
        point(p.anchor);
        point(p.outward);
        rect(p.hitRect);
        bool(p.connectable);
        if (Math.abs(Math.hypot(p.outward.x, p.outward.y) - 1) > 1e-7) fail();
        option(p.direction, ["input", "output", "bidirectional", "neutral"]);
      }
    }
    const anchor = (t: PortTarget): Point => {
      if (t.kind !== "port") fail();
      const n = nodes.get(t.node);
      const p = n?.ports.find((p) => p.key === t.port);
      if (!n || !p || n.lifetime !== t.nodeLifetime || p.lifetime !== t.lifetime) fail();
      return add(n!.rect, p!.anchor);
    };
    let commands = 0;
    for (const c of s.connections) {
      identity(c);
      str(c.topologyRef);
      number(c.z);
      bool(c.reconnectable);
      bool(c.disconnectable);
      unique(c.endpoints);
      unique(c.junctions);
      unique(c.segments);
      unique(c.parts);
      unique(c.labels);
      if (c.endpoints.length < 2) fail();
      const ends = new Map(c.endpoints.map((e) => [e.key, anchor(e.port)])),
        junctions = new Map(c.junctions.map((j) => [j.key, j.point]));
      const parts = new Set(c.parts.map((p) => p.key));
      c.parts.forEach(identity);
      for (const j of c.junctions) {
        point(j.point);
        option(j.marker, ["none", "dot"]);
      }
      for (const l of c.labels) {
        rect(l.rect);
        if (l.part !== undefined && !parts.has(l.part)) fail();
      }
      for (const seg of c.segments) {
        if (
          !Array.isArray(seg.commands) ||
          seg.commands.length < 2 ||
          (commands += seg.commands.length) > 200000
        )
          fail();
        if (seg.part !== undefined && !parts.has(seg.part)) fail();
        option(seg.startMarker, ["none", "arrow", "dot"]);
        option(seg.endMarker, ["none", "arrow", "dot"]);
        for (const [i, cmd] of seg.commands.entries()) {
          if (i === 0 ? cmd.op !== "M" : !["L", "C"].includes(cmd.op)) fail();
          point(cmd.to);
          if (cmd.op === "C") {
            point(cmd.c1);
            point(cmd.c2);
          }
        }
        const resolve = (e: RouteSegment["from"]): Point | undefined => {
          if (!["endpoint", "junction"].includes(e.kind)) fail();
          return (e.kind === "endpoint" ? ends : junctions).get(e.key);
        };
        const from = resolve(seg.from),
          to = resolve(seg.to);
        if (!from || !to || !same(seg.commands[0]!.to, from) || !same(seg.commands.at(-1)!.to, to))
          fail();
      }
    }
    return immutable(s);
  } catch {
    throw new Error("invalid-scene");
  }
}
export const sameBasis = (a: Basis, b: Basis): boolean =>
  ["surface", "encounter", "viewSeq", "sourceRev", "layoutRev"].every(
    (key) => a[key as keyof Basis] === b[key as keyof Basis],
  );
export const nodeTarget = (n: NodeRecord): Target => ({
  kind: "node",
  node: n.key,
  lifetime: n.lifetime,
});
export const portTarget = (n: NodeRecord, p: NodeRecord["ports"][number]): PortTarget => ({
  kind: "port",
  node: n.key,
  nodeLifetime: n.lifetime,
  port: p.key,
  lifetime: p.lifetime,
});
export const connectionTarget = (c: ConnectionRecord): Target => ({
  kind: "connection",
  connection: c.key,
  lifetime: c.lifetime,
});
export const targetKey = (t: Target): string =>
  JSON.stringify(
    t.kind === "node"
      ? [t.kind, t.node, t.lifetime]
      : t.kind === "port"
        ? [t.kind, t.node, t.nodeLifetime, t.port, t.lifetime]
        : t.kind === "connection"
          ? [t.kind, t.connection, t.lifetime]
          : [t.kind, t.connection, t.connectionLifetime, t.part, t.lifetime],
  );
interface PickEntry {
  target: Target;
  selectorRef: string;
  rect: Rect;
  z: number;
  order: number;
  segment?: RouteSegment;
  node?: NodeRecord;
  port?: NodeRecord["ports"][number];
  connectionKey?: string;
}
export class SceneIndex {
  readonly nodes: Map<string, NodeRecord>;
  readonly connections: Map<string, ConnectionRecord>;
  readonly incident = new Map<string, Set<string>>();
  readonly spatial = new SpatialIndex<PickEntry>();
  private curves = new WeakMap<RouteSegment, { bucket: number; points: Point[] }>();
  private nodeOrder = new Map<string, number>();
  private connectionOrder = new Map<string, number>();
  private previewSpatial = new SpatialIndex<PickEntry>();
  private moved = new Set<string>();
  private changedConnections = new Set<string>();
  constructor(readonly scene: SceneSnapshot) {
    this.nodes = new Map(scene.nodes.map((n) => [n.key, n]));
    this.connections = new Map(scene.connections.map((c) => [c.key, c]));
    scene.nodes.forEach((n, order) => {
      this.nodeOrder.set(n.key, order);
      this.incident.set(n.key, new Set());
      this.spatial.insert(n.rect, {
        target: nodeTarget(n),
        selectorRef: n.selectorRef,
        rect: n.rect,
        z: n.z,
        order,
        node: n,
      });
      for (const p of n.ports) {
        const r = { ...p.hitRect, ...add(n.rect, p.hitRect) };
        this.spatial.insert(r, {
          target: portTarget(n, p),
          selectorRef: p.selectorRef,
          rect: r,
          z: n.z,
          order,
          node: n,
          port: p,
        });
      }
    });
    scene.connections.forEach((c, order) => {
      this.connectionOrder.set(c.key, order);
      for (const e of c.endpoints) this.incident.get(e.port.node)!.add(c.key);
      for (const s of c.segments) {
        const p = c.parts.find((p) => p.key === s.part);
        const target: Target = p
          ? {
              kind: "connection-part",
              connection: c.key,
              connectionLifetime: c.lifetime,
              part: p.key,
              lifetime: p.lifetime,
            }
          : connectionTarget(c);
        const r = pathBounds(s.commands);
        this.spatial.insert(r, {
          target,
          selectorRef: p?.selectorRef ?? c.selectorRef,
          rect: r,
          z: c.z,
          order,
          segment: s,
          connectionKey: c.key,
        });
      }
    });
  }
  node(t: Target): NodeRecord | undefined {
    if (t.kind !== "node" && t.kind !== "port") return undefined;
    const n = this.nodes.get(t.node);
    return n?.lifetime === (t.kind === "node" ? t.lifetime : t.nodeLifetime) ? n : undefined;
  }
  anchor(t: PortTarget): Point | null {
    const n = this.node(t),
      p = n?.ports.find((p) => p.key === t.port && p.lifetime === t.lifetime);
    return n && p ? add(n.rect, p.anchor) : null;
  }
  region(t: Target): Rect | null {
    if (t.kind === "node") return this.node(t)?.rect ?? null;
    if (t.kind === "port") {
      const n = this.node(t),
        p = n?.ports.find((p) => p.key === t.port && p.lifetime === t.lifetime);
      return n && p ? { ...p.hitRect, ...add(n.rect, p.hitRect) } : null;
    }
    const c = this.connections.get(t.connection);
    if (!c || c.lifetime !== (t.kind === "connection" ? t.lifetime : t.connectionLifetime))
      return null;
    if (
      t.kind === "connection-part" &&
      !c.parts.some((p) => p.key === t.part && p.lifetime === t.lifetime)
    )
      return null;
    return union(
      c.segments
        .filter((s) => t.kind === "connection" || s.part === t.part)
        .map((s) => pathBounds(s.commands)),
    );
  }
  preview(origins: ReadonlyMap<string, Point>): void {
    this.previewSpatial = new SpatialIndex();
    this.moved = new Set(origins.keys());
    this.changedConnections = new Set();
    const offsets = new Map<string, Point>();
    for (const [key, origin] of origins) {
      const n = this.nodes.get(key);
      if (!n) continue;
      offsets.set(key, sub(origin, n.rect));
      const shifted = { ...n, rect: { ...n.rect, ...origin } },
        order = this.nodeOrder.get(n.key)!;
      this.previewSpatial.insert(shifted.rect, {
        target: nodeTarget(n),
        selectorRef: n.selectorRef,
        rect: shifted.rect,
        z: n.z,
        order,
        node: shifted,
      });
      for (const p of n.ports) {
        const r = { ...p.hitRect, ...add(origin, p.hitRect) };
        this.previewSpatial.insert(r, {
          target: portTarget(n, p),
          selectorRef: p.selectorRef,
          rect: r,
          z: n.z,
          order,
          node: shifted,
          port: p,
        });
      }
      for (const key of this.incident.get(n.key) ?? []) this.changedConnections.add(key);
    }
    for (const key of this.changedConnections) {
      const c = this.connections.get(key)!;
      for (const s of c.segments) {
        const p = c.parts.find((p) => p.key === s.part);
        const target: Target = p
          ? {
              kind: "connection-part",
              connection: c.key,
              connectionLifetime: c.lifetime,
              part: p.key,
              lifetime: p.lifetime,
            }
          : connectionTarget(c);
        const segment = { ...s, commands: deformation(c, s, offsets) },
          r = pathBounds(segment.commands);
        this.previewSpatial.insert(r, {
          target,
          selectorRef: p?.selectorRef ?? c.selectorRef,
          rect: r,
          z: c.z,
          order: this.connectionOrder.get(c.key)!,
          segment,
          connectionKey: c.key,
        });
      }
    }
  }
  near(rect: Rect, tolerance: number): NodeRecord[] {
    return [
      ...new Set(
        [
          ...this.spatial.query({
            x: rect.x - tolerance,
            y: rect.y - tolerance,
            width: rect.width + 2 * tolerance,
            height: rect.height + 2 * tolerance,
          }),
        ].flatMap((e) => (e.node ? [e.node] : [])),
      ),
    ];
  }
  pick(p: Point, scale: number, touch = false): HitResult | null {
    const tolerance =
      (touch ? this.scene.policy.touchPortTolerancePx : this.scene.policy.portTolerancePx) / scale;
    const wire = this.scene.policy.wireTolerancePx / scale,
      max = Math.max(tolerance, wire);
    const area = { x: p.x - max, y: p.y - max, width: 2 * max, height: 2 * max };
    const candidates = [
      ...[...this.spatial.query(area)].filter((e) =>
        e.node ? !this.moved.has(e.node.key) : !this.changedConnections.has(e.connectionKey!),
      ),
      ...this.previewSpatial.query(area),
    ].sort((a, b) => b.z - a.z || b.order - a.order);
    const opaque = candidates.find((e) => e.node && !e.port && contains(e.rect, p));
    const port = candidates.find(
      (e) =>
        e.port &&
        (!opaque || e.node === opaque.node) &&
        (contains(e.rect, p) ||
          Math.hypot(
            p.x - (e.node!.rect.x + e.port.anchor.x),
            p.y - (e.node!.rect.y + e.port.anchor.y),
          ) <= tolerance),
    );
    const result =
      port ??
      opaque ??
      candidates.find((e) => {
        if (!e.segment) return false;
        const bucket = 2 ** Math.ceil(Math.log2(scale));
        let cache = this.curves.get(e.segment);
        if (!cache || cache.bucket !== bucket) {
          cache = { bucket, points: flatten(e.segment.commands, 0.5 / bucket) };
          this.curves.set(e.segment, cache);
        }
        return cache.points.some((b, i) => i > 0 && distance(p, cache!.points[i - 1]!, b) <= wire);
      });
    return result
      ? { target: result.target, selectorRef: result.selectorRef, worldPoint: p }
      : null;
  }
}
