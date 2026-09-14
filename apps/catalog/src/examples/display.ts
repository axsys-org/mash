import type { CatalogExample } from "../examples.js";
import { refinements } from "./refinements.js";
import { utilityExamples } from "./utility.js";
import { sample } from "./shared.js";

const landscape =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#e5e9df"/><circle cx="490" cy="94" r="38" fill="#d9b982"/><path d="M0 300 190 70 390 310 510 150 640 300V360H0Z" fill="#869786"/><path d="M0 320 150 210 330 330 450 240 640 350V360H0Z" fill="#4e6d63"/></svg>`,
  );
const portrait =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#e5ded2"/><circle cx="48" cy="35" r="18" fill="#82715b"/><path d="M14 96v-8a34 34 0 0 1 68 0v8" fill="#82715b"/></svg>`,
  );
const line = (width = "100%") =>
  `<ui-skeleton style="height: 1rem; width: ${width}"></ui-skeleton>`;
const panel = (content: string) => `<div class="mash-stack">${content}</div>`;

/** Public parts and small owner scripts keep display demonstrations portable. */
export const displayExamples: Record<string, CatalogExample[]> = {
  "ui-avatar": [
    ...refinements["ui-avatar"]!,
    sample(
      "Placeholders",
      `<div class="mash-row mash-wrap"><ui-avatar alt="Guest"><ui-icon name="object.document" label=""></ui-icon></ui-avatar><ui-avatar alt="Design workspace" shape="square"><ui-icon name="action.search" label=""></ui-icon></ui-avatar><ui-avatar alt="Morgan Park"></ui-avatar><ui-avatar alt="Guest identity">?</ui-avatar></div>`,
      "Fallback content is authored in the default slot. Give anonymous people and organizations a useful accessible name.",
    ),
    sample(
      "Custom shape and finish",
      `<style>.portrait-custom::part(root){width:100px;height:100px;border-radius:20px}.portrait-bordered::part(root){width:100px;height:100px;border:3px solid var(--color-text);box-shadow:0 3px 10px color-mix(in srgb,var(--color-text) 12%,transparent)}</style><div class="mash-row mash-wrap"><ui-avatar class="portrait-custom" src="${portrait}" alt="Alex Morgan"></ui-avatar><ui-avatar class="portrait-bordered" src="${portrait}" alt="Sam Rivera"></ui-avatar></div>`,
      "Public root and image parts allow explicit dimensions, corners, and framing without changing the identity contract.",
    ),
    sample(
      "Group sizes",
      `<div class="mash-stack">${["small", "medium", "large"].map((size) => `<div class="mash-row"><span style="min-width:5rem">${size}</span><div class="mash-avatar-group" role="group" aria-label="${size} project members"><ui-avatar size="${size}" src="${portrait}" alt="Alex Morgan"></ui-avatar><ui-avatar size="${size}" alt="Sam Rivera"></ui-avatar><ui-avatar size="${size}" alt="Jo Chen"></ui-avatar><ui-avatar size="${size}" alt="Two more members: Robin Lee, Taylor Reed">+2</ui-avatar></div></div>`).join("")}</div>`,
      "Set the same size on each member. The overflow label retains the hidden members' names.",
    ),
  ],
  "ui-progress": [
    sample(
      "Values",
      `<div class="mash-stack">${[0, 25, 75, 100].map((value) => `<div class="mash-row"><span style="min-width:3rem">${value}%</span><ui-progress value="${value}" label="${value} percent complete" ${value === 100 ? 'tone="positive"' : ""}></ui-progress><ui-progress shape="circular" value="${value}" label="Circular ${value} percent complete"></ui-progress></div>`).join("")}</div>`,
    ),
    {
      ...sample(
        "Upload lifecycle",
        `<ui-card style="width:min(100%,28rem)"><strong slot="title">Design assets</strong><span slot="description">A repeatable local transfer</span><div class="mash-stack"><div class="mash-row"><ui-progress id="upload-bar" value="25" label="Asset upload" style="width:100%"></ui-progress><output id="upload-percent">25%</output></div><output id="upload-status" aria-live="polite">25 of 100 files prepared</output></div><div slot="footer" class="mash-row mash-wrap"><ui-button id="start-upload">Start</ui-button><ui-button id="pause-upload" disabled>Pause</ui-button><ui-button id="reset-upload" variant="ghost">Reset</ui-button></div></ui-card><ui-switch id="unknown-upload">Unknown total</ui-switch>`,
        "Start, pause, resume, and reset the local operation. Unknown totals use an indeterminate indicator and omit a numeric accessibility value.",
      ),
      script: `const bar = document.querySelector("#upload-bar");
const start = document.querySelector("#start-upload");
const pause = document.querySelector("#pause-upload");
const unknown = document.querySelector("#unknown-upload");
let timer;
function stop() { clearInterval(timer); timer = undefined; }
function render() {
  bar.indeterminate = unknown.checked;
  bar.tone = bar.value === 100 ? "positive" : "accent";
  document.querySelector("#upload-percent").textContent = unknown.checked ? "—" : bar.value + "%";
  document.querySelector("#upload-status").textContent = unknown.checked ? "Calculating the total…" : bar.value === 100 ? "All files are ready." : bar.value + " of 100 files prepared";
  start.disabled = Boolean(timer) || bar.value === 100;
  pause.disabled = !timer;
}
start.addEventListener("click", () => { stop(); timer = setInterval(() => { if (!unknown.checked) bar.value = Math.min(100, bar.value + 5); if (bar.value === 100) stop(); render(); }, 180); render(); });
pause.addEventListener("click", () => { stop(); start.textContent = "Resume"; render(); });
document.querySelector("#reset-upload").addEventListener("click", () => { stop(); bar.value = 0; unknown.checked = false; start.textContent = "Start"; render(); });
unknown.addEventListener("ui-switch-change", render);
window.addEventListener("pagehide", stop);
render();`,
    },
    {
      ...sample(
        "Circular task",
        `<style>.radial-task{display:grid;place-items:center;width:5rem;height:5rem}.radial-task>*{grid-area:1/1}.radial-task ui-progress{width:100%;height:100%}.radial-task output{font-variant-numeric:tabular-nums}</style><div class="mash-row"><div class="radial-task"><ui-progress id="analysis-progress" shape="circular" value="75" label="Project analysis"></ui-progress><output id="analysis-value" aria-hidden="true">75%</output></div><div class="mash-stack"><strong>Analyzing project</strong><span id="analysis-status">Scanning components and assets.</span></div></div><ui-slider id="analysis-slider" min="0" max="100" value="75" label="Analysis completion"></ui-slider><ui-switch id="analysis-loading">Preparing analysis</ui-switch>`,
        "The percentage is ordinary owner content layered over the public ring. Loading hides the numeric label.",
      ),
      script: `const progress = document.querySelector("#analysis-progress");
const value = document.querySelector("#analysis-value");
document.querySelector("#analysis-slider").addEventListener("ui-slider-input", event => { progress.value = event.detail.value; value.textContent = progress.value + "%"; });
document.querySelector("#analysis-loading").addEventListener("ui-switch-change", event => { progress.indeterminate = event.detail.checked; value.hidden = event.detail.checked; document.querySelector("#analysis-status").textContent = event.detail.checked ? "Preparing analysis…" : "Scanning components and assets."; });`,
    },
    sample(
      "Loading and color",
      `<div class="mash-row mash-wrap"><ui-progress indeterminate label="Loading results"></ui-progress><ui-progress shape="circular" indeterminate label="Preparing results"></ui-progress></div><div class="mash-stack">${["accent", "positive", "warning", "critical"].map((tone) => `<div class="mash-row"><span style="min-width:5rem">${tone}</span><ui-progress tone="${tone}" value="65" label="${tone} progress"></ui-progress></div>`).join("")}</div>`,
    ),
  ],
  "ui-spinner": [
    sample(
      "Sizes",
      `<div class="mash-row mash-wrap">${["small", "medium", "large"].map((size) => `<div class="mash-row"><ui-spinner size="${size}" label="${size} loading"></ui-spinner><span>${size}</span></div>`).join("")}</div><style>.large-spinner::part(indicator){width:64px;height:64px}</style><ui-spinner class="large-spinner" label="Custom 64 pixel loading"></ui-spinner>`,
    ),
    sample(
      "Color and timing",
      `<style>.spinner-positive::part(indicator){border-inline-start-color:var(--color-positive)}.spinner-linear::part(indicator){animation-timing-function:linear}.spinner-eased::part(indicator){animation-timing-function:cubic-bezier(0.23,1,0.32,1)}</style><div class="mash-row mash-wrap"><div class="mash-row"><ui-spinner class="spinner-positive" label="Synchronizing"></ui-spinner>Success color</div><div class="mash-row"><ui-spinner class="spinner-linear" label="Loading continuously"></ui-spinner>Linear</div><div class="mash-row"><ui-spinner class="spinner-eased" label="Loading with easing"></ui-spinner>Eased</div></div>`,
      "The indicator part owns the ring's color and timing. Reduced motion remains controlled by the shared catalogue.",
    ),
    {
      ...sample(
        "Loading with text",
        `<div class="mash-row"><ui-spinner id="sync-spinner" label="Synchronizing files"></ui-spinner><output id="sync-status" aria-live="polite">Synchronizing files…</output></div><div class="mash-row"><ui-button id="finish-sync">Complete</ui-button><ui-button id="restart-sync" variant="ghost">Restart</ui-button></div>`,
        "Keep the status meaningful when animation stops. Completion replaces the indicator with the result.",
      ),
      script: `const spinner = document.querySelector("#sync-spinner");
document.querySelector("#finish-sync").addEventListener("click", () => { spinner.hidden = true; document.querySelector("#sync-status").textContent = "All files are synchronized."; });
document.querySelector("#restart-sync").addEventListener("click", () => { spinner.hidden = false; document.querySelector("#sync-status").textContent = "Synchronizing files…"; });`,
    },
  ],
  "ui-skeleton": [
    sample(
      "Text",
      `<div class="mash-row" style="width:min(100%,24rem)"><ui-skeleton style="width:3rem;height:3rem;border-radius:50%;flex:none"></ui-skeleton><div class="mash-stack mash-fill">${line()}${line("66%")}</div></div>`,
    ),
    sample(
      "Card",
      `<div class="mash-stack" style="width:min(100%,24rem)"><ui-skeleton style="height:11rem"></ui-skeleton>${line()}${line("60%")}</div>`,
    ),
    sample(
      "Secondary treatment",
      `<style>.secondary-placeholder::part(root){background:var(--color-fill-secondary-opaque)}</style><div class="mash-stack" style="width:min(100%,24rem)">${line()}<ui-skeleton class="secondary-placeholder" style="height:1rem;width:66%"></ui-skeleton></div>`,
      "A public part adjusts the fill while retaining the same placeholder geometry.",
    ),
    {
      ...sample(
        "Loading to content",
        `<ui-card style="width:min(100%,24rem)"><strong slot="title">Project update</strong><div id="profile-loading" class="mash-stack" role="status" aria-label="Loading project">${line()}${line("65%")}${line("80%")}</div><div id="profile-ready" class="mash-stack" hidden><div class="mash-row"><ui-avatar src="${portrait}" alt="Alex Morgan"></ui-avatar><strong>Alex Morgan</strong></div><p>The typography review is ready for your feedback.</p></div><div slot="footer" class="mash-row"><ui-button id="load-profile">Show content</ui-button><ui-button id="reload-profile" variant="ghost">Restart</ui-button></div></ui-card>`,
        "Match the placeholder to the content's shape, then replace the loading region with useful content.",
      ),
      script: `function show(ready) { document.querySelector("#profile-loading").hidden = ready; document.querySelector("#profile-ready").hidden = !ready; document.querySelector("#load-profile").disabled = ready; }
document.querySelector("#load-profile").addEventListener("click", () => show(true));
document.querySelector("#reload-profile").addEventListener("click", () => show(false));`,
    },
  ],
  "ui-shimmer": [
    ...refinements["ui-shimmer"]!,
    sample(
      "Highlight colors",
      `<div class="mash-stack"><ui-shimmer>Automatic highlight</ui-shimmer><ui-shimmer style="--ui-shimmer-highlight-color:var(--color-action)">Primary highlight</ui-shimmer><ui-shimmer style="--ui-shimmer-highlight-color:var(--color-positive)">Success highlight</ui-shimmer></div>`,
    ),
    sample(
      "Duration",
      `<div class="mash-stack">${[1, 2, 4].map((seconds) => `<ui-shimmer style="--ui-shimmer-duration:${seconds}s">One sweep every ${seconds} seconds</ui-shimmer>`).join("")}</div>`,
    ),
    sample(
      "Spread",
      `<div class="mash-stack">${["12%", "30%", "60%", "48px"].map((spread) => `<ui-shimmer style="--ui-shimmer-spread:${spread}">${spread} highlight half-width</ui-shimmer>`).join("")}</div>`,
    ),
    {
      ...sample(
        "Single sweep",
        `<ui-shimmer id="one-sweep" once>One sweep, then a quiet finish.</ui-shimmer><ui-button id="replay-sweep" size="small">Replay sweep</ui-button>`,
        "Replay creates a fresh decorative shimmer while keeping the authored text identical.",
      ),
      script: `document.querySelector("#replay-sweep").addEventListener("click", () => { const shimmer = document.querySelector("#one-sweep"); shimmer.replaceWith(shimmer.cloneNode(true)); });`,
    },
    sample(
      "Shared style and wrapping",
      `<div class="mash-stack" style="--ui-shimmer-duration:3s;--ui-shimmer-spread:42%;--ui-shimmer-highlight-color:var(--color-action);max-width:24rem"><ui-shimmer style="font-size:var(--type-label-small-font-size)">Analyzing source files…</ui-shimmer><ui-shimmer style="font-weight:600">Preparing a response…</ui-shimmer><ui-shimmer>Long activity messages remain readable when the surrounding region becomes narrower. Resize the preview to see the same text wrap.</ui-shimmer></div>`,
      "Inherited custom properties share a treatment across independent text; the text retains its natural layout.",
    ),
    sample(
      "Activity compositions",
      `<ui-marker variant="plain"><ui-spinner slot="icon" size="small" label="Loading messages"></ui-spinner>Loading messages…</ui-marker><ui-marker variant="plain"><ui-shimmer>Preparing your answer…</ui-shimmer></ui-marker><ui-attachment status="processing"><ui-icon slot="media" name="object.document" label=""></ui-icon><ui-shimmer slot="title">Meeting transcript.pdf</ui-shimmer><span slot="description">Extracting discussion points</span></ui-attachment>`,
      "Compose loading text with an activity marker or attachment. The owning operation decides when to remove it.",
    ),
  ],
  "ui-image": [
    sample(
      "Image",
      `<ui-image src="${landscape}" alt="Layered green mountains beneath a warm sun" width="640" height="360" style="max-width:32rem"><span slot="placeholder">Loading landscape…</span><span slot="error">Landscape unavailable</span></ui-image>`,
    ),
    sample(
      "Object fitting",
      `<style>.fit-image{width:12rem}.fit-image::part(root){height:9rem}.fit-image::part(image){object-fit:var(--image-fit)}</style><div class="mash-row mash-wrap">${["cover", "contain", "fill", "scale-down", "none"].map((fit) => `<figure class="mash-stack" style="margin:0"><ui-image class="fit-image" style="--image-fit:${fit}" src="${landscape}" alt="Mountain landscape with ${fit} fitting"></ui-image><figcaption>${fit}</figcaption></figure>`).join("")}</div>`,
      "One intrinsic image, five public-part fitting treatments. The frame stays the same size.",
    ),
    {
      ...sample(
        "Failure and recovery",
        `<style>#recovery-image{width:min(100%,28rem)}#recovery-image::part(root){height:15rem}</style><ui-image id="recovery-image" loading="eager" src="${landscape}" alt="Project landscape"><span slot="placeholder">Loading landscape…</span><span slot="error">The landscape could not be loaded.</span></ui-image><div class="mash-row mash-wrap"><ui-button id="break-image">Fail image</ui-button><ui-button id="fallback-image">Recover with fallback</ui-button><ui-button id="retry-image" variant="ghost">Retry original</ui-button></div><output id="image-status" aria-live="polite">Original image</output>`,
        "These controls exercise real image load/error events with an invalid source and a valid fallback. The frame remains stable.",
      ),
      script: `const image = document.querySelector("#recovery-image");
const good = ${JSON.stringify(landscape)};
const bad = "data:image/png;base64,invalid";
document.querySelector("#break-image").addEventListener("click", () => { image.fallbackSrc = ""; image.src = bad; });
document.querySelector("#fallback-image").addEventListener("click", () => { image.fallbackSrc = good; image.src = bad; });
document.querySelector("#retry-image").addEventListener("click", () => { image.fallbackSrc = ""; image.src = good; });
image.addEventListener("ui-image-load", event => { document.querySelector("#image-status").textContent = event.detail.fallback ? "Fallback image loaded" : "Original image loaded"; });
image.addEventListener("ui-image-error", event => { document.querySelector("#image-status").textContent = event.detail.recoverable ? "Trying fallback…" : "Image unavailable"; });`,
    },
  ],
  "ui-resizable": [
    ...utilityExamples["ui-resizable"]!,
    sample(
      "Nested panels",
      `<div style="overflow:auto"><ui-resizable orientation="vertical" label="Nested workspace" style="height:28rem;min-width:32rem;min-height:0"><ui-resizable-panel min="180"><ui-resizable label="Editor columns" style="height:100%;min-height:0"><ui-resizable-panel size="150" min="100" max="240">${panel('<strong>Files</strong><span>100–240px</span><ui-input label="Find a file" placeholder="Search files"></ui-input>')}</ui-resizable-panel><ui-resizable-handle label="Resize files"></ui-resizable-handle><ui-resizable-panel min="140">${panel('<strong>Editor</strong><ui-textarea label="Editor draft" rows="5" value="A draft that stays with its panel."></ui-textarea>')}</ui-resizable-panel><ui-resizable-handle label="Resize inspector"></ui-resizable-handle><ui-resizable-panel size="160" min="100">${panel("<strong>Inspector</strong><ui-switch checked>Wrap lines</ui-switch>")}</ui-resizable-panel></ui-resizable></ui-resizable-panel><ui-resizable-handle label="Resize console"></ui-resizable-handle><ui-resizable-panel size="100" min="80" max="180">${panel("<strong>Console</strong><code>Ready for input.</code>")}</ui-resizable-panel></ui-resizable></div>`,
      "Independent horizontal and vertical groups preserve draft state. Handles support dragging and arrow keys; bounded panels stop at their limits.",
    ),
    {
      ...sample(
        "Programmatic resize",
        `<div class="mash-row mash-wrap"><ui-button id="compact-left">Compact left</ui-button><ui-button id="reset-left">Reset left</ui-button><ui-button id="compact-right">Compact right</ui-button><ui-button id="reset-right">Reset right</ui-button></div><div style="overflow:auto"><ui-resizable id="sized-panels" label="Adjustable columns" style="height:15rem;min-height:0;min-width:32rem"><ui-resizable-panel size="180" min="100">Left · 100px minimum</ui-resizable-panel><ui-resizable-handle label="Resize left"></ui-resizable-handle><ui-resizable-panel min="120">Center absorbs the change</ui-resizable-panel><ui-resizable-handle label="Resize right"></ui-resizable-handle><ui-resizable-panel size="160" min="80">Right · 80px minimum</ui-resizable-panel></ui-resizable></div><output id="panel-sizes" aria-live="polite">Drag a handle or use the controls.</output>`,
        "The same constraint resolver handles pointer, keyboard, and programmatic changes.",
      ),
      script: `const group = document.querySelector("#sized-panels");
document.querySelector("#compact-left").addEventListener("click", () => group.resizePanel(0, 100));
document.querySelector("#reset-left").addEventListener("click", () => group.resizePanel(0, 180));
document.querySelector("#compact-right").addEventListener("click", () => group.resizePanel(2, 80));
document.querySelector("#reset-right").addEventListener("click", () => group.resizePanel(2, 160));
group.addEventListener("ui-resizable-change", event => { document.querySelector("#panel-sizes").textContent = event.detail.sizes.map(size => Math.round(size) + "px").join(" · "); });`,
    },
    {
      ...sample(
        "Fixed and growing panels",
        `<div class="mash-row mash-wrap"><ui-switch id="show-left" checked>Show left panel</ui-switch><ui-switch id="fixed-right" checked>Keep right panel fixed</ui-switch></div><div style="overflow:auto"><ui-resizable id="flex-panels" label="Flexible columns" style="height:15rem;min-height:0;min-width:32rem"><ui-resizable-panel id="flex-left" size="140" min="80">Left</ui-resizable-panel><ui-resizable-handle label="Resize left panel"></ui-resizable-handle><ui-resizable-panel min="120">Flexible center</ui-resizable-panel><ui-resizable-handle label="Resize right panel"></ui-resizable-handle><ui-resizable-panel id="flex-right" size="180" min="100"><ui-textarea label="Inspector notes" rows="3" value="Preserve this note while hiding the left panel."></ui-textarea></ui-resizable-panel></ui-resizable></div>`,
        "A zero preferred size participates in the available space. An explicit size keeps the panel fixed while its flexible neighbor grows.",
      ),
      script: `document.querySelector("#show-left").addEventListener("ui-switch-change", event => { document.querySelector("#flex-left").visible = event.detail.checked; });
document.querySelector("#fixed-right").addEventListener("ui-switch-change", event => { document.querySelector("#flex-right").size = event.detail.checked ? 180 : 0; });`,
    },
  ],
};

displayExamples["ui-navigation-menu"] = [
  ...utilityExamples["ui-navigation-menu"]!,
  {
    ...sample(
      "Workspace navigation",
      `<style>.navigation-workspace{display:grid;grid-template-columns:minmax(10rem,14rem) minmax(0,1fr);gap:var(--space-group-block);min-width:0}.navigation-workspace[data-right]{grid-template-columns:minmax(0,1fr) minmax(10rem,14rem)}.navigation-workspace[data-right] .workspace-navigation{order:1}.workspace-navigation{width:100%}.workspace-navigation ui-link[aria-current="page"]{font-weight:600}.workspace-navigation ui-link{display:block}@media(max-width:540px){.navigation-workspace,.navigation-workspace[data-right]{grid-template-columns:1fr}.navigation-workspace[data-right] .workspace-navigation{order:0}}</style><div class="mash-row mash-wrap"><ui-switch id="navigation-right">Right side</ui-switch><ui-switch id="navigation-extra">Show another project</ui-switch></div><div id="navigation-workspace" class="navigation-workspace"><ui-navigation-menu label="Project workspace" class="mash-sidebar workspace-navigation"><ui-menu label="Workspace actions"><ui-button slot="trigger" dropdown-caret>Studio workspace</ui-button><ui-menu-item value="personal">Personal workspace</ui-menu-item><ui-menu-item value="team">Team workspace</ui-menu-item></ui-menu><strong>Workspace</strong><ui-link href="#overview" data-view="overview" aria-current="page">Overview</ui-link><div class="mash-row"><ui-link href="#inbox" data-view="inbox" class="mash-fill">Inbox</ui-link><ui-badge label="3 unread messages">3</ui-badge></div><ui-collapsible open><span slot="trigger">Projects</span><div class="mash-stack"><ui-link href="#website" data-view="website">Website</ui-link><ui-link href="#documentation" data-view="documentation">Documentation</ui-link><ui-link id="extra-project" href="#release" data-view="release" hidden>Release notes</ui-link></div></ui-collapsible><ui-separator></ui-separator><div class="mash-row"><ui-avatar src="${portrait}" size="small" alt="Alex Morgan"></ui-avatar><span>Alex Morgan</span></div></ui-navigation-menu><ui-card><strong slot="title" id="destination-title">Overview</strong><p id="destination-content">A quiet overview of your current work.</p><ui-textarea label="Workspace draft" rows="4" value="This draft stays in place while navigating."></ui-textarea><output id="workspace-selection" slot="footer" aria-live="polite">Studio workspace</output></ui-card></div>`,
      "Navigation changes the local content while the draft stays mounted. Try nested links, dynamic children, workspace switching, and right-side placement.",
    ),
    script: `const destinations = {overview:["Overview","A quiet overview of your current work."],inbox:["Inbox","Three conversations need your attention."],website:["Website","Review the new homepage and its navigation."],documentation:["Documentation","Write guides alongside the component examples."],release:["Release notes","Prepare the next update for your team."]};
document.querySelectorAll("[data-view]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); const [title, body] = destinations[link.dataset.view]; document.querySelector("#destination-title").textContent = title; document.querySelector("#destination-content").textContent = body; document.querySelectorAll("[data-view]").forEach(item => item.removeAttribute("aria-current")); link.setAttribute("aria-current", "page"); }));
document.querySelector("#navigation-right").addEventListener("ui-switch-change", event => { document.querySelector("#navigation-workspace").toggleAttribute("data-right", event.detail.checked); });
document.querySelector("#navigation-extra").addEventListener("ui-switch-change", event => { const extra = document.querySelector("#extra-project"); if (!event.detail.checked && extra.hasAttribute("aria-current")) document.querySelector('[data-view="overview"]').click(); extra.hidden = !event.detail.checked; });
document.querySelector("ui-menu").addEventListener("ui-menu-select", event => { document.querySelector("#workspace-selection").textContent = event.detail.value === "team" ? "Team workspace" : "Personal workspace"; });`,
  },
  {
    ...sample(
      "Offcanvas navigation",
      `<ui-drawer id="navigation-drawer" side="start" label="Browse workspace"><ui-button slot="trigger"><ui-icon slot="prefix" name="navigation.disclosure" label=""></ui-icon>Browse workspace</ui-button><strong slot="title">Workspace</strong><ui-navigation-menu label="Drawer navigation"><div class="mash-stack"><ui-button data-destination="Inbox" variant="ghost">Inbox</ui-button><ui-button data-destination="Projects" variant="ghost">Projects</ui-button><ui-button data-destination="Settings" variant="ghost">Settings</ui-button></div></ui-navigation-menu><ui-button slot="close" variant="ghost">Close navigation</ui-button></ui-drawer><ui-card><strong id="offcanvas-destination" slot="title">Inbox</strong><ui-textarea label="Page draft" rows="3" value="Opening navigation does not reset this page."></ui-textarea></ui-card>`,
      "Use a real drawer when navigation needs to move off canvas. Choosing a destination closes it and returns focus to the trigger.",
    ),
    script: `document.querySelectorAll("[data-destination]").forEach(button => button.addEventListener("click", () => { document.querySelector("#offcanvas-destination").textContent = button.dataset.destination; document.querySelector("#navigation-drawer").open = false; }));`,
  },
];

export const toolbarExamples: CatalogExample[] = [
  {
    ...sample(
      "Formatting",
      `<ui-toolbar label="Text formatting" data-mash-size="small"><ui-toggle id="text-bold" pressed>Bold</ui-toggle><ui-toggle id="text-italic">Italic</ui-toggle><ui-toggle id="text-underline">Underline</ui-toggle><ui-button id="publish-text" variant="primary">Publish</ui-button></ui-toolbar><p id="formatted-text" style="font-weight:700">Clear ideas deserve clear typography.</p><output id="format-result" aria-live="polite">Choose a treatment, then publish.</output>`,
      "Arrow keys move through the toolbar. Each toggle changes the preview; Publish records the chosen treatment.",
    ),
    script: `const preview = document.querySelector("#formatted-text");
const styles = {"text-bold":["fontWeight","700","400"],"text-italic":["fontStyle","italic","normal"],"text-underline":["textDecoration","underline","none"]};
Object.entries(styles).forEach(([id,[property,on,off]]) => document.getElementById(id).addEventListener("ui-toggle-change", event => { preview.style[property] = event.detail.pressed ? on : off; }));
document.querySelector("#publish-text").addEventListener("click", () => { const active = [...document.querySelectorAll("ui-toggle")].filter(toggle => toggle.pressed).map(toggle => toggle.textContent); document.querySelector("#format-result").textContent = "Published · " + (active.join(", ") || "Plain text"); });`,
  },
  {
    ...sample(
      "Mixed controls",
      `<ui-toolbar label="Document tools" data-mash-size="small"><ui-button id="new-document">New</ui-button><ui-input id="find-document" label="Find in document" placeholder="Find"></ui-input><ui-select id="document-status" label="Status" value="draft"><ui-option value="draft">Draft</ui-option><ui-option value="review">In review</ui-option><ui-option value="ready">Ready</ui-option></ui-select><ui-button id="save-document" variant="primary">Save</ui-button></ui-toolbar><ui-textarea id="toolbar-document" label="Document text" rows="4" value="A shared component language makes every new project feel familiar."></ui-textarea><output id="document-result" aria-live="polite">Ready to edit.</output>`,
      "Find counts matches in the draft. Save records a local snapshot, and New starts a fresh document.",
    ),
    script: `const draft = document.querySelector("#toolbar-document");
const result = document.querySelector("#document-result");
document.querySelector("#find-document").addEventListener("input", event => { const query = event.target.value.trim().toLowerCase(); result.textContent = query ? (draft.value.toLowerCase().split(query).length - 1) + " matches" : "Ready to edit."; });
document.querySelector("#new-document").addEventListener("click", () => { draft.value = ""; document.querySelector("#find-document").value = ""; document.querySelector("#document-status").value = "draft"; result.textContent = "New document"; draft.focus(); });
document.querySelector("#save-document").addEventListener("click", () => { const status = document.querySelector("#document-status").value; sessionStorage.setItem("mash-toolbar-document", JSON.stringify({text:draft.value,status})); result.textContent = "Saved · " + status; });`,
  },
  {
    ...sample(
      "Vertical",
      `<div class="mash-row"><ui-toolbar orientation="vertical" label="Drawing tools" data-mash-size="small"><ui-toggle value="select" pressed>Select</ui-toggle><ui-toggle value="draw">Draw</ui-toggle><ui-toggle value="erase">Erase</ui-toggle></ui-toolbar><div class="mash-panel mash-fill"><output id="drawing-tool" aria-live="polite">Select tool active</output></div></div>`,
      "A vertical toolbar uses Up and Down navigation. Selecting a tool clears the previous choice.",
    ),
    script: `document.querySelectorAll("ui-toggle").forEach(toggle => toggle.addEventListener("ui-toggle-change", () => { document.querySelectorAll("ui-toggle").forEach(item => { item.pressed = item === toggle; }); document.querySelector("#drawing-tool").textContent = toggle.textContent + " tool active"; }));`,
  },
  {
    ...sample(
      "Status bar",
      `<ui-textarea id="status-draft" label="Status document" rows="3" value="A focused space to write."></ui-textarea><ui-toolbar label="Editor status" data-mash-size="small"><span id="save-state">Saved</span><div class="mash-fill"></div><ui-button id="word-count" variant="ghost">5 words</ui-button><ui-separator orientation="vertical"></ui-separator><ui-button id="save-status" variant="ghost">Save now</ui-button></ui-toolbar><output id="status-result" aria-live="polite">Edit the document to update its status.</output>`,
      "Use plain text for passive status and buttons for actions. Word count updates with the draft and can announce document statistics.",
    ),
    script: `const draft = document.querySelector("#status-draft");
const words = () => draft.value.trim().split(/\\s+/).filter(Boolean).length;
draft.addEventListener("input", () => { document.querySelector("#save-state").textContent = "Unsaved"; document.querySelector("#word-count").textContent = words() + " words"; });
document.querySelector("#word-count").addEventListener("click", () => { document.querySelector("#status-result").textContent = words() + " words · " + draft.value.length + " characters"; });
document.querySelector("#save-status").addEventListener("click", () => { sessionStorage.setItem("mash-status-draft", draft.value); document.querySelector("#save-state").textContent = "Saved"; document.querySelector("#status-result").textContent = "Draft saved in this browser tab."; });`,
  },
  sample(
    "Status alignment",
    `<style>.status-lanes{display:flex;gap:var(--space-group-related);align-items:center;padding:var(--space-control-block) var(--space-control-inline);border-block-start:var(--border-hairline) solid var(--color-fill-secondary-opaque);font-size:var(--type-label-small-font-size)}.status-lanes .status-center{flex:1;text-align:start}.status-lanes:has(.status-left) .status-center{text-align:end}.status-lanes:has(.status-left):has(.status-right){display:grid;grid-template-columns:1fr auto 1fr}.status-lanes:has(.status-left):has(.status-right) .status-center{text-align:center}.status-right{margin-inline-start:auto}</style><div class="mash-stack"><div class="status-lanes"><span class="status-center">Center only · start aligned</span></div><div class="status-lanes"><span class="status-left">Ready</span><span class="status-center">Center with left · end aligned</span></div><div class="status-lanes"><span class="status-center">Center with right · start aligned</span><span class="status-right">UTF-8</span></div><div class="status-lanes"><span class="status-left">Ready</span><span class="status-center">Centered document</span><span class="status-right">UTF-8</span></div></div>`,
    "Passive status regions use ordinary layout. Balanced columns keep the middle centered when both ends are populated.",
  ),
];
