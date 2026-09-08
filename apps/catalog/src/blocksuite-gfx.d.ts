declare module "@blocksuite/global/gfx" {
  export type Point = [number, number];
  export type XYWH = [number, number, number, number];
  export type SerializedXYWH = `[${number},${number},${number},${number}]`;

  export class Bound {
    static fromDOMRect(rect: DOMRect | DOMRectReadOnly): Bound;
    static fromPoints(points: readonly Point[]): Bound;
    static fromXYWH(xywh: XYWH): Bound;

    constructor(x: number, y: number, w: number, h: number);

    x: number;
    y: number;
    w: number;
    h: number;
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
    readonly center: Point;

    clone(): Bound;
    containsPoint(point: Point): boolean;
    expand(size: number): Bound;
    isOverlapWithBound(bound: Bound): boolean;
    serialize(): SerializedXYWH;
    toXYWH(): XYWH;
    unite(bound: Bound): Bound;
  }
}
