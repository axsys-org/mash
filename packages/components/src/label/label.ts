import { LitElement, html, type TemplateResult } from "lit";

import { baseStyles } from "../internal/base-styles.js";

const MASKED_CHARACTER = "•";

export type LabelAlign = "start" | "center" | "end" | "left" | "right";
export type LabelHighlightMatch = "full" | "prefix";
export type LabelSize =
  "xs" | "xsmall" | "sm" | "small" | "base" | "md" | "medium" | "lg" | "large" | "xl" | "2xl";

interface TextRange {
  start: number;
  end: number;
}

interface TextChunk extends TextRange {
  highlighted: boolean;
  secondary: boolean;
  text: string;
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  const sorted = ranges
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TextRange[] = [];

  for (const range of sorted) {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push({ ...range });
      continue;
    }
    previous.end = Math.max(previous.end, range.end);
  }

  return merged;
}

function highlightRanges(text: string, query: string, match: LabelHighlightMatch): TextRange[] {
  const needle = query.trim();
  if (!needle) return [];

  const textLower = text.toLocaleLowerCase();
  const needleLower = needle.toLocaleLowerCase();

  if (match === "prefix") {
    return textLower.startsWith(needleLower) ? [{ start: 0, end: needle.length }] : [];
  }

  const ranges: TextRange[] = [];
  let searchStart = 0;
  while (searchStart < textLower.length) {
    const found = textLower.indexOf(needleLower, searchStart);
    if (found === -1) break;
    ranges.push({ start: found, end: Math.min(found + needle.length, text.length) });
    searchStart = found + 1;
  }

  return mergeRanges(ranges);
}

function textChunks(text: string, ranges: TextRange[], secondaryStart: number | null): TextChunk[] {
  if (!text) return [];

  const points = new Set([0, text.length]);
  for (const range of ranges) {
    points.add(range.start);
    points.add(range.end);
  }
  if (secondaryStart !== null) points.add(secondaryStart);

  const sorted = [...points]
    .filter((point) => point >= 0 && point <= text.length)
    .sort((a, b) => a - b);
  const chunks: TextChunk[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index]!;
    const end = sorted[index + 1]!;
    if (start === end) continue;

    chunks.push({
      start,
      end,
      highlighted: ranges.some((range) => start < range.end && end > range.start),
      secondary: secondaryStart !== null && start >= secondaryStart,
      text: text.slice(start, end),
    });
  }

  return chunks;
}

/**
 * A text label with optional secondary text, masking, and search highlighting.
 *
 * `ui-label` is a text-first primitive. Use the `text` attribute for the most
 * explicit contract, or place plain text in the default slot; the component
 * normalizes that text before applying secondary, highlighted, or masked
 * rendering.
 *
 * @tag ui-label
 * @summary Displays text with secondary, masked, highlighted, and sized states.
 *
 * @example Text with secondary state
 * <ui-label text="Company address" secondary="(optional)"></ui-label>
 *
 * @example Prefix highlight
 * <ui-label text="Billing migration" highlight="bill" highlight-match="prefix"></ui-label>
 *
 * @slot - Plain-text label fallback when `text` is not supplied.
 *
 * @csspart root - The complete label boundary.
 * @csspart value - The generated visible text.
 * @csspart secondary - The secondary text segment.
 * @csspart highlight - A highlighted matching text segment.
 *
 * @mashnode root label
 * @mashnode value value root
 * @mashnode secondary secondary value
 * @mashnode highlight highlight value
 * @mashnode text text value
 * @mashnode size size root
 * @mashaxis size type-preset
 * @mashnode align align root
 * @mashnode masked masked value
 * @mashnode highlight-match highlight-match highlight
 * @mashrole slot default value value
 */
export class UILabel extends LitElement {
  static override properties = {
    text: { type: String, reflect: true },
    secondary: { type: String, reflect: true },
    masked: { type: Boolean, reflect: true },
    highlight: { type: String, reflect: true },
    highlightMatch: { type: String, attribute: "highlight-match", reflect: true },
    align: { type: String, reflect: true },
    size: { type: String, reflect: true },
    _slotText: { state: true },
  };

  /** Primary label text. Plain default-slot text is the fallback. */
  declare text: string;
  /** Secondary text appended after the primary label with a muted treatment. */
  declare secondary: string;
  /** Replaces every displayed character with a bullet for sensitive values. */
  declare masked: boolean;
  /** Search text to highlight within the generated label. */
  declare highlight: string;
  /** Whether highlighting matches every occurrence or only the prefix. */
  declare highlightMatch: LabelHighlightMatch;
  /** Text alignment. Logical `start` and `end` are preferred. */
  declare align: LabelAlign;
  /** Semantic text size. Type scale aliases are accepted. */
  declare size: LabelSize;

  protected _slotText = "";

  constructor() {
    super();
    this.text = "";
    this.secondary = "";
    this.masked = false;
    this.highlight = "";
    this.highlightMatch = "full";
    this.align = "start";
    this.size = "base";
  }

  static override styles = baseStyles;

  #onSlotChange = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const next = slot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    if (next !== this._slotText) this._slotText = next;
  };

  #renderChunk(chunk: TextChunk): TemplateResult | string {
    if (chunk.highlighted) {
      return html`<mark part=${chunk.secondary ? "secondary highlight" : "highlight"}
        >${chunk.text}</mark
      >`;
    }

    if (chunk.secondary) {
      return html`<span part="secondary">${chunk.text}</span>`;
    }

    return chunk.text;
  }

  protected override render(): TemplateResult {
    const primary = this.text || this._slotText;
    const secondary = this.secondary.trim();
    const text = secondary ? (primary ? `${primary} ${secondary}` : secondary) : primary;
    const displayed = this.masked ? MASKED_CHARACTER.repeat([...text].length) : text;
    const ranges = this.masked
      ? []
      : highlightRanges(
          displayed,
          this.highlight,
          this.highlightMatch === "prefix" ? "prefix" : "full",
        );
    const secondaryStart = secondary && !this.masked ? (primary ? primary.length : 0) : null;

    return html`
      <span part="root">
        <slot hidden @slotchange=${this.#onSlotChange}></slot>
        <span part="value">
          ${textChunks(displayed, ranges, secondaryStart).map((chunk) => this.#renderChunk(chunk))}
        </span>
      </span>
    `;
  }
}
