import type { Camera, Point, SceneSnapshot, Rect } from "./contract.js";
import { deformation, pathData, sub, same } from "./geometry.js";
import type { SceneIndex } from "./scene.js";
const svgNS = "http://www.w3.org/2000/svg";
export const svg = <K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] =>
  document.createElementNS(svgNS, name);
const styledRoots = new WeakSet<ShadowRoot>();
function sheet(root: ShadowRoot, text: string): void {
  if (styledRoots.has(root)) return;
  styledRoots.add(root);
  if ("adoptedStyleSheets" in root && "replaceSync" in CSSStyleSheet.prototype) {
    const style = new CSSStyleSheet();
    style.replaceSync(text);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, style];
    return;
  }
  const style = document.createElement("style");
  const nonce = root.host.getAttribute("nonce");
  if (nonce) style.nonce = nonce;
  style.textContent = text;
  root.append(style);
}
/** Thin placement shell for server-owned Goo HTML.
 * @example Resolved node shell
 * <goo-patch-node data-key="source"><span>Source</span></goo-patch-node>
 * @tag goo-patch-node
 * @summary Places one resolved node occurrence without measuring its content.
 * @slot - Resolved ordinary Goo body and attachment controls.
 * @csspart root - Private resolved placement frame.
 * @mashnode root root
 * @mashnode content content root
 * @mashrole slot default content content
 */
export class GooPatchNode extends HTMLElement {
  private frame?: HTMLDivElement;
  place(rect: Rect, z: number): void {
    if (!this.frame) {
      const root = this.attachShadow({ mode: "open" });
      sheet(
        root,
        `:host{display:contents}.frame{position:absolute;box-sizing:border-box;transform-origin:0 0}.frame[data-selected]{outline:2px solid currentColor;outline-offset:3px}.frame[data-pending]{outline:2px dashed currentColor}.frame>slot{display:contents}`,
      );
      this.frame = document.createElement("div");
      this.frame.className = "frame";
      this.frame.part.add("root");
      this.frame.append(document.createElement("slot"));
      root.append(this.frame);
    }
    Object.assign(this.frame.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform: `translate(${rect.x}px,${rect.y}px)`,
      zIndex: String(z),
    });
  }
  decorate(selected: boolean, pending: boolean): void {
    this.frame?.toggleAttribute("data-selected", selected);
    this.frame?.toggleAttribute("data-pending", pending);
  }
}
/** Resolved semantic attachment shell.
 * @example Attachment control
 * <goo-patch-port data-key="out"><button data-patch-anchor>Result</button></goo-patch-port>
 * @tag goo-patch-port
 * @summary Places an ordinary accessible port control at supplied geometry.
 * @slot - Server-rendered attachment control.
 * @csspart root - Resolved attachment frame.
 * @mashnode root root
 * @mashnode content content root
 * @mashrole slot default content content
 */
export class GooPatchPort extends HTMLElement {
  place(rect: Rect): void {
    if (!this.shadowRoot) {
      const root = this.attachShadow({ mode: "open" });
      sheet(
        root,
        `:host{display:contents}.anchor{position:absolute;box-sizing:border-box;touch-action:none}.anchor>slot{display:contents}:host([data-hover]) .anchor{outline:2px dotted currentColor}:host([data-compatibility=forbidden]) .anchor{outline:2px dashed currentColor}:host([data-compatibility=allowed]) .anchor{outline:2px solid currentColor}`,
      );
      const frame = document.createElement("span");
      frame.className = "anchor";
      frame.part.add("root");
      frame.append(document.createElement("slot"));
      root.append(frame);
    }
    const frame = this.shadowRoot!.querySelector<HTMLElement>(".anchor")!;
    Object.assign(frame.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }
}
/** Identity and resolved-label shell for one semantic connection.
 * @example Connection label
 * <goo-patch-connection data-key="wire"><span data-patch-label="caption">Result</span></goo-patch-connection>
 * @tag goo-patch-connection
 * @summary Retains a connection's server-rendered labels independently of its paths.
 * @slot - Keyed server-rendered labels, assigned to private label slots at admission.
 * @csspart root - Each resolved label placement frame.
 * @mashnode root root
 * @mashnode content content root
 * @mashrole slot default content content
 */
export class GooPatchConnection extends HTMLElement {
  place(
    labels: SceneSnapshot["connections"][number]["labels"],
    elements: Map<string, HTMLElement>,
    offset: Point = { x: 0, y: 0 },
  ): void {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    if (!root.firstChild)
      sheet(
        root,
        `:host{display:contents}.label{position:absolute;box-sizing:border-box}.label>slot{display:contents}`,
      );
    const keep = new Set<string>();
    labels.forEach((l, i) => {
      const name = `patch-label-${i}`;
      keep.add(name);
      elements.get(l.key)!.slot = name;
      let frame = [...root.querySelectorAll<HTMLElement>(".label")].find(
        (e) => e.dataset.slot === name,
      );
      if (!frame) {
        frame = document.createElement("span");
        frame.className = "label";
        frame.part.add("root");
        frame.dataset.slot = name;
        const slot = document.createElement("slot");
        slot.name = name;
        frame.append(slot);
        root.append(frame);
      }
      Object.assign(frame.style, {
        left: `${l.rect.x + offset.x}px`,
        top: `${l.rect.y + offset.y}px`,
        width: `${l.rect.width}px`,
        height: `${l.rect.height}px`,
      });
    });
    for (const frame of root.querySelectorAll<HTMLElement>(".label"))
      if (!keep.has(frame.dataset.slot!)) frame.remove();
  }
}
export interface OwnedDOM {
  nodes: Map<string, GooPatchNode>;
  ports: Map<string, Map<string, GooPatchPort>>;
  connections: Map<string, GooPatchConnection>;
  labels: Map<string, Map<string, HTMLElement>>;
}
/** May run over a detached proposed root; nested patch membership is never imported. */
export function mapDOM(root: Element, scene: SceneSnapshot): OwnedDOM {
  const own = <T extends HTMLElement>(selector: string): T[] =>
    [...root.querySelectorAll<T>(selector)].filter((e) => e.closest("goo-patch") === root);
  const keyed = <T extends HTMLElement>(
    items: T[],
    get: (e: T) => string | undefined,
  ): Map<string, T> => {
    const map = new Map<string, T>();
    for (const item of items) {
      const key = get(item);
      if (!key || map.has(key)) throw new Error("invalid-scene");
      map.set(key, item);
    }
    return map;
  };
  const nodes = keyed(own<GooPatchNode>("goo-patch-node"), (e) => e.dataset.key),
    connections = keyed(own<GooPatchConnection>("goo-patch-connection"), (e) => e.dataset.key);
  const ports = new Map<string, Map<string, GooPatchPort>>(),
    labels = new Map<string, Map<string, HTMLElement>>();
  if (nodes.size !== scene.nodes.length || connections.size !== scene.connections.length)
    throw new Error("invalid-scene");
  const allPorts = own<GooPatchPort>("goo-patch-port"),
    allLabels = own<HTMLElement>("[data-patch-label]");
  const portOwners = new Map<Element, GooPatchPort[]>(),
    labelOwners = new Map<Element, HTMLElement[]>();
  for (const port of allPorts) {
    const owner = port.closest("goo-patch-node");
    if (owner) {
      const list = portOwners.get(owner) ?? [];
      list.push(port);
      portOwners.set(owner, list);
    }
  }
  for (const label of allLabels) {
    const owner = label.closest("goo-patch-connection");
    if (owner) {
      const list = labelOwners.get(owner) ?? [];
      list.push(label);
      labelOwners.set(owner, list);
    }
  }
  for (const n of scene.nodes) {
    const element = nodes.get(n.key);
    if (!element) throw new Error("invalid-scene");
    const ps = keyed(portOwners.get(element) ?? [], (p) => p.dataset.key);
    if (ps.size !== n.ports.length || n.ports.some((p) => !ps.has(p.key)))
      throw new Error("invalid-scene");
    ports.set(n.key, ps);
  }
  if ([...ports.values()].reduce((sum, m) => sum + m.size, 0) !== allPorts.length)
    throw new Error("invalid-scene");
  for (const c of scene.connections) {
    const element = connections.get(c.key);
    if (!element) throw new Error("invalid-scene");
    const ls = keyed(labelOwners.get(element) ?? [], (l) => l.dataset.patchLabel);
    if (ls.size !== c.labels.length || c.labels.some((l) => !ls.has(l.key)))
      throw new Error("invalid-scene");
    labels.set(c.key, ls);
  }
  return { nodes, ports, connections, labels };
}
let serial = 0;
export class Painter {
  readonly world: HTMLDivElement;
  readonly background: HTMLDivElement;
  readonly overlay: SVGSVGElement;
  readonly wires: SVGSVGElement;
  readonly status: HTMLParagraphElement;
  readonly navigation: HTMLDivElement;
  readonly metrics = { camera: 0, nodes: 0, connections: 0, installs: 0 };
  private paths = new Map<string, SVGGElement>();
  private id = `goo-patch-${++serial}`;
  constructor(root: ShadowRoot) {
    sheet(
      root,
      `:host{display:block;position:relative;contain:layout;min-height:200px;overflow:hidden;color:inherit}.background{position:absolute;inset:0;touch-action:none}.world{position:absolute;inset:0;transform-origin:0 0;pointer-events:none}.world>slot{display:contents}::slotted(goo-patch-node),::slotted(goo-patch-connection){pointer-events:auto}svg{position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none}path{fill:none;stroke:currentColor;stroke-width:1.5;vector-effect:non-scaling-stroke}.overlay{z-index:2147483646}.overlay path{stroke-dasharray:5 3}.overlay rect{fill:none;stroke:currentColor;stroke-dasharray:4 3;vector-effect:non-scaling-stroke}.navigation{position:relative;display:flex;gap:4px;width:max-content;z-index:2147483647}.status{position:absolute;bottom:0;left:0;margin:0;pointer-events:none;background:Canvas;color:CanvasText}g[data-selected] path,path[data-selected]{stroke-width:3}g[data-pending] path{stroke-dasharray:5 3}@media(forced-colors:active){path{stroke:CanvasText}button{forced-color-adjust:auto}}`,
    );
    this.background = document.createElement("div");
    this.background.className = "background";
    this.background.part.add("background");
    this.background.dataset.patchBackground = "";
    this.world = document.createElement("div");
    this.world.className = "world";
    this.world.part.add("root");
    this.wires = svg("svg");
    this.wires.part.add("wires");
    this.wires.setAttribute("aria-hidden", "true");
    const defs = svg("defs");
    for (const kind of ["arrow", "dot"]) {
      const marker = svg("marker");
      marker.id = `${this.id}-${kind}`;
      marker.setAttribute("viewBox", "-5 -5 10 10");
      marker.setAttribute("markerWidth", "8");
      marker.setAttribute("markerHeight", "8");
      marker.setAttribute("orient", "auto-start-reverse");
      if (kind === "arrow") {
        const p = svg("path");
        p.setAttribute("d", "M -4 -4 L 4 0 L -4 4 Z");
        p.style.fill = "currentColor";
        marker.append(p);
      } else {
        const c = svg("circle");
        c.setAttribute("r", "3");
        c.setAttribute("fill", "currentColor");
        marker.append(c);
      }
      defs.append(marker);
    }
    this.wires.append(defs);
    this.overlay = svg("svg");
    this.overlay.part.add("overlay");
    this.overlay.classList.add("overlay");
    this.overlay.setAttribute("aria-hidden", "true");
    this.world.append(this.wires, document.createElement("slot"), this.overlay);
    this.navigation = document.createElement("div");
    this.navigation.className = "navigation";
    this.navigation.part.add("navigation");
    this.navigation.setAttribute("role", "group");
    this.navigation.setAttribute("aria-label", "Surface navigation");
    this.navigation.tabIndex = 0;
    for (const [command, name] of [
      ["fit", "Fit"],
      ["zoom-in", "Zoom in"],
      ["zoom-out", "Zoom out"],
      ["left", "Pan left"],
      ["right", "Pan right"],
      ["up", "Pan up"],
      ["down", "Pan down"],
      ["select", "Select area"],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.patchCommand = command;
      b.textContent = name!;
      this.navigation.append(b);
    }
    this.status = document.createElement("p");
    this.status.className = "status";
    this.status.part.add("status");
    this.status.setAttribute("role", "status");
    this.status.setAttribute("aria-live", "polite");
    const controls = document.createElement("slot");
    controls.name = "controls";
    controls.part.add("controls");
    root.append(this.background, this.world, this.navigation, controls, this.status);
  }
  camera(camera: Camera): void {
    this.metrics.camera++;
    this.world.style.transform = `translate(${camera.tx}px,${camera.ty}px) scale(${camera.scale})`;
  }
  install(index: SceneIndex, dom: OwnedDOM): void {
    this.metrics.installs++;
    for (const [key, g] of this.paths)
      if (!index.connections.has(key)) {
        g.remove();
        this.paths.delete(key);
      }
    for (const n of index.scene.nodes) {
      const node = dom.nodes.get(n.key)!;
      for (const handle of node.querySelectorAll<HTMLElement>("[data-patch-handle]"))
        if (handle.closest("goo-patch-node") === node) handle.style.touchAction = "none";
      this.node(index, dom, n.key, n.rect);
      for (const p of n.ports) dom.ports.get(n.key)!.get(p.key)!.place(p.hitRect);
    }
    for (const c of [...index.scene.connections].sort((a, b) => a.z - b.z)) {
      this.connection(index, dom, c.key, new Map());
      this.wires.append(this.paths.get(c.key)!);
    }
  }
  node(index: SceneIndex, dom: OwnedDOM, key: string, origin: Point): void {
    const n = index.nodes.get(key);
    if (!n) return;
    this.metrics.nodes++;
    dom.nodes.get(key)!.place({ ...n.rect, ...origin }, n.z);
  }
  connection(
    index: SceneIndex,
    dom: OwnedDOM,
    key: string,
    origins: ReadonlyMap<string, Point>,
  ): void {
    const c = index.connections.get(key);
    if (!c) return;
    this.metrics.connections++;
    let group = this.paths.get(key);
    if (!group) {
      group = svg("g");
      group.dataset.key = key;
      this.paths.set(key, group);
      this.wires.append(group);
    }
    const offsets = new Map<string, Point>();
    for (const e of c.endpoints) {
      const o = origins.get(e.port.node);
      if (o) offsets.set(e.port.node, sub(o, index.nodes.get(e.port.node)!.rect));
    }
    const all = c.endpoints.map((e) => offsets.get(e.port.node) ?? { x: 0, y: 0 });
    const whole = all.every((p) => same(p, all[0]!)) ? all[0]! : { x: 0, y: 0 };
    const children: SVGElement[] = [];
    for (const s of c.segments) {
      let path = [...group.querySelectorAll("path")].find((p) => p.dataset.key === s.key);
      if (!path) {
        path = svg("path");
        path.dataset.key = s.key;
      }
      path.setAttribute("d", pathData(deformation(c, s, offsets)));
      if (s.part) path.dataset.part = s.part;
      else delete path.dataset.part;
      for (const side of ["start", "end"] as const) {
        const marker = s[side === "start" ? "startMarker" : "endMarker"];
        if (marker && marker !== "none")
          path.setAttribute(`marker-${side}`, `url(#${this.id}-${marker})`);
        else path.removeAttribute(`marker-${side}`);
      }
      children.push(path);
    }
    for (const j of c.junctions)
      if (j.marker === "dot") {
        const dot = svg("circle");
        dot.setAttribute("cx", String(j.point.x + whole.x));
        dot.setAttribute("cy", String(j.point.y + whole.y));
        dot.setAttribute("r", "3");
        dot.setAttribute("fill", "currentColor");
        children.push(dot);
      }
    group.replaceChildren(...children);
    dom.connections.get(key)!.place(c.labels, dom.labels.get(key)!, whole);
    group.toggleAttribute("data-pending", offsets.size > 0);
  }
  selectedConnections(
    keys: Set<string>,
    parts: ReadonlyMap<string, Set<string>> = new Map(),
  ): void {
    for (const [key, group] of this.paths) {
      group.toggleAttribute("data-selected", keys.has(key));
      for (const path of group.querySelectorAll("path"))
        path.toggleAttribute(
          "data-selected",
          !!path.dataset.part && !!parts.get(key)?.has(path.dataset.part),
        );
    }
  }
}
