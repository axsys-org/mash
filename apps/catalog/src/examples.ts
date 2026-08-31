import { components, type ComponentSchema, type Example } from "./schema.js";

/**
 * A catalog example is deliberately more specific than an `@example` JSDoc
 * snippet. The manifest remains the public, portable component contract; this
 * layer teaches how several contracts become a useful interface together.
 */
export interface CatalogExample extends Example {
  /**
   * This component is only meaningful as an authored composition. Hiding the
   * isolated-preview toggle avoids manufacturing invalid placeholder children
   * for slots that require a particular Mash element.
   */
  compositionOnly?: boolean;
  description?: string;
  /** Optional preview-canvas placement for examples whose shape reads from an edge. */
  stageLayout?: "start" | "fill";
}

const example = (
  name: string,
  code: string,
  options: Pick<CatalogExample, "compositionOnly" | "description" | "stageLayout"> = {},
): CatalogExample => ({ name, code: code.trim(), ...options });

/**
 * Compositions that demonstrate a component in a real UI relationship.
 *
 * These are intentionally catalog-owned rather than copied into every
 * component's JSDoc: a card with a dialog or a fieldset with a checkbox group
 * is documentation for the system, not a new public API on either primitive.
 */
const curated: Record<string, CatalogExample[]> = {
  "ui-link": [
    example(
      "Variants and states",
      `
        <div class="catalog-example example-link-showcase">
          <header class="example-link-heading">
            <span class="example-eyebrow">Foundation</span>
            <h2>Links keep their role in context</h2>
            <p>Emphasis changes independently from destination, content, and state.</p>
          </header>
          <div class="example-link-matrix">
            <div class="example-link-row">
              <span>standalone</span>
              <ui-link href="#project-overview">Project overview<span slot="suffix" aria-hidden="true">→</span></ui-link>
            </div>
            <div class="example-link-row">
              <span>inline</span>
              <p class="example-link-prose">Read the <ui-link variant="inline" href="#migration-guide">migration guide</ui-link> before changing the billing workflow.</p>
            </div>
            <div class="example-link-row">
              <span>quiet</span>
              <ui-link variant="quiet" href="#activity"><span slot="prefix" aria-hidden="true">◷</span>Recent activity</ui-link>
            </div>
            <div class="example-link-row">
              <span>current</span>
              <ui-link variant="quiet" href="#issues" current><span slot="prefix" aria-hidden="true">◇</span>Issues</ui-link>
            </div>
            <div class="example-link-row">
              <span>disabled</span>
              <ui-link href="#archived" disabled><span slot="prefix" aria-hidden="true">⊘</span>Archived projects</ui-link>
            </div>
          </div>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Standalone, inline, and quiet are stable presentation roles; current and disabled remain semantic states.",
        stageLayout: "start",
      },
    ),
    example(
      "Prefix and suffix content",
      `
        <div class="catalog-example example-link-showcase">
          <header class="example-link-heading">
            <span class="example-eyebrow">Anatomy</span>
            <h2>Authored content owns its space</h2>
            <p>Prefix and suffix slots disappear entirely when they are empty.</p>
          </header>
          <div class="example-link-content-grid">
            <ui-link href="#release-notes">
              <span slot="prefix" aria-hidden="true">↗</span>
              Release notes
            </ui-link>
            <ui-link href="#keyboard-shortcuts">
              Keyboard shortcuts
              <ui-kbd slot="suffix">⌘ K</ui-kbd>
            </ui-link>
            <ui-link variant="quiet" href="#notifications">
              <span slot="prefix" aria-hidden="true">◌</span>
              Notifications
              <ui-badge slot="suffix" size="small">3</ui-badge>
            </ui-link>
            <ui-link href="#billing-migration" label="Billing migration"></ui-link>
          </div>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Icons, keyboard hints, badges, and the label fallback all use the public link anatomy.",
        stageLayout: "start",
      },
    ),
    example(
      "Workspace navigation",
      `
        <nav class="catalog-example example-link-navigation" aria-label="Interzone workspace">
          <header class="example-link-navigation-heading">
            <ui-avatar size="small">IZ</ui-avatar>
            <span>Interzone</span>
            <ui-button variant="quiet" size="small" aria-label="Add workspace page">+</ui-button>
          </header>
          <ui-link class="example-link-nav-item" variant="quiet" href="#issues" current>
            <span slot="prefix" class="example-link-icon" aria-hidden="true">◇</span>
            Issues
            <ui-badge slot="suffix" size="small">24</ui-badge>
          </ui-link>
          <ui-link class="example-link-nav-item" variant="quiet" href="#projects">
            <span slot="prefix" class="example-link-icon" aria-hidden="true">□</span>
            Projects
          </ui-link>
          <ui-link class="example-link-nav-item" variant="quiet" href="#cycles">
            <span slot="prefix" class="example-link-icon" aria-hidden="true">◔</span>
            Cycles
            <ui-badge slot="suffix" size="small" tone="positive">Active</ui-badge>
          </ui-link>
          <ui-separator></ui-separator>
          <ui-link class="example-link-nav-item" variant="quiet" href="#settings">
            <span slot="prefix" class="example-link-icon" aria-hidden="true">⚙</span>
            Settings
          </ui-link>
        </nav>`,
      {
        compositionOnly: true,
        description:
          "Quiet links become a full navigation family through slots and composition, without a second link primitive.",
        stageLayout: "start",
      },
    ),
    example(
      "Wrapping and composition",
      `
        <ui-card class="catalog-example example-link-card" elevation="raised">
          <ui-avatar slot="prefix">BM</ui-avatar>
          <strong slot="title"><ui-link variant="inline" href="#billing-migration">Billing migration</ui-link></strong>
          <span slot="description">Payments · updated 12 minutes ago</span>
          <ui-badge slot="value" tone="positive">On track</ui-badge>
          <div slot="content" class="example-link-card-copy">
            <p>Review the <ui-link variant="inline" href="#invoice-reconciliation">invoice reconciliation requirements for international billing accounts</ui-link> before the next release window.</p>
            <p class="example-support">Inline links inherit this paragraph and wrap with it; standalone actions retain their own label treatment.</p>
          </div>
          <div slot="footer" class="example-actions">
            <ui-link href="#open-project">Open project<span slot="suffix" aria-hidden="true">→</span></ui-link>
            <ui-link variant="quiet" href="#project-settings">Settings</ui-link>
          </div>
        </ui-card>`,
      {
        compositionOnly: true,
        description:
          "Long inline destinations wrap with prose while standalone and quiet actions remain distinct inside a real card.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-table": [
    example(
      "Project status table",
      `
        <ui-table label="Project status" row-count="4" column-count="3">
          <ui-table-caption slot="caption">Project status</ui-table-caption>
          <ui-table-header>
            <ui-table-row row-index="1">
              <ui-table-head column-index="1">Project</ui-table-head>
              <ui-table-head column-index="2">Status</ui-table-head>
              <ui-table-head column-index="3">Owner</ui-table-head>
            </ui-table-row>
          </ui-table-header>
          <ui-table-body>
            <ui-table-row row-index="2">
              <ui-table-cell column-index="1">Billing migration</ui-table-cell>
              <ui-table-cell column-index="2">Active</ui-table-cell>
              <ui-table-cell column-index="3">Finance</ui-table-cell>
            </ui-table-row>
            <ui-table-row row-index="3">
              <ui-table-cell column-index="1">Invoice reconciliation</ui-table-cell>
              <ui-table-cell column-index="2">Review</ui-table-cell>
              <ui-table-cell column-index="3">Operations</ui-table-cell>
            </ui-table-row>
            <ui-table-row row-index="4">
              <ui-table-cell column-index="1">Archive import</ui-table-cell>
              <ui-table-cell column-index="2">Paused</ui-table-cell>
              <ui-table-cell column-index="3">Records</ui-table-cell>
            </ui-table-row>
          </ui-table-body>
        </ui-table>`,
      {
        compositionOnly: true,
        description: "The complete table anatomy with text-only cells.",
        stageLayout: "start",
      },
    ),
    example(
      "Single row",
      `
        <ui-table label="Current project" row-count="2" column-count="3">
          <ui-table-caption slot="caption">Current project</ui-table-caption>
          <ui-table-header>
            <ui-table-row row-index="1">
              <ui-table-head column-index="1">Project</ui-table-head>
              <ui-table-head column-index="2">Status</ui-table-head>
              <ui-table-head column-index="3">Owner</ui-table-head>
            </ui-table-row>
          </ui-table-header>
          <ui-table-body>
            <ui-table-row row-index="2">
              <ui-table-cell column-index="1">Billing migration</ui-table-cell>
              <ui-table-cell column-index="2"><ui-badge tone="positive">Active</ui-badge></ui-table-cell>
              <ui-table-cell column-index="3">Finance</ui-table-cell>
            </ui-table-row>
          </ui-table-body>
        </ui-table>`,
      {
        compositionOnly: true,
        description:
          "The smallest complete table: one header row and one data row, kept as a visual regression case.",
        stageLayout: "start",
      },
    ),
    example(
      "Project health",
      `
        <ui-table label="Project health" row-count="4" column-count="4">
          <ui-table-caption slot="caption">Project health</ui-table-caption>
          <ui-table-header>
            <ui-table-row row-index="1">
              <ui-table-head column-index="1">Project</ui-table-head>
              <ui-table-head column-index="2">Status</ui-table-head>
              <ui-table-head column-index="3">Progress</ui-table-head>
              <ui-table-head column-index="4">Owner</ui-table-head>
            </ui-table-row>
          </ui-table-header>
          <ui-table-body>
            <ui-table-row row-index="2">
              <ui-table-cell column-index="1">
                <span class="example-table-entity">
                  <ui-avatar size="small">BM</ui-avatar>
                  <span class="example-table-copy">
                    <ui-link href="#billing-migration">Billing migration</ui-link>
                    <span class="example-table-meta">Payments</span>
                  </span>
                </span>
              </ui-table-cell>
              <ui-table-cell column-index="2"><ui-badge tone="positive">On track</ui-badge></ui-table-cell>
              <ui-table-cell column-index="3">
                <span class="example-table-progress">
                  <ui-progress value="82" label="Billing migration 82 percent complete"></ui-progress>
                  <output>82%</output>
                </span>
              </ui-table-cell>
              <ui-table-cell column-index="4">Maya Chen</ui-table-cell>
            </ui-table-row>
            <ui-table-row row-index="3">
              <ui-table-cell column-index="1">
                <span class="example-table-entity">
                  <ui-avatar size="small">IR</ui-avatar>
                  <span class="example-table-copy">
                    <ui-link href="#invoice-reconciliation">Invoice reconciliation</ui-link>
                    <span class="example-table-meta">Operations</span>
                  </span>
                </span>
              </ui-table-cell>
              <ui-table-cell column-index="2"><ui-badge tone="warning">At risk</ui-badge></ui-table-cell>
              <ui-table-cell column-index="3">
                <span class="example-table-progress">
                  <ui-progress value="54" tone="warning" label="Invoice reconciliation 54 percent complete"></ui-progress>
                  <output>54%</output>
                </span>
              </ui-table-cell>
              <ui-table-cell column-index="4">Sam Ortiz</ui-table-cell>
            </ui-table-row>
            <ui-table-row row-index="4">
              <ui-table-cell column-index="1">
                <span class="example-table-entity">
                  <ui-avatar size="small">AI</ui-avatar>
                  <span class="example-table-copy">
                    <ui-link href="#archive-import">Archive import</ui-link>
                    <span class="example-table-meta">Records</span>
                  </span>
                </span>
              </ui-table-cell>
              <ui-table-cell column-index="2"><ui-badge tone="critical">Blocked</ui-badge></ui-table-cell>
              <ui-table-cell column-index="3">
                <span class="example-table-progress">
                  <ui-progress value="31" tone="critical" label="Archive import 31 percent complete"></ui-progress>
                  <output>31%</output>
                </span>
              </ui-table-cell>
              <ui-table-cell column-index="4">Alex Rivera</ui-table-cell>
            </ui-table-row>
          </ui-table-body>
        </ui-table>`,
      {
        compositionOnly: true,
        description:
          "Rich cells compose Avatar, Link, Badge, and Progress without widening the table API.",
        stageLayout: "start",
      },
    ),
    example(
      "Usage report",
      `
        <ui-table label="Workspace usage for the last 30 days" row-count="4" column-count="4">
          <ui-table-caption slot="caption">Workspace usage · Last 30 days</ui-table-caption>
          <ui-table-header>
            <ui-table-row row-index="1">
              <ui-table-head column-index="1">Service</ui-table-head>
              <ui-table-head column-index="2"><span class="example-table-number">Requests</span></ui-table-head>
              <ui-table-head column-index="3"><span class="example-table-number">Success</span></ui-table-head>
              <ui-table-head column-index="4"><span class="example-table-number">Spend</span></ui-table-head>
            </ui-table-row>
          </ui-table-header>
          <ui-table-body>
            <ui-table-row row-index="2">
              <ui-table-cell column-index="1">Document indexing</ui-table-cell>
              <ui-table-cell column-index="2"><ui-intl-formatter class="example-table-number" kind="number" value="128402" locale="en-US"></ui-intl-formatter></ui-table-cell>
              <ui-table-cell column-index="3"><ui-intl-formatter class="example-table-number" kind="percent" value="0.998" locale="en-US" maximum-fraction-digits="1"></ui-intl-formatter></ui-table-cell>
              <ui-table-cell column-index="4"><ui-intl-formatter class="example-table-number" kind="currency" value="1840.25" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
            </ui-table-row>
            <ui-table-row row-index="3">
              <ui-table-cell column-index="1">Preview rendering</ui-table-cell>
              <ui-table-cell column-index="2"><ui-intl-formatter class="example-table-number" kind="number" value="48761" locale="en-US"></ui-intl-formatter></ui-table-cell>
              <ui-table-cell column-index="3"><ui-intl-formatter class="example-table-number" kind="percent" value="0.972" locale="en-US" maximum-fraction-digits="1"></ui-intl-formatter></ui-table-cell>
              <ui-table-cell column-index="4"><ui-intl-formatter class="example-table-number" kind="currency" value="936.80" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
            </ui-table-row>
            <ui-table-row row-index="4">
              <ui-table-cell column-index="1">Audit exports</ui-table-cell>
              <ui-table-cell column-index="2"><ui-intl-formatter class="example-table-number" kind="number" value="7214" locale="en-US"></ui-intl-formatter></ui-table-cell>
              <ui-table-cell column-index="3"><ui-intl-formatter class="example-table-number" kind="percent" value="1" locale="en-US" maximum-fraction-digits="1"></ui-intl-formatter></ui-table-cell>
              <ui-table-cell column-index="4"><ui-intl-formatter class="example-table-number" kind="currency" value="214.12" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
            </ui-table-row>
          </ui-table-body>
        </ui-table>`,
      {
        compositionOnly: true,
        description:
          "Locale-aware numeric cells keep formatting behavior outside the table primitive.",
        stageLayout: "start",
      },
    ),
    example(
      "Empty and loading",
      `
        <div class="catalog-example example-table-states">
          <ui-table label="Archived projects" row-count="2" column-count="1">
            <ui-table-caption slot="caption">Archived projects</ui-table-caption>
            <ui-table-header>
              <ui-table-row row-index="1"><ui-table-head column-index="1">Project</ui-table-head></ui-table-row>
            </ui-table-header>
            <ui-table-body>
              <ui-table-row row-index="2">
                <ui-table-cell column-index="1"><span class="example-table-message">No archived projects.</span></ui-table-cell>
              </ui-table-row>
            </ui-table-body>
          </ui-table>
          <ui-table label="Projects loading" row-count="2" column-count="1" aria-busy="true">
            <ui-table-caption slot="caption">Loading state</ui-table-caption>
            <ui-table-header>
              <ui-table-row row-index="1"><ui-table-head column-index="1">Project</ui-table-head></ui-table-row>
            </ui-table-header>
            <ui-table-body>
              <ui-table-row row-index="2">
                <ui-table-cell column-index="1">
                  <span class="example-table-message"><ui-spinner size="small" label="Loading projects"></ui-spinner>Loading projects…</span>
                </ui-table-cell>
              </ui-table-row>
            </ui-table-body>
          </ui-table>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Workflow states stay authored as table content, including their accessible loading signal.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-card": [
    example(
      "Project card",
      `
        <div class="catalog-example catalog-example-card">
          <ui-card elevation="raised">
            <ui-avatar slot="prefix">BM</ui-avatar>
            <strong slot="title">Billing migration</strong>
            <span slot="description">Interzone project</span>
            <ui-badge slot="value" tone="positive">Active</ui-badge>
            <p slot="content">Replace the legacy invoice flow before the next billing cycle.</p>
            <div slot="footer" class="example-actions">
              <ui-dialog label="Rename Billing migration">
                <ui-button slot="trigger" variant="secondary">Rename</ui-button>
                <h2 slot="title">Rename project</h2>
                <p slot="description">Choose a clear name for everyone in the workspace.</p>
                <ui-field label="Project name" description="Visible to collaborators.">
                  <ui-input slot="control" name="project-name" value="Billing migration"></ui-input>
                </ui-field>
                <div slot="close" class="example-actions">
                  <ui-button variant="secondary">Cancel</ui-button>
                  <ui-button>Save changes</ui-button>
                </div>
              </ui-dialog>
              <ui-button>Open project</ui-button>
            </div>
          </ui-card>
        </div>`,
      {
        compositionOnly: true,
        description: "A surface, a status, actions, and a dialog in one authored flow.",
      },
    ),
    example(
      "Message bubble pattern",
      `
        <div class="catalog-example example-message-thread" aria-label="Project conversation">
          <ui-card class="example-message-bubble" data-from="them">
            <ui-avatar slot="prefix" size="small">MC</ui-avatar>
            <strong slot="title">Maya Chen</strong>
            <ui-intl-formatter slot="description" kind="time" value="2026-08-20T15:42:00Z" locale="en-US" time-zone="UTC"></ui-intl-formatter>
            <p slot="content">The billing migration is ready for review.</p>
          </ui-card>
          <ui-card class="example-message-bubble" data-from="me">
            <ui-avatar slot="prefix" size="small">You</ui-avatar>
            <strong slot="title">You</strong>
            <ui-intl-formatter slot="description" kind="time" value="2026-08-20T15:44:00Z" locale="en-US" time-zone="UTC"></ui-intl-formatter>
            <p slot="content">Perfect. I’ll check the final invoice sample now.</p>
            <ui-badge slot="footer" tone="positive">Delivered</ui-badge>
          </ui-card>
        </div>`,
      {
        compositionOnly: true,
        description:
          "A chat-domain pattern assembled from Card, Avatar, IntlFormatter, and Badge rather than a new base primitive.",
      },
    ),
    example(
      "Flexible action surface",
      `
        <ui-card class="catalog-example example-flex-recipe">
          <strong slot="title">Release checklist</strong>
          <span slot="description">Flex remains a catalogue layout recipe.</span>
          <ui-badge slot="value">3 remaining</ui-badge>
          <div slot="content" class="example-flex-row">
            <ui-checkbox checked>Contracts generated</ui-checkbox>
            <ui-checkbox>Visual review complete</ui-checkbox>
            <ui-checkbox>Preview shared</ui-checkbox>
          </div>
        </ui-card>`,
      { compositionOnly: true },
    ),
  ],
  "ui-image": [
    example(
      "Responsive project cover",
      `
        <figure class="catalog-example example-media-card">
          <ui-image
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='16' height='9' fill='%230a84ff'/%3E%3Cpath d='M0 7L5 3l3 2 3-3 5 5v2H0z' fill='%23ffffff' fill-opacity='.72'/%3E%3C/svg%3E"
            alt="Abstract blue project landscape"
            width="1280"
            height="720"
          >
            <span slot="placeholder">Loading project cover…</span>
            <span slot="error">Project cover unavailable</span>
          </ui-image>
          <figcaption>Aspect ratio and object fitting come from the catalogue recipe, while loading remains native.</figcaption>
        </figure>`,
      { compositionOnly: true },
    ),
    example(
      "Authored error fallback",
      `
        <ui-image class="catalog-example example-media-card" src="/missing-project-cover.webp" alt="Missing project cover">
          <div slot="error" class="example-stack">
            <strong>Project cover unavailable</strong>
            <span class="example-support">The authored fallback occupies the same semantic media surface.</span>
          </div>
        </ui-image>`,
      { compositionOnly: true },
    ),
  ],
  "ui-intl-formatter": [
    example(
      "Localized project metrics",
      `
        <dl class="catalog-example example-metric-grid">
          <div><dt>Revenue</dt><dd><ui-intl-formatter kind="currency" value="12840.5" currency="USD" locale="en-US"></ui-intl-formatter></dd></div>
          <div><dt>Conversion</dt><dd><ui-intl-formatter kind="percent" value="0.184" locale="en-US" maximum-fraction-digits="1"></ui-intl-formatter></dd></div>
          <div><dt>Migration date</dt><dd><ui-intl-formatter kind="date" value="2026-08-20T12:00:00Z" locale="en-US" date-style="long" time-zone="UTC"></ui-intl-formatter></dd></div>
        </dl>`,
      { compositionOnly: true },
    ),
  ],
  "ui-avatar": [
    example(
      "Fallbacks and group",
      `
        <div class="catalog-example example-stack">
          <div class="example-avatar-group" aria-label="Project collaborators">
            <ui-avatar size="large">MC</ui-avatar>
            <ui-avatar size="large">SO</ui-avatar>
            <ui-avatar size="large">AR</ui-avatar>
            <ui-avatar size="large">+3</ui-avatar>
          </div>
          <p class="example-support">The group is ordinary composition; every avatar keeps its own image lifecycle and fallback.</p>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-checkbox": [
    example(
      "Standalone setting",
      `
        <div class="catalog-example example-stack">
          <p class="example-eyebrow">Project delivery</p>
          <ui-checkbox name="release-notes" value="release-notes" checked>
            Email me release notes
          </ui-checkbox>
          <p class="example-support">Use a standalone checkbox for one independent preference.</p>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Inside a group",
      `
        <ui-checkbox-group class="catalog-example example-stack" label="Project notifications">
          <p class="example-eyebrow">Project notifications</p>
          <ui-checkbox name="notifications" value="deployments" checked>Deployment updates</ui-checkbox>
          <ui-checkbox name="notifications" value="reviews">Review requests</ui-checkbox>
          <ui-checkbox name="notifications" value="billing">Billing changes</ui-checkbox>
        </ui-checkbox-group>`,
      {
        compositionOnly: true,
        description: "The same checkbox becomes an option inside a labelled group.",
      },
    ),
  ],
  "ui-checkbox-group": [
    example(
      "Notification preferences",
      `
        <ui-form class="catalog-example example-form">
          <ui-fieldset legend="Project notifications">
            <p class="example-support">Choose which project events should reach you.</p>
            <ui-checkbox-group label="Project notification channels">
              <ui-checkbox name="notifications" value="deployments" checked>Deployment updates</ui-checkbox>
              <ui-checkbox name="notifications" value="reviews">Review requests</ui-checkbox>
              <ui-checkbox name="notifications" value="billing">Billing changes</ui-checkbox>
            </ui-checkbox-group>
          </ui-fieldset>
          <ui-button type="submit">Save preferences</ui-button>
        </ui-form>`,
      { compositionOnly: true },
    ),
  ],
  "ui-radio": [
    example(
      "Within a choice",
      `
        <ui-radio-group class="catalog-example example-stack" name="visibility" value="team" label="Project visibility">
          <p class="example-eyebrow">Project visibility</p>
          <ui-radio value="private">Private to me</ui-radio>
          <ui-radio value="team">Everyone in Interzone</ui-radio>
          <ui-radio value="public">Anyone with the link</ui-radio>
        </ui-radio-group>`,
      { compositionOnly: true },
    ),
  ],
  "ui-radio-group": [
    example(
      "Project visibility",
      `
        <ui-fieldset class="catalog-example example-stack" legend="Project visibility">
          <p class="example-support">Only one access policy may apply at a time.</p>
          <ui-radio-group name="visibility" value="team" label="Project visibility">
            <ui-radio value="private">Private to me</ui-radio>
            <ui-radio value="team">Everyone in Interzone</ui-radio>
            <ui-radio value="public">Anyone with the link</ui-radio>
          </ui-radio-group>
        </ui-fieldset>`,
      { compositionOnly: true },
    ),
  ],
  "ui-input": [
    example(
      "A labelled text entry",
      `
        <ui-field class="catalog-example example-field" label="Project name" description="Visible to everyone in this workspace." required>
          <ui-input slot="control" name="project-name" value="Billing migration"></ui-input>
        </ui-field>`,
      { compositionOnly: true },
    ),
  ],
  "ui-input-group": [
    example(
      "Search with affordances",
      `
        <ui-field class="catalog-example example-field" label="Search projects" description="Search by name, owner, or namespace.">
          <ui-input-group slot="control">
            <span slot="prefix" aria-hidden="true">⌕</span>
            <ui-input slot="control" type="search" label="Search projects" placeholder="Billing migration"></ui-input>
            <ui-kbd slot="suffix">⌘ K</ui-kbd>
          </ui-input-group>
        </ui-field>`,
      { compositionOnly: true },
    ),
  ],
  "ui-editor": [
    example(
      "Editing workspace",
      `
        <div class="catalog-example example-editor-workspace">
          <ui-editor
            language="typescript"
            label="Project declaration"
            value="interface Project {&#10;  title: string;&#10;  status: &quot;active&quot; | &quot;paused&quot;;&#10;}&#10;&#10;const billing: Project = {&#10;  title: &quot;Billing migration&quot;,&#10;  status: &quot;active&quot;,&#10;}"
          >
            <div slot="status" class="example-editor-status">
              <ui-badge tone="positive">TypeScript</ui-badge>
              <span>Ln 7, Col 31</span>
              <span>UTF-8</span>
            </div>
          </ui-editor>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The native editing surface remains headless while the Mash recipe realizes its gutter, viewport, and authored status slot.",
      },
    ),
    example(
      "Search and provider surfaces",
      `
        <div class="catalog-example example-editor-workspace">
          <ui-editor
            language="typescript"
            label="Searchable project declaration"
            search-open
            completion-open
            search-query="Project"
            value="type ProjectStatus = &quot;active&quot; | &quot;paused&quot;;&#10;const projectStatus: ProjectStatus = &quot;active&quot;;"
          >
            <ui-input-group slot="search" class="example-editor-search">
              <span slot="prefix" aria-hidden="true">Find</span>
              <ui-input slot="control" data-catalog-editor-search label="Find in source" value="Project"></ui-input>
              <ui-button slot="suffix" size="small" variant="secondary" data-catalog-editor-find="next">Next</ui-button>
            </ui-input-group>
            <ui-card slot="completion" elevation="raised" class="example-editor-completion">
              <strong slot="title">ProjectStatus</strong>
              <span slot="description">type alias</span>
              <ui-kbd slot="value">Tab</ui-kbd>
              <code slot="content">&quot;active&quot; | &quot;paused&quot;</code>
            </ui-card>
            <span slot="diagnostics">Status must match ProjectStatus</span>
            <div slot="status" class="example-editor-status">
              <ui-badge>TypeScript</ui-badge>
              <span>2 matches</span>
            </div>
          </ui-editor>
        </div>`,
      {
        compositionOnly: true,
        description:
          "InputGroup, Button, Card, Badge, and Kbd realize provider-owned editor slots without entering the editor primitive.",
      },
    ),
  ],
  "ui-field": [
    example(
      "Text field",
      `
        <ui-field class="catalog-example example-field" label="Project name" description="Visible to everyone in this workspace." required>
          <ui-input slot="control" name="project-name" value="Billing migration"></ui-input>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Validation",
      `
        <ui-field class="catalog-example example-field" label="Project slug" description="Used in the project URL." error="A project already uses this slug." invalid required>
          <ui-input slot="control" name="project-slug" value="billing-migration"></ui-input>
        </ui-field>`,
      { compositionOnly: true },
    ),
  ],
  "ui-fieldset": [
    example(
      "Form section",
      `
        <ui-fieldset class="catalog-example example-stack" legend="Ownership">
          <ui-field label="Project owner" description="Responsible for the next action.">
            <ui-combobox slot="control" name="owner" value="maya" label="Project owner">
              <ui-option value="maya">Maya</ui-option>
              <ui-option value="sam">Sam</ui-option>
              <ui-option value="alex">Alex</ui-option>
            </ui-combobox>
          </ui-field>
          <ui-field label="Billing contact">
            <ui-input slot="control" name="billing-contact" value="maya@interzone.test"></ui-input>
          </ui-field>
        </ui-fieldset>`,
      { compositionOnly: true },
    ),
  ],
  "ui-form": [
    example(
      "Create a project",
      `
        <ui-form class="catalog-example example-form">
          <ui-fieldset legend="New project">
            <ui-field label="Project name" description="This can be changed later." required>
              <ui-input slot="control" name="project-name" value="Billing migration"></ui-input>
            </ui-field>
            <ui-field label="Visibility">
              <ui-select slot="control" name="visibility" value="team" label="Visibility">
                <ui-option value="private">Private</ui-option>
                <ui-option value="team">Team</ui-option>
                <ui-option value="public">Public link</ui-option>
              </ui-select>
            </ui-field>
          </ui-fieldset>
          <div class="example-actions">
            <ui-button type="submit">Create project</ui-button>
            <ui-button type="reset" variant="secondary">Reset</ui-button>
          </div>
        </ui-form>`,
      { compositionOnly: true },
    ),
  ],
  "ui-select": [
    example(
      "Field control",
      `
        <ui-field class="catalog-example example-field" label="Project visibility" description="Controls who can find this project.">
          <ui-select slot="control" name="visibility" value="team" label="Project visibility">
            <span slot="icon" aria-hidden="true">⌄</span>
            <ui-option value="private">Private<span slot="indicator">✓</span></ui-option>
            <ui-option value="team">Everyone in Interzone<span slot="indicator">✓</span></ui-option>
            <ui-option value="public">Anyone with the link<span slot="indicator">✓</span></ui-option>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Grouped multiple selection",
      `
        <ui-field class="catalog-example example-field" label="Project access" description="Choose one or more audiences.">
          <ui-select slot="control" name="access" label="Project access" multiple values='["team", "guests"]'>
            <span slot="icon" aria-hidden="true">⌄</span>
            <ui-option-group label="Workspace">
              <ui-option value="team">Everyone in Interzone<span slot="indicator">✓</span></ui-option>
              <ui-option value="admins">Administrators<span slot="indicator">✓</span></ui-option>
            </ui-option-group>
            <ui-option-group label="External">
              <ui-option value="guests">Invited guests<span slot="indicator">✓</span></ui-option>
              <ui-option value="public">Anyone with the link<span slot="indicator">✓</span></ui-option>
            </ui-option-group>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
  ],
  "ui-combobox": [
    example(
      "Assign owner",
      `
        <ui-field class="catalog-example example-field" label="Project owner" description="Search the workspace to assign responsibility.">
          <ui-combobox slot="control" name="owner" value="maya" label="Project owner">
            <span slot="icon" aria-hidden="true">⌕</span>
            <ui-button slot="trigger" type="button" size="small" variant="quiet" aria-label="Show project owners">⌄</ui-button>
            <ui-button slot="clear" type="button" size="small" variant="quiet">Clear</ui-button>
            <span slot="empty">No matching people</span>
            <ui-option value="maya">Maya Chen</ui-option>
            <ui-option value="sam">Sam Okafor</ui-option>
            <ui-option value="alex">Alex Rivera</ui-option>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Multiple owners",
      `
        <ui-field class="catalog-example example-field" label="Project owners" description="Search and assign more than one owner.">
          <ui-combobox slot="control" name="owners" label="Project owners" multiple values='["maya", "sam"]'>
            <span slot="chips">
              <ui-chip value="maya">Maya Chen<ui-button slot="remove" type="button" size="small" variant="quiet" aria-label="Remove Maya">×</ui-button></ui-chip>
              <ui-chip value="sam">Sam Okafor<ui-button slot="remove" type="button" size="small" variant="quiet" aria-label="Remove Sam">×</ui-button></ui-chip>
            </span>
            <span slot="icon" aria-hidden="true">⌕</span>
            <ui-button slot="clear" type="button" size="small" variant="quiet">Clear</ui-button>
            <span slot="empty">No matching people</span>
            <ui-option-group label="People">
              <ui-option value="maya">Maya Chen<span slot="indicator">✓</span></ui-option>
              <ui-option value="sam">Sam Okafor<span slot="indicator">✓</span></ui-option>
              <ui-option value="alex">Alex Rivera<span slot="indicator">✓</span></ui-option>
            </ui-option-group>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Grid suggestions",
      `
        <ui-field class="catalog-example example-field" label="Assignee matrix" description="Arrow keys preserve row and column position.">
          <ui-combobox slot="control" name="assignee" label="Assignee matrix" grid>
            <span slot="icon" aria-hidden="true">⌕</span>
            <ui-option-row>
              <ui-option value="maya">Maya Chen</ui-option>
              <ui-option value="sam">Sam Okafor</ui-option>
            </ui-option-row>
            <ui-option-row>
              <ui-option value="alex">Alex Rivera</ui-option>
              <ui-option value="jo">Jo Bell</ui-option>
            </ui-option-row>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Externally filtered loading state",
      `
        <ui-field class="catalog-example example-field" label="Remote project" description="The caller owns async sourcing; Combobox owns the pending and listbox semantics.">
          <ui-combobox slot="control" name="remote-project" label="Remote project" filter="none" loading open>
            <span slot="icon" aria-hidden="true">⌕</span>
            <ui-spinner slot="loading" size="small" label="Searching projects"></ui-spinner>
            <span slot="empty">No remote projects found</span>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Prefix filtering",
      `
        <ui-field class="catalog-example example-field" label="Project command" description="Only option labels beginning with the query remain visible.">
          <ui-combobox slot="control" name="command" value="re" filter="starts-with" label="Project command" open>
            <span slot="icon" aria-hidden="true">⌕</span>
            <span slot="empty">No matching commands</span>
            <ui-option value="rename">Rename project</ui-option>
            <ui-option value="review">Review changes</ui-option>
            <ui-option value="archive">Archive project</ui-option>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
  ],
  "ui-autocomplete": [
    example(
      "Search projects",
      `
        <ui-field class="catalog-example example-field" label="Related project" description="Start typing to narrow the project list.">
          <ui-autocomplete slot="control" name="related-project" label="Related project">
            <span slot="icon" aria-hidden="true">⌕</span>
            <ui-button slot="clear" type="button" size="small" variant="quiet">Clear</ui-button>
            <span slot="empty">No matching projects</span>
            <ui-option-group label="Active projects">
              <ui-option value="billing">Billing migration</ui-option>
              <ui-option value="invoices">Invoice reconciliation</ui-option>
            </ui-option-group>
            <ui-option-group label="Archived projects">
              <ui-option value="ledger">Ledger export</ui-option>
            </ui-option-group>
          </ui-autocomplete>
        </ui-field>`,
      { compositionOnly: true },
    ),
  ],
  "ui-accordion": [
    example(
      "Project settings",
      `
        <ui-accordion class="catalog-example example-stack" mode="single">
          <ui-accordion-item value="general" title="General" open>
            Change the project name, slug, and default owner.
          </ui-accordion-item>
          <ui-accordion-item value="access" title="Access">
            Set visibility and manage people with access.
          </ui-accordion-item>
          <ui-accordion-item value="archive" title="Archive">
            Preserve the project without keeping it active.
          </ui-accordion-item>
        </ui-accordion>`,
      { compositionOnly: true },
    ),
  ],
  "ui-collapsible": [
    example(
      "Advanced project options",
      `
        <ui-collapsible class="catalog-example example-stack" open>
          <strong slot="trigger">Advanced project options</strong>
          <p class="example-support">Set an external reference, retention policy, or migration identifier.</p>
          <ui-field label="External reference">
            <ui-input slot="control" name="external-reference" value="REC-204"></ui-input>
          </ui-field>
        </ui-collapsible>`,
      { compositionOnly: true },
    ),
  ],
  "ui-tabs": [
    example(
      "Project settings",
      `
        <ui-tabs class="catalog-example example-tabs" value="general" label="Project settings">
          <ui-tab slot="tab" value="general">General</ui-tab>
          <ui-tab slot="tab" value="members">Members</ui-tab>
          <ui-tab slot="tab" value="activity">Activity</ui-tab>
          <ui-tab-panel slot="panel" value="general">
            <ui-field label="Project name" description="Visible across Interzone.">
              <ui-input slot="control" name="project-name" value="Billing migration"></ui-input>
            </ui-field>
          </ui-tab-panel>
          <ui-tab-panel slot="panel" value="members">
            <p>Add people who can update this project.</p>
          </ui-tab-panel>
          <ui-tab-panel slot="panel" value="activity">
            <p>Recent deployment and billing changes appear here.</p>
          </ui-tab-panel>
        </ui-tabs>`,
      { compositionOnly: true },
    ),
  ],
  "ui-toggle": [
    example(
      "In an editor toolbar",
      `
        <ui-toolbar class="catalog-example example-toolbar" label="Text formatting">
          <ui-toggle value="bold" pressed aria-label="Bold">B</ui-toggle>
          <ui-toggle value="italic" aria-label="Italic"><em>I</em></ui-toggle>
          <ui-toggle value="underline" aria-label="Underline"><u>U</u></ui-toggle>
        </ui-toolbar>`,
      { compositionOnly: true },
    ),
  ],
  "ui-toggle-group": [
    example(
      "Text alignment",
      `
        <ui-toggle-group class="catalog-example example-stack" mode="single" value="center" label="Text alignment">
          <ui-toggle value="start" aria-label="Align start">Start</ui-toggle>
          <ui-toggle value="center" aria-label="Align center">Center</ui-toggle>
          <ui-toggle value="end" aria-label="Align end">End</ui-toggle>
        </ui-toggle-group>`,
      { compositionOnly: true },
    ),
  ],
  "ui-toolbar": [
    example(
      "Text formatting",
      `
        <ui-toolbar class="catalog-example example-toolbar" label="Text formatting">
          <ui-toggle value="bold" pressed aria-label="Bold">B</ui-toggle>
          <ui-toggle value="italic" aria-label="Italic"><em>I</em></ui-toggle>
          <ui-toggle value="underline" aria-label="Underline"><u>U</u></ui-toggle>
          <ui-separator orientation="vertical"></ui-separator>
          <ui-menu label="Block type">
            <ui-button slot="trigger" variant="secondary">Paragraph</ui-button>
            <ui-menu-item value="paragraph">Paragraph</ui-menu-item>
            <ui-menu-item value="heading">Heading</ui-menu-item>
          </ui-menu>
        </ui-toolbar>`,
      { compositionOnly: true },
    ),
    example(
      "Docked editor tools",
      `
        <div class="catalog-example example-toolbar-dock">
          <span>Canvas</span>
          <ui-toolbar data-mash-toolbar-dock="top" orientation="horizontal" label="Top tools">
            <ui-toggle pressed aria-label="Select">↖</ui-toggle>
            <ui-toggle aria-label="Text">T</ui-toggle>
          </ui-toolbar>
          <ui-toolbar data-mash-toolbar-dock="right" orientation="vertical" label="Right tools">
            <ui-toggle aria-label="Comments">◌</ui-toggle>
            <ui-toggle aria-label="Inspect">⊙</ui-toggle>
          </ui-toolbar>
          <ui-toolbar data-mash-toolbar-dock="bottom" orientation="horizontal" label="Bottom tools">
            <ui-toggle aria-label="Zoom out">−</ui-toggle>
            <ui-toggle aria-label="Zoom in">+</ui-toggle>
          </ui-toolbar>
          <ui-toolbar data-mash-toolbar-dock="left" orientation="vertical" label="Left tools">
            <ui-toggle aria-label="Layers">≡</ui-toggle>
            <ui-toggle aria-label="Assets">◇</ui-toggle>
          </ui-toolbar>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Docking is an opt-in Mash recipe layout contract; toolbar keyboard semantics remain independent of screen edge.",
      },
    ),
  ],
  "ui-dialog": [
    example(
      "Rename project",
      `
        <div class="catalog-example example-stack">
          <p class="example-support">A modal asks for a focused edit, then returns focus to its trigger.</p>
          <ui-dialog label="Rename Billing migration">
            <ui-button slot="trigger">Rename project</ui-button>
            <h2 slot="title">Rename project</h2>
            <p slot="description">Use a clear name that your whole workspace will recognize.</p>
            <ui-field label="Project name" description="Visible to everyone in Interzone.">
              <ui-input slot="control" name="project-name" value="Billing migration"></ui-input>
            </ui-field>
            <div slot="close" class="example-actions">
              <ui-button variant="secondary">Cancel</ui-button>
              <ui-button>Save changes</ui-button>
            </div>
          </ui-dialog>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-alert-dialog": [
    example(
      "Archive project",
      `
        <div class="catalog-example example-stack">
          <p class="example-support">Use an alert dialog when the user must acknowledge an important consequence.</p>
          <ui-alert-dialog label="Archive Billing migration?">
            <ui-button slot="trigger" tone="critical">Archive project</ui-button>
            <h2 slot="title">Archive Billing migration?</h2>
            <p slot="description">The project will be read-only until someone restores it.</p>
            <ui-button slot="cancel" variant="secondary">Keep active</ui-button>
            <ui-button slot="confirm" tone="critical">Archive</ui-button>
          </ui-alert-dialog>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-drawer": [
    example(
      "Project activity",
      `
        <div class="catalog-example example-stack">
          <ui-drawer side="end" label="Project activity">
            <ui-button slot="trigger" variant="secondary">Open activity</ui-button>
            <h2 slot="title">Project activity</h2>
            <p slot="description">Latest changes to Billing migration.</p>
            <ui-scroll-area label="Project activity feed" class="example-activity">
              <ol>
                <li>Maya moved the project to active.</li>
                <li>Sam linked the invoice migration record.</li>
                <li>Alex requested a deployment review.</li>
              </ol>
            </ui-scroll-area>
            <div slot="close" class="example-actions"><ui-button>Done</ui-button></div>
          </ui-drawer>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-popover": [
    example(
      "Project actions",
      `
        <div class="catalog-example example-stack">
          <ui-popover label="Project actions">
            <ui-button slot="trigger" variant="secondary">Actions</ui-button>
            <strong slot="title">Billing migration</strong>
            <p slot="description">Last edited 14 minutes ago.</p>
            <ui-button slot="close" variant="quiet">Done</ui-button>
          </ui-popover>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-menu": [
    example(
      "Project actions",
      `
        <div class="catalog-example example-stack">
          <ui-menu label="Project actions">
            <ui-button slot="trigger" variant="secondary">Actions</ui-button>
            <ui-menu-item value="rename">Rename project</ui-menu-item>
            <ui-menu-item value="duplicate">Duplicate project</ui-menu-item>
            <ui-menu-item value="archive" tone="critical">Archive project</ui-menu-item>
          </ui-menu>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-context-menu": [
    example(
      "Project row",
      `
        <ui-context-menu class="catalog-example example-context-target" label="Project actions">
          <ui-card slot="trigger">
            <strong>Billing migration</strong>
            <p>Right-click this project row for actions.</p>
          </ui-card>
          <ui-menu-item value="open">Open project</ui-menu-item>
          <ui-menu-item value="copy-path">Copy project path</ui-menu-item>
          <ui-menu-item value="archive" tone="critical">Archive project</ui-menu-item>
        </ui-context-menu>`,
      { compositionOnly: true },
    ),
  ],
  "ui-preview-card": [
    example(
      "Project preview",
      `
        <div class="catalog-example example-stack">
          <p>Hover or focus the linked project for a lightweight preview.</p>
          <ui-preview-card label="Billing migration preview">
            <a slot="trigger" href="#billing-migration">Billing migration</a>
            <strong slot="title">Billing migration</strong>
            <p slot="description">Replace legacy invoicing before the next billing cycle.</p>
            <ui-badge tone="positive">Active</ui-badge>
          </ui-preview-card>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-tooltip": [
    example(
      "Compact action",
      `
        <div class="catalog-example example-stack">
          <p class="example-support">Short, non-interactive help belongs in a tooltip.</p>
          <ui-tooltip label="Create project">
            <ui-button slot="trigger" aria-label="Create project">+</ui-button>
            Create a new project
          </ui-tooltip>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Placement and trigger modes",
      `
        <div class="catalog-example example-tooltip-grid">
          <ui-tooltip label="Top detail" placement="top" open-delay="0">
            <ui-button slot="trigger" type="button" variant="secondary">Top</ui-button>
            Above the trigger
          </ui-tooltip>
          <ui-tooltip label="Right detail" placement="right" open-delay="0">
            <ui-button slot="trigger" type="button" variant="secondary">Right</ui-button>
            Beside the trigger
          </ui-tooltip>
          <ui-tooltip label="Click detail" trigger="click">
            <ui-button slot="trigger" type="button" variant="secondary">Click</ui-button>
            Click toggles this brief, non-interactive description
          </ui-tooltip>
          <ui-tooltip label="Manual detail" trigger="manual" open>
            <ui-button slot="trigger" type="button" variant="secondary">Manual</ui-button>
            Parent-owned visibility
          </ui-tooltip>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-menubar": [
    example(
      "Workspace commands",
      `
        <ui-menubar class="catalog-example example-toolbar" label="Workspace commands">
          <ui-menu label="Project menu">
            <ui-button slot="trigger" variant="quiet">Project</ui-button>
            <ui-menu-item value="new">New project</ui-menu-item>
            <ui-menu-item value="import">Import project</ui-menu-item>
          </ui-menu>
          <ui-menu label="View menu">
            <ui-button slot="trigger" variant="quiet">View</ui-button>
            <ui-menu-item value="activity">Activity</ui-menu-item>
            <ui-menu-item value="settings">Settings</ui-menu-item>
          </ui-menu>
        </ui-menubar>`,
      { compositionOnly: true },
    ),
  ],
  "ui-navigation-menu": [
    example(
      "Workspace navigation",
      `
        <ui-navigation-menu class="catalog-example example-navigation" label="Workspace">
          <a href="#projects">Projects</a>
          <a href="#activity">Activity</a>
          <a href="#members">Members</a>
          <ui-menu label="More workspace links">
            <ui-button slot="trigger" variant="quiet">More</ui-button>
            <ui-menu-item value="settings">Settings</ui-menu-item>
            <ui-menu-item value="billing">Billing</ui-menu-item>
          </ui-menu>
        </ui-navigation-menu>`,
      { compositionOnly: true },
    ),
  ],
  "ui-calendar": [
    example(
      "Calendar views",
      `
        <div class="catalog-example example-stack">
          <ui-calendar month="2026-08" value="2026-08-18" label="Billing date"></ui-calendar>
          <p class="example-support">The month and year headings switch the same state machine into month and year selection views.</p>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Two month range",
      `
        <ui-calendar class="catalog-example" month="2026-08" months="2" mode="range" value="2026-08-18/2026-09-03" label="Migration window"></ui-calendar>`,
      { compositionOnly: true },
    ),
  ],
  "ui-color-picker": [
    example(
      "Palette and HSLA controls",
      `
        <div class="catalog-example example-stack">
          <ui-color-picker label="Accent color" value="#0A84FF" open>
            <ui-button slot="trigger" variant="secondary">Choose accent</ui-button>
            <ui-color-swatch slot="preview" value="#0A84FF" disabled>Current</ui-color-swatch>
            <ui-color-swatch value="#0A84FF">Blue</ui-color-swatch>
            <ui-color-swatch value="#30D158">Green</ui-color-swatch>
            <ui-color-swatch value="#FF453A">Red</ui-color-swatch>
            <ui-slider slot="hue" min="0" max="360" step="1" label="Hue"></ui-slider>
            <ui-slider slot="saturation" min="0" max="100" step="1" label="Saturation"></ui-slider>
            <ui-slider slot="lightness" min="0" max="100" step="1" label="Lightness"></ui-slider>
            <ui-slider slot="alpha" min="0" max="100" step="1" label="Alpha"></ui-slider>
            <ui-input slot="hex" label="Hex color"></ui-input>
            <ui-button slot="clear" variant="quiet">Clear</ui-button>
            <ui-button slot="close" variant="secondary">Done</ui-button>
          </ui-color-picker>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The picker coordinates authored Mash sliders and input across hue, saturation, lightness, alpha, and hex controls.",
      },
    ),
  ],
  "ui-date-picker": [
    example(
      "Due date",
      `
        <div class="catalog-example example-stack">
          <ui-date-picker label="Due date" value="2026-08-18" open>
            <ui-button slot="trigger" variant="secondary">Choose due date</ui-button>
            <ui-calendar month="2026-08" value="2026-08-18" label="Due date"></ui-calendar>
            <ui-button slot="close" variant="secondary">Cancel</ui-button>
          </ui-date-picker>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-slider": [
    example(
      "Ticks and live value anatomy",
      `
        <ui-field class="catalog-example example-field" label="Migration confidence" description="Hover or focus the slider to reveal its current value.">
          <ui-slider slot="control" class="example-slider-ticks" name="confidence" value="75" min="0" max="100" step="25" label="Migration confidence">
            <span slot="ticks" class="example-slider-tick-row"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></span>
            <span slot="value">75%</span>
          </ui-slider>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Range, vertical, and readonly",
      `
        <div class="catalog-example example-slider-matrix">
          <ui-field label="Budget range" description="Two native thumbs preserve repeated form values.">
            <ui-slider slot="control" values="[20,80]" min="0" max="100" step="5" label="Budget range">
              <span slot="start-value">$20k</span>
              <span slot="end-value">$80k</span>
            </ui-slider>
          </ui-field>
          <ui-slider orientation="vertical" value="60" label="Vertical volume"></ui-slider>
          <ui-slider readonly value="65" label="Readonly score"></ui-slider>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-scroll-area": [
    example(
      "Activity log",
      `
        <ui-card class="catalog-example">
          <div slot="header" class="example-card-heading"><strong>Project activity</strong><ui-badge>3 new</ui-badge></div>
          <ui-scroll-area label="Project activity log" class="example-activity">
            <ol>
              <li>Maya moved the project to active.</li>
              <li>Sam linked the invoice migration record.</li>
              <li>Alex requested a deployment review.</li>
              <li>Maya assigned Billing migration to the Finance crew.</li>
              <li>Sam updated the external project reference.</li>
              <li>Priya approved the migration window.</li>
              <li>Alex attached the rollback checklist.</li>
              <li>Maya moved two dependencies into review.</li>
              <li>Sam recorded the latest invoice sample.</li>
              <li>Priya scheduled the production rehearsal.</li>
              <li>Alex resolved the final deployment warning.</li>
              <li>Maya published the release notes.</li>
              <li>Sam archived the superseded migration plan.</li>
            </ol>
          </ui-scroll-area>
        </ui-card>`,
      { compositionOnly: true },
    ),
    example(
      "Scroll target action",
      `
        <div class="catalog-example example-scroll-jump">
          <ui-scroll-area label="Migration checkpoints" class="example-activity">
            <ol>
              <li data-scroll-edge="start">Inventory legacy invoice paths</li>
              <li>Freeze the migration contract</li>
              <li>Reconcile customer balances</li>
              <li>Replay invoice fixtures</li>
              <li>Review failed payments</li>
              <li>Verify settlement totals</li>
              <li>Publish the rollback checklist</li>
              <li>Approve the production window</li>
              <li>Notify project owners</li>
              <li data-scroll-edge="end">Archive the legacy invoicer</li>
            </ol>
          </ui-scroll-area>
          <div class="example-scroll-actions">
            <ui-button type="button" size="small" variant="secondary" data-catalog-scroll-to="start">Back to top</ui-button>
            <ui-button type="button" size="small" data-catalog-scroll-to="end">Latest checkpoint</ui-button>
          </div>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The catalogue composes Button with ScrollArea; no styled scroll-to primitive is introduced.",
      },
    ),
  ],
  "ui-pagination": [
    example(
      "Result pages",
      `
        <div class="catalog-example example-pagination">
          <div class="example-pagination-heading">
            <div>
              <strong>Invoice records</strong>
              <span>420 results</span>
            </div>
            <output data-catalog-page-output>Page 6 of 42</output>
          </div>
          <ui-pagination current-page="6" total-pages="42" visible-pages="5" label="Invoice result pages"></ui-pagination>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The catalogue consumes the controlled page request so the example visibly advances while ownership stays outside the primitive.",
      },
    ),
  ],
  "ui-tree": [
    example(
      "Project hierarchy",
      `
          <ui-tree class="catalog-example" label="Interzone project hierarchy">
            <ui-tree-item kind="folder" path="/interzone" title="Interzone" expanded>
            <span slot="icon" class="example-tree-glyph" data-kind="workspace" aria-hidden="true"></span>
            <ui-badge slot="meta">workspace</ui-badge>
            <ui-tree-item slot="children" kind="folder" path="/interzone/projects" title="Projects" expanded>
              <span slot="icon" class="example-tree-glyph" data-kind="folder" aria-hidden="true"></span>
              <span slot="meta">2 records</span>
              <ui-tree-item slot="children" kind="file" path="/interzone/projects/billing-migration" title="Billing migration" selected>
                <span slot="icon" class="example-tree-glyph" data-kind="file" aria-hidden="true"></span>
                <ui-badge slot="meta" tone="positive">active</ui-badge>
              </ui-tree-item>
              <ui-tree-item slot="children" kind="file" path="/interzone/projects/invoice-reconciliation" title="Invoice reconciliation" current>
                <span slot="icon" class="example-tree-glyph" data-kind="file" aria-hidden="true"></span>
              </ui-tree-item>
            </ui-tree-item>
            <ui-tree-item slot="children" kind="folder" path="/interzone/archive" title="Archive">
              <span slot="icon" class="example-tree-glyph" data-kind="folder" aria-hidden="true"></span>
            </ui-tree-item>
          </ui-tree-item>
        </ui-tree>`,
      { compositionOnly: true },
    ),
  ],
  "ui-toast": [
    example(
      "Saved status",
      `
        <div class="catalog-example example-stack">
          <ui-toast open tone="positive" duration="0">Project preferences saved</ui-toast>
          <p class="example-support">Transient feedback confirms a completed action without taking focus.</p>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Semantic tones and icons",
      `
        <div class="catalog-example example-toast-list">
          <ui-toast open tone="positive" duration="0"><span slot="icon" aria-hidden="true">✓</span>Project saved</ui-toast>
          <ui-toast open tone="warning" duration="0"><span slot="icon" aria-hidden="true">!</span>Migration needs attention</ui-toast>
          <ui-toast open tone="critical" duration="0"><span slot="icon" aria-hidden="true">×</span>Invoice replay failed</ui-toast>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Pause on interaction",
      `
        <div class="catalog-example example-stack">
          <ui-toast open tone="neutral" duration="5000" pause-on-hover>Hover or focus to pause this notification</ui-toast>
          <p class="example-support">The remaining duration resumes after interaction leaves.</p>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-toast-stack": [
    example(
      "Workspace notifications",
      `
        <ui-toast-stack placement="top-end" limit="3" label="Workspace notifications">
          <ui-toast open duration="0" tone="positive">Project saved</ui-toast>
          <ui-toast open duration="0">Review requested</ui-toast>
          <ui-toast open duration="0" tone="warning">Migration needs attention</ui-toast>
        </ui-toast-stack>`,
      { compositionOnly: true },
    ),
    example(
      "Logical placements",
      `
        <div class="catalog-example example-toast-placement-grid">
          <ui-toast-stack placement="top-start" limit="1" label="Top start notifications">
            <ui-toast open duration="0">Top start</ui-toast>
          </ui-toast-stack>
          <ui-toast-stack placement="bottom-end" limit="1" label="Bottom end notifications">
            <ui-toast open duration="0" tone="positive">Bottom end</ui-toast>
          </ui-toast-stack>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "sh-triptych": [
    example(
      "Application sidebar composition",
      `
        <sh-triptych>
          <ui-navigation-menu slot="sidebar" class="example-sidebar-navigation" label="Interzone">
            <strong>Interzone</strong>
            <ui-link href="#projects">Projects</ui-link>
            <ui-collapsible>
              <span slot="trigger">Recent projects</span>
              <ui-link href="#billing">Billing migration</ui-link>
              <ui-link href="#invoice">Invoice reconciliation</ui-link>
            </ui-collapsible>
            <ui-link href="#activity">Activity</ui-link>
            <ui-link href="#members">Members</ui-link>
          </ui-navigation-menu>
          <ui-button slot="navigate" variant="secondary">New project</ui-button>
          <ui-path slot="locator" path="/interzone/projects/billing-migration" title="Billing migration"></ui-path>
          <ui-card slot="content" elevation="raised">
            <strong slot="title">Billing migration</strong>
            <span slot="description">Application content remains independent of sidebar layout.</span>
            <p slot="content">Replace the legacy invoice flow before the next billing cycle.</p>
          </ui-card>
          <strong slot="inspector-locator">Properties</strong>
          <ui-field slot="inspector" label="Project title">
            <ui-input slot="control" value="Billing migration"></ui-input>
          </ui-field>
        </sh-triptych>`,
      {
        compositionOnly: true,
        description:
          "Sidebar behavior is composed from Triptych, NavigationMenu, Collapsible, Link, and Button instead of a new ui-sidebar primitive.",
      },
    ),
  ],
};

/**
 * Elements whose useful preview is the family they participate in.
 *
 * These are still public elements with their own manifest pages, but rendering
 * a table cell, tab panel, option, or Shrine limb by itself teaches the wrong
 * composition. Reuse the parent's authored example so the selected element is
 * visible inside the DOM relationship that gives it meaning.
 */
const familyCompositions: Record<
  string,
  { parent: string; example?: string; openParent?: boolean }
> = {
  "sh-limb": { parent: "sh-myth" },
  "sh-pail": { parent: "sh-myth" },
  "sh-slot": { parent: "sh-myth" },
  "ui-accordion-item": { parent: "ui-accordion" },
  "ui-chip": { parent: "ui-combobox", example: "Multiple owners" },
  "ui-color-swatch": { parent: "ui-color-picker" },
  "ui-menu-item": { parent: "ui-menu", openParent: true },
  "ui-option": { parent: "ui-select", openParent: true },
  "ui-option-group": {
    parent: "ui-select",
    example: "Grouped multiple selection",
    openParent: true,
  },
  "ui-option-row": {
    parent: "ui-combobox",
    example: "Grid suggestions",
    openParent: true,
  },
  "ui-resizable-handle": { parent: "ui-resizable" },
  "ui-resizable-panel": { parent: "ui-resizable" },
  "ui-tab": { parent: "ui-tabs" },
  "ui-tab-panel": { parent: "ui-tabs" },
  "ui-table-body": { parent: "ui-table" },
  "ui-table-caption": { parent: "ui-table" },
  "ui-table-cell": { parent: "ui-table" },
  "ui-table-head": { parent: "ui-table" },
  "ui-table-header": { parent: "ui-table" },
  "ui-table-row": { parent: "ui-table" },
  "ui-tree-item": { parent: "ui-tree" },
  "ui-virtual-item": { parent: "ui-virtual-list" },
};

/** Curated system compositions take precedence; all other public examples stay manifest-driven. */
export function examplesFor(component: ComponentSchema): CatalogExample[] {
  const direct = curated[component.tagName];
  if (direct) return direct;

  const composition = familyCompositions[component.tagName];
  if (!composition) return component.examples;

  const parent = components.find((candidate) => candidate.tagName === composition.parent);
  if (!parent) return component.examples;

  const parentExamples = curated[parent.tagName] ?? parent.examples;
  const selected = composition.example
    ? parentExamples.find((candidate) => candidate.name === composition.example)
    : parentExamples[0];
  if (!selected) return component.examples;

  const code = composition.openParent
    ? selected.code.replace(`<${composition.parent}`, `<${composition.parent} open`)
    : selected.code;
  return [{ ...selected, code, compositionOnly: true }];
}

export function exampleNamed(
  component: ComponentSchema,
  name: string | null,
): CatalogExample | null {
  return name === null
    ? null
    : (examplesFor(component).find((entry) => entry.name === name) ?? null);
}

/** Whether synthesising standalone slots would create an invalid component tree. */
export function controlsPreviewAllowed(component: ComponentSchema): boolean {
  return familyCompositions[component.tagName] === undefined;
}
