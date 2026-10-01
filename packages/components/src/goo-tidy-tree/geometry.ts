import { stratify } from "d3-hierarchy";
import { flextree } from "d3-flextree";

export type TreeDirection = "right" | "left" | "down" | "up";

export interface TreeRecord {
  id: string;
  parentId: string | null;
  el: HTMLElement;
  width: number;
  height: number;
}

export interface TreeBox extends TreeRecord {
  x: number;
  y: number;
}

/** Validate explicitly: stratify otherwise accepts some duplicate leaf IDs. */
function validate(records: TreeRecord[]): void {
  const byId = new Map<string, TreeRecord>();
  for (const record of records) {
    if (!record.id) throw new Error("goo-tree-node requires a nonempty subject");
    if (byId.has(record.id)) {
      throw new Error(`duplicate goo-tree-node subject: ${JSON.stringify(record.id)}`);
    }
    byId.set(record.id, record);
  }
  for (const record of records) {
    if (record.parentId !== null && !byId.has(record.parentId)) {
      throw new Error(
        `goo-tree-node ${JSON.stringify(record.id)} references missing parent ${JSON.stringify(record.parentId)}`,
      );
    }
  }
  // Walk each parent chain once, including disconnected cycles. No recursion.
  const complete = new Set<string>();
  for (const record of records) {
    const visiting = new Set<string>();
    let current: TreeRecord | undefined = record;
    while (current && !complete.has(current.id)) {
      if (visiting.has(current.id)) throw new Error("goo-tidy-tree hierarchy contains a cycle");
      visiting.add(current.id);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    for (const id of visiting) complete.add(id);
  }
  const roots = records.filter((record) => record.parentId === null).length;
  if (roots !== 1) {
    throw new Error(`goo-tidy-tree expected exactly one root; found ${roots}`);
  }
}

/** Flextree's x is the breadth center; y is the leading depth boundary. */
export function computeTree(
  records: TreeRecord[],
  direction: TreeDirection,
  gap: number,
  levelGap: number,
): { boxes: TreeBox[]; width: number; height: number; paths: string[] } {
  validate(records);
  const vertical = direction === "down" || direction === "up";
  const root = stratify<TreeRecord>()
    .id((d) => d.id)
    .parentId((d) => d.parentId)(records);
  const layout = flextree<TreeRecord>({
    nodeSize: ({ data }) =>
      vertical ? [data.width, data.height + levelGap] : [data.height, data.width + levelGap],
    spacing: gap,
  });
  const boxes: TreeBox[] = layout(root)
    .descendants()
    .map(({ data, x, y }) => {
      switch (direction) {
        case "right":
          return { ...data, x: y, y: x - data.height / 2 };
        case "left":
          return { ...data, x: -y - data.width, y: x - data.height / 2 };
        case "down":
          return { ...data, x: x - data.width / 2, y };
        case "up":
          return { ...data, x: x - data.width / 2, y: -y - data.height };
      }
    });
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  for (const box of boxes) {
    box.x += 24 - minX;
    box.y += 24 - minY;
  }
  const byId = new Map(boxes.map((box) => [box.id, box]));
  const paths: string[] = [];
  for (const child of boxes) {
    if (child.parentId === null) continue;
    const parent = byId.get(child.parentId)!;
    let sx = parent.x + parent.width / 2;
    let sy = parent.y + parent.height / 2;
    let tx = child.x + child.width / 2;
    let ty = child.y + child.height / 2;
    if (vertical) {
      sy += ((direction === "down" ? 1 : -1) * parent.height) / 2;
      ty -= ((direction === "down" ? 1 : -1) * child.height) / 2;
      const mid = (sy + ty) / 2;
      paths.push(`M ${sx} ${sy} C ${sx} ${mid}, ${tx} ${mid}, ${tx} ${ty}`);
    } else {
      sx += ((direction === "right" ? 1 : -1) * parent.width) / 2;
      tx -= ((direction === "right" ? 1 : -1) * child.width) / 2;
      const mid = (sx + tx) / 2;
      paths.push(`M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}`);
    }
  }
  return { boxes, paths, width: maxX - minX + 48, height: maxY - minY + 48 };
}
