import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * A labelled navigation landmark for authored links and disclosure controls.
 *
 * This primitive deliberately leaves link routing and current-page policy to
 * the application. It provides the meaningful landmark and an external recipe
 * hook without treating navigation as a cosmetic horizontal list.
 *
 * @tag ui-navigation-menu
 * @summary Groups primary navigation links in a labelled landmark.
 *
 * @example Workspace navigation
 * <ui-navigation-menu label="Workspace">
 *   <a href="/projects">Projects</a>
 *   <a href="/activity">Activity</a>
 * </ui-navigation-menu>
 *
 * @slot - Navigation links or nested navigation disclosures.
 *
 * @csspart root - The navigation landmark.
 * @csspart children - The authored navigation collection.
 *
 * @mashnode root root
 * @mashnode children children root
 * @mashrole slot default children children
 */
export class UINavigationMenu extends LitElement {
  static override properties = { label: { type: String, reflect: true } };

  /** Accessible name for the navigation landmark. */
  declare label: string;

  constructor() {
    super();
    this.label = "Navigation";
  }
  static override styles = baseStyles;

  protected override render(): TemplateResult {
    return html`<nav part="root" aria-label=${this.label}><slot part="children"></slot></nav>`;
  }
}
