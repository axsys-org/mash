import type {
  Camera,
  Point,
  Rect,
  PathCommand,
  ConnectionRecord,
  RouteSegment,
} from "./contract.js";
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const same = (a: Point, b: Point, epsilon = 1e-7): boolean =>
  Math.hypot(a.x - b.x, a.y - b.y) <= epsilon;
export const inverse = (p: Point, c: Camera): Point => ({
  x: (p.x - c.tx) / c.scale,
  y: (p.y - c.ty) / c.scale,
});
export const forward = (p: Point, c: Camera): Point => ({
  x: p.x * c.scale + c.tx,
  y: p.y * c.scale + c.ty,
});
export const zoom = (c: Camera, p: Point, scale: number): Camera => {
  const w = inverse(p, c);
  return { scale, tx: p.x - w.x * scale, ty: p.y - w.y * scale };
};
export const intersects = (a: Rect, b: Rect): boolean =>
  a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
export const contains = (r: Rect, p: Point): boolean =>
  intersects(r, { ...p, width: 0, height: 0 });
export function bounds(points: readonly Point[]): Rect {
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const p of points) {
    x = Math.min(x, p.x);
    y = Math.min(y, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  return { x, y, width: right - x, height: bottom - y };
}
export const union = (rects: readonly Rect[]): Rect =>
  bounds(rects.flatMap((r) => [r, { x: r.x + r.width, y: r.y + r.height }]));
export function fitCamera(
  r: Rect,
  width: number,
  height: number,
  padding: number,
  min: number,
  max: number,
): Camera | null {
  if (width <= 0 || height <= 0) return null;
  const scale = Math.max(
    min,
    Math.min(
      max,
      r.width ? Math.max(1, width - padding * 2) / r.width : 1,
      r.height ? Math.max(1, height - padding * 2) / r.height : 1,
    ),
  );
  return {
    scale,
    tx: width / 2 - (r.x + r.width / 2) * scale,
    ty: height / 2 - (r.y + r.height / 2) * scale,
  };
}
export function distance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    d = dx * dx + dy * dy;
  const t = d ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / d)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
/** Convex-hull flatness bounds curve/chord distance by epsilon world units. */
export function flatten(commands: readonly PathCommand[], epsilon: number): Point[] {
  const result: Point[] = [];
  function cubic(a: Point, b: Point, c: Point, d: Point, depth = 0): void {
    if (result.length > 8192) throw new Error("curve-complexity");
    if (Math.max(distance(b, a, d), distance(c, a, d)) <= epsilon) {
      result.push(d);
      return;
    }
    if (depth >= 24) throw new Error("curve-complexity");
    const ab = mid(a, b),
      bc = mid(b, c),
      cd = mid(c, d),
      abc = mid(ab, bc),
      bcd = mid(bc, cd),
      m = mid(abc, bcd);
    cubic(a, ab, abc, m, depth + 1);
    cubic(m, bcd, cd, d, depth + 1);
  }
  for (const c of commands) {
    if (c.op === "C") cubic(result.at(-1)!, c.c1, c.c2, c.to);
    else result.push(c.to);
  }
  return result;
}
export const pathData = (commands: readonly PathCommand[]): string =>
  commands
    .map((c) =>
      c.op === "C"
        ? `C ${c.c1.x} ${c.c1.y} ${c.c2.x} ${c.c2.y} ${c.to.x} ${c.to.y}`
        : `${c.op} ${c.to.x} ${c.to.y}`,
    )
    .join(" ");
export const pathBounds = (commands: readonly PathCommand[]): Rect =>
  bounds(commands.flatMap((c) => (c.op === "C" ? [c.c1, c.c2, c.to] : [c.to])));
export function deformation(
  c: ConnectionRecord,
  s: RouteSegment,
  offsets: ReadonlyMap<string, Point>,
): readonly PathCommand[] {
  const displacements = c.endpoints.map((e) => offsets.get(e.port.node) ?? { x: 0, y: 0 });
  const whole =
    displacements[0] && displacements.every((p) => same(p, displacements[0]!))
      ? displacements[0]
      : null;
  const end = (ref: RouteSegment["from"]): Point =>
    ref.kind === "endpoint"
      ? (offsets.get(c.endpoints.find((e) => e.key === ref.key)!.port.node) ?? { x: 0, y: 0 })
      : { x: 0, y: 0 };
  const start = end(s.from),
    finish = end(s.to);
  return s.commands.map((cmd, i) => {
    const delta =
      whole ?? (i === 0 ? start : i === s.commands.length - 1 ? finish : { x: 0, y: 0 });
    if (cmd.op === "C")
      return {
        ...cmd,
        to: add(cmd.to, delta),
        c1: add(cmd.c1, whole ?? (i === 1 ? start : { x: 0, y: 0 })),
        c2: add(cmd.c2, whole ?? (i === s.commands.length - 1 ? finish : { x: 0, y: 0 })),
      };
    return { ...cmd, to: add(cmd.to, delta) };
  });
}
/** Uniform cells with a bounded overflow set for long paths; no key interpolation. */
export class SpatialIndex<T> {
  private cells = new Map<number, Map<number, Set<T>>>();
  private overflow = new Set<T>();
  insert(r: Rect, value: T): void {
    const x0 = Math.floor(r.x / 128),
      x1 = Math.floor((r.x + r.width) / 128),
      y0 = Math.floor(r.y / 128),
      y1 = Math.floor((r.y + r.height) / 128);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 256) {
      this.overflow.add(value);
      return;
    }
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        let column = this.cells.get(x);
        if (!column) this.cells.set(x, (column = new Map()));
        let cell = column.get(y);
        if (!cell) column.set(y, (cell = new Set()));
        cell.add(value);
      }
  }
  query(r: Rect): Set<T> {
    const found = new Set(this.overflow);
    const x0 = Math.floor(r.x / 128),
      x1 = Math.floor((r.x + r.width) / 128),
      y0 = Math.floor(r.y / 128),
      y1 = Math.floor((r.y + r.height) / 128);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4096) {
      for (const col of this.cells.values())
        for (const cell of col.values()) for (const v of cell) found.add(v);
      return found;
    }
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) for (const v of this.cells.get(x)?.get(y) ?? []) found.add(v);
    return found;
  }
}
