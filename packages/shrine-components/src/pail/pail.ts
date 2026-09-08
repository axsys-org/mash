import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * The value held by a Shrine limb.
 *
 * @tag sh-pail
 * @summary Renders a readable Shrine field value.
 *
 * @example Text value
 * <sh-pail text="active"></sh-pail>
 *
 * @slot - Compatibility fallback for the `value` slot.
 * @slot value - Optional rich value content. Overrides the `text` fallback.
 * @csspart root - The visible field value.
 * @csspart value - The authored rich value slot.
 * @mashnode root value
 * @mashnode content content root
 * @mashrole slot default content content
 * @mashrole slot value content content
 * @mashrole part root value root
 * @mashrole part value content content
 */
export class ShrinePail extends LitElement {
  static override properties = {
    text: { type: String, reflect: true },
  };

  /** The textual value used when no default-slot content is supplied. */
  declare text: string;

  constructor() {
    super();
    this.text = "";
  }

  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<span part="root"
      ><slot name="value" part="value"><slot>${this.text}</slot></slot></span
    >`;
  }
}
