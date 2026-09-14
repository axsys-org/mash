export interface DockTabs {
  type: "tabs";
  id: string;
  panels: string[];
  active: string;
}
export interface DockSplit {
  type: "split";
  id: string;
  orientation: "horizontal" | "vertical";
  ratio: number;
  children: [DockNode, DockNode];
}
export type DockNode = DockTabs | DockSplit;
export interface DockLayout {
  version: 1;
  root: DockNode | null;
}
export type DockPlacement = "center" | "left" | "right" | "top" | "bottom";

/** Validate a serialized layout before it can influence live panel projection. */
export function validLayout(value: unknown, known: ReadonlySet<string>): value is DockLayout {
  const ids = new Set<string>(),
    panels = new Set<string>();
  const visit = (candidate: unknown, depth: number): boolean => {
    if (!candidate || typeof candidate !== "object" || depth > 20) return false;
    const node = candidate as Record<string, unknown>;
    if (typeof node.id !== "string" || !node.id || ids.has(node.id)) return false;
    ids.add(node.id);
    if (node.type === "tabs") {
      if (!Array.isArray(node.panels) || !node.panels.length || !node.panels.includes(node.active))
        return false;
      return node.panels.every((name) => {
        if (typeof name !== "string" || !known.has(name) || panels.has(name)) return false;
        panels.add(name);
        return true;
      });
    }
    return (
      node.type === "split" &&
      ["horizontal", "vertical"].includes(String(node.orientation)) &&
      typeof node.ratio === "number" &&
      Number.isFinite(node.ratio) &&
      node.ratio >= 0.1 &&
      node.ratio <= 0.9 &&
      Array.isArray(node.children) &&
      node.children.length === 2 &&
      node.children.every((child) => visit(child, depth + 1))
    );
  };
  if (!value || typeof value !== "object") return false;
  const layout = value as Record<string, unknown>;
  return layout.version === 1 && (layout.root === null || visit(layout.root, 0));
}
export function groups(node: DockNode | null): DockTabs[] {
  return node === null ? [] : node.type === "tabs" ? [node] : node.children.flatMap(groups);
}
export function removePanel(node: DockNode | null, name: string): DockNode | null {
  if (!node) return null;
  if (node.type === "tabs") {
    const index = node.panels.indexOf(name);
    if (index < 0) return node;
    node.panels.splice(index, 1);
    if (!node.panels.length) return null;
    if (node.active === name) node.active = node.panels[Math.min(index, node.panels.length - 1)]!;
    return node;
  }
  const left = removePanel(node.children[0], name),
    right = removePanel(node.children[1], name);
  if (!left) return right;
  if (!right) return left;
  node.children = [left, right];
  return node;
}
export function replaceGroup(node: DockNode, id: string, replacement: DockNode): DockNode {
  if (node.id === id) return replacement;
  if (node.type === "split")
    node.children = node.children.map((child) => replaceGroup(child, id, replacement)) as [
      DockNode,
      DockNode,
    ];
  return node;
}
