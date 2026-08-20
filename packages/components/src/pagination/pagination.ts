import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

export type PaginationItem = { kind: "page"; page: number } | { kind: "ellipsis" };

/**
 * A controlled, unstyled pagination navigation landmark.
 *
 * Mash calculates the stable page window and emits requests; the owner remains
 * responsible for updating `current-page`. Every visible region can be
 * replaced through slots without replacing the behavior contract.
 *
 * @tag ui-pagination
 * @summary Requests movement through a controlled set of pages.
 *
 * @example Result pages
 * <ui-pagination current-page="5" total-pages="10" label="Search result pages"></ui-pagination>
 *
 * @slot previous - Replaces the previous-page control.
 * @slot - Replaces the calculated page and ellipsis controls.
 * @slot next - Replaces the next-page control.
 *
 * @csspart root - The navigation landmark.
 * @csspart previous - The previous-page realization.
 * @csspart pages - The page collection realization.
 * @csspart page - A generated page action.
 * @csspart current-page - The generated action for the current page.
 * @csspart ellipsis - A generated omitted-range marker.
 * @csspart next - The next-page realization.
 *
 * @cssstate disabled - Matches `:state(disabled)` while navigation is unavailable.
 *
 * @fires {CustomEvent<{page: number}>} ui-page-change - Requests a new current page.
 *
 * @mashnode root root
 * @mashnode previous previous root
 * @mashnode pages list root
 * @mashnode page page pages
 * @mashnode ellipsis separator pages
 * @mashnode next next root
 * @mashnode current page-index root
 * @mashnode current-item current pages
 * @mashnode total max root
 * @mashnode visible length root
 * @mashnode label label root
 * @mashnode disabled disabled root
 * @mashnode change change root
 * @mashrole attribute current-page page-index current
 * @mashrole attribute total-pages max total
 * @mashrole attribute visible-pages length visible
 * @mashrole event ui-page-change change change
 * @mashrole slot default list pages
 * @mashrole part pages list pages
 * @mashrole part ellipsis separator ellipsis
 * @mashrole part current-page current current-item
 */
export class UIPagination extends LitElement {
  static override properties = {
    currentPage: { type: Number, attribute: "current-page", reflect: true },
    totalPages: { type: Number, attribute: "total-pages", reflect: true },
    visiblePages: { type: Number, attribute: "visible-pages", reflect: true },
    label: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** One-based current page controlled by the owner. */
  declare currentPage: number;
  /** One-based total number of pages. */
  declare totalPages: number;
  /** Maximum generated page-window size, clamped to at least five. */
  declare visiblePages: number;
  /** Accessible name for the pagination landmark. */
  declare label: string;
  /** Prevents every page-change request. */
  declare disabled: boolean;

  readonly #internals: ElementInternals;

  constructor() {
    super();
    this.currentPage = 1;
    this.totalPages = 1;
    this.visiblePages = 7;
    this.label = "Pagination";
    this.disabled = false;
    this.#internals = this.attachInternals();
  }

  static override styles = baseStyles;

  /** The normalized, one-based current page. */
  get normalizedCurrentPage(): number {
    return Math.min(this.normalizedTotalPages, Math.max(1, Math.trunc(this.currentPage) || 1));
  }

  /** The normalized total page count. */
  get normalizedTotalPages(): number {
    return Math.max(1, Math.trunc(this.totalPages) || 1);
  }

  /** The current calculated page/ellipsis window. */
  get items(): PaginationItem[] {
    const total = this.normalizedTotalPages;
    if (total <= 1) return [];

    const current = this.normalizedCurrentPage;
    const visible = Math.max(5, Math.trunc(this.visiblePages) || 7);
    if (total <= visible) {
      return Array.from({ length: total }, (_, index) => ({ kind: "page", page: index + 1 }));
    }

    const result: PaginationItem[] = [{ kind: "page", page: 1 }];
    const side = Math.floor((visible - 3) / 2);
    const start =
      current <= side + 1 ? 2 : current > total - side - 1 ? total - side - 1 : current - side;
    if (start > 2) result.push({ kind: "ellipsis" });

    const end =
      current >= total - side ? total - 1 : current <= side + 1 ? side + 2 : current + side;
    for (let page = start; page <= end; page += 1) result.push({ kind: "page", page });
    if (end < total - 1) result.push({ kind: "ellipsis" });
    result.push({ kind: "page", page: total });
    return result;
  }

  /** Requests a page without mutating the controlled current page. */
  requestPage(page: number): void {
    const requested = Math.trunc(page);
    if (
      this.disabled ||
      requested < 1 ||
      requested > this.normalizedTotalPages ||
      requested === this.normalizedCurrentPage
    ) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent<{ page: number }>("ui-page-change", {
        detail: { page: requested },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #onClick = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-page]");
    if (!button) return;
    this.requestPage(Number(button.dataset.page));
  };

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("disabled")) return;
    if (this.disabled) this.#internals.states.add("disabled");
    else this.#internals.states.delete("disabled");
  }

  protected override render(): TemplateResult {
    const current = this.normalizedCurrentPage;
    const total = this.normalizedTotalPages;
    return html`
      <nav part="root" aria-label=${this.label || "Pagination"} @click=${this.#onClick}>
        <slot name="previous" part="previous">
          <button
            part="previous"
            type="button"
            data-page=${current - 1}
            aria-label="Previous page"
            ?disabled=${this.disabled || current <= 1}
          >
            ‹
          </button>
        </slot>
        <span part="pages">
          <slot>
            ${this.items.map((item) =>
              item.kind === "ellipsis"
                ? html`<span part="ellipsis" aria-hidden="true">…</span>`
                : html`
                    <button
                      part=${item.page === current ? "page current-page" : "page"}
                      type="button"
                      data-page=${item.page}
                      aria-label=${`Page ${item.page}`}
                      aria-current=${item.page === current ? "page" : nothing}
                      ?disabled=${this.disabled}
                    >
                      ${item.page}
                    </button>
                  `,
            )}
          </slot>
        </span>
        <slot name="next" part="next">
          <button
            part="next"
            type="button"
            data-page=${current + 1}
            aria-label="Next page"
            ?disabled=${this.disabled || current >= total}
          >
            ›
          </button>
        </slot>
      </nav>
    `;
  }
}
