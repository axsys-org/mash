import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

// Restored from main c5795e2, "Inline path lanes". These are catalogue
// fixtures, not live namespace records or a second tree selection model.
const nodes = [
  {
    id: "KTK-1",
    path: "/work/KTK-1",
    title: "Stitch revision topology",
    lane: 0,
    parents: "MIR-8",
    relation: "current",
    children: [
      {
        id: "KTK-1/overlay",
        path: "/work/KTK-1/overlays/invoice",
        title: "Invoice overlay",
        lane: 1,
        parents: "KTK-1",
        relation: "x→x",
        overlay: true,
      },
      {
        id: "KTK-1/source",
        path: "/work/KTK-1/source",
        title: "Source witness",
        lane: 2,
        parents: "KTK-1",
        relation: "child",
      },
    ],
  },
  {
    id: "MIR-8",
    path: "/work/MIR-8",
    title: "Reconcile namespace witnesses",
    lane: 0,
    parents: "BASE-1",
    relation: "parent",
    children: [
      {
        id: "MIR-8/records",
        path: "/work/MIR-8/records",
        title: "Projected records",
        lane: 3,
        parents: "MIR-8",
        relation: "overlay",
        overlay: true,
      },
    ],
  },
  {
    id: "BASE-1",
    path: "/work/BASE-1",
    title: "Addressable Shrine lineage",
    lane: 0,
    relation: "root",
  },
];

interface PathNode {
  id: string;
  path: string;
  title: string;
  lane: number;
  parents?: string;
  relation: string;
  overlay?: boolean;
  children?: PathNode[];
}

const field = (name: string, value: string) =>
  `<sh-limb><sh-slot slot="label" title="${name}"></sh-slot><sh-pail slot="value">${value}</sh-pail></sh-limb>`;

const row = (node: PathNode, nested = false): string => `
  <ui-tree-item ${nested ? 'slot="children"' : ""} value="${node.id}" path="${node.path}" title="${node.title}"
    ${node.children ? 'kind="folder" expanded' : ""} ${node.id === "KTK-1" ? "current selected" : ""}
    ${node.overlay ? "data-overlay" : ""} data-relation="${node.relation}"
    data-shrine-lane="${node.lane}" ${node.parents ? `data-shrine-parents="${node.parents}"` : ""}>
    <ui-path slot="label" size="small" path="${node.path}"><span slot="title">${node.title}</span></ui-path>
    ${node.overlay ? `<ui-badge slot="meta" size="small" tone="warning">${node.relation}</ui-badge>` : `<span slot="meta">${node.relation}</span>`}
    <ui-preview-card slot="actions" label="${node.title} provenance" placement="right" open-delay="140" close-delay="250">
      <ui-button slot="trigger" size="small" variant="ghost" aria-label="Preview ${node.title}">Info</ui-button>
      <sh-myth variant="preview" kind="Fixture" title="${node.title}" path="${node.path}">
        ${field("node", node.id)}
        ${field("lane", String(node.lane))}
        ${field("relation", node.relation)}
        ${field("source", node.parents || "—")}
      </sh-myth>
    </ui-preview-card>
    ${node.children?.map((child) => row(child, true)).join("") || ""}
  </ui-tree-item>`;

const layout = `<style>
.shrine-path-stage{inline-size:min(100%,58rem);margin-inline:auto;display:grid;gap:var(--space-container-gap);min-inline-size:0}
.shrine-path-stage sh-tree{inline-size:100%}
.shrine-path-stage [hidden]{display:none!important}
.shrine-path-stage output{overflow-wrap:anywhere;font-size:var(--type-label-small-font-size);color:var(--color-text-muted)}
.shrine-path-stage ui-preview-card::part(popup){inline-size:min(23rem,calc(100vw - 2rem))}
.shrine-path-stage sh-myth{inline-size:100%}
</style>`;

export const shrineTreeExamples: CatalogExample[] = [
  {
    ...sample(
      "Inline path lanes",
      `${layout}
      <section class="shrine-path-stage" aria-label="Inline Shrine path lanes">
        <div class="mash-row mash-wrap">
          <ui-button id="toggle-overlays" size="small" variant="secondary" aria-pressed="true">Hide overlays</ui-button>
          <ui-button id="reveal-overlay" size="small" variant="secondary">Reveal invoice overlay</ui-button>
        </div>
        <sh-tree variant="inline"><ui-tree slot="tree" selection-mode="single" label="Addressable Shrine path history">${nodes.map((node) => row(node)).join("")}</ui-tree></sh-tree>
        <output id="path-selection" role="status">/work/KTK-1 · current</output>
      </section>`,
      "Restored from the original catalogue: overlays and source witnesses are inline, addressable tree items. Colored lanes show their relationships; hover or focus Info for provenance. Fixture data only.",
    ),
    compositionOnly: true,
    scoped: true,
    script: `const tree = root.querySelector("ui-tree");
const graph = root.querySelector("sh-tree");
const toggle = root.querySelector("#toggle-overlays");
const output = root.querySelector("#path-selection");
const rows = [...tree.querySelectorAll("ui-tree-item")];
const overlays = rows.filter(row => row.hasAttribute("data-overlay"));
function describe() {
  const selected = rows.find(row => tree.selectedValues.includes(row.identity));
  output.textContent = selected ? selected.getAttribute("path") + " · " + selected.dataset.relation : "No path selected";
}
function showOverlays(show) {
  if (!show) {
    const selected = overlays.find(row => tree.selectedValues.includes(row.identity));
    if (selected) tree.selectedValues = [selected.parentElement.closest("ui-tree-item").identity];
    root.querySelectorAll("ui-preview-card").forEach(card => card.dismiss());
  }
  overlays.forEach(row => { row.hidden = !show; });
  toggle.textContent = show ? "Hide overlays" : "Show overlays";
  toggle.setAttribute("aria-pressed", String(show));
  graph.refreshGraph();
  describe();
}
tree.addEventListener("ui-tree-selection-change", describe, { signal });
tree.addEventListener("ui-tree-toggle", event => {
  const row = rows.find(row => row.identity === event.detail.value);
  if (row) row.expanded = event.detail.expanded;
}, { signal });
toggle.addEventListener("click", () => showOverlays(toggle.getAttribute("aria-pressed") !== "true"), { signal });
root.querySelector("#reveal-overlay").addEventListener("click", async () => {
  showOverlays(true);
  tree.revealItem("KTK-1/overlay");
  await Promise.all(rows.map(row => row.updateComplete));
  if (signal.aborted) return;
  tree.focusItem("KTK-1/overlay");
  tree.selectedValues = ["KTK-1/overlay"];
  describe();
}, { signal });`,
  },
  {
    ...sample(
      "Mixed node forms",
      `${layout}
<div class="shrine-path-stage">
        <sh-tree variant="inline" >
          <ui-tree slot="tree" selection-mode="single" label="Mixed Shrine node pronunciations">
            <ui-tree-item value="HEAD" path="/revisions/head" title="Current revision" current selected data-shrine-capsule="HEAD" data-shrine-lane="0" data-shrine-parents="MAIN">
              <ui-path slot="label" size="small" path="/revisions/head"><span slot="title">Current revision</span></ui-path>
              <span slot="meta">capsule opt-in</span>
            </ui-tree-item>
            <ui-tree-item value="PATCH" path="/revisions/patch" title="Overlay patch" data-shrine-lane="2" data-shrine-parents="MAIN">
              <ui-path slot="label" size="small" path="/revisions/patch"><span slot="title">Overlay patch</span></ui-path>
              <span slot="meta">regular node</span>
            </ui-tree-item>
            <ui-tree-item value="MAIN" path="/revisions/main" title="Main witness" data-shrine-lane="0">
              <ui-path slot="label" size="small" path="/revisions/main"><span slot="title">Main witness</span></ui-path>
              <span slot="meta">regular node</span>
            </ui-tree-item>
          </ui-tree>
        </sh-tree></div>`,
    ),
    compositionOnly: true,
  },
  {
    ...sample(
      "KTK-1 trace ledger",
      `${layout}
<div class="shrine-path-stage">
        <sh-tree variant="ledger" >
          <ui-tree slot="tree" selection-mode="single" label="KTK-1 Shrine trace ledger">
            <ui-tree-item value="KTK-1" title="Stitch revision topology into the Shrine tree" current selected data-shrine-lane="0" data-shrine-parents="MIR-8">
              <ui-path slot="label" size="small" path="/trace/KTK-1"><span slot="title">Stitch revision topology into the Shrine tree</span></ui-path>
              <ui-badge slot="meta" tone="positive">KTK-1 · current</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="MIR-8" title="Reconcile projected namespace witnesses" data-shrine-lane="0" data-shrine-parents="AXL-6 VEL-3">
              <ui-path slot="label" size="small" path="/trace/MIR-8"><span slot="title">Reconcile projected namespace witnesses</span></ui-path>
              <span slot="meta">MIR-8 · now</span>
            </ui-tree-item>
            <ui-tree-item value="AXL-6" title="Admit stable path identities" data-shrine-lane="0" data-shrine-parents="AXL-5">
              <ui-path slot="label" size="small" path="/trace/AXL-6"><span slot="title">Admit stable path identities</span></ui-path>
              <ui-badge slot="meta">main trace</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="VEL-3" title="Carry revision provenance through the catalogue" data-shrine-lane="3" data-shrine-parents="VEL-2">
              <ui-path slot="label" size="small" path="/trace/VEL-3"><span slot="title">Carry revision provenance through the catalogue</span></ui-path>
              <ui-badge slot="meta" tone="warning">projection</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="AXL-5" title="Sew semantic handles into record rows" data-shrine-lane="0" data-shrine-parents="AXL-4 ORB-2">
              <ui-path slot="label" size="small" path="/trace/AXL-5"><span slot="title">Sew semantic handles into record rows</span></ui-path>
              <span slot="meta">AXL-5 · 14m</span>
            </ui-tree-item>
            <ui-tree-item value="ORB-2" title="Prototype alternate locator pronunciation" data-shrine-lane="5" data-shrine-parents="ORB-1">
              <ui-path slot="label" size="small" path="/trace/ORB-2"><span slot="title">Prototype alternate locator pronunciation</span></ui-path>
              <ui-badge slot="meta" tone="critical">detached</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="VEL-2" title="Normalize trace color roles" data-shrine-lane="3" data-shrine-parents="JOIN-4">
              <ui-path slot="label" size="small" path="/trace/VEL-2"><span slot="title">Normalize trace color roles</span></ui-path>
              <span slot="meta">VEL-2 · 31m</span>
            </ui-tree-item>
            <ui-tree-item value="AXL-4" title="Preserve tree keyboard ownership" data-shrine-lane="0" data-shrine-parents="BASE-1">
              <ui-path slot="label" size="small" path="/trace/AXL-4"><span slot="title">Preserve tree keyboard ownership</span></ui-path>
              <span slot="meta">AXL-4 · 42m</span>
            </ui-tree-item>
            <ui-tree-item value="ORB-1" title="Test an independent material branch" data-shrine-lane="5" data-shrine-parents="JOIN-4">
              <ui-path slot="label" size="small" path="/trace/ORB-1"><span slot="title">Test an independent material branch</span></ui-path>
              <span slot="meta">ORB-1 · 1h</span>
            </ui-tree-item>
            <ui-tree-item value="JOIN-4" title="Join projected histories without rewriting identity" data-shrine-lane="2" data-shrine-parents="BASE-1">
              <ui-path slot="label" size="small" path="/trace/JOIN-4"><span slot="title">Join projected histories without rewriting identity</span></ui-path>
              <ui-badge slot="meta" tone="positive">witnessed</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="BASE-1" title="Establish the first addressable Shrine lineage" data-shrine-lane="0">
              <ui-path slot="label" size="small" path="/trace/BASE-1"><span slot="title">Establish the first addressable Shrine lineage</span></ui-path>
              <span slot="meta">BASE-1 · yesterday</span>
            </ui-tree-item>
          </ui-tree>
        </sh-tree></div>`,
    ),
    compositionOnly: true,
  },
  {
    ...sample(
      "Revision graph",
      `${layout}
<div class="shrine-path-stage">
        <sh-tree >
          <ui-tree slot="tree" selection-mode="single" label="Shrine revision graph">
            <ui-tree-item value="head" title="AXI-37 Shrine revision graph" current selected data-shrine-lane="0" data-shrine-parents="merge">
              <span slot="icon" aria-hidden="true">◆</span>
              <span slot="meta"><ui-badge tone="positive">HEAD</ui-badge></span>
            </ui-tree-item>
            <ui-tree-item value="merge" title="Merge catalogue conformance" data-shrine-lane="0" data-shrine-parents="main feature-a">
              <span slot="meta">0bce38b · 8m</span>
            </ui-tree-item>
            <ui-tree-item value="main" title="Normalize component recipes" data-shrine-lane="0" data-shrine-parents="base">
              <span slot="meta"><ui-badge>main</ui-badge></span>
            </ui-tree-item>
            <ui-tree-item value="feature-a" title="Add progressive path masks" data-shrine-lane="2" data-shrine-parents="feature-b">
              <span slot="meta"><ui-badge tone="warning">AXI-62</ui-badge></span>
            </ui-tree-item>
            <ui-tree-item value="feature-b" title="Expose semantic overflow parts" data-shrine-lane="2" data-shrine-parents="base">
              <span slot="meta">ae91d4c · 2h</span>
            </ui-tree-item>
            <ui-tree-item value="base" title="Establish Mash component foundations" data-shrine-lane="0">
              <span slot="meta">c4a23f1 · yesterday</span>
            </ui-tree-item>
          </ui-tree>
        </sh-tree></div>`,
    ),
    compositionOnly: true,
  },
];
