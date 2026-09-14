import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const palette = [
  ["Violet", "#7965E8"],
  ["Green", "#36A376"],
  ["Amber", "#E79A32"],
  ["Rose", "#CF6179"],
  ["Blue", "#4F8CC9"],
  ["Slate", "#677585"],
];
const swatches = (colors = palette) =>
  colors
    .map(
      ([label, value]) =>
        `<ui-color-swatch value="${value}" label="${label}">${label}</ui-color-swatch>`,
    )
    .join("");
const painted = `<div class="color-paint" aria-label="Selected color preview"><div data-paint></div></div>`;
const colorStyles = `<style>
.color-paint { border:1px solid var(--color-border); border-radius:var(--radius-container); overflow:hidden; background:repeating-conic-gradient(var(--color-surface) 0% 25%,var(--color-surface-hover) 0% 50%) 0 0 / 16px 16px; }
.color-paint [data-paint] { min-height:7rem; }
.color-numbers { display:grid; grid-template-columns:repeat(auto-fit,minmax(5rem,1fr)); gap:var(--space-control-gap); }
.color-layout { display:flex; flex-wrap:wrap; gap:var(--space-container-gap); align-items:start; }
.color-layout > ui-card { flex:1 1 15rem; min-width:0; }
.color-palettes { display:grid; grid-template-columns:repeat(auto-fit,minmax(7rem,1fr)); gap:var(--space-control-gap); }
#theme-preview::part(title) { color:inherit; }
</style>`;
const copyOwner = `async function copyValue(button, value) { try { await navigator.clipboard.writeText(value); button.textContent = "Copied"; } catch { button.textContent = "Select the value to copy"; } }`;
const singleOwner = `${copyOwner}
const picker = document.querySelector("#color");
const render = () => { document.querySelector("[data-paint]").style.background = picker.preview || picker.value || "transparent"; document.querySelector("#color-value").textContent = picker.value || "No color"; };
picker.addEventListener("ui-color-change", render); picker.addEventListener("ui-color-preview", render); render();
document.querySelector("#copy-color").addEventListener("click", event => copyValue(event.currentTarget, picker.value));`;

function colorExample(
  name: string,
  markup: string,
  description: string,
  script?: string,
): CatalogExample {
  return { ...sample(name, colorStyles + markup, description), ...(script ? { script } : {}) };
}

const channel = (name: string, max: number, value = 0, step = 1) =>
  `<ui-number-field data-channel="${name.toLowerCase()}" required label="${name}" min="0" max="${max}" step="${step}" value="${value}"></ui-number-field>`;
const colorMath = `const byte = number => Math.round(Math.min(255, Math.max(0, number))).toString(16).padStart(2, "0").toUpperCase();
const rgba = value => { const hex = value.replace("#", ""); return [0,2,4,6].map((offset, index) => index === 3 ? (hex.length === 8 ? parseInt(hex.slice(6,8),16) / 255 : 1) : parseInt(hex.slice(offset,offset+2),16)); };
const toHex = ([red, green, blue, alpha = 1]) => "#" + byte(red) + byte(green) + byte(blue) + (alpha < 1 ? byte(alpha * 255) : "");
function hslHex(hue, saturation, lightness, alpha) {
  const s = saturation / 100, l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + hue / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return toHex([255*f(0), 255*f(8), 255*f(4), alpha / 100]);
}`;

export const colorExamples: Record<string, CatalogExample[]> = {
  "ui-color-picker": [
    colorExample(
      "Color formats",
      `<div class="color-layout"><ui-color-picker id="format-picker" inline format="oklch" label="Accent color" value="oklch(67% 0.18 265)"></ui-color-picker><ui-card><strong slot="title">One color, four formats</strong>${painted}<div class="mash-stack" id="format-values" style="font-size:12px;overflow-wrap:anywhere"></div></ui-card></div>`,
      "Switch between HEX, RGB, HSL and OKLCH without changing the color. Alpha travels with every format; the editor maps colors into sRGB.",
      `const picker = document.querySelector("#format-picker");
function render() {
  const parsed = picker.parsedColor;
  if (!parsed) return;
  document.querySelector("[data-paint]").style.background = parsed.hex;
  const rows = ["hex","rgb","hsl","oklch"].map(format => {
    const row = document.createElement("code"); row.textContent = parsed[format]; return row;
  });
  document.querySelector("#format-values").replaceChildren(...rows);
}
picker.addEventListener("ui-color-change",render); picker.addEventListener("ui-color-preview",render); render();`,
    ),
    colorExample(
      "Fill control",
      `<div class="mash-row"><ui-color-picker id="fill" label="Fill color" value="#6B97FF" placement="bottom"><ui-button slot="trigger" variant="ghost"><span data-tile style="display:inline-block;width:20px;height:20px;border:1px solid var(--color-border);border-radius:4px;background:#6B97FF"></span><span>Fill</span><code data-value>#6B97FF</code></ui-button>${swatches()}<ui-button slot="close" size="small" variant="ghost">Done</ui-button></ui-color-picker><ui-button id="remove-fill" size="small" variant="ghost" aria-label="Remove fill"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button></div>${painted}<output id="fill-status" aria-live="polite">Fill applied</output>`,
      "The picker, trigger tile, value and remove action share one color. Removing fill leaves the trigger available to choose another.",
      `const picker = document.querySelector("#fill");
function render() {
  const value = picker.preview || picker.value;
  document.querySelector("[data-tile]").style.background = value || "transparent";
  document.querySelector("[data-value]").textContent = picker.value || "None";
  document.querySelector("[data-paint]").style.background = value || "transparent";
  document.querySelector("#remove-fill").disabled = !picker.value;
  document.querySelector("#fill-status").textContent = picker.value ? "Fill applied" : "No fill";
}
picker.addEventListener("ui-color-change",render); picker.addEventListener("ui-color-preview",render);
document.querySelector("#remove-fill").addEventListener("click",() => picker.clearColor()); render();`,
    ),
    colorExample(
      "Compact palette",
      `<style>.compact-colors::part(palette){display:flex;flex-wrap:wrap;gap:8px}.compact-colors ui-color-swatch::part(label){display:none}.compact-colors ui-color-swatch::part(control){padding:4px}.compact-colors ui-color-swatch::part(swatch){width:24px;height:24px;border-radius:50%}</style><ui-color-picker class="compact-colors" inline hide-eyedropper label="Project palette" value="#7965E8">${swatches()}</ui-color-picker>`,
      "Preset swatches stay optional. This compact panel hides the screen picker and styles the existing swatch parts.",
    ),

    colorExample(
      "Color selector",
      `<div class="color-layout"><ui-color-picker id="color" inline label="Accent" value="#7965E8"><ui-button slot="clear" size="small" variant="ghost">Clear</ui-button></ui-color-picker><ui-card><strong slot="title">Your color</strong>${painted}<code id="color-value">#7965E8</code><ui-button id="copy-color" slot="footer" size="small">Copy hex</ui-button></ui-card></div>`,
      "Drag the plane, edit channels or enter hex. The large preview shows opacity; clear and copy use the committed value.",
      singleOwner,
    ),
    colorExample(
      "Popover and palette",
      `<ui-color-picker label="Label color" value="#7965E8"><ui-button slot="trigger" outline>Choose label color</ui-button>${swatches()}<ui-button slot="close" size="small">Done</ui-button></ui-color-picker><output id="palette-result" aria-live="polite">#7965E8</output>`,
      "Hover a swatch to preview it; choose one to commit. The palette and channel controls share a value.",
      `document.querySelector("ui-color-picker").addEventListener("ui-color-change", event => document.querySelector("#palette-result").textContent = event.detail.value);`,
    ),
    colorExample(
      "Sizes",
      `<div class="color-layout">${["small", "medium", "large"].map((size) => `<div class="mash-stack"><strong>${size}</strong><ui-color-picker data-mash-size="${size}" inline label="${size} color selector" value="#7965E8"></ui-color-picker></div>`).join("")}</div>`,
      "Each size changes the working color plane and control geometry through the shared catalogue size context.",
    ),
    colorExample(
      "Formats",
      `<div class="color-layout"><ui-color-picker id="color" inline label="Color formats" value="#7965E880"></ui-color-picker><ui-card><strong slot="title">One color, three formats</strong>${painted}<div class="mash-stack"><ui-input id="format-hex" label="HEX" value="#7965E880"></ui-input><strong>RGB</strong><div class="color-numbers">${channel("Red", 255)}${channel("Green", 255)}${channel("Blue", 255)}${channel("Opacity", 100, 50)}</div><strong>HSL</strong><div class="color-numbers">${channel("Hue", 359)}${channel("Saturation", 100)}${channel("Lightness", 100)}</div><code id="color-value"></code></div><ui-button id="copy-color" slot="footer" size="small">Copy hex</ui-button></ui-card></div>`,
      "Edit HEX, RGB or HSL values directly. Every representation stays synchronized and preserves opacity.",
      `${singleOwner}
${colorMath}
const inputs = Object.fromEntries([...document.querySelectorAll("[data-channel]")].map(input => [input.dataset.channel, input]));
async function syncFormats() {
  await picker.updateComplete;
  const [red, green, blue, alpha] = rgba(picker.value);
  for (const [name, value] of Object.entries({red, green, blue, opacity: Math.round(alpha * 100), hue: Math.round(picker.hue), saturation: Math.round(picker.saturation), lightness: Math.round(picker.lightness)})) inputs[name].value = value;
  document.querySelector("#format-hex").value = picker.value;
}
picker.addEventListener("ui-color-change", syncFormats); syncFormats();
const feedback = document.createElement("output"); feedback.setAttribute("aria-live", "polite"); document.querySelector("#format-hex").after(feedback);
document.querySelector("#format-hex").addEventListener("change", event => {
  if (!picker.commitColor(event.target.value, false)) { event.target.value = picker.value; feedback.textContent = "Enter 3, 4, 6 or 8 hexadecimal digits. Previous color restored."; }
  else feedback.textContent = "Color updated";
});
function invalidChannel() { return Object.values(inputs).find(input => !Number.isFinite(input.value)); }
Object.entries(inputs).forEach(([name, input]) => {
  input.addEventListener("ui-number-field-input", () => {
    const invalid = invalidChannel();
    if (invalid) { feedback.textContent = invalid.label + ": enter a number from " + invalid.min + " to " + invalid.max + ". Color unchanged."; return; }
    let value;
    if (["hue", "saturation", "lightness"].includes(name)) value = hslHex(inputs.hue.value, inputs.saturation.value, inputs.lightness.value, inputs.opacity.value);
    else { const current = rgba(picker.value); const index = ["red", "green", "blue", "opacity"].indexOf(name); current[index] = name === "opacity" ? input.value / 100 : input.value; value = toHex(current); }
    if (picker.commitColor(value, false)) feedback.textContent = "Color updated";
  });
  input.addEventListener("ui-number-field-change", () => {
    if (!invalidChannel()) return;
    syncFormats(); feedback.textContent = "Enter a valid channel value. Previous color restored.";
  });
});`,
    ),
    colorExample(
      "Theme colors",
      `<div class="color-layout"><div class="mash-stack">${[
        ["surface", "Surface", "#FFFFFF"],
        ["text", "Text", "#26303C"],
        ["accent", "Accent", "#7965E8"],
      ]
        .map(
          ([name, label, value]) =>
            `<ui-color-picker data-theme-color="${name}" label="${label}" value="${value}"><ui-button slot="trigger" outline>${label}</ui-button>${swatches()}</ui-color-picker>`,
        )
        .join(
          "",
        )}</div><ui-card id="theme-preview"><strong slot="title">Release notes</strong><p>Keep color roles distinct and check the text against its surface.</p><p><strong id="accent-preview">Ready for review</strong></p><output id="contrast-result" aria-live="polite"></output><code id="theme-values"></code></ui-card></div>`,
      "Each role retains its own color. The preview reports actual text/surface contrast, including alpha compositing.",
      `${colorMath}
const pickers = [...document.querySelectorAll("[data-theme-color]")];
const composite = (front, back) => front.slice(0,3).map((value,i) => value * front[3] + back[i] * (1-front[3]));
const luminance = rgb => rgb.map(value => { const c=value/255; return c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)**2.4; }).reduce((sum,c,i) => sum+c*[0.2126,0.7152,0.0722][i],0);
function renderTheme() {
  const values = Object.fromEntries(pickers.map(picker => [picker.dataset.themeColor, picker.value]));
  const surface = composite(rgba(values.surface), [255,255,255]);
  const text = composite(rgba(values.text), surface);
  const [low,high] = [luminance(surface),luminance(text)].sort((a,b)=>a-b);
  const ratio = (high+0.05)/(low+0.05);
  const preview = document.querySelector("#theme-preview");
  preview.style.background = toHex(surface); preview.style.color = values.text;
  document.querySelector("#accent-preview").style.color = values.accent;
  document.querySelector("#contrast-result").textContent = ratio.toFixed(2) + ":1 text contrast · " + (ratio >= 4.5 ? "Meets 4.5:1" : "Below 4.5:1");
  document.querySelector("#theme-values").textContent = Object.entries(values).map(([name,value])=>name+": "+value).join(" · ");
}
pickers.forEach(picker => picker.addEventListener("ui-color-change", renderTheme)); renderTheme();`,
    ),
    colorExample(
      "Palette builder",
      `<div class="color-layout"><ui-color-picker id="palette-editor" inline label="Edit palette color" value="#7965E8"></ui-color-picker><ui-card><strong slot="title">Project palette</strong><div id="saved-colors" class="color-palettes"></div><div class="mash-row mash-wrap"><ui-button id="add-color" size="small" outline>Add color</ui-button><ui-button id="remove-color" size="small" variant="ghost">Remove selected</ui-button></div><code id="palette-code"></code><ui-button id="copy-palette" slot="footer" size="small">Copy palette</ui-button></ui-card></div>`,
      "Choose a saved color to edit it. Add and remove entries, then copy the palette as custom properties.",
      `${copyOwner}
const picker = document.querySelector("#palette-editor");
const colors = ["#7965E8", "#36A376", "#E79A32"];
let selected = 0;
const exportPalette = () => colors.map((color,index) => "--palette-" + (index+1) + ": " + color + ";").join("\\n");
function renderPalette() {
  const nodes = colors.map((color,index) => {
    const swatch = document.createElement("ui-color-swatch"); Object.assign(swatch,{value:color,label:"Color " + (index+1),selected:index===selected}); swatch.textContent="Color " + (index+1);
    swatch.addEventListener("ui-color-select", () => { selected=index; picker.value=colors[index]; renderPalette(); }); return swatch;
  });
  document.querySelector("#saved-colors").replaceChildren(...nodes);
  document.querySelector("#remove-color").disabled = colors.length === 1;
  document.querySelector("#palette-code").textContent = exportPalette();
}
picker.addEventListener("ui-color-change", () => { colors[selected]=picker.value; renderPalette(); });
document.querySelector("#add-color").addEventListener("click", () => { colors.push(picker.value); selected=colors.length-1; renderPalette(); });
document.querySelector("#remove-color").addEventListener("click", () => { if (colors.length===1) return; colors.splice(selected,1); selected=Math.min(selected,colors.length-1); picker.value=colors[selected]; renderPalette(); });
document.querySelector("#copy-palette").addEventListener("click", event => copyValue(event.currentTarget,exportPalette())); renderPalette();`,
    ),
    colorExample(
      "Toolbar and placement",
      `<ui-toolbar label="Drawing colors"><ui-color-picker label="Stroke color" value="#7965E8" placement="bottom"><ui-button slot="trigger" variant="ghost" aria-label="Stroke color"><ui-icon name="object.document" label=""></ui-icon></ui-button>${swatches()}</ui-color-picker><ui-color-picker label="Fill color" value="#36A37680" placement="top"><ui-button slot="trigger" variant="ghost">Fill</ui-button>${swatches()}</ui-color-picker></ui-toolbar><div class="color-paint"><div id="drawing-preview" data-paint style="border:8px solid #7965E8;background:#36A37680"></div></div>`,
      "Icon and text triggers can share a toolbar. The popup respects its preferred placement while keeping the color controls reachable.",
      `const pickers=[...document.querySelectorAll("ui-color-picker")]; pickers[0].addEventListener("ui-color-change", event => document.querySelector("#drawing-preview").style.borderColor=event.detail.value); pickers[1].addEventListener("ui-color-change", event => document.querySelector("#drawing-preview").style.background=event.detail.value);`,
    ),
    colorExample(
      "Disabled",
      `<div class="color-layout"><ui-color-picker inline disabled label="Managed accent" value="#7965E8">${swatches()}<ui-button slot="clear" disabled size="small">Managed by workspace</ui-button></ui-color-picker><ui-color-picker disabled label="Unavailable color" value="#7965E8"><ui-button slot="trigger" disabled>Unavailable color</ui-button></ui-color-picker></div>`,
      "Disabled channels, palette choices and triggers cannot alter the managed value.",
    ),
  ],
};
