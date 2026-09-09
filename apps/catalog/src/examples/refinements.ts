import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
const source = `// Keep behavior close to the content it owns.
interface Message {
  author: string;
  text: string;
}

export function greeting(name: string): Message {
  return { author: "Team", text: "Hello, " + name };
}

const message = greeting("Alex");
console.log(message.text);`;
export const refinements: Record<string, CatalogExample[]> = {
  "ui-editor": [
    {
      ...sample(
        "Source editor",
        `<div class="mash-row"><ui-button id="find" size="small">Find / replace</ui-button><ui-checkbox id="wrap">Wrap lines</ui-checkbox><ui-button id="reset-source" size="small" variant="ghost">Reset</ui-button></div><ui-editor id="source" language="typescript" label="TypeScript source"><div slot="search" class="mash-row mash-wrap"><ui-input id="query" label="Find" placeholder="Find"></ui-input><ui-input id="replacement" label="Replace" placeholder="Replace with"></ui-input><ui-button id="next" size="small">Next</ui-button><ui-button id="replace" size="small">Replace all</ui-button><ui-button id="close-search" size="small" aria-label="Close search">×</ui-button></div><span slot="status" id="source-status">TypeScript · UTF-8</span></ui-editor>`,
        "Edit directly. Tab indents, Shift+Tab outdents, and ⌘/Ctrl+F opens search. Text input, selection, IME, and clipboard stay native.",
      ),
      script: `const editor = document.querySelector("#source");
const initial = ${JSON.stringify(source)};
editor.value = initial;
const query = document.querySelector("#query");
document.querySelector("#find").addEventListener("click", () => { editor.searchOpen = !editor.searchOpen; if (editor.searchOpen) query.focus(); });
editor.addEventListener("ui-editor-command", event => { if (event.detail.command === "find") query.focus(); });
query.addEventListener("input", () => { editor.searchQuery = query.value; });
document.querySelector("#next").addEventListener("click", () => editor.findNext());
document.querySelector("#replace").addEventListener("click", () => editor.replaceAllMatches(document.querySelector("#replacement").value));
document.querySelector("#close-search").addEventListener("click", () => { editor.searchOpen = false; editor.focus(); });
document.querySelector("#wrap").addEventListener("change", event => { editor.softWrap = event.target.checked; });
document.querySelector("#reset-source").addEventListener("click", () => { editor.value = initial; });
editor.addEventListener("ui-editor-selection-change", event => { document.querySelector("#source-status").textContent = "Ln " + event.detail.startLine + ", Col " + (event.detail.startColumn + 1) + " · TypeScript · UTF-8"; });`,
    },
    sample(
      "Read-only",
      `<ui-editor readonly label="Configuration" language="json" value='{ "theme": "system", "motion": true }'><span slot="status">Read-only configuration</span></ui-editor>`,
      "Read-only documents still support text selection and copy.",
    ),
  ],
  "ui-color-picker": [
    {
      ...sample(
        "Color selector",
        `<div class="mash-row mash-wrap"><ui-color-picker id="color" inline label="Accent" value="#7965E8"></ui-color-picker><ui-card id="color-preview"><strong slot="title">Your color</strong><p id="color-value">#7965E8</p><ui-button id="copy-color" slot="footer" size="small">Copy hex</ui-button></ui-card></div>`,
        "Drag the color plane, adjust channels with the keyboard, or enter a hex value. Opacity is preserved in eight-digit hex.",
      ),
      script: `const picker = document.querySelector("#color");
const preview = document.querySelector("#color-preview");
const update = () => { preview.style.borderInlineStart = "4px solid " + picker.value; document.querySelector("#color-value").textContent = picker.value; };
picker.addEventListener("ui-color-change", update); update();
document.querySelector("#copy-color").addEventListener("click", async event => { try { await navigator.clipboard.writeText(picker.value); event.target.textContent = "Copied"; } catch { event.target.textContent = "Select hex to copy"; } });`,
    },
    sample(
      "Popover and palette",
      `<ui-color-picker label="Label color" value="#7965E8"><ui-button slot="trigger">Choose label color</ui-button><ui-color-swatch value="#7965E8" label="Violet"></ui-color-swatch><ui-color-swatch value="#36A376" label="Green"></ui-color-swatch><ui-color-swatch value="#E79A32" label="Amber"></ui-color-swatch><ui-button slot="close" size="small">Done</ui-button></ui-color-picker>`,
      "The same controls work in a popup. Supply swatches for a project palette.",
    ),
  ],
  "ui-shimmer": [
    {
      ...sample(
        "Activity",
        `<div class="mash-row"><ui-spinner id="activity-spinner" label="Preparing"></ui-spinner><ui-shimmer id="activity">Preparing your response…</ui-shimmer></div><div class="mash-row"><ui-button id="pause" size="small">Pause animation</ui-button><ui-button id="finish" size="small">Complete</ui-button><ui-button id="restart" size="small" variant="ghost">Restart</ui-button></div><output id="activity-result" aria-live="polite"></output>`,
        "Shimmer decorates readable activity text. It does not replace a progress indicator, and respects reduced motion.",
      ),
      script: `const shimmer = document.querySelector("#activity");
const spinner = document.querySelector("#activity-spinner");
document.querySelector("#pause").addEventListener("click", event => { shimmer.paused = !shimmer.paused; event.target.textContent = shimmer.paused ? "Resume animation" : "Pause animation"; });
document.querySelector("#finish").addEventListener("click", () => { shimmer.hidden = spinner.hidden = true; document.querySelector("#activity-result").textContent = "Your response is ready."; });
document.querySelector("#restart").addEventListener("click", () => { shimmer.hidden = spinner.hidden = false; shimmer.paused = false; document.querySelector("#pause").textContent = "Pause animation"; document.querySelector("#activity-result").textContent = ""; });`,
    },
    sample(
      "Sweep direction",
      `<div class="mash-row mash-wrap"><ui-shimmer>Working through the details</ui-shimmer><ui-shimmer reverse>Checking your changes</ui-shimmer><ui-shimmer once>Finishing up</ui-shimmer></div>`,
      "Default, reverse, and single-pass treatments share the same text and timing tokens.",
    ),
  ],
  "ui-avatar": [
    sample(
      "Identity and presence",
      `<div class="mash-row mash-wrap">${["online", "away", "busy", "offline"].map((status, index) => `<div class="mash-row"><ui-avatar alt="${["Alex Morgan", "Sam Rivera", "Jo Chen", "Robin Lee"][index]}" status="${status}"></ui-avatar><span>${status}</span></div>`).join("")}</div>`,
      "Initials come from the accessible name when no fallback is supplied. Availability is announced with the name.",
    ),
    sample(
      "Sizes and shapes",
      `<div class="mash-row">${["small", "medium", "large"].map((size) => `<ui-avatar size="${size}" alt="Alex Morgan"></ui-avatar><ui-avatar size="${size}" shape="square" alt="Design team">D</ui-avatar>`).join("")}</div>`,
    ),
    {
      ...sample(
        "Image and fallback",
        `<div class="mash-row"><ui-avatar id="portrait" size="large" alt="Alex Morgan"></ui-avatar><ui-button id="load-portrait" size="small">Load image</ui-button><ui-button id="clear-portrait" size="small">Use initials</ui-button><ui-button id="broken-portrait" size="small" variant="ghost">Test unavailable image</ui-button></div><output id="portrait-state" aria-live="polite">Initials</output>`,
        "Image loading and failure preserve the avatar's size and accessible identity.",
      ),
      script: `const avatar = document.querySelector("#portrait");
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="#ded9ef"/><circle cx="48" cy="35" r="18" fill="#71618d"/><path d="M14 96v-8a34 34 0 0 1 68 0v8" fill="#71618d"/></svg>';
document.querySelector("#load-portrait").addEventListener("click", () => { avatar.src = "data:image/svg+xml," + encodeURIComponent(image); });
document.querySelector("#clear-portrait").addEventListener("click", () => { avatar.src = ""; document.querySelector("#portrait-state").textContent = "Initials"; });
document.querySelector("#broken-portrait").addEventListener("click", () => { avatar.src = "data:image/png;base64,invalid"; });
avatar.addEventListener("ui-avatar-load", () => { document.querySelector("#portrait-state").textContent = "Image loaded"; });
avatar.addEventListener("ui-avatar-error", () => { document.querySelector("#portrait-state").textContent = "Image unavailable · showing initials"; });`,
    },
  ],
};

refinements["ui-dock"] = [
  {
    ...sample(
      "Workspace panels",
      `<div class="mash-row mash-wrap"><ui-button id="split-right" size="small">Split preview right</ui-button><ui-button id="split-bottom" size="small">Move console below</ui-button><ui-button id="open-notes" size="small">Open notes</ui-button><ui-button id="save-layout" size="small">Save layout</ui-button><ui-button id="restore-layout" size="small">Restore</ui-button><ui-button id="reset-layout" size="small" variant="ghost">Reset</ui-button></div><ui-dock id="workspace" label="Workspace panels"><ui-dock-panel name="notes" label="Notes"><ui-textarea label="Working notes" value="Write here, then move this panel. Your text stays with it." rows="8"></ui-textarea></ui-dock-panel><ui-dock-panel name="preview" label="Preview"><ui-card><strong slot="title">A composed panel</strong><p>Panels can contain forms, editors, charts, or any other content.</p><ui-switch>Live preview</ui-switch></ui-card></ui-dock-panel><ui-dock-panel name="console" label="Console"><ui-editor label="Console log" readonly value="Ready.&#10;Workspace initialized."></ui-editor></ui-dock-panel></ui-dock><output id="layout-state" aria-live="polite">Drag a tab to reorder or split a group.</output>`,
      "Drag tabs onto a panel edge to split, or onto another tab to reorder. Arrow keys navigate tabs; Alt+Shift+Arrow splits the active tab. Separators resize with arrow keys. Snapshots preserve layout, while panel content remains application-owned.",
    ),
    script: `const workspace = document.querySelector("#workspace");
await workspace.updateComplete;
const initial = workspace.getLayout();
const firstGroup = node => node.type === "tabs" ? node.id : firstGroup(node.children[0]);
document.querySelector("#split-right").addEventListener("click", () => workspace.movePanel("preview", firstGroup(workspace.layout.root), "right"));
document.querySelector("#split-bottom").addEventListener("click", () => workspace.movePanel("console", firstGroup(workspace.layout.root), "bottom"));
document.querySelector("#open-notes").addEventListener("click", () => workspace.openPanel("notes"));
document.querySelector("#save-layout").addEventListener("click", () => { localStorage.setItem("mash-dock-layout", JSON.stringify(workspace.getLayout())); document.querySelector("#layout-state").textContent = "Layout saved in this browser"; });
document.querySelector("#restore-layout").addEventListener("click", () => { try { const restored = workspace.restoreLayout(JSON.parse(localStorage.getItem("mash-dock-layout") || "null")); document.querySelector("#layout-state").textContent = restored ? "Layout restored" : "No compatible saved layout"; } catch { document.querySelector("#layout-state").textContent = "Saved layout could not be restored"; } });
document.querySelector("#reset-layout").addEventListener("click", () => workspace.restoreLayout(initial));`,
  },
];
