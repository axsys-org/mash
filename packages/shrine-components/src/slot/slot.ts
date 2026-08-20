import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * The named label of a Shrine limb.
 *
 * @tag sh-slot
 * @summary Renders a concise, code-style Shrine field label.
 *
 * @example Field label
 * <sh-slot title="status"></sh-slot>
 *
 * @slot - Compatibility fallback for the `label` slot.
 * @slot label - Optional rich label content. Overrides the `title` fallback.
 *
 * @csspart root - The visible field label.
 *
 * @mashrole attribute title label label
 * @mashrole slot default label label
 * @mashrole part root label label
 * @mashnode label label
 */
export class ShrineSlot extends LitElement {
  static override properties = {
    title: { type: String, reflect: true },
  };

  /** The concise field name used when no default-slot content is supplied. */
  declare title: string;

  constructor() {
    super();
    this.title = "";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<span part="root"
      ><slot name="label"><slot>${this.title}</slot></slot></span
    >`;
  }
}
