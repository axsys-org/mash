import { css } from "lit";

/**
 * Technical baseline shared by Shrine definition modules.
 *
 * This deliberately contains no visual language. Display, layout, spacing,
 * colour, type, motion, and state presentation live in an opt-in catalogue
 * recipe so the same Shrine anatomy can be interpreted by another product.
 */
export const baseStyles = css`
  :host {
    box-sizing: border-box;
  }

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }

  :host([hidden]),
  [hidden] {
    display: none !important;
  }
`;
