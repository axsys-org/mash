import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const style = `<style>
.hover-scene { padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-container); }
.hover-items { display: grid; gap: 8px; }
.hover-items ui-button { display: block; min-width: 0; }
.hover-items ui-button::part(control) { width: 100%; justify-content: start; background: transparent; min-height: 40px; }
.hover-items ui-button::part(control):hover { background: transparent; }
.hover-items ui-button[data-hover-active]::part(control) { color: var(--color-text); }
.hover-items small { display: block; font-size: 12px; color: var(--color-text-muted); font-weight: 400; margin-top: 4px; }
.hover-horizontal { display: flex; flex-wrap: wrap; }
.hover-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
.hover-grid ui-button::part(control) { min-height: 80px; justify-content: center; }
</style>`;
const highlight = `<span slot="underlay" class="mash-hover-highlight" aria-hidden="true"></span>`;
const script = (axis: string, gap = 0) => `const scene = document.querySelector(".hover-scene");
scene.trackHover({ highlight: scene.querySelector("[slot=underlay]"), axis: "${axis}", gap: ${gap} });
scene.querySelectorAll("[data-hover-item]").forEach(button => button.addEventListener("click", () => {
  document.querySelector("output").textContent = button.textContent.trim() + " selected";
}));`;
export const hoverExamples: CatalogExample[] = [
  {
    ...sample(
      "Following highlight",
      `${style}<ui-motion class="mash-hover hover-scene" motion="none">${highlight}<div class="hover-items">${["Inbox", "Projects", "Documents", "Archive"].map((label, i) => `<ui-button data-hover-item variant="ghost" ${i === 3 ? "disabled" : ""}>${label}</ui-button>`).join("")}</div></ui-motion><output aria-live="polite">Move between rows or use Tab to focus.</output>`,
      "One underlay follows enabled rows, including the gaps. Focus gets the same treatment. In this list, clicks within 8px of a row select the highlighted action.",
    ),
    script: script("vertical", 8),
  },
  {
    ...sample(
      "Horizontal highlight",
      `${style}<ui-motion class="mash-hover hover-scene" motion="none">${highlight}<div class="hover-items hover-horizontal">${["Overview", "Activity", "Files", "Members"].map((label) => `<ui-button data-hover-item variant="ghost">${label}</ui-button>`).join("")}</div></ui-motion><output aria-live="polite">Choose a view.</output>`,
      "The same motion scene tracks a horizontal strip. Empty space stays inert; the buttons own activation.",
    ),
    script: script("horizontal"),
  },
  {
    ...sample(
      "Grid highlight",
      `${style}<ui-motion class="mash-hover hover-scene" motion="none">${highlight}<div class="hover-items hover-grid">${["Board", "List", "Calendar", "Timeline", "Gallery", "Canvas"].map((label) => `<ui-button data-hover-item variant="ghost">${label}</ui-button>`).join("")}</div></ui-motion><output aria-live="polite">Choose a layout.</output>`,
      "Two-dimensional targeting follows the closest card. Position uses shared spring tokens; reduced motion snaps directly to the target.",
    ),
    script: script("both"),
  },
];
