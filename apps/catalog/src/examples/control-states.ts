import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
const demo = (name: string, code: string, script: string): CatalogExample => ({
  ...sample(name, code),
  script,
});

export const controlStateExamples: Record<string, CatalogExample[]> = {
  "ui-input": [
    demo(
      "Search and clear",
      `<ui-input-group><ui-icon slot="prefix" name="action.search"></ui-icon><ui-input id="file-search" slot="control" label="Filter documents" type="search" placeholder="Search documents" clean-on-escape></ui-input><ui-button id="clear-search" slot="suffix" variant="ghost" size="xsmall" disabled>Clear</ui-button></ui-input-group><div id="search-results" class="mash-stack"></div><output id="search-count" aria-live="polite"></output>`,
      `const input = document.querySelector("#file-search"); const clear = document.querySelector("#clear-search"); const documents = ["Design principles", "Release notes", "Keyboard shortcuts", "Component inventory"]; const render = () => { const matches = documents.filter(title => title.toLowerCase().includes(input.value.toLowerCase())); const results = document.querySelector("#search-results"); results.replaceChildren(...matches.map(title => { const row = document.createElement("div"); row.textContent = title; return row; })); clear.disabled = !input.value; document.querySelector("#search-count").textContent = matches.length ? matches.length + " documents" : "No documents match. Clear the search to start again."; }; input.addEventListener("input", render); clear.addEventListener("click", () => { input.value = ""; input.focus(); render(); }); render();`,
    ),
    demo(
      "Password visibility",
      `<ui-field label="Password" description="Reveal briefly to check what you typed."><ui-input-group slot="control"><ui-input id="secret-input" slot="control" type="password" autocomplete="new-password" label="Password" value="correct-horse-battery"></ui-input><ui-button id="reveal-secret" slot="suffix" size="xsmall" variant="ghost" aria-label="Show password">Show</ui-button></ui-input-group></ui-field><output id="secret-state" aria-live="polite">Password hidden</output>`,
      `const input = document.querySelector("#secret-input"); const reveal = document.querySelector("#reveal-secret"); reveal.addEventListener("click", () => { const selection = [input.control.selectionStart, input.control.selectionEnd]; const visible = input.type === "password"; input.type = visible ? "text" : "password"; reveal.textContent = visible ? "Hide" : "Show"; reveal.setAttribute("aria-label", visible ? "Hide password" : "Show password"); reveal.setAttribute("aria-pressed", String(visible)); document.querySelector("#secret-state").textContent = visible ? "Password visible" : "Password hidden"; input.updateComplete.then(() => { input.focus(); input.control.setSelectionRange(...selection); }); });`,
    ),
    demo(
      "Live validation and submit",
      `<ui-form id="handle-form"><ui-field id="handle-field" label="Workspace address" description="3–16 lowercase letters, digits, or hyphens." error="Use 3–16 lowercase letters, digits, or hyphens."><ui-input slot="control" id="handle-input" name="handle" placeholder="design-team" pattern="[a-z0-9-]{3,16}" minlength="3" maxlength="16" required></ui-input></ui-field><ui-button type="submit" variant="primary">Reserve address</ui-button></ui-form><output id="handle-result" aria-live="polite">Choose a workspace address.</output>`,
      `const form = document.querySelector("#handle-form"); const input = document.querySelector("#handle-input"); const field = document.querySelector("#handle-field"); const output = document.querySelector("#handle-result"); input.addEventListener("input", () => { field.invalid = Boolean(input.value) && !/^[a-z0-9-]{3,16}$/.test(input.value); output.textContent = field.invalid ? "The address needs a small correction." : input.value ? input.value + ".example · available locally" : "Choose a workspace address."; }); form.addEventListener("ui-form-submit", event => { event.preventDefault(); output.textContent = "Reserved " + event.detail.formData.get("handle") + ".example"; });`,
    ),
    demo(
      "Editing lifecycle",
      `<ui-input id="event-input" label="Command name" placeholder="Type, press Enter, then leave the field"></ui-input><div class="mash-row"><ui-button id="focus-input" size="small">Focus field</ui-button><ui-button size="small" variant="ghost">Move focus here</ui-button></div><output id="event-result" aria-live="polite">Waiting for an edit</output>`,
      `const input = document.querySelector("#event-input"); const output = document.querySelector("#event-result"); input.addEventListener("input", () => { output.textContent = "Editing: " + (input.value || "empty"); }); input.addEventListener("change", () => { output.textContent = "Committed: " + input.value; }); input.addEventListener("ui-input-enter", () => { output.textContent = "Submitted: " + (input.value || "empty"); }); input.addEventListener("ui-input-focus-change", event => { if (event.detail.focused) output.textContent = "Focused: " + (input.value || "empty"); }); document.querySelector("#focus-input").addEventListener("click", () => input.focus());`,
    ),
    sample(
      "Content types and alignment",
      `<style>#center-code::part(control){text-align:center}#invoice-amount::part(control){text-align:end}</style><div class="mash-grid"><ui-input type="email" autocomplete="email" label="Email" placeholder="you@example.com"></ui-input><ui-input type="tel" inputmode="tel" autocomplete="tel" label="Phone" placeholder="+1 555 0100"></ui-input><ui-input type="url" inputmode="url" label="Website" placeholder="https://example.com"></ui-input><ui-input id="center-code" label="Centered reference" value="AB-1042" readonly></ui-input><ui-input id="invoice-amount" inputmode="decimal" label="Amount" value="125.00"></ui-input></div>`,
    ),
  ],
  "ui-radio-group": [
    demo(
      "Plan selection",
      `<ui-radio-group id="billing-plan" label="Plan" name="plan" value="team"><ui-radio value="personal"><strong>Personal</strong> · one workspace · $0</ui-radio><ui-radio value="team"><strong>Team</strong> · shared projects · $12</ui-radio><ui-radio value="business" disabled><strong>Business</strong> · contact your administrator</ui-radio></ui-radio-group><ui-separator></ui-separator><ui-radio-group id="billing-period" label="Billing period" orientation="horizontal" value="monthly"><ui-radio value="monthly">Monthly</ui-radio><ui-radio value="annual">Annual · save 20%</ui-radio></ui-radio-group><output id="plan-result" aria-live="polite"></output>`,
      `const plan = document.querySelector("#billing-plan"); const period = document.querySelector("#billing-period"); const render = () => { const amount = plan.value === "personal" ? 0 : period.value === "annual" ? 9.6 : 12; document.querySelector("#plan-result").textContent = (plan.value === "personal" ? "Personal" : "Team") + " · " + new Intl.NumberFormat("en", { style:"currency", currency:"USD" }).format(amount) + "/month" + (period.value === "annual" ? " billed annually" : ""); }; [plan, period].forEach(group => group.addEventListener("ui-radio-group-change", render)); render();`,
    ),
  ],
  "ui-checkbox": [
    sample(
      "Sizes and disabled selection",
      `<div class="mash-grid">${["small", "medium", "large"].map((size) => `<ui-checkbox size="${size}" checked>${size} selected</ui-checkbox><ui-checkbox size="${size}">${size} unselected</ui-checkbox>`).join("")}<ui-checkbox disabled>Unavailable</ui-checkbox><ui-checkbox checked disabled>Required selection</ui-checkbox><ui-checkbox indeterminate disabled>Managed mixed selection</ui-checkbox></div>`,
    ),
  ],
  "ui-radio": [
    sample(
      "Sizes and availability",
      `<div class="mash-grid">${["small", "medium", "large"].map((size) => `<ui-radio-group data-mash-size="${size}" style="--layout-dimension-glyph:var(--layout-dimension-checkbox-${size});${size === "medium" ? "" : `--type-body-font-size:var(--type-${size === "small" ? "callout" : "label-large"}-font-size);--type-body-line-height:var(--type-${size === "small" ? "callout" : "label-large"}-line-height)`}" label="${size} choices" name="size-${size}" value="selected" orientation="horizontal"><ui-radio value="selected">${size} selected</ui-radio><ui-radio value="other">Other</ui-radio><ui-radio value="disabled" disabled>Unavailable</ui-radio></ui-radio-group>`).join("")}</div>`,
    ),
  ],
  "ui-slider": [
    demo(
      "Range filter",
      `<ui-slider id="price-range" label="Price per month" min="0" max="200" step="10" values='[40,120]'><span slot="start-value" id="price-start">$40</span><span slot="end-value" id="price-end">$120</span></ui-slider><div id="price-matches" class="mash-stack"></div><output id="price-result" aria-live="polite"></output>`,
      `const slider = document.querySelector("#price-range"); const plans = [{name:"Starter",price:20},{name:"Studio",price:60},{name:"Team",price:100},{name:"Enterprise",price:180}]; const render = () => { const [start,end] = slider.values; document.querySelector("#price-start").textContent = "$"+start; document.querySelector("#price-end").textContent = "$"+end; const matches=plans.filter(plan=>plan.price>=start&&plan.price<=end); document.querySelector("#price-matches").replaceChildren(...matches.map(plan=>{const row=document.createElement("div");row.textContent=plan.name+" · $"+plan.price+"/month";return row;})); document.querySelector("#price-result").textContent=matches.length+" plans in range"; }; slider.addEventListener("ui-slider-input",render);render();`,
    ),
    demo(
      "Scale, direction, and orientation",
      `<div class="mash-grid"><ui-slider id="gain-slider" label="Logarithmic frequency" min="20" max="20000" value="1000" scale="logarithmic"><span slot="value" id="frequency-value">1,000 Hz</span></ui-slider><ui-slider id="reverse-slider" label="Reversed range" min="0" max="100" value="70" reversed></ui-slider><ui-slider label="Managed volume" value="45" disabled></ui-slider><ui-slider label="Read only level" value="65" readonly></ui-slider></div><div style="block-size:12rem"><ui-slider id="vertical-slider" orientation="vertical" label="Channel volume" value="60" style="block-size:100%"></ui-slider></div><output id="scale-result" aria-live="polite">Adjust frequency or channel volume.</output>`,
      `const frequency = document.querySelector("#gain-slider"); frequency.addEventListener("ui-slider-input", () => { document.querySelector("#frequency-value").textContent = Math.round(frequency.value).toLocaleString("en") + " Hz"; }); for(const id of ["reverse-slider","vertical-slider"]){const slider=document.getElementById(id);slider.addEventListener("ui-slider-input",()=>{document.querySelector("#scale-result").textContent=slider.label+": "+Math.round(slider.value)+"%";});}`,
    ),
  ],
  "ui-button": [
    sample(
      "Outline and compact",
      `<div class="mash-stack"><div class="mash-row mash-wrap">${["neutral", "accent", "positive", "warning", "critical", "info"].map((tone) => `<ui-button outline tone="${tone}">${tone}</ui-button>`).join("")}</div><div class="mash-row mash-wrap"><ui-button>Standard spacing</ui-button><ui-button compact>Compact spacing</ui-button><ui-button compact selected>Compact selected</ui-button><ui-button selected disabled>Selected unavailable</ui-button><ui-button selected loading>Selected loading</ui-button></div><div class="mash-row"><ui-button><ui-icon slot="prefix" name="action.add"></ui-icon>New item<ui-kbd slot="suffix" shortcut="Primary+N"></ui-kbd></ui-button><ui-button aria-label="Add item" style="inline-size:2.75rem;block-size:2.75rem"><ui-icon name="action.add"></ui-icon></ui-button></div></div>`,
    ),
  ],
};

export function mergeControlStateExamples(
  target: Record<string, CatalogExample[]>,
  controlsOnly = false,
): void {
  for (const [tag, additions] of Object.entries(controlStateExamples)) {
    if (controlsOnly && !target[tag]) continue;
    target[tag] = [...(target[tag] ?? []), ...additions];
  }
}
