/** Pure connection projection. No DOM, selection state, namespace reads, or styles. */
export interface TopologyNode {
  id: string;
  lane: number;
  x: number;
  y: number;
  /** Omitted: next visible node in this lane. Empty: explicitly disconnected. */
  parents?: readonly string[];
}

export interface GraphEdge {
  key: string;
  lane: number;
  path: string;
}

export function projectEdges(nodes: readonly TopologyNode[]): GraphEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const nextInLane = new Map<string, TopologyNode>();
  const lanes = new Map<number, TopologyNode>();
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index]!;
    const next = lanes.get(node.lane);
    if (next) nextInLane.set(node.id, next);
    lanes.set(node.lane, node);
  }
  return nodes.flatMap((node) => {
    const parents =
      node.parents === undefined
        ? [nextInLane.get(node.id)]
        : [...new Set(node.parents)].map((id) => byId.get(id));
    return parents
      .filter((parent): parent is TopologyNode => Boolean(parent) && parent !== node)
      .map((parent) => {
        const middle = node.y + (parent.y - node.y) / 2;
        return {
          key: `${node.id}:${parent.id}`,
          lane: parent.lane,
          path: `M ${node.x} ${node.y} C ${node.x} ${middle}, ${parent.x} ${middle}, ${parent.x} ${parent.y}`,
        };
      });
  });
}
