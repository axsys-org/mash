import { css } from "lit";

/**
 * Styles shared by every component in the system.
 *
 * This is internal: it is not listed in the package's `exports` map, so it is
 * reachable from inside the package but not importable by consumers. Keep it
 * genuinely universal — anything that only two components happen to share
 * belongs in those components, not here.
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

  /* Without this, a host with [hidden] still lays out, because the component's
     own :host display rule beats the UA stylesheet's [hidden] rule. */
  :host([hidden]) {
    display: none !important;
  }
`;
