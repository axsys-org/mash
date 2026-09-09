import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
const demo = (name: string, code: string, script: string): CatalogExample => ({
  ...sample(name, code),
  script,
});
const team = [
  "Alex Morgan",
  "River Lee",
  "Sam Chen",
  "Taylor Reed",
  "Jamie Stone",
  "Morgan Park",
  "Casey Lane",
  "Avery Wells",
];
export const finalControlExamples: Record<string, CatalogExample[]> = {
  "ui-form": [
    demo(
      "Responsive layouts and spans",
      `<style>#layout-fields{display:grid;gap:var(--space-group-block)}#layout-form[data-layout="columns"] #layout-fields{grid-template-columns:repeat(2,minmax(0,1fr))}#layout-fields .full-span{grid-column:1/-1}#layout-form[data-layout="horizontal"] ui-field::part(root){grid-template-columns:8rem minmax(0,1fr);align-items:center}#layout-form[data-layout="horizontal"] ui-field::part(description),#layout-form[data-layout="horizontal"] ui-field::part(error){grid-column:2}@media(max-width:440px){#layout-form[data-layout="columns"] #layout-fields{grid-template-columns:1fr}#layout-form[data-layout="horizontal"] ui-field::part(root){grid-template-columns:1fr}#layout-form[data-layout="horizontal"] ui-field::part(description),#layout-form[data-layout="horizontal"] ui-field::part(error){grid-column:1}}</style><div class="mash-row mash-wrap"><ui-select id="form-layout-choice" label="Field layout" value="columns"><ui-option value="vertical">Vertical</ui-option><ui-option value="horizontal">Horizontal labels</ui-option><ui-option value="columns">Two columns</ui-option></ui-select><ui-select id="form-scale-choice" label="Field size" value="small"><ui-option value="small">Small</ui-option><ui-option value="medium">Medium</ui-option><ui-option value="large">Large</ui-option></ui-select></div><div id="layout-size" data-mash-size="small"><ui-form id="layout-form" data-layout="columns"><div id="layout-fields"><ui-field label="First name" required><ui-input slot="control" name="first" value="Alex" autocomplete="given-name"></ui-input></ui-field><ui-field label="Last name" required><ui-input slot="control" name="last" value="Morgan" autocomplete="family-name"></ui-input></ui-field><ui-field label="Email" description="Only used for project updates." required class="full-span"><ui-input slot="control" name="email" type="email" value="alex@example.com" autocomplete="email"></ui-input></ui-field><ui-field label="Role"><ui-select slot="control" name="role" value="Designer"><ui-option value="Designer">Designer</ui-option><ui-option value="Engineer">Engineer</ui-option></ui-select></ui-field><ui-field label="Team"><ui-input slot="control" name="team" value="Studio"></ui-input></ui-field><ui-field label="Project notes" class="full-span"><ui-textarea slot="control" name="notes" value="Keep the first release focused." rows="2"></ui-textarea></ui-field></div><div class="mash-row"><ui-button type="submit" variant="primary">Save profile</ui-button><ui-button type="reset" variant="ghost">Reset</ui-button></div></ui-form></div><output id="layout-form-result" aria-live="polite">Changing layout or size preserves your edits.</output>`,
      `const form=document.querySelector("#layout-form");document.querySelector("#form-layout-choice").addEventListener("ui-select-change",event=>{form.dataset.layout=event.detail.value;});document.querySelector("#form-scale-choice").addEventListener("ui-select-change",event=>{document.querySelector("#layout-size").dataset.mashSize=event.detail.value;});form.addEventListener("ui-form-submit",event=>{event.preventDefault();const data=Object.fromEntries(event.detail.formData);document.querySelector("#layout-form-result").textContent="Saved "+data.first+" "+data.last+" · "+data.role+" · "+data.team;});form.addEventListener("reset",()=>{document.querySelector("#layout-form-result").textContent="Profile restored.";});`,
    ),
  ],
  "ui-otp-field": [
    sample(
      "Cell sizes and custom treatment",
      `<style>#compact-code::part(cell){inline-size:1.75rem;block-size:2rem}#spacious-code::part(cell){inline-size:2.75rem;block-size:3rem}#underline-code::part(cell){border-radius:0;border-inline:0;border-block-start:0;border-block-end-width:var(--border-strong);background:transparent}</style><ui-otp-field id="compact-code" label="Compact code" length="6" group-size="3" value="123456"></ui-otp-field><ui-otp-field label="Standard code" length="6" group-size="3" value="123456"></ui-otp-field><ui-otp-field id="spacious-code" label="Spacious code" length="4" value="4821"></ui-otp-field><ui-otp-field id="underline-code" label="Underline treatment" length="4" value="4821"></ui-otp-field>`,
    ),
    demo(
      "Resend and cooldown",
      `<ui-field id="resend-frame" label="Verification code" description="The initial demo code is 123456." error="That code has expired or does not match."><ui-otp-field slot="control" id="resend-code" length="6" group-size="3"></ui-otp-field></ui-field><div class="mash-row"><ui-button id="resend-request" size="small">Resend code</ui-button><ui-button id="resend-fill" size="small" variant="ghost">Fill current demo code</ui-button></div><output id="resend-result" aria-live="polite">Waiting for verification</output>`,
      `const code=document.querySelector("#resend-code"),field=document.querySelector("#resend-frame"),resend=document.querySelector("#resend-request"),output=document.querySelector("#resend-result");let expected="123456",attempt=0;const verify=()=>{field.invalid=code.value!==expected;output.textContent=field.invalid?"Use the latest code shown above.":"Verified with the current code.";};code.addEventListener("ui-otp-field-complete",verify);document.querySelector("#resend-fill").addEventListener("click",()=>{code.value=expected;verify();});resend.addEventListener("click",()=>{if(resend.disabled)return;attempt++;expected=attempt%2?"246810":"123456";code.value="";field.invalid=false;field.description="Current demo code: "+expected+". Older codes no longer work.";output.textContent="A new code is ready.";const deadline=Date.now()+5000;resend.disabled=true;const tick=()=>{if(!resend.isConnected)return;const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));resend.textContent=seconds?"Resend in "+seconds+"s":"Resend code";resend.disabled=seconds>0;if(seconds)setTimeout(tick,250);};tick();});`,
    ),
  ],
  "ui-combobox": [
    demo(
      "Rich grid navigation",
      `<ui-combobox id="team-grid" label="Choose a collaborator" placeholder="Search name or discipline" grid>${[
        0, 1, 2,
      ]
        .map(
          (row) =>
            `<ui-option-row>${team
              .slice(row * 2, row * 2 + 2)
              .map(
                (name, index) =>
                  `<ui-option value="${name}" ${row === 2 && index === 1 ? "disabled" : ""}><div class="mash-row"><ui-avatar size="small" alt="${name}">${name
                    .split(" ")
                    .map((word) => word[0])
                    .join(
                      "",
                    )}</ui-avatar><span class="mash-stack"><strong>${name}</strong><small>${index ? "Engineering" : "Design"}${row === 2 && index === 1 ? " · unavailable" : ""}</small></span></div><ui-icon slot="indicator" name="action.confirm"></ui-icon></ui-option>`,
              )
              .join("")}</ui-option-row>`,
        )
        .join(
          "",
        )}<span slot="empty">No collaborator matches that search.</span><small slot="footer">Arrow keys navigate rows and columns. Enter chooses a collaborator.</small></ui-combobox><output id="grid-collaborator" aria-live="polite">No collaborator selected</output>`,
      `const combo=document.querySelector("#team-grid");combo.addEventListener("ui-combobox-change",()=>{document.querySelector("#grid-collaborator").textContent=combo.value?"Collaborating with "+combo.value:"No collaborator selected";});`,
    ),
    demo(
      "Collapsed selection summary",
      `<style>#overflow-chips{display:flex;flex-wrap:wrap;gap:var(--space-control-gap);max-block-size:8rem;overflow:auto;max-inline-size:28rem}</style><ui-combobox id="overflow-people" label="Project members" multiple placeholder="Add members" values='${JSON.stringify(team.slice(0, 6))}'><div slot="chips" id="overflow-chips"></div><ui-button slot="value" id="expand-chips" size="xsmall" variant="ghost" aria-expanded="false">4 more</ui-button>${team.map((name) => `<ui-option value="${name}">${name}</ui-option>`).join("")}<ui-button slot="clear" size="xsmall" variant="ghost" aria-label="Clear selected members">Clear</ui-button></ui-combobox><output id="overflow-result" aria-live="polite"></output>`,
      `const combo=document.querySelector("#overflow-people"),chips=document.querySelector("#overflow-chips"),toggle=document.querySelector("#expand-chips");let expanded=false;const render=()=>{const visible=expanded?combo.values:combo.values.slice(0,2);chips.replaceChildren(...visible.map(value=>{const chip=document.createElement("ui-chip");chip.value=value;chip.textContent=value;return chip;}));toggle.hidden=combo.values.length<=2;toggle.textContent=expanded?"Show fewer":(combo.values.length-2)+" more";toggle.setAttribute("aria-expanded",String(expanded));document.querySelector("#overflow-result").textContent=combo.values.length?combo.values.length+" members: "+combo.values.join(", "):"No members selected";};toggle.addEventListener("click",()=>{expanded=!expanded;render();});combo.addEventListener("ui-combobox-change",render);render();`,
    ),
  ],
  "ui-accordion": [
    demo(
      "Authored disclosure and title",
      `<style>#custom-disclosures ui-accordion-item::part(disclosure){transform:none!important}#custom-disclosures ui-accordion-item::part(title){font-weight:var(--type-label-font-weight)}#custom-disclosures ui-accordion-item[open]::part(trigger){background:var(--color-surface-sunken)}</style><ui-accordion id="custom-disclosures" bordered mode="multiple"><ui-accordion-item value="sharing" open><span slot="title">Sharing preferences</span><ui-badge slot="suffix">Team</ui-badge><span slot="disclosure" class="custom-mark">−</span><div class="mash-stack"><ui-switch id="custom-sharing" checked>Allow project members to invite collaborators</ui-switch><small>The disclosure symbol is authored content. Panel controls keep their values when collapsed.</small></div></ui-accordion-item><ui-accordion-item value="retention" title="Retention policy"><span slot="disclosure" class="custom-mark">+</span><ui-select id="custom-retention" label="Keep archived projects" value="90 days"><ui-option value="30 days">30 days</ui-option><ui-option value="90 days">90 days</ui-option><ui-option value="Forever">Forever</ui-option></ui-select></ui-accordion-item></ui-accordion><output id="custom-accordion-result" aria-live="polite">Invitations enabled · archives kept 90 days</output>`,
      `const accordion=document.querySelector("#custom-disclosures");const render=()=>{accordion.querySelectorAll("ui-accordion-item").forEach(item=>{item.querySelector(".custom-mark").textContent=item.open?"−":"+";});document.querySelector("#custom-accordion-result").textContent="Invitations "+(document.querySelector("#custom-sharing").checked?"enabled":"disabled")+" · archives kept "+document.querySelector("#custom-retention").value;};accordion.addEventListener("ui-accordion-change",render);accordion.addEventListener("ui-switch-change",render);accordion.addEventListener("ui-select-change",render);render();`,
    ),
  ],
  "ui-toggle-group": [
    demo(
      "Connected controls and combinations",
      `<style>.connected-toggles::part(root){gap:0}.connected-toggles>ui-toggle::part(control){border-radius:0}.connected-toggles>ui-toggle+ui-toggle{margin-inline-start:calc(0px - var(--border-hairline))}.connected-toggles>ui-toggle:first-child::part(control){border-start-start-radius:var(--radius-control);border-end-start-radius:var(--radius-control)}.connected-toggles>ui-toggle:last-child::part(control){border-start-end-radius:var(--radius-control);border-end-end-radius:var(--radius-control)}.connected-toggles[orientation="vertical"]>ui-toggle+ui-toggle{margin-inline-start:0;margin-block-start:calc(0px - var(--border-hairline))}.connected-toggles[orientation="vertical"]>ui-toggle:first-child::part(control){border-radius:var(--radius-control) var(--radius-control) 0 0}.connected-toggles[orientation="vertical"]>ui-toggle:last-child::part(control){border-radius:0 0 var(--radius-control) var(--radius-control)}</style><div class="mash-row mash-wrap"><ui-select id="connected-size" label="Group size" value="small"><ui-option value="xsmall">Extra small</ui-option><ui-option value="small">Small</ui-option><ui-option value="medium">Medium</ui-option><ui-option value="large">Large</ui-option></ui-select><ui-switch id="connected-disabled">Disable groups</ui-switch></div><div id="connected-context" data-mash-size="small" class="mash-row mash-wrap" style="align-items:flex-start"><ui-toggle-group id="connected-format" class="connected-toggles" mode="multiple" label="Text formatting"><ui-toggle value="bold" pressed>Bold</ui-toggle><ui-toggle value="italic">Italic</ui-toggle><ui-toggle value="underline" disabled>Underline</ui-toggle></ui-toggle-group><ui-toggle-group id="connected-alignment" class="connected-toggles" mode="single" value="left" orientation="vertical" label="Text alignment"><ui-toggle value="left">Left</ui-toggle><ui-toggle value="center">Center</ui-toggle><ui-toggle value="right">Right</ui-toggle></ui-toggle-group></div><p id="connected-preview" class="mash-panel">A concise preview of the selected formatting and alignment.</p><output id="connected-result" aria-live="polite"></output>`,
      `const formatting=document.querySelector("#connected-format"),alignment=document.querySelector("#connected-alignment"),preview=document.querySelector("#connected-preview");const render=()=>{const pressed=[...formatting.querySelectorAll("ui-toggle")].filter(toggle=>toggle.pressed).map(toggle=>toggle.value);const align=alignment.querySelector("ui-toggle[pressed]")?.value||"left";preview.style.fontWeight=pressed.includes("bold")?"700":"400";preview.style.fontStyle=pressed.includes("italic")?"italic":"normal";preview.style.textAlign=align;document.querySelector("#connected-result").textContent=(pressed.join(", ")||"Plain text")+" · "+align;};formatting.addEventListener("ui-toggle-group-change",()=>queueMicrotask(render));alignment.addEventListener("ui-toggle-group-change",()=>queueMicrotask(render));document.querySelector("#connected-size").addEventListener("ui-select-change",event=>{document.querySelector("#connected-context").dataset.mashSize=event.detail.value;});document.querySelector("#connected-disabled").addEventListener("ui-switch-change",event=>{formatting.disabled=alignment.disabled=event.detail.checked;});render();`,
    ),
  ],
  "ui-alert-dialog": [
    demo(
      "No-title confirmation",
      `<style>#untitled-confirmation::part(title){display:none}#untitled-confirmation::part(popup){inline-size:min(23rem,90vw)}</style><ui-alert-dialog id="untitled-confirmation" label="Remove the local draft"><ui-button slot="trigger" tone="critical">Remove local draft</ui-button><p>This removes the draft from this example. You can restore it immediately afterward.</p><ui-button slot="cancel" variant="ghost">Keep draft</ui-button><ui-button slot="confirm" tone="critical">Remove draft</ui-button></ui-alert-dialog><div class="mash-row"><span id="untitled-draft">Local draft · ready</span><ui-button id="restore-untitled-draft" size="small" variant="ghost" hidden>Restore draft</ui-button></div><output id="untitled-result" aria-live="polite">Draft retained</output>`,
      `const alert=document.querySelector("#untitled-confirmation"),draft=document.querySelector("#untitled-draft"),restore=document.querySelector("#restore-untitled-draft");alert.addEventListener("ui-alert-dialog-confirm",()=>{draft.hidden=true;restore.hidden=false;document.querySelector("#untitled-result").textContent="Local draft removed";});restore.addEventListener("click",()=>{draft.hidden=false;restore.hidden=true;document.querySelector("#untitled-result").textContent="Local draft restored";});`,
    ),
    demo(
      "Update choices and full-width actions",
      `<style>#update-notice::part(popup){inline-size:min(27rem,90vw)}#update-notice::part(actions){display:grid;grid-template-columns:1fr}#update-notice ui-button[slot="confirm"],#update-notice ui-button[slot="cancel"]{inline-size:100%}</style><ui-alert-dialog id="update-notice" label="A workspace update is ready"><ui-button slot="trigger">Review update</ui-button><strong slot="title">A workspace update is ready</strong><span slot="description">Choose when to apply the local example update.</span><ui-checkbox id="update-auto">Apply future updates automatically</ui-checkbox><p id="update-summary">Version 2 adds clearer navigation and improved keyboard access.</p><ui-button slot="confirm" variant="primary">Apply update now</ui-button><ui-button slot="cancel" variant="ghost">Remind me later</ui-button></ui-alert-dialog><output id="update-outcome" aria-live="polite">Version 1 · up to date with your current choice</output>`,
      `const alert=document.querySelector("#update-notice"),output=document.querySelector("#update-outcome");alert.addEventListener("ui-alert-dialog-confirm",()=>{output.textContent="Version 2 applied · automatic updates "+(document.querySelector("#update-auto").checked?"enabled":"disabled");document.querySelector("#update-summary").textContent="Version 2 is active in this example. Your update preference is retained.";});alert.addEventListener("ui-alert-dialog-cancel",()=>{output.textContent="Update deferred · current version retained";});`,
    ),
  ],
};
