import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/** User activation of the independent path preview control. */
export interface ShrinePathRowToggleDetail {
  open: boolean;
}

/**
 * A destination and its independently disclosed, authored preview.
 *
 * The native anchor owns navigation; the sibling Mash button owns disclosure.
 * This is a list row, not a tree item. Routing, reads, caching and preview data
 * remain outside the component. Preview content stays mounted when hidden.
 *
 * @tag sh-path-row
 * @summary Pairs a real path link with a separate, labelled preview control.
 * @slot icon - Optional decorative path icon.
 * @slot label - Noninteractive destination label, falling back to label or href.
 * @slot meta - Noninteractive authored summary, never rewritten or shortened.
 * @slot preview - Authored content outside both interactive controls.
 * @csspart root - The complete row and preview composition.
 * @csspart row - The destination and independent preview control.
 * @csspart link - The native navigation anchor.
 * @csspart icon - The leading decorative icon lane.
 * @csspart label - The destination label and full-text native tooltip.
 * @csspart meta - The authored summary and full-text native tooltip.
 * @csspart toggle - The composed Mash preview button host.
 * @csspart toggle-control - The button's exported native control.
 * @csspart disclosure - The stock disclosure icon host.
 * @csspart disclosure-root - The icon's exported root.
 * @csspart disclosure-glyph - The icon's exported glyph wrapper.
 * @csspart disclosure-source - The icon's exported vector source.
 * @csspart preview - The labelled, natively hidden preview region.
 * @csspart guide - The logical guide around authored preview content.
 * @cssstate has-icon - Authored icon content occupies the leading lane.
 * @cssstate has-meta - Authored summary content occupies the secondary lane.
 * @fires {CustomEvent<ShrinePathRowToggleDetail>} sh-path-row-toggle - Emitted after user activation changes open. Property changes are silent.
 * @mashnode root root
 * @mashnode row row root
 * @mashnode link control row
 * @mashnode icon icon link
 * @mashnode label label link
 * @mashnode meta description link
 * @mashnode toggle trigger row
 * @mashnode toggle-control control toggle
 * @mashnode disclosure icon toggle
 * @mashnode preview content root
 * @mashnode guide content preview
 * @mashrole attribute href path link
 * @mashrole slot icon icon icon
 * @mashrole slot label label label
 * @mashrole slot meta description meta
 * @mashrole slot preview content preview
 * @mashfallback slot label bindings attribute:label attribute:href
 * @example Path with authored preview
 * <sh-path-row href="/debug/app" label="app" previewable preview-label="Preview /app">
 *   <ui-icon slot="icon" name="object.folder" size="small"></ui-icon>
 *   <span slot="meta">Applications.</span>
 *   <p slot="preview">Authored application record content.</p>
 * </sh-path-row>
 */
export class ShrinePathRow extends LitElement {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override properties = {
    href: { type: String, reflect: true },
    label: { type: String },
    target: { type: String, reflect: true },
    rel: { type: String, reflect: true },
    previewLabel: { type: String, attribute: "preview-label" },
    previewable: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    _labelText: { state: true },
    _metaText: { state: true },
    _hasIcon: { state: true },
    _hasMeta: { state: true },
  };

  /** Native navigation destination; no route normalization or interception. */
  declare href: string;
  /** Complete visible fallback when the label slot is empty. */
  declare label: string;
  /** Native browsing-context target, including _blank. */
  declare target: string;
  /** Authored link relationship; an absent _blank relationship defaults safely. */
  declare rel: string;
  /** Complete accessible preview name, usually "Preview /canonical/path". */
  declare previewLabel: string;
  /** Opts into a preview. Defaults false; setting false silently closes it. */
  declare previewable: boolean;
  /** Whether the authored preview is visible. Property changes emit no event. */
  declare open: boolean;
  declare private _labelText: string;
  declare private _metaText: string;
  declare private _hasIcon: boolean;
  declare private _hasMeta: boolean;

  readonly #internals = this.attachInternals();
  readonly #labels = new MutationObserver(() => this.#syncSlots());

  constructor() {
    super();
    this.href = "";
    this.label = "";
    this.target = "";
    this.rel = "";
    this.previewLabel = "";
    this.previewable = false;
    this.open = false;
    this._labelText = "";
    this._metaText = "";
    this._hasIcon = false;
    this._hasMeta = false;
  }

  static override styles = baseStyles;

  override disconnectedCallback(): void {
    this.#labels.disconnect();
    super.disconnectedCallback();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#syncSlots();
  }

  #assigned(name: string): Node[] {
    return (
      this.shadowRoot
        ?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.assignedNodes({ flatten: true }) ?? []
    );
  }

  #syncSlots = (): void => {
    const present = (nodes: Node[]) =>
      nodes.some((node) =>
        node.nodeType === Node.ELEMENT_NODE
          ? !(node as HTMLElement).hidden
          : !!node.textContent?.trim(),
      );
    const visibleText = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).hidden) return "";
      return [...node.childNodes].map(visibleText).join("");
    };
    this._hasIcon = present(this.#assigned("icon"));
    this._labelText = this.#assigned("label").map(visibleText).join(" ").trim();
    this._metaText = this.#assigned("meta").map(visibleText).join(" ").trim();
    this._hasMeta = !!this._metaText;
    this.#labels.disconnect();
    if (this.isConnected)
      for (const node of [
        ...this.#assigned("icon"),
        ...this.#assigned("label"),
        ...this.#assigned("meta"),
      ]) {
        this.#labels.observe(node, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["hidden"],
        });
      }
  };

  protected override willUpdate(): void {
    const toggle = this.shadowRoot?.querySelector<HTMLElement>('[part="toggle"]');
    const active = this.ownerDocument.activeElement;
    const insidePreview =
      active && this.#assigned("preview").some((node) => node === active || node.contains(active));
    if (!this.previewable) {
      this.open = false;
      if (insidePreview || (toggle && this.shadowRoot?.activeElement === toggle))
        this.shadowRoot?.querySelector<HTMLAnchorElement>('[part="link"]')?.focus();
    } else if (!this.open && insidePreview) toggle?.focus();
  }

  protected override updated(_changed: PropertyValues<this>): void {
    if (this._hasIcon) this.#internals.states.add("has-icon");
    else this.#internals.states.delete("has-icon");
    if (this._hasMeta) this.#internals.states.add("has-meta");
    else this.#internals.states.delete("has-meta");
  }

  #onToggle = (event: MouseEvent): void => {
    if (!this.previewable || event.defaultPrevented || event.button !== 0) return;
    this.open = !this.open;
    this.dispatchEvent(
      new CustomEvent<ShrinePathRowToggleDetail>("sh-path-row-toggle", {
        bubbles: true,
        composed: true,
        detail: { open: this.open },
      }),
    );
  };

  protected override render(): TemplateResult {
    const previewName =
      this.previewLabel || `Preview ${this.label || this._labelText || this.href || "path"}`;
    const rel =
      this.rel.trim() || (this.target.toLowerCase() === "_blank" ? "noopener noreferrer" : "");
    return html`<div part="root">
      <div part="row">
        <ui-button
          part="toggle"
          exportparts="control:toggle-control"
          icon-only
          size="compact"
          variant="ghost"
          tone="neutral"
          ?hidden=${!this.previewable}
          .disabled=${!this.previewable}
          aria-label=${previewName}
          aria-expanded=${this.previewable ? String(this.open) : nothing}
          @click=${this.#onToggle}
        >
          <ui-icon
            part="disclosure"
            exportparts="root:disclosure-root,glyph:disclosure-glyph,source:disclosure-source"
            name="navigation.disclosure"
            size="small"
            label=""
          ></ui-icon>
        </ui-button>
        <a
          part="link"
          href=${this.href || nothing}
          target=${this.target || nothing}
          rel=${rel || nothing}
          aria-labelledby="label"
          aria-describedby=${this._hasMeta ? "meta" : nothing}
        >
          <span part="icon" aria-hidden="true" ?hidden=${!this._hasIcon}
            ><slot name="icon" @slotchange=${this.#syncSlots}></slot
          ></span>
          <span part="label" id="label" title=${this._labelText || this.label || this.href}>
            <slot name="label" @slotchange=${this.#syncSlots}>${this.label || this.href}</slot>
          </span>
          <span part="meta" id="meta" title=${this._metaText || nothing} ?hidden=${!this._hasMeta}
            ><slot name="meta" @slotchange=${this.#syncSlots}></slot
          ></span>
        </a>
      </div>
      <div
        part="preview"
        role="region"
        aria-label=${previewName}
        ?hidden=${!this.previewable || !this.open}
      >
        <div part="guide"><slot name="preview"></slot></div>
      </div>
    </div>`;
  }
}
