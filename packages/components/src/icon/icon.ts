import { LitElement, html, nothing, type TemplateResult } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

import { baseStyles } from "../internal/base-styles.js";
import {
  hasIcon,
  iconNames,
  iconSource,
  registerIcon,
  unregisterIcon,
  type IconSize,
  type IconSource,
} from "./icon-registry.js";

export type IconName = string;
export { hasIcon, iconNames, registerIcon, unregisterIcon };
export type { IconSize, IconSource };

/**
 * Realizes a semantic icon name through Mash's current glyph source.
 *
 * Carbon is the bundled source today, but authored layers and the registration
 * API keep that choice outside the public component contract.
 *
 * @tag ui-icon
 * @summary Displays a semantic glyph with replaceable layered anatomy.
 *
 * @example Carbon semantics and authored anatomy
 * <div class="demo button-showcase-row">
 *   <ui-icon name="action.search" label="Search"></ui-icon>
 *   <ui-icon name="object.folder" label="Folder"></ui-icon>
 *   <ui-icon name="status.warning" label="Warning"></ui-icon>
 * </div>
 *
 * @slot primary - Replaces the generated source glyph.
 * @slot secondary - Optional second glyph layer.
 * @slot badge - Optional overlay layer; slotted content owns any status or count semantics.
 * @slot fallback - Authored fallback when `name` is unavailable.
 *
 * @csspart root - The accessible icon boundary.
 * @csspart glyph - The layered glyph stack.
 * @csspart primary - The generated or authored primary glyph.
 * @csspart secondary - The optional secondary glyph layer.
 * @csspart badge - The optional overlay layer.
 * @csspart fallback - The unavailable-glyph fallback.
 * @csspart source - The generated Carbon SVG source.
 *
 * @mashnode root icon
 * @mashnode glyph glyph root
 * @mashnode primary primary glyph
 * @mashnode secondary secondary glyph
 * @mashnode badge badge glyph
 * @mashnode name name root
 * @mashnode size size root
 * @mashaxis size glyph-size
 * @mashnode label label root
 * @mashrole slot primary primary primary
 * @mashrole slot secondary secondary secondary
 * @mashrole slot badge badge badge
 * @mashrole slot fallback fallback fallback
 */
export class UIIcon extends LitElement {
  static override properties = {
    name: { type: String, reflect: true },
    size: { type: String, reflect: true },
    label: { type: String, reflect: true },
  };

  /** Semantic glyph identity. */
  declare name: IconName | string;
  /** Semantic physical scale. */
  declare size: IconSize;
  /** Accessible name. Omit for a decorative icon hidden from assistive technology. */
  declare label: string;

  constructor() {
    super();
    this.name = "";
    this.size = "medium";
    this.label = "";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    const source = iconSource(this.name, this.size);
    const labelled = this.label.trim().length > 0;

    return html`
      <span
        part="root"
        role=${labelled ? "img" : nothing}
        aria-label=${labelled ? this.label : nothing}
        aria-hidden=${labelled ? nothing : "true"}
      >
        <span part="glyph">
          <span part="primary">
            <slot name="primary">
              ${
                source
                  ? unsafeSVG(source)
                  : html`<span part="fallback"><slot name="fallback">□</slot></span>`
              }
            </slot>
          </span>
          <span part="secondary"><slot name="secondary"></slot></span>
          <span part="badge"><slot name="badge"></slot></span>
        </span>
      </span>
    `;
  }
}
