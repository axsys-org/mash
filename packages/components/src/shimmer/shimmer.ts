import { LitElement, css, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

/**
 * Renders readable text with a decorative moving highlight.
 *
 * `ui-shimmer` keeps authored text as the layout and accessibility owner. It
 * does not replace text with placeholder boxes, report progress, or own an
 * operation's loading state; applications should render it only while a
 * meaningful activity label belongs on screen.
 *
 * @tag ui-shimmer
 * @summary Applies a reduced-motion-aware shimmer to short loading text.
 *
 * @example Thinking label
 * <ui-shimmer>Thinking...</ui-shimmer>
 *
 * @slot - Meaningful loading text.
 *
 * @csspart root - The complete shimmer text boundary.
 * @csspart content - The authored text receiving the decorative highlight.
 *
 * @cssproperty --ui-shimmer-duration - One complete sweep duration. Defaults to `2s`.
 * @cssproperty --ui-shimmer-spread - Highlight half-width. Defaults to `30%`.
 * @cssproperty --ui-shimmer-base-color - Text color outside the highlight band.
 * @cssproperty --ui-shimmer-highlight-color - Text color at the highlight peak.
 *
 * @mashnode root text
 * @mashnode content content root
 * @mashnode shimmer shimmer content
 * @mashnode reverse direction root
 * @mashnode once repetition root
 * @mashrole slot default content content
 * @mashrole part root text root
 * @mashrole part content content content
 */
export class UIShimmer extends LitElement {
  static override properties = {
    reverse: { type: Boolean, reflect: true },
    once: { type: Boolean, reflect: true },
  };

  /** Sweeps the highlight from inline-end toward inline-start. */
  declare reverse: boolean;
  /** Plays a single sweep instead of looping continuously. */
  declare once: boolean;

  constructor() {
    super();
    this.reverse = false;
    this.once = false;
  }

  static override styles = [
    baseStyles,
    css`
      :host {
        display: inline;
        color: inherit;
        --_ui-shimmer-duration: var(--ui-shimmer-duration, 2s);
        --_ui-shimmer-spread: var(--ui-shimmer-spread, 30%);
        --_ui-shimmer-base-color: var(--ui-shimmer-base-color, rgb(127 127 127 / 0.56));
        --_ui-shimmer-highlight-color: var(--ui-shimmer-highlight-color, currentColor);
      }

      [part="root"],
      [part="content"] {
        display: inline;
        color: inherit;
      }

      [part="content"] {
        background-image: linear-gradient(
          90deg,
          var(--_ui-shimmer-base-color) 0,
          var(--_ui-shimmer-base-color) calc(50% - var(--_ui-shimmer-spread)),
          var(--_ui-shimmer-highlight-color) 50%,
          var(--_ui-shimmer-base-color) calc(50% + var(--_ui-shimmer-spread)),
          var(--_ui-shimmer-base-color) 100%
        );
        background-position: 100% 50%;
        background-size: 250% 100%;
        background-repeat: no-repeat;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: ui-shimmer-sweep var(--_ui-shimmer-duration) linear infinite;
      }

      :host([reverse]) [part="content"] {
        animation-direction: reverse;
      }

      :host([once]) [part="content"] {
        animation-iteration-count: 1;
        animation-fill-mode: both;
      }

      @keyframes ui-shimmer-sweep {
        from {
          background-position: 100% 50%;
        }
        to {
          background-position: 0% 50%;
        }
      }

      @media (prefers-reduced-motion: reduce),
        (prefers-reduced-transparency: reduce),
        (forced-colors: active) {
        [part="content"] {
          animation: none;
          background-image: none;
          -webkit-text-fill-color: currentColor;
        }
      }
    `,
  ];

  protected override render(): TemplateResult {
    return html`<span part="root"
      ><span part="content"><slot></slot></span
    ></span>`;
  }
}
