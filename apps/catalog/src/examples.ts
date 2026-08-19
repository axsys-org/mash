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
            <div slot="header" class="example-card-heading">
              <ui-avatar>BM</ui-avatar>
              <div>
                <strong>Billing migration</strong>
                <span>Interzone project</span>
              </div>
              <ui-badge tone="positive">Active</ui-badge>
            </div>
            <p>Replace the legacy invoice flow before the next billing cycle.</p>
            <div slot="footer" class="example-actions">
              <ui-dialog label="Rename Billing migration">
                <ui-button slot="trigger" variant="secondary">Rename</ui-button>
                <div class="example-dialog-copy">
                  <h2>Rename project</h2>
                  <p>Choose a clear name for everyone in the workspace.</p>
                </div>
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
            <ui-option value="private">Private</ui-option>
            <ui-option value="team">Everyone in Interzone</ui-option>
            <ui-option value="public">Anyone with the link</ui-option>
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
            <ui-option value="maya">Maya Chen</ui-option>
            <ui-option value="sam">Sam Okafor</ui-option>
            <ui-option value="alex">Alex Rivera</ui-option>
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
            <ui-option value="billing">Billing migration</ui-option>
            <ui-option value="invoices">Invoice reconciliation</ui-option>
            <ui-option value="ledger">Ledger export</ui-option>
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
  ],
  "ui-dialog": [
    example(
      "Rename project",
      `
        <div class="catalog-example example-stack">
          <p class="example-support">A modal asks for a focused edit, then returns focus to its trigger.</p>
          <ui-dialog label="Rename Billing migration">
            <ui-button slot="trigger">Rename project</ui-button>
            <div class="example-dialog-copy">
              <h2>Rename project</h2>
              <p>Use a clear name that your whole workspace will recognize.</p>
            </div>
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
            <div class="example-dialog-copy">
              <h2>Archive Billing migration?</h2>
              <p>The project will be read-only until someone restores it.</p>
            </div>
            <div slot="close" class="example-actions">
              <ui-button variant="secondary">Keep active</ui-button>
              <ui-button tone="critical">Archive</ui-button>
            </div>
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
            <div class="example-dialog-copy">
              <h2>Project activity</h2>
              <p>Latest changes to Billing migration.</p>
            </div>
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
            <div class="example-popover-content">
              <strong>Billing migration</strong>
              <p>Last edited 14 minutes ago.</p>
              <div slot="close" class="example-actions"><ui-button variant="quiet">Done</ui-button></div>
            </div>
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
            <div class="example-popover-content">
              <ui-badge tone="positive">Active</ui-badge>
              <strong>Billing migration</strong>
              <p>Replace legacy invoicing before the next billing cycle.</p>
            </div>
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
          <ui-tree-item path="/interzone" title="Interzone" expanded>
            <ui-tree-item slot="children" path="/interzone/projects" title="Projects" expanded>
              <ui-tree-item slot="children" path="/interzone/projects/billing-migration" title="Billing migration"></ui-tree-item>
              <ui-tree-item slot="children" path="/interzone/projects/invoice-reconciliation" title="Invoice reconciliation"></ui-tree-item>
            </ui-tree-item>
            <ui-tree-item slot="children" path="/interzone/archive" title="Archive"></ui-tree-item>
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
export function controlsPreviewAllowed(component: ComponentSchema): boolean {
  return !examplesFor(component).some((entry) => entry.compositionOnly);
}
