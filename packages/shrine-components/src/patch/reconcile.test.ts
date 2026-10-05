import { afterEach, describe, it, expect } from "vitest";
import { fixtureDOM, FixtureHarness, largeScene } from "./fixtures/harness.js";
import { exampleScene } from "./fixtures/example-scene.js";
import type { SceneSnapshot, NodeTarget, PortTarget, ConnectionTarget } from "./contract.js";
import { forward } from "./geometry.js";
import { validateScene } from "./scene.js";
import { sceneScript } from "./backend/emitter.js";
import type { GooPatch } from "./patch.js";
const roots: GooPatch[] = [];
afterEach(() => {
  for (const r of roots) {
    r.retire();
    r.remove();
  }
  roots.length = 0;
});
function setup(scene: SceneSnapshot = exampleScene) {
  const root = fixtureDOM(scene);
  document.body.append(root);
  roots.push(root);
  const harness = new FixtureHarness(root);
  expect(root.hydrate()).toBe("installed");
  root.setCamera({ tx: 0, ty: 40, scale: 1 });
  return { root, harness };
}
const n: NodeTarget = { kind: "node", node: "source", lifetime: "node-life:source" };
const from: PortTarget = {
  kind: "port",
  node: "source",
  nodeLifetime: "node-life:source",
  port: "out",
  lifetime: "port-life:source:out",
};
const to: PortTarget = {
  kind: "port",
  node: "sink",
  nodeLifetime: "node-life:sink",
  port: "in",
  lifetime: "port-life:sink:in",
};
const c: ConnectionTarget = {
  kind: "connection",
  connection: "transformed-result",
  lifetime: "connection-life:transformed-result",
};
const next = (seq: number): SceneSnapshot => ({
  ...exampleScene,
  header: { ...exampleScene.header, viewSeq: seq },
});
function connect(root: GooPatch) {
  root.gestures.arm(from);
  root.dom!.ports.get("sink")!.get("in")!.querySelector("button")!.click();
}
function client(root: GooPatch, p: { x: number; y: number }) {
  const v = forward(p, root.getCamera()),
    m = root.mapping()!;
  return { clientX: m.left + v.x * m.sx, clientY: m.top + v.y * m.sy };
}
function pointer(
  target: Element,
  type: string,
  root: GooPatch,
  p: { x: number; y: number },
  id = 1,
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      pointerId: id,
      pointerType: "mouse",
      button: 0,
      ...client(root, p),
    }),
  );
}
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
describe("coherent projections and operation coverage", () => {
  it("R06 accepted before covering projection preserves ghost; duplicate frame/receipt idempotent", () => {
    const { root, harness } = setup();
    connect(root);
    const id = harness.intents[0]!.operationId;
    harness.receipt(id, "accepted");
    expect(root.pending.size).toBe(1);
    expect(root.painter!.overlay.querySelectorAll("path")).toHaveLength(1);
    harness.frame(next(2), { covered: [id] });
    expect(root.pending.size).toBe(0);
    expect(root.painter!.overlay.querySelectorAll("path")).toHaveLength(0);
    expect(harness.frame(next(2), { covered: [id] })).toBe("duplicate");
    harness.receipt(id, "accepted");
    expect(root.pending.size).toBe(0);
  });
  it("R07 covering projection before receipt clears once and runtime records later outcome", () => {
    const { root, harness } = setup();
    connect(root);
    const id = harness.intents[0]!.operationId;
    harness.frame(next(2), { covered: [id] });
    harness.receipt(id, "accepted");
    expect(root.pending.size).toBe(0);
    expect(harness.outcomes.get(id)?.outcome).toBe("accepted");
  });
  it("R08 rejection returns to latest scene instead of captured origin", () => {
    const { root, harness } = setup();
    root.gestures.moveBy([n], { x: 100, y: 0 });
    const id = harness.intents[0]!.operationId;
    const scene = {
      ...next(2),
      nodes: exampleScene.nodes.map((node) =>
        node.key === "source" ? { ...node, rect: { ...node.rect, x: 60 } } : node,
      ),
      connections: [],
    };
    const proposed = fixtureDOM(scene);
    harness.frame(scene, {
      prepare: () => ({
        proposed,
        commit: () => {
          for (const el of root.querySelectorAll("goo-patch-connection")) el.remove();
        },
      }),
    });
    expect(root.origins.get("source")?.x).toBe(140);
    harness.receipt(id, "rejected", "Placement conflict");
    expect(root.origins.size).toBe(0);
    expect(
      root.dom!.nodes.get("source")!.shadowRoot!.querySelector<HTMLElement>(".frame")!.style
        .transform,
    ).toBe("translate(60px, 80px)");
    expect(root.painter!.status.textContent).toContain("Placement conflict");
  });
  it("R09 unknown outcome retains ID and preview; later success works", () => {
    const { root, harness } = setup();
    connect(root);
    const id = harness.intents[0]!.operationId;
    harness.receipt(id, "unknown");
    expect(root.pending.get(id)?.state).toBe("unknown");
    expect(harness.reconciliations).toEqual([id]);
    harness.receipt(id, "accepted");
    expect(root.pending.get(id)?.state).toBe("accepted");
    expect(harness.intents).toHaveLength(1);
  });
  it("R05/R10 retirement prevents resurrection but runtime retains outcome", () => {
    const { root, harness } = setup();
    connect(root);
    const id = harness.intents[0]!.operationId;
    harness.retire();
    expect(harness.frame(next(2))).toBe("rejected");
    harness.receipt(id, "accepted");
    expect(harness.outcomes.get(id)?.outcome).toBe("accepted");
    expect(root.pending.size).toBe(0);
    expect(harness.listeners.size).toBe(0);
  });
  it("R11 mutation failure fails closed and requires a full repair", () => {
    const { root, harness } = setup();
    harness.frame(next(2), {
      prepare: () => ({
        proposed: root,
        commit: () => {
          root.dataset.partial = "true";
          throw Error("patch failure");
        },
      }),
    });
    expect(root.editable).toBe(false);
    expect(harness.repairs).toContain("projection-failed");
    connect(root);
    expect(harness.intents).toHaveLength(0);
    expect(harness.frame(next(3), { base: 1 })).toBe("rejected");
    expect(harness.frame(next(3))).toBe("installed");
    expect(root.editable).toBe(true);
  });
  it("N01 whole candidate defers under the common composition policy", () => {
    const { root, harness } = setup();
    harness.composition = true;
    let mutations = 0;
    expect(
      harness.frame(next(2), {
        prepare: () => ({
          proposed: root,
          commit: () => {
            mutations++;
          },
        }),
      }),
    ).toBe("deferred");
    expect(root.installedScene!.header.viewSeq).toBe(1);
    expect(mutations).toBe(0);
    harness.composition = false;
    root.flushDeferred();
    expect(mutations).toBe(1);
    expect(root.installedScene!.header.viewSeq).toBe(2);
  });
  it("N03 relocation and suspend/resume preserve camera and one handler set", () => {
    const { root, harness } = setup();
    const camera = root.getCamera();
    const holder = document.createElement("div");
    document.body.append(holder);
    holder.append(root);
    root.resume();
    root.resume();
    connect(root);
    expect(harness.intents).toHaveLength(1);
    expect(root.getCamera()).toEqual(camera);
    expect(harness.listeners.size).toBe(1);
    document.body.append(root);
    holder.remove();
  });
});
describe("gestures and ownership", () => {
  it("I01 below-threshold handle movement emits no edit", () => {
    const { root, harness } = setup();
    const handle = root.dom!.nodes.get("source")!.querySelector("[data-patch-handle]")!;
    pointer(handle, "pointerdown", root, { x: 60, y: 90 });
    pointer(root, "pointermove", root, { x: 62, y: 90 });
    pointer(root, "pointerup", root, { x: 62, y: 90 });
    expect(harness.intents).toHaveLength(0);
  });
  it("I02/I05 shared group translation and one completion after leaving surface", () => {
    const { root, harness } = setup();
    root.setSelection([n, { kind: "node", node: "transform", lifetime: "node-life:transform" }]);
    const handle = root.dom!.nodes.get("source")!.querySelector("[data-patch-handle]")!;
    pointer(handle, "pointerdown", root, { x: 60, y: 90 });
    pointer(root, "pointermove", root, { x: 180, y: 110 });
    pointer(root, "pointerup", root, { x: 180, y: 110 });
    root.dispatchEvent(new PointerEvent("lostpointercapture", { pointerId: 1 }));
    expect(harness.intents).toHaveLength(1);
    const a = harness.intents[0]!.args;
    if (a.kind !== "move-nodes") throw Error();
    expect(a.nodes[0]!.proposedOrigin.x - a.nodes[0]!.baseOrigin.x).toBe(
      a.nodes[1]!.proposedOrigin.x - a.nodes[1]!.baseOrigin.x,
    );
  });
  it("I03 newer origin rebases visual override while captured evidence stays original", async () => {
    const { root, harness } = setup({ ...exampleScene, connections: [] });
    const handle = root.dom!.nodes.get("source")!.querySelector("[data-patch-handle]")!;
    pointer(handle, "pointerdown", root, { x: 60, y: 90 });
    pointer(root, "pointermove", root, { x: 180, y: 110 });
    await frame();
    const held = root.origins.get("source");
    const scene = {
      ...next(2),
      connections: [],
      nodes: exampleScene.nodes.map((node) =>
        node.key === "source" ? { ...node, rect: { ...node.rect, x: 90 } } : node,
      ),
    };
    harness.frame(scene);
    expect(root.origins.get("source")).toEqual(held);
    expect(
      root.dom!.nodes.get("source")!.shadowRoot!.querySelector<HTMLElement>(".frame")!.style
        .transform,
    ).toContain(String(held!.x));
    pointer(root, "pointerup", root, { x: 180, y: 110 });
    const args = harness.intents[0]!.args;
    if (args.kind !== "move-nodes") throw Error();
    expect(args.nodes[0]!.baseOrigin.x).toBe(40);
    expect(harness.intents[0]!.basis.viewSeq).toBe(1);
  });
  it("I06 Escape, pointercancel and capture loss cancel unsent drafts", () => {
    for (const type of ["escape", "pointercancel", "lostpointercapture"]) {
      const { root, harness } = setup();
      const h = root.dom!.nodes.get("source")!.querySelector("[data-patch-handle]")!;
      pointer(h, "pointerdown", root, { x: 60, y: 90 });
      pointer(root, "pointermove", root, { x: 160, y: 90 });
      if (type === "escape")
        root.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }),
        );
      else root.dispatchEvent(new PointerEvent(type, { pointerId: 1 }));
      expect(root.gestures.draft).toBeUndefined();
      expect(harness.intents).toHaveLength(0);
    }
  });
  it("I07 click-click and drag connect supply equivalent semantic arguments", () => {
    const a = setup(),
      b = setup();
    connect(a.root);
    const source = b.root.dom!.ports.get("source")!.get("out")!.querySelector("button")!;
    pointer(source, "pointerdown", b.root, { x: 240, y: 144 });
    pointer(b.root, "pointermove", b.root, { x: 740, y: 160 });
    pointer(b.root, "pointerup", b.root, { x: 740, y: 160 });
    expect(b.harness.intents[0]!.args).toEqual(a.harness.intents[0]!.args);
    expect(b.harness.captures[0]!.offer).toBe(a.harness.captures[0]!.offer);
  });
  it("I08/I09 unknown allowed, current forbidden blocks, stale feedback cannot resurrect", () => {
    const { root, harness } = setup();
    root.gestures.arm(from);
    const q = harness.queries.at(-1)!;
    root.receiveCompatibility({
      queryId: q.queryId,
      gestureId: q.gestureId!,
      basis: q.basis,
      from,
      candidates: [{ target: to, status: "forbidden", explanationRef: "Type conflict" }],
    });
    root.dom!.ports.get("sink")!.get("in")!.querySelector("button")!.click();
    expect(harness.intents).toHaveLength(0);
    root.receiveCompatibility({
      queryId: q.queryId,
      gestureId: q.gestureId!,
      basis: q.basis,
      from,
      candidates: [],
    });
    expect(root.gestures.draft).toBeUndefined();
    connect(root);
    expect(harness.intents).toHaveLength(1);
  });
  it("I10 reconnect rejection preserves accepted connection; no disconnect first", () => {
    const { root, harness } = setup();
    root.gestures.reconnect(c, "e-to");
    root.dom!.ports.get("source")!.get("out")!.querySelector("button")!.click();
    expect(harness.intents.map((i) => i.args.kind)).toEqual(["reconnect"]);
    harness.receipt(harness.intents[0]!.operationId, "rejected");
    expect(root.index!.connections.has(c.connection)).toBe(true);
  });
  it("I11 empty drop requests a picker without a domain mutation", () => {
    const { root, harness } = setup();
    const source = root.dom!.ports.get("source")!.get("out")!.querySelector("button")!;
    pointer(source, "pointerdown", root, { x: 240, y: 144 });
    pointer(root, "pointermove", root, { x: 700, y: 400 });
    pointer(root, "pointerup", root, { x: 700, y: 400 });
    expect(harness.intents).toHaveLength(0);
    expect(harness.queries.at(-1)?.kind).toBe("create-picker");
  });
  it("R04 lifetime replacement cancels instead of retargeting", () => {
    const { root, harness } = setup({ ...exampleScene, connections: [] });
    root.gestures.arm(from);
    const scene = {
      ...next(2),
      connections: [],
      nodes: exampleScene.nodes.map((node) =>
        node.key === "source" ? { ...node, lifetime: "replacement" } : node,
      ),
    };
    harness.frame(scene);
    expect(root.gestures.draft).toBeUndefined();
    expect(harness.intents).toHaveLength(0);
  });
  it("S01/S02 box selects nodes only and reflection has no feedback loop", () => {
    const { root, harness } = setup();
    root.setSelection([n]);
    expect(harness.selections).toHaveLength(0);
    const bg = root.painter!.background;
    pointer(bg, "pointerdown", root, { x: 20, y: 40 });
    pointer(root, "pointermove", root, { x: 700, y: 350 });
    pointer(root, "pointerup", root, { x: 700, y: 350 });
    expect(harness.selections[0]!.targets.map((t) => t.kind)).toEqual(["node", "node"]);
  });
  it("S03 unrealization preserves the owner selection", () => {
    const { root, harness } = setup();
    root.setSelection([n]);
    const scene = { ...next(2), nodes: [], connections: [] };
    const proposed = fixtureDOM(scene);
    harness.frame(scene, {
      prepare: () => ({
        proposed,
        commit: () => {
          for (const el of root.querySelectorAll("goo-patch-node,goo-patch-connection"))
            el.remove();
        },
      }),
    });
    expect(root.selection).toEqual([n]);
    expect(harness.selections).toHaveLength(0);
  });
  it("N02 native input and nested surface never leak ownership", () => {
    const outer = setup(),
      inner = setup();
    outer.root.dom!.nodes.get("transform")!.append(inner.root);
    const input = outer.root.querySelector("input")!;
    pointer(input, "pointerdown", outer.root, { x: 100, y: 100 });
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, composed: true }),
    );
    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      composed: true,
      cancelable: true,
      deltaY: 40,
    });
    input.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    connect(inner.root);
    expect(outer.harness.intents).toHaveLength(0);
    expect(inner.harness.intents).toHaveLength(1);
    expect(outer.root.gestures.draft).toBeUndefined();
  });
  it("A01/A02 move, disconnect, reconnect and connect use native click controls", () => {
    const { root, harness } = setup();
    root.querySelector<HTMLButtonElement>('[data-patch-move][data-dx="10"]')!.click();
    root.querySelector<HTMLButtonElement>("[data-patch-disconnect]")!.click();
    expect(harness.intents.map((i) => i.args.kind)).toEqual(["move-nodes", "disconnect"]);
    root
      .querySelector<HTMLButtonElement>(
        '[data-patch-reconnect][data-patch-connection="transformed-result"]',
      )!
      .click();
    root.dom!.ports.get("sink")!.get("in")!.querySelector("button")!.click();
    expect(harness.intents.at(-1)!.args.kind).toBe("reconnect");
  });
});
describe("validation, camera and bounded work", () => {
  it("G05 empty, negative and zero viewport never create invalid cameras", () => {
    const { root } = setup({
      ...exampleScene,
      nodes: [],
      connections: [],
      extent: { x: -100, y: -50, width: 0, height: 0 },
    });
    root.fit();
    expect(Object.values(root.getCamera()).every(Number.isFinite)).toBe(true);
    root.style.width = "0";
    root.style.height = "0";
    root.style.minHeight = "0";
    root.fit();
    expect(Object.values(root.getCamera()).every(Number.isFinite)).toBe(true);
  });
  it("C02 nested translated/scaled ancestors map client points correctly", () => {
    const { root } = setup();
    root.style.transform = "translate(25px,35px) scale(.5)";
    root.style.transformOrigin = "0 0";
    const p = client(root, { x: 240, y: 144 });
    expect(root.pick({ x: p.clientX, y: p.clientY })?.target).toEqual(from);
    root.setCamera({ tx: 100, ty: 80, scale: 2 });
    const q = client(root, { x: 240, y: 144 });
    expect(root.pick({ x: q.clientX, y: q.clientY })?.target).toEqual(from);
  });
  it("G07 invalid references, duplicate keys, bad commands, scale and numeric data rejected", () => {
    const mutations = [
      (s: any) => s.nodes.push(s.nodes[0]),
      (s: any) => (s.nodes[0].ports[0].outward.x = 2),
      (s: any) => (s.connections[0].endpoints[0].port.lifetime = "wrong"),
      (s: any) => (s.connections[0].segments[0].commands[1].op = "Q"),
      (s: any) => (s.policy.minScale = 0),
      (s: any) => (s.nodes[0].rect.width = -1),
      (s: any) => (s.header.viewSeq = 0.5),
      (s: any) => (s.nodes[0].rect.x = Infinity),
    ];
    for (const mutate of mutations) {
      const s = structuredClone(exampleScene);
      mutate(s);
      expect(() => validateScene(s)).toThrow("invalid-scene");
    }
  });
  it("P01/P02 moving one node only dirties its incident connections; pan is camera-only", () => {
    const { root } = setup(largeScene(100, exampleScene));
    const before = { ...root.painter!.metrics };
    for (let i = 0; i < 10; i++) root.setCamera({ tx: i, ty: 0, scale: 1 });
    expect(root.painter!.metrics.nodes).toBe(before.nodes);
    expect(root.painter!.metrics.connections).toBe(before.connections);
    root.gestures.moveBy([{ kind: "node", node: "n0", lifetime: "nl0" }], { x: 20, y: 0 });
    expect(root.painter!.metrics.nodes - before.nodes).toBe(1);
    expect(root.painter!.metrics.connections - before.connections).toBe(
      root.index!.incident.get("n0")!.size,
    );
  });
  it("P03 500ms pending response leaves camera and unrelated edits available", async () => {
    const { root, harness } = setup();
    connect(root);
    const id = harness.intents[0]!.operationId,
      delivery = harness.delayedReceipt(id, "accepted");
    root.setCamera({ tx: 22, ty: 30, scale: 1 });
    root.gestures.moveBy([n], { x: 10, y: 0 });
    expect(harness.intents).toHaveLength(2);
    expect(root.getCamera().tx).toBe(22);
    await delivery;
    expect(root.pending.get(id)?.state).toBe("accepted");
  });
  it("safe script serialization cannot terminate the inert manifest", () => {
    const s = {
      ...exampleScene,
      header: { ...exampleScene.header, sourceRev: "</script><script>alert(1)</script>" },
    };
    expect(sceneScript(s)).not.toContain("</script><script>");
    expect(sceneScript(s)).toContain("\\u003c/script>");
  });
});

describe("remaining geometry and gesture edge cases", () => {
  it("G04 repeated semantic subjects preserve occurrence-specific port targets", () => {
    const scene = {
      ...exampleScene,
      nodes: exampleScene.nodes.map((node) => ({ ...node, selectorRef: "shared-subject" })),
    };
    const { root, harness } = setup(scene);
    root.gestures.arm(to);
    root.dom!.ports.get("source")!.get("out")!.querySelector("button")!.click();
    const args = harness.intents[0]!.args;
    if (args.kind !== "connect") throw Error();
    expect(args.from.node).toBe("sink");
    expect(args.to.node).toBe("source");
  });
  it("G08 explicitly identified branch resolves to its part", () => {
    const scene = {
      ...exampleScene,
      connections: exampleScene.connections.map((c) =>
        c.key === "shared-result"
          ? {
              ...c,
              parts: [{ key: "branch", lifetime: "branch-life", selectorRef: "branch-selector" }],
              segments: c.segments.map((s) =>
                s.key === "preview-branch" ? { ...s, part: "branch" } : s,
              ),
            }
          : c,
      ),
    };
    const { root } = setup(scene);
    const p = client(root, { x: 500, y: 320 });
    expect(root.pick({ x: p.clientX, y: p.clientY })?.target).toEqual({
      kind: "connection-part",
      connection: "shared-result",
      connectionLifetime: "connection-life:shared-result",
      part: "branch",
      lifetime: "branch-life",
    });
  });
  it("I04 auto-pan updates preview without new pointer events", async () => {
    const { root } = setup({
      ...exampleScene,
      policy: { ...exampleScene.policy, alignmentSnap: false },
    });
    const handle = root.dom!.nodes.get("source")!.querySelector("[data-patch-handle]")!;
    pointer(handle, "pointerdown", root, { x: 60, y: 90 });
    pointer(root, "pointermove", root, { x: 995, y: 100 });
    await frame();
    const a = root.origins.get("source")!.x;
    await frame();
    await frame();
    expect(root.origins.get("source")!.x).toBeGreaterThan(a);
    expect(root.getCamera().tx).toBeLessThan(0);
    root.cancelGesture("test");
  });
  it("I02 grid snap moves the group by the same deterministic displacement", () => {
    const { root, harness } = setup({
      ...exampleScene,
      policy: {
        ...exampleScene.policy,
        alignmentSnap: false,
        grid: { origin: { x: 0, y: 0 }, step: { x: 20, y: 20 } },
      },
    });
    root.setSelection([n, { kind: "node", node: "sink", lifetime: "node-life:sink" }]);
    const handle = root.dom!.nodes.get("source")!.querySelector("[data-patch-handle]")!;
    pointer(handle, "pointerdown", root, { x: 60, y: 90 });
    pointer(root, "pointermove", root, { x: 117, y: 109 });
    pointer(root, "pointerup", root, { x: 117, y: 109 });
    const args = harness.intents[0]!.args;
    if (args.kind !== "move-nodes") throw Error();
    expect(args.nodes[0]!.proposedOrigin).toEqual({ x: 100, y: 100 });
    expect(args.nodes[1]!.proposedOrigin).toEqual({ x: 800, y: 132 });
  });
  it("G06 pending self-loop translates every point and remains pickable at the displayed origin", () => {
    const { root } = setup();
    root.gestures.moveBy([{ kind: "node", node: "transform", lifetime: "node-life:transform" }], {
      x: 40,
      y: 20,
    });
    const group = [...root.painter!.wires.querySelectorAll("g")].find(
      (g) => g.dataset.key === "feedback",
    )!;
    expect(group.querySelector("path")!.getAttribute("d")).toContain(
      "M 640 172 L 680 172 L 680 36",
    );
    const p = client(root, { x: 640, y: 172 });
    expect(root.pick({ x: p.clientX, y: p.clientY })?.target).toEqual({
      kind: "port",
      node: "transform",
      nodeLifetime: "node-life:transform",
      port: "out",
      lifetime: "port-life:transform:out",
    });
  });
  it("camera pinch only accepts two owned background pointers", () => {
    const { root } = setup();
    const bg = root.painter!.background,
      send = (target: Element, type: string, id: number, x: number) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            composed: true,
            pointerType: "touch",
            pointerId: id,
            ...client(root, { x, y: 400 }),
          }),
        );
    send(bg, "pointerdown", 1, 100);
    send(bg, "pointerdown", 2, 300);
    expect(root.gestures.draft?.phase).toBe("camera-pinch");
    send(root, "pointerup", 2, 300);
    expect(root.gestures.draft).toBeUndefined();
    const handle = root.dom!.nodes.get("source")!.querySelector("[data-patch-handle]")!;
    send(handle, "pointerdown", 3, 60);
    send(root.querySelector("input")!, "pointerdown", 4, 100);
    expect(root.gestures.draft?.phase).toBe("pressed");
  });
  it("N02 native selection, slider and scroll containers keep first refusal", () => {
    const { root } = setup();
    const body = root.dom!.nodes.get("source")!;
    const slider = document.createElement("input");
    slider.type = "range";
    const scroll = document.createElement("div");
    scroll.dataset.patchScroll = "";
    scroll.textContent = "Select ordinary text";
    body.append(slider, scroll);
    for (const target of [slider, scroll]) {
      const event = new PointerEvent("pointerdown", {
        bubbles: true,
        composed: true,
        cancelable: true,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      });
      target.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(root.gestures.draft).toBeUndefined();
      const menu = new MouseEvent("contextmenu", {
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      target.dispatchEvent(menu);
      expect(menu.defaultPrevented).toBe(false);
    }
  });
});

describe("explicit tools and measurement prohibition", () => {
  it("G03 mount/pick/drag/reconcile need only viewport geometry", () => {
    const { root, harness } = setup();
    for (const element of root.querySelectorAll<HTMLElement>("*")) {
      element.getBoundingClientRect = () => {
        throw Error("Forbidden content measurement");
      };
      for (const property of ["offsetWidth", "offsetHeight", "clientWidth", "clientHeight"])
        Object.defineProperty(element, property, {
          get: () => {
            throw Error("Forbidden content size");
          },
        });
    }
    const p = client(root, { x: 240, y: 144 });
    expect(root.pick({ x: p.clientX, y: p.clientY })?.target).toEqual(from);
    const handle = root.dom!.nodes.get("source")!.querySelector("[data-patch-handle]")!;
    pointer(handle, "pointerdown", root, { x: 60, y: 90 });
    pointer(root, "pointermove", root, { x: 160, y: 110 });
    pointer(root, "pointerup", root, { x: 160, y: 110 });
    expect(harness.intents).toHaveLength(1);
    expect(harness.frame(next(2))).toBe("installed");
    root.setCamera({ tx: 10, ty: 20, scale: 2 });
    expect(root.origins.has("source")).toBe(true);
  });
  it("A02 explicit Select tool supports two clicks without dragging", () => {
    const { root, harness } = setup();
    root
      .painter!.navigation.querySelector<HTMLButtonElement>('[data-patch-command="select"]')!
      .click();
    for (const point of [
      { x: 20, y: 40 },
      { x: 700, y: 350 },
    ])
      root.painter!.background.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true, ...client(root, point) }),
      );
    expect(harness.selections.at(-1)?.targets.map((t) => t.kind)).toEqual(["node", "node"]);
  });
  it("I11 only a matching bound picker choice creates; cancelled picker cannot create", () => {
    const { root, harness } = setup();
    const start = () => {
      const source = root.dom!.ports.get("source")!.get("out")!.querySelector("button")!;
      pointer(source, "pointerdown", root, { x: 240, y: 144 });
      pointer(root, "pointermove", root, { x: 700, y: 400 });
      pointer(root, "pointerup", root, { x: 700, y: 400 });
    };
    start();
    const first = harness.queries.at(-1)!;
    root.cancelGesture("picker-cancel");
    root.gestures.acceptChoice(first.queryId, "bound-choice");
    expect(harness.intents).toHaveLength(0);
    start();
    const second = harness.queries.at(-1)!;
    root.gestures.acceptChoice(second.queryId, "bound-choice");
    expect(harness.intents[0]!.args.kind).toBe("create-from-port");
  });
  it("G06 parallel routes keep their connection identities independently", () => {
    const parallel = {
      ...exampleScene.connections[1],
      key: "parallel",
      lifetime: "parallel-life",
      selectorRef: "parallel-selector",
      z: 3,
    };
    const { root } = setup({
      ...exampleScene,
      connections: [...exampleScene.connections, parallel],
    });
    root.setSelection([
      c,
      { kind: "connection", connection: "parallel", lifetime: "parallel-life" },
    ]);
    expect(root.painter!.wires.querySelectorAll("g[data-selected]")).toHaveLength(2);
    root.gestures.moveBy([{ kind: "node", node: "sink", lifetime: "node-life:sink" }], {
      x: 20,
      y: 0,
    });
    expect(root.index!.connections.get("parallel")!.endpoints).toEqual(
      exampleScene.connections[1].endpoints,
    );
    expect(root.index!.connections.size).toBe(4);
  });
});
