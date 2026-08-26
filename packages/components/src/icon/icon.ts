import { LitElement, html, nothing, type TemplateResult } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

import { baseStyles } from "../internal/base-styles.js";
import { carbonIcons } from "./carbon-icons.generated.js";

export type IconName = keyof typeof carbonIcons;
export type IconSize = "small" | "medium" | "large";
export type IconSource = string | Readonly<Partial<Record<16 | 20 | 24, string>>>;

const customIcons = new Map<string, IconSource>();
const sizeInPixels: Record<IconSize, 16 | 20 | 24> = { small: 16, medium: 20, large: 24 };

/** Registers trusted SVG markup behind a semantic name. User-authored strings must never be passed here. */
export function registerIcon(name: string, source: IconSource): void {
  customIcons.set(name, source);
}

/** Removes an application-provided icon without affecting Mash's Carbon defaults. */
export function unregisterIcon(name: string): boolean {
  return customIcons.delete(name);
}

/** Reports whether a semantic name can currently be realized. */
export function hasIcon(name: string): boolean {
  return customIcons.has(name) || name in carbonIcons;
}

/** The immutable names bundled with Mash's curated Carbon realization. */
export const iconNames = Object.freeze(Object.keys(carbonIcons) as IconName[]);

function sourceFor(name: string, size: IconSize): string | undefined {
  const source = customIcons.get(name) ?? carbonIcons[name as IconName];
  if (typeof source === "string") return source;
  if (!source) return undefined;

  const pixels = sizeInPixels[size];
  return source[pixels] ?? source[20] ?? source[16] ?? source[24];
}

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
 * @slot badge - Optional compact status or count layer.
 * @slot fallback - Authored fallback when `name` is unavailable.
 *
 * @csspart root - The accessible icon boundary.
 * @csspart glyph - The layered glyph stack.
 * @csspart primary - The generated or authored primary glyph.
 * @csspart secondary - The optional secondary glyph layer.
 * @csspart badge - The optional status layer.
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
    const source = sourceFor(this.name, this.size);
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
