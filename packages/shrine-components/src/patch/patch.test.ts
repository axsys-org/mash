import { describe, it, expect } from "vitest";
import { fixture } from "../test-support/fixture.js";
import { GooPatch } from "./register.js";
import { exampleScene } from "./fixtures/example-scene.js";
import { validateScene, SceneIndex } from "./scene.js";
import { forward, inverse, zoom } from "./geometry.js";
import type { SceneSnapshot } from "./contract.js";
export function markup(s: SceneSnapshot): string {
  return `<goo-patch style="width:1000px;height:600px"><script type="application/json" data-patch-scene>${JSON.stringify(s).replaceAll("<", "\\u003c")}</script>${s.nodes.map((n) => `<goo-patch-node data-key="${n.key}"><header data-patch-select>${n.key}<button data-patch-handle>Move ${n.key}</button></header><input aria-label="Native editor" value="original">${n.ports.map((p) => `<goo-patch-port data-key="${p.key}"><button data-patch-anchor>${p.key}</button></goo-patch-port>`).join("")}</goo-patch-node>`).join("")}${s.connections.map((c) => `<goo-patch-connection data-key="${c.key}">${c.labels.map((l) => `<span data-patch-label="${l.key}">${l.key}</span>`).join("")}</goo-patch-connection>`).join("")}</goo-patch>`;
}
describe("patch vertical slice", () => {
  it("G01/G03 mounts supplied fan-out, cubic, self-loop without content measurement", async () => {
    const el = await fixture<GooPatch>(markup(exampleScene));
    for (const e of el.querySelectorAll<HTMLElement>(
      "goo-patch-node,goo-patch-port,[data-patch-label]",
    )) {
      e.getBoundingClientRect = () => {
        throw Error("content measurement");
      };
      for (const key of ["offsetWidth", "offsetHeight"])
        Object.defineProperty(e, key, {
          get: () => {
            throw Error("measurement");
          },
        });
    }
    expect(el.hydrate()).toBe("installed");
    expect(el.shadowRoot!.querySelectorAll("svg g path").length).toBe(5);
    const camera = el.getCamera();
    el.setCamera({ ...camera, tx: camera.tx + 20 });
    expect(el.painter!.metrics.nodes).toBe(3);
    const p = el.project([
      {
        kind: "port",
        node: "source",
        nodeLifetime: "node-life:source",
        port: "out",
        lifetime: "port-life:source:out",
      },
    ]);
    expect(p[0]!.bounds.x).toBe(228);
  });
  it("G07 validates complete scene before mutation", () => {
    const s = structuredClone(exampleScene);
    Object.assign(s.connections[0].segments[0].commands[0].to, { x: 0 });
    expect(() => validateScene(s)).toThrow("invalid-scene");
  });
  it("G08 retains whole connection identity unless explicit part", () => {
    const index = new SceneIndex(validateScene(exampleScene));
    expect(index.pick({ x: 500, y: 320 }, 1)?.target).toEqual({
      kind: "connection",
      connection: "shared-result",
      lifetime: "connection-life:shared-result",
    });
  });
  it("C01 zoom preserves anchor and inverse", () => {
    const c = { tx: 30, ty: -45, scale: 0.5 },
      p = { x: 170, y: 90 },
      world = inverse(p, c);
    expect(forward(world, zoom(c, p, 2))).toEqual(p);
  });
  it("R01/R02/C03 stale and wrong-base frames never commit or reseed camera", async () => {
    const el = await fixture<GooPatch>(markup(exampleScene));
    el.hydrate();
    el.setCamera({ tx: -20, ty: 30, scale: 2 });
    let commits = 0;
    const scene = structuredClone(exampleScene) as SceneSnapshot;
    const next = { ...scene, header: { ...scene.header, viewSeq: 3 } };
    const prepare = () => ({
      proposed: el,
      commit: () => {
        commits++;
      },
    });
    expect(
      el.admit({ scene: next, dom: { kind: "complete" }, coveredOperationIds: [], prepare }),
    ).toBe("installed");
    expect(el.admit({ scene, dom: { kind: "complete" }, coveredOperationIds: [], prepare })).toBe(
      "rejected",
    );
    expect(
      el.admit({
        scene: { ...next, header: { ...next.header, viewSeq: 4 } },
        dom: { kind: "delta", baseViewSeq: 2 },
        coveredOperationIds: [],
        prepare,
      }),
    ).toBe("rejected");
    expect(commits).toBe(1);
    expect(el.getCamera()).toEqual({ tx: -20, ty: 30, scale: 2 });
  });
});

it("invalid DOM admission metadata is rejected before mutation", async () => {
  const el = await fixture<GooPatch>(markup(exampleScene));
  el.hydrate();
  let commits = 0;
  const frame = {
    scene: { ...exampleScene, header: { ...exampleScene.header, viewSeq: 2 } },
    dom: { kind: "unsupported" },
    coveredOperationIds: [],
    prepare: () => ({
      proposed: el,
      commit: () => {
        commits++;
      },
    }),
  };
  expect(el.admit(frame as unknown as Parameters<GooPatch["admit"]>[0])).toBe("rejected");
  expect(commits).toBe(0);
});
