import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const demo = (
  name: string,
  code: string,
  script: string,
  description?: string,
): CatalogExample => ({
  ...sample(name, code, description),
  script,
});
const options = `<ui-option value="Draft">Draft</ui-option><ui-option value="Review">Review</ui-option><ui-option value="Published">Published</ui-option>`;
const choiceStates = (tag: string) =>
  sample(
    "Sizes and availability",
    `<div class="mash-grid">${["small", "medium", "large"].map((size) => `<${tag} label="${size} status" size="${size}" value="Draft">${options}</${tag}>`).join("")}<${tag} label="Disabled status" value="Review" disabled>${options}</${tag}><${tag} label="Read only status" value="Published" readonly>${options}</${tag}></div>`,
  );

export const selectionExamples: Record<string, CatalogExample[]> = {
  "ui-autocomplete": [
    demo(
      "Typeahead",
      `<div class="mash-stack" style="inline-size:30rem;max-inline-size:100%">
  <ui-autocomplete id="project-typeahead" label="Find a project" placeholder="Search projects or people…" filter="none" style="inline-size:100%">
    <ui-icon slot="icon" name="action.search"></ui-icon>
    <ui-button slot="clear" variant="ghost" size="xsmall" aria-label="Clear project search"><ui-icon name="action.dismiss" size="small"></ui-icon></ui-button>
    <span slot="empty" id="typeahead-empty">Start typing to find a project.</span>
    <span slot="footer"><ui-kbd>↑</ui-kbd> <ui-kbd>↓</ui-kbd> to navigate · <ui-kbd>Enter</ui-kbd> to select</span>
  </ui-autocomplete>
  <output id="typeahead-result" aria-live="polite">No project selected.</output>
</div>`,
      `const search = document.querySelector("#project-typeahead");
const empty = document.querySelector("#typeahead-empty");
const result = document.querySelector("#typeahead-result");
const projects = [
  { name: "Design system", owner: "Alex Morgan" },
  { name: "Developer documentation", owner: "Sam Chen" },
  { name: "Documentation search", owner: "Jordan Lee" },
  { name: "Mobile navigation", owner: "Alex Morgan" },
  { name: "Release planning", owner: "River Park" },
  { name: "Website redesign", owner: "Sam Chen" },
];
search.addEventListener("ui-combobox-input", () => {
  const query = search.value.trim().toLocaleLowerCase();
  const matches = query ? projects.filter(project =>
    (project.name + " " + project.owner).toLocaleLowerCase().includes(query)
  ).sort((a, b) => Number(b.name.toLocaleLowerCase().startsWith(query)) - Number(a.name.toLocaleLowerCase().startsWith(query)) || a.name.localeCompare(b.name)) : [];
  search.querySelectorAll("ui-option").forEach(option => option.remove());
  for (const project of matches) {
    const option = document.createElement("ui-option");
    option.value = project.name;
    const label = document.createElement("span");
    label.className = "mash-stack";
    label.style.gap = "0";
    const title = document.createElement("strong");
    title.textContent = project.name;
    const owner = document.createElement("small");
    owner.textContent = project.owner;
    label.append(title, owner);
    option.append(label);
    search.append(option);
  }
  empty.textContent = query ? 'No projects match “' + search.value.trim() + '”. Try another name.' : "Start typing to find a project.";
  result.textContent = "No project selected.";
});
search.addEventListener("ui-combobox-change", () => {
  const project = projects.find(item => item.name === search.value);
  result.textContent = project ? "Selected: " + project.name + " · " + project.owner : "No project selected.";
});`,
      "Suggestions update as you type. Search by project or owner; matching project names appear first.",
    ),
  ],
  "ui-select": [
    choiceStates("ui-select"),
    demo(
      "Search, clear, and empty",
      `<ui-select id="search-status" label="Publication status" placeholder="Choose a status" searchable>${options}<ui-option value="Archived" disabled>Archived · unavailable</ui-option><ui-button slot="clear" size="xsmall" variant="ghost" aria-label="Clear status">Clear</ui-button><span slot="empty">No matching status. Clear the search to see all choices.</span></ui-select><output id="status-result" aria-live="polite">No status selected</output>`,
      `const select = document.querySelector("#search-status");
select.addEventListener("ui-select-change", () => { document.querySelector("#status-result").textContent = select.value ? "Status: " + select.value : "No status selected"; });`,
    ),
    demo(
      "People and custom value",
      `<ui-select id="assignee" label="Assignee" placeholder="Assign someone" searchable><span slot="value" id="assignee-value">Unassigned</span><ui-option-group label="Design"><ui-option value="Alex"><div class="mash-stack"><strong>Alex Morgan</strong><small>Product designer · available</small></div><ui-icon slot="indicator" name="action.confirm"></ui-icon></ui-option><ui-option value="River"><div class="mash-stack"><strong>River Lee</strong><small>Design systems</small></div></ui-option></ui-option-group><ui-option-group label="Engineering"><ui-option value="Sam">Sam Chen · frontend</ui-option><ui-option value="Jordan" disabled>Jordan Park · away</ui-option></ui-option-group></ui-select><output id="person-result">Choose an owner for the next review.</output>`,
      `const select = document.querySelector("#assignee");
select.addEventListener("ui-select-change", () => { document.querySelector("#assignee-value").textContent = select.value; document.querySelector("#person-result").textContent = select.value + " will own the next review."; });`,
    ),
    demo(
      "Constrained list and external reset",
      `<style>#region-list::part(popup){inline-size:min(22rem,85vw)}#region-list::part(viewport){max-block-size:12rem}</style><ui-select id="region-list" label="Region" placeholder="Choose a region" searchable>${["Amsterdam", "Berlin", "Copenhagen", "Dublin", "Helsinki", "Lisbon", "London", "Madrid", "Oslo", "Paris", "Rome", "Stockholm", "Vienna", "Zurich"].map((city) => `<ui-option value="${city}">${city}</ui-option>`).join("")}</ui-select><div class="mash-row"><ui-button id="region-default" size="small">Use nearest region</ui-button><ui-button id="region-reset" size="small" variant="ghost">Reset</ui-button></div><output id="region-result">No region selected</output>`,
      `const select = document.querySelector("#region-list");
const render = () => { document.querySelector("#region-result").textContent = select.value || "No region selected"; };
select.addEventListener("ui-select-change", render);
document.querySelector("#region-default").addEventListener("click", () => { select.value = "London"; render(); });
document.querySelector("#region-reset").addEventListener("click", () => { select.value = ""; render(); });`,
    ),
  ],
  "ui-combobox": [
    demo(
      "Async search and recovery",
      `<ui-combobox id="remote-people" label="Search teammates" placeholder="Try Alex, Sam, or error" filter="none"><span slot="loading">Searching the directory…</span><span slot="empty" id="directory-empty">Type a name to search.</span><ui-button slot="clear" size="xsmall" variant="ghost" aria-label="Clear teammate">Clear</ui-button><ui-button slot="footer" id="retry-directory" size="small" hidden>Retry search</ui-button></ui-combobox><output id="directory-result" aria-live="polite">Search runs locally with a short delay.</output>`,
      `const combo = document.querySelector("#remote-people");
const empty = document.querySelector("#directory-empty");
const retry = document.querySelector("#retry-directory");
const people = ["Alex Morgan", "Sam Chen", "River Lee", "Jamie Stone", "Taylor Reed"];
let request = 0;
const search = async (recover = false) => { const ticket = ++request; const query = combo.value.trim(); combo.querySelectorAll("ui-option").forEach(option => option.remove()); retry.hidden = true; if (!query) { combo.loading = false; empty.textContent = "Type a name to search."; return; } combo.loading = true; await new Promise(resolve => setTimeout(resolve, 450)); if (ticket !== request || !combo.isConnected) return; combo.loading = false; if (query.toLowerCase() === "error" && !recover) { empty.textContent = "Directory unavailable. Retry the search."; retry.hidden = false; return; } const matches = recover ? people : people.filter(person => person.toLowerCase().includes(query.toLowerCase())); for (const person of matches) { const option = document.createElement("ui-option"); option.value = person; option.textContent = person; combo.append(option); } empty.textContent = "No teammates found. Try another name."; };
combo.addEventListener("ui-combobox-input", () => search());
retry.addEventListener("click", () => search(true));
combo.addEventListener("ui-combobox-change", () => { document.querySelector("#directory-result").textContent = combo.value ? "Assigned to " + combo.value : "No teammate selected"; });`,
    ),
    demo(
      "Selection limit and pinned chip",
      `<ui-combobox id="reviewers" label="Reviewers" placeholder="Add up to three" multiple values='["You"]'><ui-option value="You" aria-label="You" disabled>You · required owner</ui-option>${["Alex", "River", "Sam", "Taylor"].map((name) => `<ui-option value="${name}">${name}</ui-option>`).join("")}<ui-button slot="clear" size="xsmall" variant="ghost" aria-label="Clear optional reviewers">Clear</ui-button><small slot="footer">The owner stays selected. Choose two more reviewers.</small></ui-combobox><output id="reviewer-result" aria-live="polite"></output>`,
      `const combo = document.querySelector("#reviewers");
const render = () => { combo.values = ["You", ...combo.values.filter(value => value !== "You")].slice(0, 3); combo.querySelectorAll("ui-option").forEach(option => { option.disabled = option.value === "You" || (combo.values.length >= 3 && !combo.values.includes(option.value)); }); document.querySelector("#reviewer-result").textContent = combo.values.length + "/3 reviewers: " + combo.values.join(", "); };
combo.addEventListener("ui-combobox-change", render); render();`,
    ),
  ],
  "ui-form": [
    demo(
      "Form",
      `<ui-form id="project-form"><ui-field label="Project name" description="Required. Visible to your workspace."><ui-input slot="control" name="project" required placeholder="Studio website"></ui-input></ui-field><ui-field label="Contact email"><ui-input slot="control" name="email" type="email" required placeholder="you@example.com"></ui-input></ui-field><ui-select name="visibility" label="Visibility" value="Team"><ui-option value="Team">Team</ui-option><ui-option value="Private">Private</ui-option></ui-select><div class="mash-row"><ui-button type="submit" variant="primary">Create project</ui-button><ui-button type="reset" variant="ghost">Reset</ui-button></div></ui-form><output id="project-result" aria-live="polite">Complete both fields to create a local project.</output>`,
      `const form = document.querySelector("#project-form");
const output = document.querySelector("#project-result");
form.addEventListener("ui-form-submit", event => { event.preventDefault(); const data = Object.fromEntries(event.detail.formData); output.textContent = "Created " + data.project + " · " + data.visibility + " · " + data.email; });
form.addEventListener("reset", () => { output.textContent = "Form reset. Complete both fields to create a local project."; });`,
    ),
    demo(
      "Mixed controls and conditional fields",
      `<ui-form id="booking-form"><div class="mash-grid"><ui-input name="name" label="Booking name" value="Design review" required></ui-input><ui-number-field name="seats" label="Seats" value="4" min="1" max="12" required></ui-number-field></div><ui-checkbox name="remote" value="yes" id="remote-booking" checked>Include a remote meeting</ui-checkbox><ui-input id="meeting-link" name="link" label="Meeting address" value="https://meet.example/review" type="url"></ui-input><div class="mash-row"><ui-button type="submit" variant="primary">Save booking</ui-button><ui-button type="reset">Reset</ui-button></div></ui-form><output id="booking-result" aria-live="polite">Remote meeting details are retained when hidden.</output>`,
      `const form = document.querySelector("#booking-form");
const remote = document.querySelector("#remote-booking");
const link = document.querySelector("#meeting-link");
const sync = () => { link.hidden = !remote.checked; link.disabled = !remote.checked; };
const seats = form.querySelector("[name=seats]");
seats.addEventListener("ui-number-field-input", () => { document.querySelector("#booking-result").textContent = Number.isFinite(seats.value) && seats.value >= 1 && seats.value <= 12 ? "Ready to save booking." : "Enter a seat count from 1 to 12 before saving."; });
remote.addEventListener("ui-checkbox-change", sync);
form.addEventListener("reset", () => queueMicrotask(sync));
form.addEventListener("ui-form-submit", event => { event.preventDefault(); const data = Object.fromEntries(event.detail.formData); document.querySelector("#booking-result").textContent = data.name + " · " + data.seats + " seats · " + (data.link || "In person"); });`,
    ),
  ],
  "ui-number-field": [
    sample(
      "Units and compact controls",
      `<div class="mash-grid"><ui-number-field label="Width" value="320" min="0" max="1920"><span slot="suffix">px</span></ui-number-field><ui-number-field label="Price" value="24.95" min="0" step="0.05"><span slot="prefix">$</span></ui-number-field><ui-number-field class="mash-number-stacked" label="Opacity" value="80" min="0" max="100"><span slot="suffix">%</span></ui-number-field><ui-number-field class="mash-number-stacked" label="Rotation" value="-15" min="-180" max="180"><span slot="suffix">°</span></ui-number-field></div>`,
      "Units use prefix and suffix slots. Stacked controls use the same input, buttons and keyboard behavior. Arrow keys step; Shift steps ten times.",
    ),
    sample(
      "Sizes and states",
      `<div class="mash-grid"><div data-mash-size="small"><ui-number-field label="Small quantity" value="3" min="0" max="10"></ui-number-field></div><div data-mash-size="medium"><ui-number-field label="Medium quantity" value="3" min="0" max="10"></ui-number-field></div><div data-mash-size="large"><ui-number-field label="Large quantity" value="3" min="0" max="10"></ui-number-field></div><ui-number-field label="Read only" value="128" readonly><span slot="suffix">GB</span></ui-number-field><ui-number-field label="Unavailable" value="64" disabled><span slot="suffix">GB</span></ui-number-field><ui-number-field label="At the limit" value="5" min="1" max="5"></ui-number-field></div>`,
      "Control height follows the surrounding size context. Read-only values remain selectable; disabled fields do not submit. Step buttons stop at valid limits.",
    ),
    demo(
      "Editing and validation",
      `<ui-form id="number-form"><ui-number-field id="edited-number" name="quantity" label="Quantity" value="120" min="100" max="500" required></ui-number-field><ui-number-field id="optional-number" name="discount" label="Optional discount" placeholder="None" value="NaN" min="0" max="100"><span slot="suffix">%</span></ui-number-field><div class="mash-row"><ui-button type="submit" variant="primary">Apply values</ui-button><ui-button type="reset">Reset</ui-button></div></ui-form><output id="number-result" aria-live="polite">Quantity: 120 · no discount</output>`,
      `const form = document.querySelector("#number-form"); const result = document.querySelector("#number-result"); const quantity = document.querySelector("#edited-number");
quantity.addEventListener("ui-number-field-input", () => { result.textContent = Number.isFinite(quantity.value) ? "Editing quantity: " + quantity.value : "Enter a quantity."; });
form.addEventListener("ui-form-submit", event => { event.preventDefault(); const values = Object.fromEntries(event.detail.formData); result.textContent = "Quantity: " + values.quantity + " · " + (values.discount === "" ? "no discount" : values.discount + "% discount"); });
form.addEventListener("reset", () => { result.textContent = "Quantity: 120 · no discount"; });`,
      "Type a complete number without the field interrupting your draft. Leaving the field clamps it to 100–500. Empty required values block submission; optional empty values stay empty.",
    ),
    demo(
      "Fractional, negative, and bounded",
      `<div class="mash-grid"><ui-number-field id="quantity" label="Seats · 1–12" value="3" min="1" max="12"></ui-number-field><ui-number-field id="hourly" label="Hours · quarter hour steps" value="1.5" min="0.25" max="8" step="0.25"></ui-number-field><ui-number-field label="Temperature offset" value="-2" min="-10" max="10" step="0.5"></ui-number-field><ui-number-field label="Managed limit" value="100" disabled></ui-number-field></div><output id="estimate" aria-live="polite"></output>`,
      `const seats = document.querySelector("#quantity"); const hours = document.querySelector("#hourly");
const render = () => { const output = document.querySelector("#estimate"); if (!Number.isFinite(seats.value) || !Number.isFinite(hours.value)) { output.textContent = "Enter seats and hours to calculate the estimate."; return; } output.textContent = seats.value + " seats × " + hours.value + " hours = " + new Intl.NumberFormat("en", {style:"currency",currency:"USD"}).format(seats.value * hours.value * 20); };
[seats, hours].forEach(field => field.addEventListener("ui-number-field-input", render)); render();`,
    ),
    demo(
      "Controlled step size",
      `<ui-select id="step-size" label="Increment" value="5"><ui-option value="1">Fine · 1</ui-option><ui-option value="5">Normal · 5</ui-option><ui-option value="25">Coarse · 25</ui-option></ui-select><ui-number-field id="budget" label="Budget units" value="50" min="0" max="200" step="5"></ui-number-field><output id="budget-result" aria-live="polite">50 units · step 5</output>`,
      `const step = document.querySelector("#step-size"); const number = document.querySelector("#budget"); const render = () => { document.querySelector("#budget-result").textContent = Number.isFinite(number.value) ? number.value + " units · step " + number.step : "Enter budget units · step " + number.step; }; step.addEventListener("ui-select-change", () => { number.step = Number(step.value); render(); }); number.addEventListener("ui-number-field-input", render);`,
    ),
  ],
  "ui-otp-field": [
    sample(
      "Lengths, grouping, and masking",
      `<ui-otp-field label="Four digit PIN" length="4" value="4821"></ui-otp-field><ui-otp-field label="Grouped security code" length="6" group-size="3" value="123456"></ui-otp-field><ui-otp-field label="Private code" length="6" group-size="3" value="482109" masked></ui-otp-field><ui-otp-field label="Unavailable code" length="4" value="1234" disabled></ui-otp-field>`,
    ),
    demo(
      "Verify, retry, and reset",
      `<ui-field id="code-frame" label="Verification code" description="Enter or paste 123456 to verify." error="That code did not match. Try 123456."><ui-otp-field slot="control" id="verify-code" length="6" group-size="3"></ui-otp-field></ui-field><div class="mash-row"><ui-button id="fill-code" size="small">Fill demo code</ui-button><ui-button id="reset-code" size="small" variant="ghost">Start again</ui-button></div><output id="code-result" aria-live="polite">Waiting for six characters</output>`,
      `const code = document.querySelector("#verify-code"); const field = document.querySelector("#code-frame"); const output = document.querySelector("#code-result");
const verify = () => { field.invalid = code.value !== "123456"; output.textContent = field.invalid ? "Verification failed. Edit the code and try again." : "Verified. You can continue."; };
code.addEventListener("ui-otp-field-complete", verify);
code.addEventListener("ui-otp-field-input", event => { if (!event.detail.complete) { field.invalid = false; output.textContent = event.detail.value.length + "/6 characters"; } });
document.querySelector("#fill-code").addEventListener("click", () => { code.value = "123456"; verify(); });
document.querySelector("#reset-code").addEventListener("click", () => { code.value = ""; field.invalid = false; output.textContent = "Waiting for six characters"; });`,
    ),
  ],
  "ui-checkbox": [
    demo(
      "Select all and mixed state",
      `<ui-checkbox id="select-all" indeterminate>Select all deliverables</ui-checkbox><ui-separator></ui-separator><ui-checkbox class="deliverable" value="Design" checked><strong>Design</strong> · ready for review</ui-checkbox><ui-checkbox class="deliverable" value="Content">Content · draft</ui-checkbox><ui-checkbox class="deliverable" value="Engineering">Engineering · in progress</ui-checkbox><ui-checkbox checked disabled>Required compliance review</ui-checkbox><output id="selection-result" aria-live="polite"></output>`,
      `const all = document.querySelector("#select-all"); const items = [...document.querySelectorAll(".deliverable")]; const render = () => { const selected = items.filter(item => item.checked); all.checked = selected.length === items.length; all.indeterminate = selected.length > 0 && !all.checked; document.querySelector("#selection-result").textContent = selected.length + "/3 selected" + (selected.length ? ": " + selected.map(item => item.value).join(", ") : ""); }; all.addEventListener("ui-checkbox-change", () => { items.forEach(item => { item.checked = all.checked; }); render(); }); items.forEach(item => item.addEventListener("ui-checkbox-change", render)); render();`,
    ),
  ],
  "ui-switch": [
    demo(
      "Fluid toggle",
      `<ui-switch id="fluid-switch" name="notifications"><span class="mash-weight" data-text="Notifications"><span>Notifications</span></span></ui-switch><output id="fluid-switch-result" aria-live="polite">Notifications off</output>`,
      `const control = document.querySelector("#fluid-switch"); control.addEventListener("ui-switch-change", () => { document.querySelector("#fluid-switch-result").textContent = "Notifications " + (control.checked ? "on" : "off"); });`,
      "Click the label, press Space or drag the thumb. Hover stretches the thumb; pressing compresses it. Label emphasis reserves its width, so nearby content stays still.",
    ),
    sample(
      "Size context and availability",
      `<div class="mash-grid"><div data-mash-size="small"><ui-switch label="Inherited compact" checked></ui-switch></div><ui-switch size="compact" label="Pinned compact" checked></ui-switch><div data-mash-size="small"><ui-switch size="default" label="Default size" checked></ui-switch></div><ui-switch label="Disabled off" disabled></ui-switch><ui-switch label="Disabled on" checked disabled></ui-switch><fieldset disabled style="border:0;padding:0;margin:0;min-width:0"><ui-switch label="Disabled by fieldset" checked></ui-switch></fieldset></div>`,
      "Omitted size follows the nearest size context; compact and default pin the track size. Attribute labels and slotted labels share native switch semantics.",
    ),
    demo(
      "Controlled setting",
      `<ui-switch id="controlled-switch" label="Sync over cellular" label-side="left"></ui-switch><div class="mash-row"><ui-button id="enable-sync">Enable</ui-button><ui-button id="disable-sync">Disable</ui-button></div><output id="controlled-switch-result" aria-live="polite">Waiting for Wi-Fi</output>`,
      `const control = document.querySelector("#controlled-switch"); const render = () => { document.querySelector("#controlled-switch-result").textContent = control.checked ? "Cellular sync enabled" : "Waiting for Wi-Fi"; }; document.querySelector("#enable-sync").addEventListener("click", () => { control.checked = true; render(); }); document.querySelector("#disable-sync").addEventListener("click", () => { control.checked = false; render(); }); control.addEventListener("ui-switch-change", render);`,
      "The application can set checked directly. User changes arrive through ui-switch-change; assignment does not emit a second user event.",
    ),
    demo(
      "Notification settings",
      `<ui-switch id="desktop-alerts" checked><strong>Desktop alerts</strong> · updates while you work</ui-switch><ui-switch id="quiet-alerts" size="small" label-side="left">Quiet hours</ui-switch><ui-switch checked disabled>Security alerts · required</ui-switch><ui-switch disabled>Mobile push · connect a device</ui-switch><output id="notification-result" aria-live="polite"></output>`,
      `const desktop = document.querySelector("#desktop-alerts"); const quiet = document.querySelector("#quiet-alerts"); const render = () => { document.querySelector("#notification-result").textContent = !desktop.checked ? "Desktop alerts paused" : quiet.checked ? "Desktop alerts held until quiet hours end" : "Desktop alerts enabled"; }; [desktop, quiet].forEach(control => control.addEventListener("ui-switch-change", render)); render();`,
    ),
  ],
};

/** Preserve useful earlier variants while replacing examples with the same purpose. */
export function mergeSelectionExamples(
  target: Record<string, CatalogExample[]>,
  controlsOnly = false,
): void {
  for (const [tag, additions] of Object.entries(selectionExamples)) {
    if (controlsOnly && !target[tag]) continue;
    const current = target[tag] ?? [];
    target[tag] = current.map(
      (example) => additions.find((addition) => addition.name === example.name) ?? example,
    );
    target[tag].push(
      ...additions.filter((addition) => !current.some((example) => example.name === addition.name)),
    );
  }
}
