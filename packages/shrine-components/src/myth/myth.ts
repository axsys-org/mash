import { LitElement, css, html, nothing, type TemplateResult } from "lit";

/** One slot and the value that was observed at that location. */
export interface MythEntry {
  /** Shrine path that identifies the slot. */
  slot: string;
  /** Pretty-printed value shown in the code block. */
  value: unknown;
  /** Optional human-readable path title. */
  title?: string;
}

const normalizeEntries = (input: unknown): MythEntry[] => {
  if (!Array.isArray(input)) return [];

  return input.flatMap((candidate): MythEntry[] => {
    if (!candidate || typeof candidate !== "object") return [];

    const record = candidate as Record<string, unknown>;
    const slot = typeof record.slot === "string" ? record.slot.trim() : "";
    if (!slot) return [];

    const title = typeof record.title === "string" ? record.title.trim() : undefined;
    return [{ slot, value: record.value, ...(title ? { title } : {}) }];
  });
};

const parseData = (data: string): MythEntry[] => {
  if (!data.trim()) return [];

  try {
    return normalizeEntries(JSON.parse(data));
  } catch {
    // The empty state is safer than putting an invalid data attribute into the
    // catalog's render loop. Programmatic callers can use `entries` when they
    // already have structured data.
    return [];
  }
};

const prettyPrint = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";

  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};

/**
 * Show a small, explicit slot-to-value mapping for a Myth inspection surface.
 *
 * @tag sh-myth
 * @summary Displays Shrine slots with their pretty-printed values.
 *
 * @example Mapping
 * <sh-myth
 *   label="Foundry values"
 *   data='[
 *     {"slot":"/shrine/foundry","title":"Foundry","value":{"status":"ready","version":1}},
 *     {"slot":"/shrine/foundry/mode","value":"inspect"}
 *   ]'
 * ></sh-myth>
 *
 * @csspart root - The card surface containing the mapping.
 * @csspart heading - The mapping heading.
 * @csspart mapping - The list of slot/value entries.
 * @csspart entry - One slot/value pair.
 * @csspart slot - The slot path label.
 * @csspart value - The value code block.
 * @csspart empty - The message shown when there are no valid entries.
 */
export class ShrineMyth extends LitElement {
  static override properties = {
    /** JSON-encoded entries for declarative catalog examples. */
    data: { type: String },
    /** Heading shown above the mapping. */
    label: { type: String, reflect: true },
    /** Structured entries for application code; assign a new array to update. */
    entries: { attribute: false },
  };

  /** JSON-encoded entries for declarative catalog examples. */
  declare data: string;

  /** Heading shown above the mapping. */
  declare label: string;

  /** Structured entries for application code; assign a new array to update. */
  declare entries: ReadonlyArray<MythEntry>;

  constructor() {
    super();
    this.data = "";
    this.label = "Myth";
    this.entries = [];
  }

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
    }

    :host([hidden]) {
      display: none !important;
    }

    .heading {
      display: flex;
      align-items: baseline;
      gap: var(--space-inline);
      margin: 0 0 var(--space-stack);
    }

    .heading-label {
      margin: 0;
      color: var(--color-text);
      font-family: var(--type-heading-font-family);
      font-size: var(--type-heading-font-size);
      font-weight: var(--type-heading-font-weight);
      line-height: var(--type-heading-line-height);
    }

    .mapping {
      display: grid;
      gap: var(--space-stack);
      margin: 0;
    }

    .entry {
      display: grid;
      grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
      gap: var(--space-inline);
      align-items: start;
    }

    .slot,
    .value {
      min-inline-size: 0;
      margin: 0;
    }

    .slot {
      padding-block-start: var(--space-control-block-small);
      color: var(--color-text-muted);
      font-family: var(--type-code-font-family);
      font-size: var(--type-code-font-size);
      font-weight: var(--type-code-font-weight);
      line-height: var(--type-code-line-height);
    }

    .code {
      max-inline-size: 100%;
      box-sizing: border-box;
      overflow: auto;
      margin: 0;
      padding: var(--space-control-block) var(--space-control-inline);
      background: var(--color-surface-raised);
      border: var(--border-hairline) solid var(--color-border);
      border-radius: var(--radius-control);
      color: var(--color-text);
      font-family: var(--type-code-font-family);
      font-size: var(--type-code-font-size);
      font-weight: var(--type-code-font-weight);
      line-height: var(--type-code-line-height);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .empty {
      margin: 0;
      color: var(--color-text-muted);
    }

    @media (max-width: 520px) {
      .entry {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-control-gap);
      }

      .slot {
        padding-block-start: 0;
      }
    }

    @media (forced-colors: active) {
      .code {
        border-color: CanvasText;
      }
    }
  `;

  protected override render(): TemplateResult {
    const entries = this.data.trim() ? parseData(this.data) : normalizeEntries(this.entries);

    return html`
      <ui-card part="root" elevation="flat">
        <div class="heading">
          <h2 part="heading" class="heading-label">${this.label}</h2>
        </div>

        ${
          entries.length
            ? html`
                <dl part="mapping" class="mapping">
                  ${entries.map(
                    (entry) => html`
                      <div part="entry" class="entry">
                        <dt part="slot" class="slot">
                          <ui-path
                            path=${entry.slot}
                            title=${entry.title || nothing}
                            size="small"
                          ></ui-path>
                        </dt>
                        <dd part="value" class="value">
                          <pre class="code"><code>${prettyPrint(entry.value)}</code></pre>
                        </dd>
                      </div>
                    `,
                  )}
                </dl>
              `
            : html`<p part="empty" class="empty">No mappings.</p>`
        }
      </ui-card>
    `;
  }
}
