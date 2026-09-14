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
console.log(message.text);

const members = ["Alex", "Sam", "Morgan"];
for (const member of members) {
  console.log(greeting(member));
}`;
const indentSource = "function review() {\n\tconst title = 'Weekly review';\n\treturn title;\n}";
const diagnosticSource =
  "const price = 24;\nconst total = price * quantity;\nconst legacyName = 'draft';\nconsole.log(total);";
const searchMarkup = `<div slot="search" class="mash-stack"><div class="mash-row mash-wrap"><ui-input id="query" label="Find" placeholder="Find literal text"></ui-input><ui-button id="previous" size="small">Previous</ui-button><ui-button id="next" size="small">Next</ui-button><ui-switch id="match-case">Match case</ui-switch><ui-button id="close-search" size="small" variant="ghost">Close search</ui-button></div><div id="replace-controls" class="mash-row mash-wrap"><ui-input id="replacement" label="Replace" placeholder="Replace with"></ui-input><ui-button id="replace" size="small">Replace all</ui-button></div><output id="search-count" aria-live="polite">Enter a search query.</output></div>`;
const searchScript = `const query = document.querySelector("#query");
const count = document.querySelector("#search-count");
function find(backward) { if (backward) editor.findPrevious(); else editor.findNext(); }
document.querySelector("#find").addEventListener("click", () => { editor.searchOpen = !editor.searchOpen; if (editor.searchOpen) query.focus(); });
editor.addEventListener("ui-editor-command", event => { if (event.detail.command === "find") query.focus(); });
query.addEventListener("input", () => { editor.searchQuery = query.value; });
query.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); find(event.shiftKey); query.focus(); } if (event.key === "Escape") { event.preventDefault(); editor.searchOpen = false; editor.focus(); } });
document.querySelector("#next").addEventListener("click", () => find(false));
document.querySelector("#previous").addEventListener("click", () => find(true));
document.querySelector("#match-case").addEventListener("ui-switch-change", event => { editor.caseSensitive = event.detail.checked; });
document.querySelector("#replace").addEventListener("click", () => { editor.replaceAllMatches(document.querySelector("#replacement").value); });
document.querySelector("#close-search").addEventListener("click", () => { editor.searchOpen = false; editor.focus(); });
editor.addEventListener("ui-editor-search-change", event => { const {query,count:total,index} = event.detail; count.textContent = !query ? "Enter a search query." : total ? (index < 0 ? total + " matches" : (index + 1) + " of " + total) : "No matches"; });`;

export const editorExamples: Record<string, CatalogExample[]> = {
  "ui-editor": [
    {
      ...sample(
        "Source editor",
        `<div class="mash-row mash-wrap"><ui-button id="find" size="small">Find / replace</ui-button><ui-switch id="wrap">Wrap lines</ui-switch><ui-switch id="read-only">Read only</ui-switch><ui-button id="reset-source" size="small" variant="ghost">Reset</ui-button></div><ui-editor id="source" language="typescript" label="TypeScript source">${searchMarkup}<span slot="status" id="source-status">TypeScript · UTF-8</span></ui-editor>`,
        "Literal search supports Previous/Next and Enter/Shift+Enter from Find. Read-only documents retain search and selection while hiding replacement controls.",
      ),
      script: `const editor = document.querySelector("#source");
const initial = ${JSON.stringify(source)};
editor.value = initial;
${searchScript}
document.querySelector("#wrap").addEventListener("ui-switch-change", event => { editor.softWrap = event.detail.checked; });
document.querySelector("#read-only").addEventListener("ui-switch-change", event => { editor.readonly = event.detail.checked; document.querySelector("#replace-controls").hidden = event.detail.checked; });
document.querySelector("#reset-source").addEventListener("click", () => { editor.value = initial; });
editor.addEventListener("ui-editor-selection-change", event => { document.querySelector("#source-status").textContent = "Ln " + event.detail.startLine + ", Col " + (event.detail.startColumn + 1) + " · TypeScript · UTF-8"; });`,
    },
    {
      ...sample(
        "Indentation and whitespace",
        `<div class="mash-row mash-wrap"><ui-select id="tab-width" label="Tab width" value="4"><ui-option value="2">2 columns</ui-option><ui-option value="4">4 columns</ui-option><ui-option value="8">8 columns</ui-option></ui-select><ui-switch id="hard-tabs" checked>Insert hard tabs</ui-switch><ui-switch id="whitespace" checked>Show whitespace</ui-switch></div><ui-editor id="indent-editor" hard-tabs show-whitespace tab-size="4" language="typescript" label="Indentation source"><output id="indent-status" slot="status">Tab inserts a literal tab. Shift+Tab removes one indentation level.</output></ui-editor>`,
        "Space and tab markers are decorative; copying and editing retain the original characters. Multi-line indentation preserves mapped ranges and excludes a line when the selection ends at its start.",
      ),
      script: `const editor = document.querySelector("#indent-editor");
editor.value = ${JSON.stringify(indentSource)};
document.querySelector("#tab-width").addEventListener("ui-select-change", event => { editor.tabSize = Number(event.detail.value); });
document.querySelector("#hard-tabs").addEventListener("ui-switch-change", event => { editor.hardTabs = event.detail.checked; });
document.querySelector("#whitespace").addEventListener("ui-switch-change", event => { editor.showWhitespace = event.detail.checked; });
editor.addEventListener("input", () => { const tabs = [...editor.value].filter(character => character === "\\t").length; document.querySelector("#indent-status").textContent = tabs + " literal tabs · " + editor.value.length + " UTF-16 units"; });`,
    },
    {
      ...sample(
        "Typography",
        `<div class="mash-row mash-wrap"><ui-select id="editor-family" label="Editor font" value="default"><ui-option value="default">Theme monospace</ui-option><ui-option value="Menlo">Menlo</ui-option><ui-option value="Consolas">Consolas</ui-option><ui-option value="Monaco">Monaco</ui-option></ui-select><ui-select id="editor-size" label="Editor font size" value="13">${[11, 13, 16, 20].map((size) => `<ui-option value="${size}">${size}px</ui-option>`).join("")}</ui-select><ui-switch id="type-wrap" checked>Wrap source</ui-switch></div><ui-editor id="type-editor" language="typescript" soft-wrap label="Typography source"></ui-editor>`,
        "The textarea, lexical color layer, and line gutter share the same font metrics. Unavailable fonts use the local monospace fallback.",
      ),
      script: `const editor = document.querySelector("#type-editor");
editor.value = ${JSON.stringify(source + "\n\n// Long source lines wrap inside the viewport while their logical line numbers stay aligned with the first visual line of each statement.")};
function setSize(value) { editor.style.setProperty("--type-code-font-size", value + "px"); editor.style.setProperty("--type-code-line-height", Number(value) * 1.5 + "px"); editor.requestUpdate(); }
setSize(13);
document.querySelector("#editor-size").addEventListener("ui-select-change", event => setSize(event.detail.value));
document.querySelector("#editor-family").addEventListener("ui-select-change", event => { if (event.detail.value === "default") editor.style.removeProperty("--type-code-font-family"); else editor.style.setProperty("--type-code-font-family", event.detail.value + ", ui-monospace, monospace"); editor.requestUpdate(); });
document.querySelector("#type-wrap").addEventListener("ui-switch-change", event => { editor.softWrap = event.detail.checked; });`,
    },
    {
      ...sample(
        "Mapped diagnostics",
        `<div class="mash-row mash-wrap"><ui-button id="validate-ranges">Check source</ui-button><ui-button id="apply-range-fix">Use a quantity of 2</ui-button><ui-button id="reset-ranges" variant="ghost">Reset</ui-button></div><ui-editor id="range-editor" language="typescript" label="Decorated source"><div slot="diagnostics" id="range-diagnostics" class="mash-stack" aria-label="Source diagnostics"></div><output slot="status" id="range-status" aria-live="polite">Edit before a marked word to move its range.</output></ui-editor>`,
        "Owner-supplied UTF-16 ranges map through native edits, indentation and replacement. Selecting a diagnostic selects its real source range. Marks change color or underline without changing caret metrics; this is not a language server.",
      ),
      script: `const editor = document.querySelector("#range-editor");
const initial = ${JSON.stringify(diagnosticSource)};
const diagnostics = document.querySelector("#range-diagnostics");
function renderDiagnostics() {
  const ranges = editor.decorations.filter(range => range.message);
  diagnostics.replaceChildren(...ranges.map(range => { const button = document.createElement("ui-button"); button.size = "small"; button.variant = "ghost"; button.textContent = range.message; button.addEventListener("click", () => { editor.setSelectionRange(range.start, range.end); editor.focus(); }); return button; }));
  document.querySelector("#apply-range-fix").disabled = !editor.decorations.some(range => range.id === "quantity");
  document.querySelector("#range-status").textContent = ranges.length + " diagnostics · " + editor.decorations.length + " marked ranges";
}
function validate() {
  editor.decorations = [
    {id:"quantity",word:"quantity",kind:"error",message:"Quantity has no local value"},
    {id:"legacy",word:"legacyName",kind:"warning",message:"Review the legacy name"},
    {id:"total",word:"total",kind:"highlight"},
    {id:"price",word:"price",kind:"info"},
  ].flatMap(({word,...range}) => { const start = editor.value.indexOf(word); return start < 0 ? [] : [{...range,start,end:start + word.length}]; });
  renderDiagnostics();
}
editor.value = initial; validate();
editor.addEventListener("ui-editor-decorations-change", renderDiagnostics);
document.querySelector("#validate-ranges").addEventListener("click", validate);
document.querySelector("#apply-range-fix").addEventListener("click", () => { const range = editor.decorations.find(range => range.id === "quantity"); if (!range) return; editor.setSelectionRange(range.start, range.end); editor.replaceSelection("2"); renderDiagnostics(); });
document.querySelector("#reset-ranges").addEventListener("click", () => { editor.value = initial; validate(); });`,
    },
    {
      ...sample(
        "Read-only",
        `<ui-button id="find" size="small">Find / replace</ui-button><ui-editor id="readonly-source" readonly label="Configuration" language="json">${searchMarkup}<span slot="status">Read-only configuration · selection and copy remain native</span></ui-editor>`,
        "Read-only preserves search, keyboard navigation, selection, and copying. Replacement is unavailable.",
      ),
      script: `const editor = document.querySelector("#readonly-source"); editor.value = '{ "theme": "system", "motion": true, "workspace": "Studio" }';
${searchScript}
document.querySelector("#replace-controls").hidden = true;`,
    },
  ],
  "ui-typeset": [
    sample(
      "Document specimen",
      `<ui-typeset flow="block" style="max-width:44rem"><h1>A clear place to work</h1><p>A good document combines <strong>clear structure</strong>, <em>useful emphasis</em>, and links that explain their destination.</p><h2>Make progress visible</h2><p>Keep related information together. Use <code>semantic HTML</code> for the meaning and tokens for its appearance.</p><blockquote>Give every important idea enough room to be understood.</blockquote><h3>Before a review</h3><ul><li>Read the page with real content.</li><li>Try the keyboard path.</li><li>Check a narrow layout and both themes.</li></ul><h3>Review sequence</h3><ol><li>Prepare the work.</li><li>Share the draft.</li><li>Resolve the feedback.</li></ol><hr><table><caption>Release checklist</caption><thead><tr><th>Area</th><th>Owner</th><th>Status</th></tr></thead><tbody><tr><td>Navigation</td><td>Alex</td><td>Ready</td></tr><tr><td>Typography</td><td>Sam</td><td>In review</td></tr></tbody></table><h3>Small, understandable code</h3><pre><code>const ready = tasks.every(task =&gt; task.done);\nreturn ready ? "Ready" : "In progress";</code></pre><p>Reference details may use <abbr title="Hypertext Markup Language">HTML</abbr>, a date such as <time datetime="2026-09-09">September 9</time>, and a descriptive <ui-link href="https://example.com">project reference</ui-link>.</p></ui-typeset>`,
      "This is authored semantic HTML styled by the public typography recipe. It does not parse Markdown or accept untrusted source markup.",
    ),
    sample(
      "Type and tone",
      `<div class="mash-stack">${["body", "body-small", "body-large", "label", "label-small", "label-large", "heading", "code"].map((preset) => `<ui-typeset preset="${preset}">${preset} · The details make the difference.</ui-typeset>`).join("")}</div><ui-separator></ui-separator><div class="mash-stack">${["primary", "secondary", "tertiary", "disabled", "accent", "critical"].map((tone) => `<ui-typeset tone="${tone}">${tone} foreground</ui-typeset>`).join("")}</div>`,
    ),
    {
      ...sample(
        "Expandable article",
        `<ui-typeset flow="block"><h2>Design notes</h2><p>Start with a useful hierarchy and a small set of shared decisions.</p></ui-typeset><ui-reveal id="article-details"><ui-typeset flow="block"><p>Related controls should share spacing, material, and focus behavior. A composed surface should feel like one coherent interface.</p><blockquote>Keep the content mounted so reading and editing state remain stable.</blockquote></ui-typeset></ui-reveal><ui-button id="expand-article" variant="ghost" aria-expanded="false">Read more</ui-button>`,
        "An explicit reveal boundary expands additional authored content without pretending to parse or clamp a source document.",
      ),
      script: `document.querySelector("#expand-article").addEventListener("click", event => { const details = document.querySelector("#article-details"); details.open = !details.open; event.target.setAttribute("aria-expanded", String(details.open)); event.target.textContent = details.open ? "Read less" : "Read more"; });`,
    },
    {
      ...sample(
        "Local links and code actions",
        `<ui-typeset flow="block"><p>Read the <a href="#usage" id="article-usage-link">usage notes</a> or copy this code to start a small composition.</p><pre><code>&lt;ui-card&gt;A place for related content&lt;/ui-card&gt;</code></pre></ui-typeset><ui-clipboard value="&lt;ui-card&gt;A place for related content&lt;/ui-card&gt;" label="Copy composition code"></ui-clipboard><ui-reveal id="usage-notes"><ui-typeset flow="block"><h3>Usage notes</h3><p>Place a meaningful heading in the title slot and put actions in the footer.</p></ui-typeset></ui-reveal><output id="article-link-result" aria-live="polite"></output>`,
        "A local link can route through the owning application while the authored text keeps native link semantics.",
      ),
      script: `document.querySelector("#article-usage-link").addEventListener("click", event => { event.preventDefault(); document.querySelector("#usage-notes").open = true; document.querySelector("#article-link-result").textContent = "Usage notes opened."; });`,
    },
  ],
};
