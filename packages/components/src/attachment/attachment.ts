import { LitElement, css, html, type TemplateResult } from "lit";
import { baseStyles } from "../internal/base-styles.js";
import { hideEmptySlot } from "../internal/slot-visibility.js";
/**
 * Presents a file with metadata, preview, lifecycle state, and actions.
 * @example Basic
 * <ui-attachment><strong slot="title">report.pdf</strong><span slot="description">PDF · 2.4 MB</span></ui-attachment>
 * @mashnode size size root
 * @mashaxis size control-size
 * @tag ui-attachment
 * @summary Presents a file with metadata, preview, lifecycle state, and actions.
 * @slot  - Additional file details.
 * @slot media - File icon or image preview.
 * @slot title - File name or download link.
 * @slot description - File type, size, or progress description.
 * @slot actions - Download, retry, or remove controls.
 * @csspart root - The root region.
 * @mashnode root root
 * @csspart media - The media region.
 * @mashnode media media root
 * @csspart title - The title region.
 * @mashnode title title root
 * @csspart description - The description region.
 * @mashnode description description root
 * @csspart actions - The actions region.
 * @mashnode actions actions root
 */
export class UIAttachment extends LitElement {
  static override properties = {
    status: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    size: { type: String, reflect: true },
  };
  /** Lifecycle state; upload ownership stays with the application. */
  declare status: "ready" | "uploading" | "failed" | "pending";
  /** Density of the file preview. */
  declare size: "xsmall" | "small" | "medium" | "large";
  /** Arrange media beside or above file metadata. */
  declare orientation: "horizontal" | "vertical";
  constructor() {
    super();
    this.status = "ready";
    this.size = "medium";
    this.orientation = "horizontal";
  }
  static override styles = [
    baseStyles,
    css`
      .stack {
        min-inline-size: 0;
        flex: 1;
      }
    `,
  ];
  protected emptySlot = hideEmptySlot;

  protected override render(): TemplateResult {
    return html`<div part="root" aria-busy=${this.status === "uploading" ? "true" : "false"}>
      <div part="media"><slot name="media" @slotchange=${this.emptySlot}></slot></div>
      <div class="stack">
        <div part="title"><slot name="title" @slotchange=${this.emptySlot}></slot></div>
        <div part="description"><slot name="description" @slotchange=${this.emptySlot}></slot></div>
        <slot></slot>
      </div>
      <div part="actions"><slot name="actions" @slotchange=${this.emptySlot}></slot></div>
    </div>`;
  }
}
