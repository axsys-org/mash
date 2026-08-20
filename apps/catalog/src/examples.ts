import type { ComponentSchema, Example } from "./schema.js";

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
}

const example = (
  name: string,
  code: string,
  options: Pick<CatalogExample, "compositionOnly" | "description"> = {},
): CatalogExample => ({ name, code: code.trim(), ...options });

/**
 * Compositions that demonstrate a component in a real UI relationship.
 *
 * These are intentionally catalog-owned rather than copied into every
 * component's JSDoc: a card with a dialog or a fieldset with a checkbox group
 * is documentation for the system, not a new public API on either primitive.
 */
const curated: Record<string, CatalogExample[]> = {
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
          "The picker coordinates authored Mash sliders and input through renderer-neutral hue, saturation, lightness, alpha, and hex nodes.",
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
  ],
  "ui-tree": [
    example(
      "Project hierarchy",
      `
        <ui-tree class="catalog-example" label="Interzone project hierarchy">
          <ui-tree-item kind="folder" path="/interzone" title="Interzone" expanded>
            <span slot="icon" aria-hidden="true">▣</span>
            <span slot="meta">workspace</span>
            <ui-tree-item slot="children" kind="folder" path="/interzone/projects" title="Projects" expanded>
              <span slot="icon" aria-hidden="true">▤</span>
              <span slot="meta">2 records</span>
              <ui-tree-item slot="children" kind="file" path="/interzone/projects/billing-migration" title="Billing migration" selected>
                <span slot="icon" aria-hidden="true">◆</span>
                <span slot="meta">active</span>
              </ui-tree-item>
              <ui-tree-item slot="children" kind="file" path="/interzone/projects/invoice-reconciliation" title="Invoice reconciliation" current>
                <span slot="icon" aria-hidden="true">◆</span>
              </ui-tree-item>
            </ui-tree-item>
            <ui-tree-item slot="children" kind="folder" path="/interzone/archive" title="Archive">
              <span slot="icon" aria-hidden="true">▤</span>
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
  ],
};

/** Curated system compositions take precedence; all other public examples stay manifest-driven. */
export function examplesFor(component: ComponentSchema): CatalogExample[] {
  return curated[component.tagName] ?? component.examples;
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
export function controlsPreviewAllowed(_component: ComponentSchema): boolean {
  return true;
}
