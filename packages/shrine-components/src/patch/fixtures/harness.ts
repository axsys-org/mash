/** TEST HARNESS ONLY. These simulated outcomes are not production authority. */
import type {
  Basis,
  CompatibilityResult,
  OperationReceipt,
  PatchIntent,
  PatchQuery,
  SceneSnapshot,
  SelectionRequest,
  Target,
} from "../contract.js";
import type { PatchAdapter, ProjectionFrame } from "../adapter.js";
import { GooPatch } from "../register.js";
import { targetKey } from "../scene.js";
export class FixtureHarness implements PatchAdapter {
  readonly intents: PatchIntent[] = [];
  readonly queries: PatchQuery[] = [];
  readonly selections: SelectionRequest[] = [];
  readonly repairs: string[] = [];
  readonly reconciliations: string[] = [];
  readonly outcomes = new Map<string, OperationReceipt>();
  readonly captures: { offer: string; basis: Basis; targets: readonly Target[] }[] = [];
  readonly listeners = new Set<(r: OperationReceipt) => void>();
  composition = false;
  active = true;
  delay = 500;
  private serial = 0;
  constructor(readonly surface: GooPatch) {
    surface.attachAdapter(this);
  }
  live(_basis: Basis): boolean {
    return this.active;
  }
  composing(): boolean {
    return this.composition;
  }
  describeExplanation(reference: string): string {
    return reference;
  }
  repair(code: string): void {
    this.repairs.push(code);
  }
  reconcileOperation(id: string): void {
    this.reconciliations.push(id);
  }
  capture(offer: string, basis: Basis, targets: readonly Target[]) {
    this.captures.push({ offer, basis, targets });
    return {
      operationId: `fixture-operation-${++this.serial}`,
      activationRef: `fixture-activation-${this.serial}`,
    };
  }
  submit(intent: PatchIntent): void {
    if (!this.intents.some((i) => i.operationId === intent.operationId)) this.intents.push(intent);
  }
  select(request: SelectionRequest): void {
    this.selections.push(request);
    let targets = [...this.surface.selection];
    const incoming = new Set(request.targets.map(targetKey));
    if (request.mode === "replace") targets = [...request.targets];
    else if (request.mode === "add")
      targets = [
        ...targets,
        ...request.targets.filter((t) => !targets.some((old) => targetKey(old) === targetKey(t))),
      ];
    else
      targets = [
        ...targets.filter((t) => !incoming.has(targetKey(t))),
        ...request.targets.filter((t) => !targets.some((old) => targetKey(old) === targetKey(t))),
      ];
    this.surface.setSelection(targets);
  }
  query(request: PatchQuery): void {
    this.queries.push(request);
  }
  subscribeReceipts(listener: (r: OperationReceipt) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  receipt(id: string, outcome: OperationReceipt["outcome"], explanationRef?: string): void {
    const intent = this.intents.find((i) => i.operationId === id);
    if (!intent) throw new Error("Unknown fixture operation");
    const receipt = {
      operationId: id,
      outcome,
      surface: intent.basis.surface,
      encounter: intent.basis.encounter,
      ...(explanationRef ? { explanationRef } : {}),
    };
    const previous = this.outcomes.get(id);
    if (previous?.outcome === "accepted" || previous?.outcome === "rejected") return;
    this.outcomes.set(id, receipt);
    for (const listener of this.listeners) listener(receipt);
  }
  delayedReceipt(id: string, outcome: OperationReceipt["outcome"]): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(() => {
        this.receipt(id, outcome);
        resolve();
      }, this.delay),
    );
  }
  compatibility(result: CompatibilityResult): void {
    this.surface.receiveCompatibility(result);
  }
  frame(
    scene: SceneSnapshot,
    options: { base?: number; covered?: string[]; prepare?: ProjectionFrame["prepare"] } = {},
  ): string {
    return this.surface.admit({
      scene,
      dom:
        options.base === undefined
          ? { kind: "complete" }
          : { kind: "delta", baseViewSeq: options.base },
      coveredOperationIds: options.covered ?? [],
      prepare: options.prepare ?? (() => ({ proposed: this.surface, commit: () => {} })),
    });
  }
  retire(): void {
    this.active = false;
    this.surface.retire();
  }
}
const button = (label: string, attrs: Record<string, string>): HTMLButtonElement => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
  return b;
};
/** Deterministic server-like resolved fixture HTML. No layout decisions occur here. */
export function fixtureDOM(scene: SceneSnapshot): GooPatch {
  const root = document.createElement("goo-patch");
  root.style.cssText = "width:1000px;height:600px;border:1px solid";
  root.setAttribute("aria-label", "Fixture patch (simulated authority)");
  const script = document.createElement("script");
  script.type = "application/json";
  script.dataset.patchScene = "";
  script.textContent = JSON.stringify(scene);
  root.append(script);
  for (const n of scene.nodes) {
    const node = document.createElement("goo-patch-node");
    node.dataset.key = n.key;
    const body = document.createElement("div");
    body.style.cssText =
      "position:absolute;inset:0;border:1px solid currentColor;background:Canvas;color:CanvasText;box-sizing:border-box";
    node.append(body);
    const header = document.createElement("header");
    header.dataset.patchSelect = "";
    header.textContent = n.key;
    header.style.cssText =
      "position:absolute;left:16px;top:8px;height:28px;background:Canvas;color:CanvasText";
    header.append(button(`Move ${n.key}`, { "data-patch-handle": "" }));
    node.append(header);
    const input = document.createElement("input");
    input.setAttribute("aria-label", `Edit ${n.key}`);
    input.value = "original";
    input.style.cssText = "position:absolute;left:24px;top:44px;width:120px;box-sizing:border-box";
    node.append(input);
    for (const [name, dx, dy] of [
      ["left", -10, 0],
      ["right", 10, 0],
      ["up", 0, -10],
      ["down", 0, 10],
    ] as const) {
      const b = button(`Move ${n.key} ${name}`, {
        "data-patch-move": "",
        "data-dx": String(dx),
        "data-dy": String(dy),
      });
      b.style.cssText = `position:absolute;left:${16 + ["left", "right", "up", "down"].indexOf(name) * 36}px;top:90px;width:32px;height:24px`;
      b.setAttribute("aria-label", `Move ${n.key} ${name}`);
      b.textContent = { left: "←", right: "→", up: "↑", down: "↓" }[name];
      node.append(b);
    }
    for (const p of n.ports) {
      const port = document.createElement("goo-patch-port");
      port.dataset.key = p.key;
      const b = button(p.direction === "output" ? "→" : "●", {
        "data-patch-anchor": "",
        "aria-label": `${n.key} ${p.key}`,
      });
      b.style.cssText = "width:24px;height:24px;padding:0";
      port.append(b);
      node.append(port);
    }
    root.append(node);
  }
  const table = document.createElement("div");
  table.slot = "controls";
  table.setAttribute("aria-label", "Connections");
  table.style.cssText =
    "position:absolute;right:0;bottom:0;max-width:100%;max-height:100px;overflow:auto;background:Canvas;color:CanvasText";
  table.dataset.patchNative = "";
  for (const c of scene.connections) {
    const connection = document.createElement("goo-patch-connection");
    connection.dataset.key = c.key;
    for (const l of c.labels) {
      const label = document.createElement("span");
      label.dataset.patchLabel = l.key;
      label.textContent = l.key;
      connection.append(label);
    }
    root.append(connection);
    const row = document.createElement("div");
    row.textContent = c.key;
    row.append(
      button(`Disconnect ${c.key}`, {
        "data-patch-disconnect": "",
        "data-patch-connection": c.key,
      }),
    );
    for (const e of c.endpoints)
      row.append(
        button(`Reconnect ${c.key} ${e.key}`, {
          "data-patch-reconnect": e.key,
          "data-patch-connection": c.key,
        }),
      );
    table.append(row);
  }
  root.append(table);
  return root;
}
/** Explicit large server fixture: two identity-bearing routes per node, no client solver. */
export function largeScene(count: number, base: SceneSnapshot): SceneSnapshot {
  const nodes = Array.from({ length: count }, (_, i) => ({
    key: `n${i}`,
    lifetime: `nl${i}`,
    selectorRef: `ns${i}`,
    rect: { x: (i % 25) * 220, y: Math.floor(i / 25) * 120, width: 160, height: 80 },
    z: 10,
    presentation: "node" as const,
    draggable: true,
    ports: [
      {
        key: "p",
        lifetime: `pl${i}`,
        selectorRef: `ps${i}`,
        anchor: { x: 160, y: 40 },
        outward: { x: 1, y: 0 },
        hitRect: { x: 148, y: 28, width: 24, height: 24 },
        connectable: true,
      },
    ],
  }));
  const connections = nodes.flatMap((n, i) =>
    [1, 2].map((step) => {
      const to = nodes[(i + step) % count]!;
      const target = (n: (typeof nodes)[number]) => ({
        kind: "port" as const,
        node: n.key,
        nodeLifetime: n.lifetime,
        port: "p",
        lifetime: n.ports[0]!.lifetime,
      });
      return {
        key: `c${i}-${step}`,
        lifetime: `cl${i}-${step}`,
        selectorRef: `cs${i}-${step}`,
        topologyRef: "fixture-topology",
        z: 0,
        endpoints: [
          { key: "a", port: target(n) },
          { key: "b", port: target(to) },
        ],
        junctions: [],
        segments: [
          {
            key: "s",
            from: { kind: "endpoint" as const, key: "a" },
            to: { kind: "endpoint" as const, key: "b" },
            commands: [
              { op: "M" as const, to: { x: n.rect.x + 160, y: n.rect.y + 40 } },
              { op: "L" as const, to: { x: to.rect.x + 160, y: to.rect.y + 40 } },
            ],
          },
        ],
        parts: [],
        labels: [],
        reconnectable: true,
        disconnectable: true,
      };
    }),
  );
  return {
    ...base,
    nodes,
    connections,
    extent: { x: 0, y: 0, width: 5500, height: Math.ceil(count / 25) * 120 },
    initialCamera: { tx: 0, ty: 50, scale: 1 },
  };
}
