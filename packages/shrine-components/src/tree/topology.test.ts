import { describe, expect, it } from "vitest";
import { projectEdges, type TopologyNode } from "./topology.js";

const node = (id: string, lane: number, y: number, parents?: string[]): TopologyNode => ({
  id,
  lane,
  x: lane * 16,
  y,
  parents,
});

describe("tree topology", () => {
  it("retains implicit same-lane revision chains", () => {
    expect(
      projectEdges([node("a", 0, 0), node("b", 1, 10), node("c", 0, 20)]).map((edge) => edge.key),
    ).toEqual(["a:c"]);
  });
  it("keeps explicit roots disconnected and siblings connected only to their real parent", () => {
    expect(
      projectEdges([
        node("root", 0, 0, []),
        node("a", 1, 10, ["root"]),
        node("b", 1, 20, ["root"]),
      ]).map((edge) => edge.key),
    ).toEqual(["a:root", "b:root"]);
  });
  it("does not invent edges for hidden parents, self references, or duplicate references", () => {
    expect(
      projectEdges([node("a", 0, 0, ["missing", "a", "b", "b"]), node("b", 1, 20, [])]),
    ).toEqual([{ key: "a:b", lane: 1, path: "M 0 0 C 0 10, 16 10, 16 20" }]);
  });
});
