import { html, type TemplateResult } from "lit";

/** Shared semantic edge for a recipe-defined directional overflow treatment. */
export function renderProgressiveOverflow(edge: "start" | "end", visible: boolean): TemplateResult {
  return html`
    <span part=${`overflow overflow-${edge}`} aria-hidden="true" ?hidden=${!visible}></span>
  `;
}
