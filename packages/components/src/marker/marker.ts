import { LitElement, html, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";
import { hideEmptySlot } from "../internal/slot-visibility.js";
/**
 * Separates conversation sections with a compact label.
 * @example Basic
 * <ui-marker>Today</ui-marker>
 * @tag ui-marker
 * @summary Separates conversation sections with a compact label.
 * @slot  - Date, unread boundary, or section label.
 * @slot icon - Optional leading symbol.
 * @csspart root - The root region.
 * @mashnode root root
 * @csspart icon - The icon region.
 * @mashnode icon icon root
 */
export class UIMarker extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
  };
  /** Plain label, dividing rules, or bordered label. */
  declare variant: "plain" | "separator" | "border";
  constructor() {
    super();
    this.variant = "separator";
  }
  static override styles = baseStyles;
  protected emptySlot = hideEmptySlot;

  protected override render(): TemplateResult {
    return html`<div part="root">
      <div part="icon"><slot name="icon" @slotchange=${this.emptySlot}></slot></div>
      <slot></slot>
    </div>`;
  }
}
