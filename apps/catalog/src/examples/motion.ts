import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";
import { hoverExamples } from "./hover.js";

const demo = (name: string, code: string, script: string, description: string): CatalogExample => ({
  ...sample(name, code, description),
  script,
});
const options = (values: string[]) =>
  values.map((value) => `<ui-option value="${value}">${value}</ui-option>`).join("");
const scene = `<ui-card><strong slot="title">Release notes</strong><p>Small improvements, ready to share.</p><ui-badge>Draft</ui-badge></ui-card>`;
const recipes = [
  "fade",
  "scale",
  "slide-inline",
  "slide-block",
  "rotate",
  "spin",
  "pulse",
  "shake",
  "blur",
  "none",
];
const galleryStyle = `<style>.motion-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:1rem;inline-size:100%}.motion-tile{display:grid;gap:1rem;padding:1rem;border:1px solid var(--color-border);border-radius:var(--radius-container);text-align:center}.motion-sample{display:grid;place-items:center;min-block-size:5rem}.motion-glyph{display:grid;place-items:center;inline-size:3rem;block-size:3rem;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:var(--radius-control);font-size:1.5rem}.motion-muted{color:var(--color-text-muted);font-size:var(--type-label-small-font-size)}</style>`;

export const motionExamples: CatalogExample[] = [
  demo(
    "Recipe gallery",
    `${galleryStyle}<div class="motion-gallery">${recipes.map((recipe) => `<section class="motion-tile" data-recipe="${recipe}"><strong>${recipe}</strong><div class="motion-sample"><ui-motion motion="${recipe}"><span class="motion-glyph"><ui-icon name="action.refresh"></ui-icon></span></ui-motion></div><ui-button size="small" variant="ghost" aria-label="Play ${recipe}">Play</ui-button></section>`).join("")}</div>`,
    `document.querySelectorAll("[data-recipe]").forEach(tile => {
  const motion = tile.querySelector("ui-motion");
  const button = tile.querySelector("ui-button");
  const looping = ["spin", "pulse"].includes(motion.motion);
  button.addEventListener("click", () => {
    if (looping && motion.state === "loading") { motion.state = "idle"; button.textContent = "Play"; return; }
    motion.play(looping ? "loading" : ["rotate", "shake"].includes(motion.motion) ? "active" : "entering");
    if (looping) button.textContent = "Stop";
  });
});`,
    "Play each built-in recipe. Spin and pulse loop until stopped; none preserves the lifecycle without a visual effect. Motion respects your system’s reduced-motion preference.",
  ),
  demo(
    "States and lifecycle",
    `<div class="mash-row mash-wrap"><ui-select id="motion-recipe" label="Motion recipe" value="slide-block">${options(recipes)}</ui-select>${["entering", "active", "loading", "exiting"].map((state) => `<ui-button size="small" data-state="${state}">${state}</ui-button>`).join("")}<ui-button id="motion-reset" size="small" variant="ghost">Reset</ui-button></div><ui-motion id="lifecycle-motion" motion="slide-block">${scene}</ui-motion><output id="motion-events" aria-live="polite">Idle · choose a state to play.</output>`,
    `const motion = document.querySelector("#lifecycle-motion");
const output = document.querySelector("#motion-events");
document.querySelector("#motion-recipe").addEventListener("ui-select-change", event => { motion.state = "idle"; motion.motion = event.currentTarget.value; output.textContent = "Idle · " + motion.motion; });
document.querySelectorAll("[data-state]").forEach(button => button.addEventListener("click", () => motion.play(button.dataset.state)));
document.querySelector("#motion-reset").addEventListener("click", () => { motion.state = "idle"; output.textContent = "Idle · reset"; });
for (const type of ["mash-motion-start", "mash-motion-end"]) motion.addEventListener(type, event => {
  if (motion.state === "idle") return;
  const { state, interrupted, reducedMotion } = event.detail;
  output.textContent = (type.endsWith("start") ? "Started" : interrupted ? "Interrupted" : "Finished") + " · " + state + (reducedMotion ? " · reduced motion" : "");
});`,
    "Replay the same state with play(). Exiting retains the content; Reset restores it. Try interrupting an entrance with an exit, or spin with loading. Start and end events report completion, interruption, and reduced motion.",
  ),
  demo(
    "Scene layers",
    `<style>#layer-scene::part(root){inline-size:18rem;min-block-size:11rem}#layer-scene::part(underlay){border-radius:var(--radius-container);overflow:hidden}#layer-scene::part(content){padding:1.5rem}#layer-scene::part(indicator){place-self:start end;padding:.75rem}#layer-scene::part(overlay){place-self:end stretch;padding:.75rem}#layer-scene [slot="underlay"]{display:block;inline-size:100%;block-size:100%;background:linear-gradient(135deg,var(--color-surface-raised),var(--color-selection))}#layer-scene [slot="overlay"]{display:block;border-top:1px solid var(--color-border);padding-block-start:.5rem;color:var(--color-text-muted)}</style><div class="mash-row"><ui-select id="motion-lane" label="Animate layer" value="content">${options(["root", "underlay", "content", "overlay", "indicator"])}</ui-select><ui-button id="play-layer" size="small">Replay layer</ui-button></div><ui-motion id="layer-scene" motion="slide-block" target="content"><span slot="underlay"></span><div class="mash-stack"><strong>Shared workspace</strong><span>Content stays independent of its layers.</span></div><span slot="overlay">Last edited just now</span><ui-badge slot="indicator">Live</ui-badge></ui-motion>`,
    `const motion = document.querySelector("#layer-scene");
document.querySelector("#motion-lane").addEventListener("ui-select-change", event => { motion.state = "idle"; motion.target = event.currentTarget.value; });
document.querySelector("#play-layer").addEventListener("click", () => motion.play("entering"));`,
    "Target the whole scene or one named layer. Underlay, content, overlay, and indicator share a grid cell; CSS parts control their placement.",
  ),
  demo(
    "Nested motion and reveal",
    `<div class="mash-row"><ui-button id="details-toggle" size="small" aria-expanded="false"><ui-motion id="details-chevron" motion="rotate"><span aria-hidden="true">›</span></ui-motion> Details</ui-button><ui-button id="details-replay" size="small" variant="ghost">Replay content</ui-button></div><ui-reveal id="motion-details"><ui-motion id="details-content" motion="slide-block">${scene}</ui-motion></ui-reveal><output id="details-status" aria-live="polite">Details collapsed</output>`,
    `const reveal = document.querySelector("#motion-details");
const toggle = document.querySelector("#details-toggle");
const content = document.querySelector("#details-content");
function setOpen(open) {
  reveal.open = open;
  toggle.setAttribute("aria-expanded", String(open));
  document.querySelector("#details-chevron").state = open ? "active" : "idle";
  document.querySelector("#details-status").textContent = open ? "Details expanded" : "Details collapsed";
  if (open) content.play("entering");
}
toggle.addEventListener("click", () => setOpen(!reveal.open));
document.querySelector("#details-replay").addEventListener("click", () => setOpen(true));`,
    "Reveal owns measured height and hidden-content accessibility. Independent motion elements rotate the disclosure icon and animate the entering content.",
  ),
  demo(
    "Stagger origins",
    `${galleryStyle}<div class="mash-row mash-wrap"><ui-select id="stagger-origin" label="Stagger origin" value="first">${options(["first", "last", "center", "index"])}</ui-select><ui-button id="stagger-play" size="small">Replay sequence</ui-button></div><div class="mash-row mash-wrap"><ui-stagger id="motion-sequence" step="70" origin-index="1">${["Plan", "Design", "Build", "Review", "Ship"].map((label, index) => `<ui-motion motion="slide-block"><div class="motion-tile"><span class="motion-muted">0${index + 1}</span><strong>${label}</strong></div></ui-motion>`).join("")}</ui-stagger></div><output id="stagger-status" aria-live="polite">70 ms between items · first origin</output>`,
    `const sequence = document.querySelector("#motion-sequence");
const replay = () => sequence.querySelectorAll("ui-motion").forEach(motion => motion.play("entering"));
document.querySelector("#stagger-origin").addEventListener("ui-select-change", event => {
  sequence.origin = event.currentTarget.value;
  document.querySelector("#stagger-status").textContent = "70 ms between items · " + sequence.origin + (sequence.origin === "index" ? " 1 (Design)" : "") + " origin";
});
document.querySelector("#stagger-play").addEventListener("click", replay);`,
    "Stagger supplies CSS delays to direct children. First, last, center, or an explicit index changes the sequence without per-item timers.",
  ),
  demo(
    "Custom SVG motion",
    `<style>#draw-check::part(content){transition:clip-path var(--duration-surface) var(--easing-surface);clip-path:inset(0 100% 0 0)}#draw-check[state="active"]::part(content){clip-path:inset(0)}@media(prefers-reduced-motion:reduce){#draw-check::part(content){clip-path:inset(0);transition:none}}</style><div class="mash-row"><ui-motion id="draw-check" motion="custom"><svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Saved"><circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" opacity=".15" stroke-width="2"/><path d="m18 33 9 9 19-21" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></ui-motion><div class="mash-stack"><strong>Changes saved</strong><ui-button id="draw-replay" size="small" variant="ghost">Replay checkmark</ui-button></div></div><output id="draw-status" aria-live="polite">Custom recipe · CSS parts own the visual effect.</output>`,
    `const motion = document.querySelector("#draw-check");
document.querySelector("#draw-replay").addEventListener("click", () => motion.play("active"));
motion.addEventListener("mash-motion-end", event => { document.querySelector("#draw-status").textContent = event.detail.interrupted ? "Interrupted" : "Checkmark complete"; });`,
    "Custom leaves the visual effect to your CSS. This SVG uses a clipped content part, semantic timing tokens, and an explicit reduced-motion fallback; the same lifecycle events still fire.",
  ),
  demo(
    "Gesture feedback",
    `<ui-motion id="feedback-motion" motion="shake"><ui-alert tone="warning"><strong slot="title">Review before publishing</strong>Two checks need your attention.</ui-alert></ui-motion><div class="mash-row"><ui-button id="review-action" size="small">Check again</ui-button><ui-gesture-binding for="review-action" gesture="key" command="motion.review" shortcut="Primary+Enter" prevent-default="always"></ui-gesture-binding><ui-kbd shortcut="Primary+Enter"></ui-kbd></div><output id="review-status" aria-live="polite">Focus Check again to use the shortcut.</output>`,
    `const motion = document.querySelector("#feedback-motion");
const button = document.querySelector("#review-action");
let attempts = 0;
function review() { motion.play("active"); document.querySelector("#review-status").textContent = "Review " + ++attempts + " · two checks still need attention."; }
button.addEventListener("click", review);
button.addEventListener("mash-command", event => { if (event.detail.phase === "ended") review(); });`,
    "Compose an alert, a gesture binding, and one short shake. The message carries the meaning even when animation is reduced or cannot be seen.",
  ),
  demo(
    "Timing tiers",
    `<style>.tier-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem;width:100%}.tier-cell{display:grid;gap:1rem}.tier-stage{display:grid;place-items:center;min-height:8rem;border:1px solid var(--color-border);border-radius:var(--radius-container)}.tier-stage ui-motion::part(root){width:100%}</style><div class="tier-grid">${[
      ["fast", "80 / 60 ms"],
      ["moderate", "160 / 120 ms"],
      ["slow", "240 / 160 ms"],
    ]
      .map(
        ([tier, time]) =>
          `<section class="tier-cell"><strong>${tier}</strong><small>${time} · enter / exit</small><div class="tier-stage"><ui-motion id="tier-${tier}" pace="${tier}" motion="scale"><ui-card><strong slot="title">Ready to share</strong>One scene, shared timing.</ui-card></ui-motion></div><div class="mash-row"><ui-button data-tier="${tier}" data-state="entering" size="small">Enter</ui-button><ui-button data-tier="${tier}" data-state="exiting" size="small">Exit</ui-button></div></section>`,
      )
      .join(
        "",
      )}</div><output id="tier-result" aria-live="polite">Choose a tier to compare entry and exit.</output>`,
    `document.querySelectorAll("[data-tier]").forEach(button => button.addEventListener("click", () => { const motion = document.querySelector("#tier-" + button.dataset.tier); motion.hidden = false; motion.play(button.dataset.state); })); document.querySelectorAll(".tier-stage ui-motion").forEach(motion => motion.addEventListener("mash-motion-end", event => { if (event.detail.interrupted) return; if (event.detail.state === "exiting") motion.hidden = true; document.querySelector("#tier-result").textContent = motion.pace + " · " + (event.detail.state === "exiting" ? "dismissed" : "settled") + (event.detail.reducedMotion ? " · reduced motion" : ""); }));`,
    "Fast is for small feedback; moderate lands precisely; slow gives larger surfaces a restrained spring. Exits are shorter and settle without overshoot. The existing lifecycle owns completion and interruption.",
  ),
  demo(
    "Weight without layout shift",
    `<ui-toolbar label="Document actions"><ui-button id="weight-action" variant="ghost"><span class="mash-weight" data-text="Review document"><span>Review document</span></span></ui-button><ui-separator orientation="vertical"></ui-separator><ui-button size="small">Publish</ui-button></ui-toolbar><ui-switch id="weight-setting"><span class="mash-weight" data-text="Keep available offline"><span>Keep available offline</span></span></ui-switch><output id="weight-result" aria-live="polite">Hover or focus Review document; toggle the setting.</output>`,
    `document.querySelector("#weight-action").addEventListener("click", () => { document.querySelector("#weight-result").textContent = "Document ready for review"; });`,
    "The label reserves its emphasized width. Its variable font weight can change while the adjacent action stays in place. Keep data-text synchronized with the visible label.",
  ),
  ...hoverExamples,
];
