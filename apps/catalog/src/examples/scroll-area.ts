import type { CatalogExample } from "../examples.js";
import { sample } from "./shared.js";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const tasks = [
  "Refine the navigation",
  "Review keyboard shortcuts",
  "Polish empty states",
  "Prepare release notes",
  "Check focus boundaries",
  "Share the preview",
  "Review touch targets",
  "Tune transitions",
  "Update component usage",
  "Ship the details",
];
const list = `<div style="padding: 8px 20px">${tasks.map((task, i) => `<div style="display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--color-border)"><span style="font-variant-numeric: tabular-nums; color: var(--color-text-muted)">${String(i + 1).padStart(2, "0")}</span><span style="flex: 1">${task}</span><ui-badge tone="neutral" size="small">${i < 3 ? "Ready" : "Planned"}</ui-badge></div>`).join("")}</div>`;
const rail = `<div style="display: flex; gap: 8px; width: max-content; padding: 16px 12px 24px">${months.map((month, i) => `<div data-scroll-id="month-${i}" style="display: grid; align-content: space-between; flex: 0 0 128px; height: 100px; padding: 14px; border: 1px solid var(--color-border); border-radius: var(--radius-control); background: var(--color-surface); scroll-snap-align: start"><span style="font-size: 12px; color: var(--color-text-muted)">${String(i + 1).padStart(2, "0")}</span><strong>${month}</strong></div>`).join("")}</div>`;
const boundary = `border: 1px solid var(--color-border); border-radius: var(--radius-control); overflow: hidden`;

export const scrollAreaExamples: CatalogExample[] = [
  sample(
    "Quiet vertical",
    `<ui-scroll-area class="mash-scroll-quiet mash-scroll-fade" orientation="vertical" mode="always" label="Release checklist" style="height: 280px; ${boundary}">${list}</ui-scroll-area>`,
    "A persistent, narrow thumb widens on hover. Drag it, scroll normally, or focus the scrollbar and use arrows, Page Up / Down, Home and End. Touch keeps native scrolling.",
  ),
  {
    ...sample(
      "Horizontal months",
      `<div class="mash-row" style="justify-content: space-between"><strong>2026</strong><div class="mash-row"><ui-button id="previous-months" size="small" variant="ghost">Previous</ui-button><ui-button id="next-months" size="small" variant="ghost">Next</ui-button></div></div><ui-scroll-area id="months" class="mash-scroll-quiet mash-scroll-fade" orientation="horizontal" mode="always" label="Months of the year" style="${boundary}">${rail}</ui-scroll-area>`,
      "The fade follows the overflow edges; the scrollbar stays outside the mask. Buttons use the same native viewport and respect reduced motion.",
    ),
    script: `const area = document.querySelector("#months");
const move = (direction) => {
  const viewport = area.viewportElement;
  area.scrollViewportTo({ left: viewport.scrollLeft + direction * viewport.clientWidth * 0.8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
};
document.querySelector("#previous-months").addEventListener("click", () => move(-1));
document.querySelector("#next-months").addEventListener("click", () => move(1));`,
  },
  sample(
    "Both axes",
    `<ui-scroll-area class="mash-scroll-quiet mash-scroll-fade" orientation="both" mode="always" gutter="stable" label="Release schedule" style="height: 280px; ${boundary}"><ui-table label="Release schedule" style="width: 1100px; max-inline-size: none"><ui-table-header><ui-table-row>${["Workstream", ...months.slice(0, 6)].map((label) => `<ui-table-head>${label}</ui-table-head>`).join("")}</ui-table-row></ui-table-header><ui-table-body>${tasks
      .map(
        (task, i) =>
          `<ui-table-row><ui-table-head scope="row">${task}</ui-table-head>${months
            .slice(0, 6)
            .map(
              (_, j) =>
                `<ui-table-cell>${(i + j) % 3 === 0 ? "Review" : (i + j) % 3 === 1 ? "Design" : "—"}</ui-table-cell>`,
            )
            .join("")}</ui-table-row>`,
      )
      .join("")}</ui-table-body></ui-table></ui-scroll-area>`,
    "A stable gutter reserves room for each axis. The two edge masks intersect without fading the thumbs.",
  ),
  sample(
    "Visibility modes",
    `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px">${["always", "hover", "scrolling"].map((mode) => `<div class="mash-stack"><strong>${mode === "always" ? "Always visible" : mode === "hover" ? "On hover or focus" : "While scrolling"}</strong><ui-scroll-area class="mash-scroll-quiet" orientation="vertical" mode="${mode}" idle-delay="800" label="${mode} visibility" style="height: 220px; ${boundary}">${list}</ui-scroll-area></div>`).join("")}</div>`,
    "Choose the visibility policy on the component. The quiet recipe changes only the presentation; keyboard focus always exposes the control.",
  ),
  sample(
    "CSS parts and shapes",
    `<style>
.square-scroll::part(block-scrollbar) { border-radius: 0; }
.square-scroll::part(block-thumb) { background: var(--color-action); }
.inset-scroll::part(block-scrollbar) { inset-inline-end: 8px; inset-block: 12px; }
.inset-scroll::part(block-track) { background: var(--color-fill-tertiary-opaque); }
</style><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px"><div class="mash-stack"><strong>Square · accent</strong><ui-scroll-area class="mash-scroll-quiet square-scroll" orientation="vertical" mode="always" label="Square scrollbar" style="height: 240px; ${boundary}">${list}</ui-scroll-area></div><div class="mash-stack"><strong>Rounded · inset track</strong><ui-scroll-area class="inset-scroll" orientation="vertical" mode="always" size="large" label="Inset scrollbar" style="height: 240px; ${boundary}">${list}</ui-scroll-area></div></div>`,
    "Style viewport, block-track, block-thumb and their inline counterparts through ::part(). Shape and material belong in CSS; scroll behavior stays shared.",
  ),
  {
    ...sample(
      "Scroll to a section",
      `<div class="mash-row mash-wrap"><ui-button size="small" data-section="overview">Overview</ui-button><ui-button size="small" data-section="interaction">Interaction</ui-button><ui-button size="small" data-section="styling">Styling</ui-button></div><ui-scroll-area id="guide" class="mash-scroll-quiet mash-scroll-fade" orientation="vertical" mode="always" label="Scroll area guide" style="height: 250px; ${boundary}"><div style="padding: 20px 28px">${[
        [
          "overview",
          "Constrain the container",
          "Set a height for vertical scrolling or a width for horizontal scrolling. Content keeps its natural size inside the viewport. Short content needs no scrollbar or fade.",
        ],
        [
          "interaction",
          "Keep native input",
          "Wheel, trackpad, touch and keyboard all move the native viewport. Use scrollToTarget for navigation to existing content, with reduced motion handled by the component.",
        ],
        [
          "styling",
          "Compose through parts",
          "Apply mash-scroll-quiet for the narrow thumb and mash-scroll-fade for overflow cues. Use ::part(viewport) for inner layout and the track and thumb parts for materials and shape.",
        ],
      ]
        .map(
          ([id, title, text]) =>
            `<section data-scroll-id="${id}" style="min-height: 200px; padding-block: 16px"><h3 style="margin: 0 0 12px">${title}</h3><p style="max-width: 52ch; margin: 0; line-height: 1.7; color: var(--color-text-muted)">${text}</p></section>`,
        )
        .join("")}</div></ui-scroll-area>`,
      "Navigation composes the public scrollToTarget API. No separate scroll animator or document-level listeners.",
    ),
    script: `const guide = document.querySelector("#guide");
document.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => {
  guide.scrollToTarget(button.dataset.section, { behavior: "smooth" });
}));`,
  },
];
