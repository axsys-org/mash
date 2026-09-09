import { LitElement, html, css } from "lit";
import { baseStyles } from "../internal/base-styles.js";
/**
 * Stable authored content in a dock workspace. Moving its tab preserves this element.
 * @tag ui-dock-panel
 * @summary Names a movable workspace panel without owning its application state.
 * @slot - Panel content.
 * @csspart root - Panel content boundary.
 * @mashnode root panel
 * @example Panel
 * <ui-dock><ui-dock-panel name="notes" label="Notes">Workspace notes</ui-dock-panel></ui-dock>
 */
export class UIDockPanel extends LitElement {
  static override properties = {
    name: { type: String, reflect: true },
    label: { type: String, reflect: true },
    closable: { type: Boolean, reflect: true },
  };
  /** Stable identity used by layout snapshots. */
  declare name: string;
  /** Visible tab and accessible panel label. */
  declare label: string;
  /** Allow the panel to be closed and reopened. */
  declare closable: boolean;
  constructor() {
    super();
    this.name = "";
    this.label = "Panel";
    this.closable = true;
  }
  static override styles = [
    baseStyles,
    css`
      :host {
        display: block;
        block-size: 100%;
        min-inline-size: 0;
      }
      [part="root"] {
        block-size: 100%;
        overflow: auto;
      }
    `,
  ];
  protected override render() {
    return html`<div part="root" role="tabpanel" aria-label=${this.label}><slot></slot></div>`;
  }
}
