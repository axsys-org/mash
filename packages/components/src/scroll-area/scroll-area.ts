import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * An accessible native scroll viewport with a stable styling boundary.
 *
 * The component deliberately keeps browser scrolling intact. It supplies a
 * focusable labelled region and exposes `viewport` as the one catalogue hook;
 * custom thumb rendering is an optional renderer concern, not a requirement
 * for ordinary content to remain reachable.
 *
 * @tag ui-scroll-area
 * @summary Provides a labelled, keyboard-focusable native scroll viewport.
 *
 * @example Activity log
 * <ui-scroll-area label="Activity log">
 *   <ol><li>Project created</li><li>Members invited</li></ol>
 * </ui-scroll-area>
 *
 * @slot - Scrollable content.
 *
 * @csspart viewport - The native overflow viewport.
 */
export class UIScrollArea extends LitElement {
  static override properties = {
    label: { type: String, reflect: true },
  };

  /** Accessible name for the scrollable region. */
  declare label: string;

  constructor() {
    super();
    this.label = "Scrollable content";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<div part="viewport" role="region" aria-label=${this.label} tabindex="0">
      <slot></slot>
    </div>`;
  }
}
