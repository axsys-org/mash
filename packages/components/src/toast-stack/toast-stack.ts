import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";
import type { UIToast } from "../toast/toast.js";

export type ToastStackPlacement =
  "bottom-center" | "bottom-end" | "bottom-start" | "top-center" | "top-end" | "top-start";

/**
 * A headless placement and expansion coordinator for authored toasts.
 *
 * Products still own their notification queue and identifiers. The stack owns
 * renderer-neutral placement, collapsed visibility, hover/focus expansion,
 * and Escape dismissal of the newest visible toast.
 *
 * @tag ui-toast-stack
 * @summary Places and coordinates a collection of authored toast announcements.
 *
 * @example Notification stack
 * <ui-toast-stack placement="top-end" limit="3" label="Workspace notifications">
 *   <ui-toast open duration="0" tone="positive">Project saved</ui-toast>
 *   <ui-toast open duration="0">Review requested</ui-toast>
 *   <ui-toast open duration="0" tone="warning">Migration needs attention</ui-toast>
 * </ui-toast-stack>
 *
 * @slot - Authored `ui-toast` announcements in queue order.
 *
 * @csspart root - The positioned stack boundary.
 * @csspart items - The authored toast collection.
 *
 * @cssstate expanded - Matches `:state(expanded)` while the complete stack is revealed.
 *
 * @fires {CustomEvent<{ expanded: boolean }>} ui-toast-stack-expanded-change - Reports hover or focus expansion changes.
 *
 * @mashnode root group
 * @mashnode items children root
 * @mashnode placement placement root
 * @mashnode limit limit root
 * @mashnode label label root
 * @mashnode expanded expanded root
 * @mashnode expanded-change change root
 * @mashrole part root group root
 * @mashrole slot default children items
 * @mashrole part items children items
 * @mashrole event ui-toast-stack-expanded-change change expanded-change
 */
export class UIToastStack extends LitElement {
  static override properties = {
    placement: { type: String, reflect: true },
    limit: { type: Number, reflect: true },
    label: { type: String, reflect: true },
    expanded: { type: Boolean, reflect: true },
  };

  /** Logical viewport corner or edge-center used by the active renderer. */
  declare placement: ToastStackPlacement;
  /** Maximum newest toasts visible while collapsed. Set zero for no limit. */
  declare limit: number;
  /** Accessible name for the notification collection. */
  declare label: string;
  /** Whether every authored toast is revealed. */
  declare expanded: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.placement = "top-end";
    this.limit = 3;
    this.label = "Notifications";
    this.expanded = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  get #toasts(): UIToast[] {
    return [...this.querySelectorAll<UIToast>(":scope > ui-toast")];
  }

  #setExpanded(expanded: boolean): void {
    if (this.expanded === expanded) return;
    this.expanded = expanded;
    this.dispatchEvent(
      new CustomEvent<{ expanded: boolean }>("ui-toast-stack-expanded-change", {
        bubbles: true,
        composed: true,
        detail: { expanded },
      }),
    );
  }

  #syncItems = (): void => {
    const toasts = this.#toasts;
    const firstVisible =
      this.expanded || this.limit <= 0 ? 0 : Math.max(0, toasts.length - this.limit);
    toasts.forEach((toast, index) => {
      toast.hidden = index < firstVisible;
      toast.paused = this.expanded;
    });
  };

  protected override updated(): void {
    if (this.expanded) this.#internals.states.add("expanded");
    else this.#internals.states.delete("expanded");
    this.#syncItems();
  }

  #onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.contains(next)) this.#setExpanded(false);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    let toast: UIToast | undefined;
    for (let index = this.#toasts.length - 1; index >= 0; index -= 1) {
      const candidate = this.#toasts[index];
      if (candidate?.open && !candidate.hidden) {
        toast = candidate;
        break;
      }
    }
    if (!toast) return;
    event.preventDefault();
    toast.requestClose("escape");
  };

  /** Requests dismissal of every currently open authored toast. */
  dismissAll(reason = "dismiss-all"): void {
    for (const toast of this.#toasts) toast.requestClose(reason);
  }

  protected override render(): TemplateResult {
    return html`
      <section
        part="root"
        role="region"
        aria-label=${this.label}
        @pointerenter=${() => this.#setExpanded(true)}
        @pointerleave=${() => this.#setExpanded(false)}
        @focusin=${() => this.#setExpanded(true)}
        @focusout=${this.#onFocusOut}
        @keydown=${this.#onKeydown}
      >
        <slot part="items" @slotchange=${this.#syncItems}></slot>
      </section>
    `;
  }
}
