import { components, tokens, valueOf, type ComponentSchema, type Example } from "./schema.js";

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

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const alphabetSections = alphabet
  .map(
    (letter, index) => `
      <section class="example-scroll-alpha-section" data-scroll-id="letter-${letter.toLowerCase()}" data-scroll-snap>
        <strong>${letter}</strong>
        <span>${["Archive", "Billing", "Contract", "Dependency", "Environment"][index % 5]} ${index + 1}</span>
        <span>${["Owner", "Project", "Record", "Status", "Workspace"][(index + 2) % 5]}</span>
      </section>`,
  )
  .join("");
const alphabetDetents = alphabet
  .map(
    (letter) =>
      `<button type="button" class="example-scroll-detent example-scroll-letter" slot="block-detents" data-scroll-target="letter-${letter.toLowerCase()}" data-scroll-behavior="smooth" aria-label="Scroll to ${letter}">${letter}</button>`,
  )
  .join("");
const readingSections = Array.from(
  { length: 16 },
  (_, index) => `
    <section class="example-scroll-reading-section" data-scroll-id="reading-${index + 1}" data-scroll-snap>
      <span class="example-eyebrow">Section ${String(index + 1).padStart(2, "0")}</span>
      <h3>${["Namespace contracts", "Motion ownership", "Renderer boundaries", "Semantic events"][index % 4]}</h3>
      <p>Keep authored content independent from its scrollbar realization. The rail reports position and intent while the native viewport retains focus, touch, wheel, and keyboard behavior.</p>
      <pre><code>scroll target-${index + 1} / detent-${String(index + 1).padStart(2, "0")}</code></pre>
    </section>`,
).join("");
const readingDetents = Array.from({ length: 32 }, (_, index) => {
  const percentage = (index / 31) * 100;
  const major = index % 4 === 0;
  return `<span class="example-scroll-detent example-scroll-reading-detent${major ? " example-scroll-reading-detent-major" : ""}" slot="block-detents" data-scroll-detent="${percentage.toFixed(3)}" aria-hidden="true"></span>`;
}).join("");
const scrollCanvasRows = Array.from({ length: 12 }, (_rowValue, rowIndex) => {
  const row = rowIndex + 1;
  const cards = Array.from({ length: 8 }, (_columnValue, columnIndex) => {
    const column = columnIndex + 1;
    const columnTarget = row === 1 ? ` data-scroll-id="column-${column}"` : "";
    return `<ui-card class="example-scroll-canvas-card"${columnTarget}>
      <strong slot="title">${String.fromCharCode(64 + column)}${row}</strong>
      <span slot="description">Namespace cell</span>
      <ui-badge slot="value">${row * column}</ui-badge>
      <span slot="content">Renderer-neutral content at row ${row}, column ${column}.</span>
    </ui-card>`;
  }).join("");
  return `<section class="example-scroll-canvas-row" data-scroll-id="row-${row}">${cards}</section>`;
}).join("");

const virtualFeedSeed = [
  {
    key: "MAS-142",
    title: "Preserve filter state in shared views",
    area: "Views",
    actor: "Maya Chen",
    initials: "MC",
    status: "In progress",
    tone: "positive",
  },
  {
    key: "MAS-138",
    title: "Ship keyboard navigation for issue lists",
    area: "Accessibility",
    actor: "Sam Ortiz",
    initials: "SO",
    status: "Review",
    tone: "warning",
  },
  {
    key: "MAS-133",
    title: "Add cycle progress to team overview",
    area: "Cycles",
    actor: "Alex Rivera",
    initials: "AR",
    status: "Planned",
    tone: "neutral",
  },
  {
    key: "MAS-129",
    title: "Clarify archived project permissions",
    area: "Projects",
    actor: "Priya Jain",
    initials: "PJ",
    status: "Blocked",
    tone: "critical",
  },
  {
    key: "MAS-121",
    title: "Normalize compact density tokens",
    area: "Foundations",
    actor: "Rina Malik",
    initials: "RM",
    status: "Done",
    tone: "positive",
  },
] as const;

const virtualFeedItems = Array.from({ length: 36 }, (_value, index) => {
  const item = virtualFeedSeed[index % virtualFeedSeed.length]!;
  const cycle = Math.floor(index / virtualFeedSeed.length) + 1;
  const logicalKey = `${item.key}-${cycle}`;
  const size = index % 5 === 1 ? 84 : index % 3 === 0 ? 76 : 68;

  return `
    <ui-virtual-item size="${size}" data-catalog-virtual-item="${index}">
      <article class="example-virtual-row">
        <ui-avatar size="small">${item.initials}</ui-avatar>
        <span class="example-virtual-copy">
          <span class="example-virtual-meta"><ui-badge size="small">${logicalKey}</ui-badge><span>${item.area}</span><span>${item.actor}</span></span>
          <ui-link variant="quiet" href="#${logicalKey.toLocaleLowerCase()}">${item.title}</ui-link>
        </span>
        <ui-badge size="small" tone="${item.tone}">${item.status}</ui-badge>
      </article>
    </ui-virtual-item>`;
}).join("");

const displayTheme = "light";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const motionRecipes = [
  {
    name: "none",
    state: "active",
    target: "content",
    label: "No visual recipe",
    note: "Lifecycle only",
  },
  {
    name: "custom",
    state: "active",
    target: "content",
    label: "Part-owned CSS",
    note: "Authored realization",
  },
  {
    name: "fade",
    state: "active",
    target: "content",
    label: "Opacity shift",
    note: "Control timing",
  },
  {
    name: "scale",
    state: "active",
    target: "content",
    label: "Pressed scale",
    note: "Snappy spring",
  },
  {
    name: "slide-inline",
    state: "entering",
    target: "content",
    label: "Inline entry",
    note: "Directional distance",
  },
  {
    name: "slide-block",
    state: "entering",
    target: "content",
    label: "Block entry",
    note: "Directional distance",
  },
  {
    name: "rotate",
    state: "active",
    target: "content",
    label: "Quarter turn",
    note: "Control response",
  },
  {
    name: "spin",
    state: "loading",
    target: "content",
    label: "Continuous spin",
    note: "Loading state",
  },
  {
    name: "pulse",
    state: "loading",
    target: "content",
    label: "Breathing pulse",
    note: "Loading state",
  },
  {
    name: "shake",
    state: "active",
    target: "content",
    label: "Inline nudge",
    note: "Attention state",
  },
  {
    name: "blur",
    state: "entering",
    target: "content",
    label: "Optical entry",
    note: "Surface timing",
  },
] as const;

const motionTargets = ["root", "underlay", "content", "overlay", "indicator"] as const;

const motionTokenGroups = [
  {
    title: "Timing",
    ids: ["duration.control", "duration.transient", "duration.surface"],
  },
  {
    title: "Easing",
    ids: ["easing.control", "easing.surface", "easing.springGentle", "easing.springSnappy"],
  },
  {
    title: "Distance",
    ids: ["motion.distance.short", "motion.distance.medium", "motion.distance.long"],
  },
  {
    title: "Scale",
    ids: [
      "motion.scale.rest",
      "motion.scale.enter",
      "motion.scale.pressed",
      "motion.scale.emphasized",
    ],
  },
  {
    title: "Optical",
    ids: [
      "motion.blur.none",
      "motion.blur.subtle",
      "motion.blur.emphasized",
      "motion.opacity.hidden",
      "motion.opacity.muted",
      "motion.opacity.visible",
    ],
  },
  {
    title: "Rotation",
    ids: ["motion.rotation.none", "motion.rotation.quarter", "motion.rotation.full"],
  },
] as const;

function motionRecipeMatrixCode(): string {
  return `
        <section class="catalog-example example-motion-system" data-catalog-motion-demo>
          <div class="example-motion-heading">
            <span><strong>Semantic recipe matrix</strong><span class="example-support">Every built-in ui-motion recipe, its intended state, and the target lane it animates.</span></span>
          </div>
          <div class="example-motion-recipe-grid">
            ${motionRecipes
              .map(
                (recipe) => `
                  <article class="example-motion-tile" data-catalog-motion-item>
                    <ui-motion
                      class="example-motion-scene${recipe.name === "custom" ? " example-motion-custom" : ""}"
                      motion="${recipe.name}"
                      state="${recipe.state}"
                      target="${recipe.target}"
                      data-catalog-motion
                      data-catalog-motion-state="${recipe.state}"
                    >
                      <span class="example-motion-sample">${recipe.label}</span>
                    </ui-motion>
                    <div class="example-motion-tile-copy">
                      <span><code>${recipe.name}</code><span>${recipe.state} · ${recipe.note}</span></span>
                      <ui-button type="button" size="small" variant="quiet" data-catalog-motion-replay>Replay</ui-button>
                    </div>
                  </article>`,
              )
              .join("")}
          </div>
          <output data-catalog-motion-output>Recipe matrix ready</output>
        </section>`;
}

function motionTargetMatrixCode(): string {
  return `
        <section class="catalog-example example-motion-system" data-catalog-motion-demo>
          <div class="example-motion-heading">
            <span><strong>Scene target lanes</strong><span class="example-support">The same pulse recipe can target the whole scene or any one authored lane.</span></span>
          </div>
          <div class="example-motion-target-grid">
            ${motionTargets
              .map(
                (target) => `
                  <article class="example-motion-tile example-motion-lane-tile" data-catalog-motion-item>
                    <ui-motion
                      class="example-motion-scene example-motion-lanes"
                      motion="pulse"
                      state="loading"
                      target="${target}"
                      data-catalog-motion
                      data-catalog-motion-state="loading"
                    >
                      <span slot="underlay" class="example-motion-lane example-motion-underlay">underlay</span>
                      <span class="example-motion-lane example-motion-content">content</span>
                      <span slot="overlay" class="example-motion-lane example-motion-overlay">overlay</span>
                      <ui-badge slot="indicator" tone="positive">indicator</ui-badge>
                    </ui-motion>
                    <div class="example-motion-tile-copy">
                      <span><code>target="${target}"</code><span>${target === "root" ? "all lanes" : `${target} lane`}</span></span>
                      <ui-button type="button" size="small" variant="quiet" data-catalog-motion-replay>Replay</ui-button>
                    </div>
                  </article>`,
              )
              .join("")}
          </div>
          <output data-catalog-motion-output>Lane matrix ready</output>
        </section>`;
}

function motionTokenRow(id: string): string {
  const token = tokens[id];
  if (!token) return "";
  const description = token.description ? `<span>${escapeHtml(token.description)}</span>` : "";
  return `
                  <div class="example-motion-token-row">
                    <code>${escapeHtml(token.cssVar)}</code>
                    <strong>${escapeHtml(valueOf(token, displayTheme))}</strong>
                    ${description}
                  </div>`;
}

function motionTokenReferenceCode(): string {
  return `
        <section class="catalog-example example-motion-reference" data-catalog-motion-demo>
          <div class="example-motion-heading">
            <span><strong>Token contract</strong><span class="example-support">The semantic timing, easing, spatial, optical, and rotational values that motion recipes consume.</span></span>
            <ui-motion class="example-motion-token-probe" motion="blur" state="entering" target="content" data-catalog-motion data-catalog-motion-state="entering">
              <span>token probe</span>
            </ui-motion>
          </div>
          <div class="example-motion-reference-grid">
            ${motionTokenGroups
              .map(
                (group) => `
                  <section class="example-motion-reference-group">
                    <h3>${group.title}</h3>
                    ${group.ids.map(motionTokenRow).join("")}
                  </section>`,
              )
              .join("")}
          </div>
        </section>`;
}

function motionUtilityReferenceCode(): string {
  return `
        <section class="catalog-example example-motion-utility-demo" data-catalog-motion-utility-demo>
          <div class="example-motion-heading">
            <span><strong>Utility composition</strong><span class="example-support">Token-generated classes supply the timing and destination values; the app owns when the state is applied.</span></span>
            <ui-button type="button" size="small" variant="secondary" data-catalog-motion-utility-toggle>Apply</ui-button>
          </div>
          <div class="example-motion-utility-grid">
            <article class="example-motion-utility-card">
              <span class="example-motion-utility-copy"><code>motion-control</code><code>scale-motion-pressed</code></span>
              <button type="button" class="example-motion-utility-sample example-motion-utility-button motion-control data-[motion-utility-active=true]:scale-motion-pressed" data-catalog-motion-utility-target>Control press</button>
            </article>
            <article class="example-motion-utility-card">
              <span class="example-motion-utility-copy"><code>motion-surface</code><code>translate-x-motion-short</code></span>
              <span class="example-motion-utility-sample motion-surface data-[motion-utility-active=true]:translate-x-motion-short" data-catalog-motion-utility-target>Surface offset</span>
            </article>
            <article class="example-motion-utility-card">
              <span class="example-motion-utility-copy"><code>motion-surface</code><code>opacity-motion-muted</code><code>blur-motion-subtle</code></span>
              <span class="example-motion-utility-sample motion-surface data-[motion-utility-active=true]:opacity-motion-muted data-[motion-utility-active=true]:blur-motion-subtle" data-catalog-motion-utility-target>Optical state</span>
            </article>
            <article class="example-motion-utility-card">
              <span class="example-motion-utility-copy"><code>animate-fade-in</code></span>
              <span class="example-motion-utility-sample data-[motion-utility-active=true]:animate-fade-in" data-catalog-motion-utility-target>Entry keyframe</span>
            </article>
          </div>
          <output data-catalog-motion-utility-output>Utilities at rest</output>
        </section>`;
}

function motionSystemConsumersCode(): string {
  return `
        <section class="catalog-example example-motion-consumers" data-catalog-motion-demo>
          <div class="example-motion-heading">
            <span><strong>System consumers</strong><span class="example-support">Component recipes share the same motion contract for controls, overlays, feedback, and progress.</span></span>
            <ui-motion class="example-motion-token-probe" motion="fade" state="active" target="content" data-catalog-motion data-catalog-motion-state="active">
              <span>component probe</span>
            </ui-motion>
          </div>
          <div class="example-motion-consumer-grid">
            <div class="example-motion-consumer-slot">
              <ui-button type="button" loading>Saving preferences</ui-button>
            </div>
            <div class="example-motion-consumer-slot">
              <ui-menu label="Transient commands" density="compact" open>
                <ui-button slot="trigger" type="button" variant="secondary">Commands</ui-button>
                <ui-menu-item value="open">Open project</ui-menu-item>
                <ui-menu-item value="search">Search project</ui-menu-item>
              </ui-menu>
            </div>
            <div class="example-motion-consumer-slot">
              <ui-popover label="Surface motion" placement="bottom-start" open>
                <ui-button slot="trigger" type="button" variant="secondary">Details</ui-button>
                <p>Anchored surfaces use enter/exit states and the surface duration tier.</p>
              </ui-popover>
            </div>
            <div class="example-motion-progress-set example-motion-consumer-slot">
              <ui-progress indeterminate label="Indexing workspace"></ui-progress>
              <ui-progress shape="circular" indeterminate label="Syncing workspace"></ui-progress>
            </div>
            <div class="example-motion-consumer-slot">
              <ui-toast open duration="0" tone="positive">Animation contract indexed</ui-toast>
            </div>
          </div>
        </section>`;
}

function staggerCenterOriginCode(): string {
  return `
        <section class="catalog-example example-stagger-demo" data-catalog-motion-demo>
          <div class="example-motion-heading">
            <span><strong>Center-origin entrance</strong><span class="example-support">The parent writes delay variables; each child owns its visual motion.</span></span>
            <ui-button type="button" size="small" variant="secondary" data-catalog-motion-replay>Replay</ui-button>
          </div>
          <ui-stagger class="example-stagger-list" step="56" origin="center">
            <ui-motion motion="slide-block" state="entering" data-catalog-motion data-catalog-motion-state="entering">
              <span class="example-stagger-item"><strong>Profile</strong><span>Primary identity synced</span></span>
            </ui-motion>
            <ui-motion motion="slide-block" state="entering" data-catalog-motion data-catalog-motion-state="entering">
              <span class="example-stagger-item"><strong>Billing</strong><span>Ledger updated</span></span>
            </ui-motion>
            <ui-motion motion="slide-block" state="entering" data-catalog-motion data-catalog-motion-state="entering">
              <span class="example-stagger-item"><strong>Permissions</strong><span>Team roles indexed</span></span>
            </ui-motion>
            <ui-motion motion="slide-block" state="entering" data-catalog-motion data-catalog-motion-state="entering">
              <span class="example-stagger-item"><strong>Audit</strong><span>Exports queued</span></span>
            </ui-motion>
            <ui-motion motion="slide-block" state="entering" data-catalog-motion data-catalog-motion-state="entering">
              <span class="example-stagger-item"><strong>Archive</strong><span>Retention checked</span></span>
            </ui-motion>
          </ui-stagger>
          <output data-catalog-motion-output>Center origin · 56ms step</output>
        </section>`;
}

function staggerIndexedOriginCode(): string {
  return `
        <section class="catalog-example example-stagger-demo" data-catalog-motion-demo>
          <div class="example-motion-heading">
            <span><strong>Selected-origin pulse</strong><span class="example-support">origin-index lets a selected item become the zero-delay point.</span></span>
            <ui-button type="button" size="small" variant="secondary" data-catalog-motion-replay>Replay</ui-button>
          </div>
          <ui-stagger class="example-stagger-rail" step="42" origin="index" origin-index="2">
            <ui-motion motion="pulse" state="loading" data-catalog-motion data-catalog-motion-state="loading"><span>Draft</span></ui-motion>
            <ui-motion motion="pulse" state="loading" data-catalog-motion data-catalog-motion-state="loading"><span>Review</span></ui-motion>
            <ui-motion motion="pulse" state="loading" data-catalog-motion data-catalog-motion-state="loading"><span>Active</span></ui-motion>
            <ui-motion motion="pulse" state="loading" data-catalog-motion data-catalog-motion-state="loading"><span>Ready</span></ui-motion>
            <ui-motion motion="pulse" state="loading" data-catalog-motion data-catalog-motion-state="loading"><span>Done</span></ui-motion>
          </ui-stagger>
          <output data-catalog-motion-output>Index origin · item 2</output>
        </section>`;
}

function revealMeasuredPresenceCode(): string {
  return `
        <section class="catalog-example example-reveal-demo" data-catalog-reveal-demo>
          <div class="example-motion-heading">
            <span><strong>Measured presence</strong><span class="example-support">The content remains mounted while the closing animation settles.</span></span>
            <ui-button type="button" size="small" variant="secondary" data-catalog-reveal-toggle>Close</ui-button>
          </div>
          <ui-reveal open data-catalog-reveal>
            <div class="example-reveal-panel">
              <strong>Release readiness</strong>
              <span>Three checks complete, one deployment window reserved, and the audit trail is attached.</span>
              <ui-progress value="78" label="Release readiness"></ui-progress>
            </div>
          </ui-reveal>
          <output data-catalog-reveal-output>Open · present</output>
        </section>`;
}

function revealInlineAxisCode(): string {
  return `
        <section class="catalog-example example-reveal-demo" data-catalog-reveal-demo>
          <div class="example-motion-heading">
            <span><strong>Inline-axis reveal</strong><span class="example-support">The same presence lifecycle can clip width for compact status affordances.</span></span>
            <ui-button type="button" size="small" variant="secondary" data-catalog-reveal-toggle>Close</ui-button>
          </div>
          <ui-reveal axis="inline" open data-catalog-reveal>
            <span class="example-reveal-pill"><ui-badge tone="positive">Synced</ui-badge><span>Workspace index refreshed</span></span>
          </ui-reveal>
          <output data-catalog-reveal-output>Open · inline</output>
        </section>`;
}

/**
 * Compositions that demonstrate a component in a real UI relationship.
 *
 * These are intentionally catalog-owned rather than copied into every
 * component's JSDoc: a card with a dialog or a fieldset with a checkbox group
 * is documentation for the system, not a new public API on either primitive.
 */
const curated: Record<string, CatalogExample[]> = {
  "ui-gesture-binding": [
    example(
      "Command convergence",
      `
        <section id="gesture-command-surface" class="catalog-example example-gesture-command" tabindex="0" data-catalog-gesture-demo>
          <ui-card>
            <div slot="header" class="example-card-heading">
              <span><strong>Inspect billing migration</strong><span class="example-support">Press the surface or use the same keyboard command.</span></span>
              <ui-kbd command="workspace.inspect" shortcut="Primary+K"></ui-kbd>
            </div>
            <p slot="content">Pointer and keyboard recognizers produce one parent-owned semantic intent.</p>
          </ui-card>
          <div class="example-gesture-status">
            <ui-badge data-catalog-gesture-state>idle</ui-badge>
            <output data-catalog-gesture-output>Waiting for workspace.inspect</output>
          </div>
          <ui-gesture-binding for="gesture-command-surface" gesture="press" command="workspace.inspect" group="invoke"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-command-surface" gesture="key" shortcut="Primary+K" command="workspace.inspect" group="invoke" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-command-surface" gesture="hover" command="workspace.preview" group="presence" simultaneous></ui-gesture-binding>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Press, hover, and a portable Primary+K chord remain distinct recognizers while semantic commands provide the shared integration boundary. ui-kbd only advertises the binding.",
      },
    ),
    example(
      "Gesture arena",
      `
        <section class="catalog-example example-gesture-arena-shell" data-catalog-gesture-demo>
          <div id="gesture-arena-surface" class="example-gesture-arena" tabindex="0" data-catalog-gesture-drag>
            <ui-icon name="action.drag" label="Gesture arena"></ui-icon>
            <div><strong>Project card gesture arena</strong><span>Press selects · hold previews · drag moves · wheel scrubs</span></div>
            <ui-kbd command="canvas.select" shortcut="Enter"></ui-kbd>
          </div>
          <div class="example-gesture-status">
            <ui-badge data-catalog-gesture-state>possible</ui-badge>
            <output data-catalog-gesture-output>Move far enough for drag to defeat press.</output>
          </div>
          <ui-gesture-binding id="arena-press" for="gesture-arena-surface" gesture="press" command="canvas.select" group="canvas" threshold="8"></ui-gesture-binding>
          <ui-gesture-binding id="arena-preview" for="gesture-arena-surface" gesture="long-press" command="canvas.preview" group="canvas" priority="5" delay="550"></ui-gesture-binding>
          <ui-gesture-binding id="arena-drag" for="gesture-arena-surface" gesture="drag" command="canvas.move" group="canvas" priority="10" threshold="6" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-arena-surface" gesture="wheel" command="canvas.scrub" group="scroll" axis="y" simultaneous prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-arena-surface" gesture="key" shortcut="Enter" command="canvas.select" group="canvas" prevent-default="recognized"></ui-gesture-binding>
        </section>`,
      {
        compositionOnly: true,
        description:
          "One target hosts competing discrete and continuous recognizers. Priority, threshold, group, and simultaneous policies decide which semantic command wins without teaching the primitive what a project card means.",
        stageLayout: "fill",
      },
    ),
    example(
      "Shortcut command map",
      `
        <section id="gesture-shortcut-surface" class="catalog-example example-gesture-shortcuts" tabindex="0" data-catalog-gesture-demo>
          <div class="example-gesture-heading">
            <span><strong>Workspace commands</strong><span class="example-support">Focus this panel, then invoke any command by pointer or keyboard.</span></span>
            <ui-badge data-catalog-gesture-state>focused target</ui-badge>
          </div>
          <div class="example-gesture-command-list">
            <ui-button id="gesture-command-search" type="button" variant="quiet" data-gesture-command-label="Search projects">
              <ui-icon name="action.search" label=""></ui-icon><span>Search projects</span><ui-kbd command="workspace.search" shortcut="Primary+K"></ui-kbd>
            </ui-button>
            <ui-button id="gesture-command-palette" type="button" variant="quiet" data-gesture-command-label="Open command palette">
              <ui-icon name="object.terminal" label=""></ui-icon><span>Command palette</span><ui-kbd command="workspace.palette" shortcut="Primary+Shift+P"></ui-kbd>
            </ui-button>
            <ui-button id="gesture-command-dismiss" type="button" variant="quiet" data-gesture-command-label="Dismiss current layer">
              <ui-icon name="action.dismiss" label=""></ui-icon><span>Dismiss layer</span><ui-kbd command="workspace.dismiss" shortcut="Escape"></ui-kbd>
            </ui-button>
          </div>
          <div class="example-gesture-status">
            <ui-badge>command</ui-badge>
            <output data-catalog-gesture-output>Waiting for a workspace command.</output>
          </div>
          <ui-gesture-binding for="gesture-command-search" gesture="press" command="workspace.search" group="search"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-shortcut-surface" gesture="key" shortcut="Primary+K" command="workspace.search" group="search" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-command-palette" gesture="press" command="workspace.palette" group="palette"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-shortcut-surface" gesture="key" shortcut="Primary+Shift+P" command="workspace.palette" group="palette" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-command-dismiss" gesture="press" command="workspace.dismiss" group="dismiss"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-shortcut-surface" gesture="key" shortcut="Escape" command="workspace.dismiss" group="dismiss" prevent-default="recognized"></ui-gesture-binding>
        </section>`,
      {
        compositionOnly: true,
        description:
          "One focusable command scope owns several keyboard bindings while the visible buttons retain their normal pointer path. ui-kbd describes the contract without executing it.",
      },
    ),
    example(
      "Modifier range selection",
      `
        <section class="catalog-example example-gesture-selection" data-catalog-gesture-demo data-gesture-selection-demo>
          <div class="example-gesture-heading">
            <span><strong>Issue range</strong><span class="example-support">Select an anchor, then Shift-click another issue to extend the range.</span></span>
            <ui-kbd>SHIFT + CLICK</ui-kbd>
          </div>
          <div class="example-gesture-selection-list" role="listbox" aria-label="Issues" aria-multiselectable="true">
            <ui-button id="gesture-select-0" type="button" variant="quiet" role="option" aria-selected="false" data-gesture-selection-key="MAS-142"><ui-badge size="small">MAS-142</ui-badge><span>Preserve filter state</span></ui-button>
            <ui-button id="gesture-select-1" type="button" variant="quiet" role="option" aria-selected="false" data-gesture-selection-key="MAS-138"><ui-badge size="small">MAS-138</ui-badge><span>Keyboard navigation</span></ui-button>
            <ui-button id="gesture-select-2" type="button" variant="quiet" role="option" aria-selected="false" data-gesture-selection-key="MAS-133"><ui-badge size="small">MAS-133</ui-badge><span>Cycle progress</span></ui-button>
            <ui-button id="gesture-select-3" type="button" variant="quiet" role="option" aria-selected="false" data-gesture-selection-key="MAS-129"><ui-badge size="small">MAS-129</ui-badge><span>Project permissions</span></ui-button>
          </div>
          <div class="example-gesture-status"><ui-badge data-catalog-gesture-state>idle</ui-badge><output data-catalog-gesture-output>Select an issue.</output></div>
          ${[0, 1, 2, 3]
            .map(
              (index) => `
                <ui-gesture-binding for="gesture-select-${index}" gesture="press" command="selection.set" group="selection-${index}"></ui-gesture-binding>
                <ui-gesture-binding for="gesture-select-${index}" gesture="press" modifiers="Shift" command="selection.extend" group="selection-${index}" priority="1"></ui-gesture-binding>`,
            )
            .join("")}
        </section>`,
      {
        compositionOnly: true,
        description:
          "Exact modifier chords turn ordinary pointer input into distinct semantic commands. The parent example, not the recognizer, owns the anchor and selected range.",
      },
    ),
    example(
      "Continuous timeline scrub",
      `
        <section class="catalog-example example-gesture-scrubber" data-catalog-gesture-demo data-gesture-scrubber data-gesture-value="46">
          <div class="example-gesture-heading">
            <span><strong>Timeline position</strong><span class="example-support">Drag the track, use the wheel, press the step buttons, or use arrow keys.</span></span>
            <output data-gesture-value-output>46%</output>
          </div>
          <div id="gesture-scrub-track" class="example-gesture-scrub-track" tabindex="0">
            <ui-progress value="46" label="Timeline position 46 percent" data-gesture-progress></ui-progress>
            <span class="example-gesture-scrub-thumb" aria-hidden="true"></span>
          </div>
          <ui-toolbar aria-label="Timeline controls">
            <ui-button id="gesture-step-back" type="button" size="small" variant="secondary" aria-label="Step backward">−</ui-button>
            <div class="example-gesture-status"><ui-badge data-catalog-gesture-state>idle</ui-badge><output data-catalog-gesture-output>Ready to scrub.</output></div>
            <ui-button id="gesture-step-forward" type="button" size="small" variant="secondary" aria-label="Step forward">+</ui-button>
          </ui-toolbar>
          <ui-gesture-binding for="gesture-scrub-track" gesture="drag" axis="x" threshold="2" command="timeline.scrub" group="timeline" priority="10" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-scrub-track" gesture="wheel" axis="both" command="timeline.scrub" group="timeline-wheel" simultaneous prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-scrub-track" gesture="key" shortcut="ArrowLeft" command="timeline.step-back" group="timeline-key" prevent-default="recognized" repeat></ui-gesture-binding>
          <ui-gesture-binding for="gesture-scrub-track" gesture="key" shortcut="ArrowRight" command="timeline.step-forward" group="timeline-key" prevent-default="recognized" repeat></ui-gesture-binding>
          <ui-gesture-binding for="gesture-step-back" gesture="press" command="timeline.step-back" group="timeline-step-back"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-step-forward" gesture="press" command="timeline.step-forward" group="timeline-step-forward"></ui-gesture-binding>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Drag, wheel, keyboard, and buttons converge on a controlled timeline value. The gesture layer reports input deltas; the example owns clamping, progress, and presentation.",
      },
    ),
    example(
      "Transient hover preview",
      `
        <section class="catalog-example example-gesture-preview" data-catalog-gesture-demo data-gesture-preview-demo>
          <div class="example-gesture-preview-list" aria-label="Projects">
            <ui-button id="gesture-preview-billing" type="button" variant="quiet" data-gesture-preview-title="Billing migration" data-gesture-preview-copy="Payment infrastructure moves to the new ledger on Friday."><ui-badge size="small" tone="positive">Active</ui-badge><span>Billing migration</span></ui-button>
            <ui-button id="gesture-preview-invoice" type="button" variant="quiet" data-gesture-preview-title="Invoice reconciliation" data-gesture-preview-copy="Three accounting exceptions still need an owner."><ui-badge size="small" tone="warning">Review</ui-badge><span>Invoice reconciliation</span></ui-button>
            <ui-button id="gesture-preview-archive" type="button" variant="quiet" data-gesture-preview-title="Archive import" data-gesture-preview-copy="Historical records are paused while retention rules are verified."><ui-badge size="small">Paused</ui-badge><span>Archive import</span></ui-button>
          </div>
          <ui-card class="example-gesture-preview-card" data-gesture-preview-card>
            <strong slot="title" data-gesture-preview-card-title>Hover a project</strong>
            <span slot="description" data-gesture-preview-card-copy>Transient preview state appears here.</span>
          </ui-card>
          <div class="example-gesture-status"><ui-badge data-catalog-gesture-state>idle</ui-badge><output data-catalog-gesture-output>Waiting for hover intent.</output></div>
          <ui-gesture-binding for="gesture-preview-billing" gesture="hover" command="preview.project" group="preview"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-preview-invoice" gesture="hover" command="preview.project" group="preview"></ui-gesture-binding>
          <ui-gesture-binding for="gesture-preview-archive" gesture="hover" command="preview.project" group="preview"></ui-gesture-binding>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Hover emits a began/ended lifecycle instead of mutating a popover. The parent decides what preview surface to populate and how to clear transient state.",
      },
    ),
  ],
  "ui-label": [
    example(
      "Secondary text and highlights",
      `
        <div class="catalog-example example-label-stack">
          <ui-label text="Company address" secondary="(optional)"></ui-label>
          <ui-label text="Billing migration" highlight="bill" highlight-match="prefix"></ui-label>
          <ui-label text="Invoice sample approved" highlight="sample"></ui-label>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Secondary text, full-match highlighting, and prefix highlighting share one text-first primitive.",
      },
    ),
    example(
      "Masked values and sizes",
      `
        <div class="catalog-example example-label-scale">
          <ui-label size="xsmall" text="Archive"></ui-label>
          <ui-label size="small" text="Invoice sample"></ui-label>
          <ui-label size="base" text="Billing migration"></ui-label>
          <ui-label size="large" text="Release checkpoint"></ui-label>
          <ui-label size="2xl" text="$9,182.50 USD" masked></ui-label>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Text size aliases resolve through Mash typography roles, while masked values keep their measured length.",
      },
    ),
  ],
  "ui-clipboard": [
    example(
      "Values, source, and feedback",
      `
        <section class="catalog-example example-clipboard-panel" data-catalog-clipboard-demo>
          <header class="example-clipboard-heading">
            <ui-typeset preset="title3">Share commands</ui-typeset>
            <ui-typeset tone="secondary">Static values, live field values, and late-bound command text share the same copy contract.</ui-typeset>
          </header>
          <ui-field label="Share URL" description="The suffix button reads the current field value at activation time.">
            <ui-input-group class="example-clipboard-input-group" slot="control">
              <ui-icon slot="prefix" name="action.launch" label=""></ui-icon>
              <ui-input id="clipboard-share-url" slot="control" type="url" label="Share URL" value="https://shrine.local/interzone/projects/billing?view=release"></ui-input>
              <ui-clipboard slot="suffix" source="#clipboard-share-url" size="xs" variant="ghost" copied-label="Copied">Copy</ui-clipboard>
            </ui-input-group>
          </ui-field>
          <div class="example-clipboard-actions">
            <ui-clipboard value="sk-live-redacted-1234" size="small" variant="secondary">Copy key</ui-clipboard>
            <ui-clipboard value="git checkout -b docs/clipboard" size="small" variant="secondary" data-catalog-clipboard-dynamic>Copy branch command</ui-clipboard>
            <ui-clipboard value="dangerous reset command withheld" size="small" variant="danger" outline>Copy reset note</ui-clipboard>
          </div>
          <output class="example-clipboard-output" data-catalog-clipboard-output aria-live="polite">Ready to copy.</output>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Static values and dynamic value callbacks map to `value`, `source`, and the `ui-clipboard-copy` request event. The control uses button sizing aliases and copied/error feedback states.",
        stageLayout: "start",
      },
    ),
    example(
      "Typeset code block",
      `
        <ui-typeset flow="block" preset="body" class="catalog-example example-clipboard-markdown" data-catalog-clipboard-demo>
          <h2>Markdown renderer contract</h2>
          <p>Rendered prose stays semantic: inline destinations use <ui-link variant="inline" href="#ui-link">ui-link</ui-link>, inline code uses <code>code</code>, and copy remains a button action.</p>
          <figure class="example-code-block">
            <figcaption class="example-code-header">
              <span class="example-code-title">
                <ui-badge size="small">tsx</ui-badge>
                <span>components/markdown-frame.tsx</span>
              </span>
              <ui-clipboard source="#clipboard-markdown-source" size="xs" variant="ghost" copied-label="Copied" reset-after="1200">Copy</ui-clipboard>
            </figcaption>
            <ui-scroll-area class="example-code-scroll" label="Markdown frame source" size="small" gutter="stable" mode="auto">
              <pre data-not-typeset><code id="clipboard-markdown-source" data-not-typeset>${escapeHtml(`import "@mash/ui/typeset/register";
import "@mash/ui/clipboard/register";

export function MarkdownFrame({ html }: { html: string }) {
  return (
    <ui-typeset flow="block" preset="body">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </ui-typeset>
  );
}`)}</code></pre>
            </ui-scroll-area>
          </figure>
          <blockquote>Style the rendered HTML container once; keep links, code, tables, and copy actions as their own semantic primitives.</blockquote>
          <p><ui-link variant="inline" href="#ui-typeset">Open typeset</ui-link> or copy the source block above.</p>
          <output class="example-clipboard-output" data-catalog-clipboard-output aria-live="polite">Code block ready.</output>
        </ui-typeset>`,
      {
        compositionOnly: true,
        description:
          "A markdown-renderer shaped composition: ui-typeset owns prose rhythm, ui-link preserves navigation semantics, ui-scroll-area owns overflow, and ui-clipboard copies the exact source code by selector.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-icon": [
    example(
      "Semantic Carbon vocabulary",
      `
        <div class="catalog-example example-icon-library">
          <span><ui-icon name="action.search" label="Search"></ui-icon>Search</span>
          <span><ui-icon name="action.settings" label="Settings"></ui-icon>Settings</span>
          <span><ui-icon name="object.folder" label="Folder"></ui-icon>Folder</span>
          <span><ui-icon name="object.terminal" label="Terminal"></ui-icon>Terminal</span>
          <span><ui-icon name="status.warning" label="Warning"></ui-icon>Warning</span>
          <span><ui-icon name="action.drag" label="Drag"></ui-icon>Drag</span>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Mash exposes semantic names while a generated, curated Carbon registry supplies the current glyph realization.",
      },
    ),
    example(
      "Replaceable layers",
      `
        <div class="catalog-example example-icon-layers">
          <span class="example-icon-layer-sample">
            <ui-icon name="object.folder" size="large" label="Synced billing folder">
              <ui-icon slot="secondary" name="action.confirm" size="small"></ui-icon>
            </ui-icon>
          </span>
          <span class="example-icon-layer-sample">
            <ui-icon name="object.folder" size="large" label="Authored folder glyph">
              <span slot="primary" class="example-icon-authored-glyph" aria-hidden="true">F</span>
            </ui-icon>
          </span>
          <span class="example-icon-layer-sample">
            <ui-icon name="product.unknown" size="large" label="Authored product fallback">
              <span slot="fallback" class="example-icon-fallback-glyph" aria-hidden="true">?</span>
            </ui-icon>
          </span>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Primary, secondary, badge, and fallback lanes keep application anatomy independent from Carbon.",
      },
    ),
  ],
  "ui-motion": [
    example("Recipe matrix", motionRecipeMatrixCode(), {
      compositionOnly: true,
      description:
        "Every built-in recipe is represented once, with per-recipe replay so each behavior can be inspected independently.",
      stageLayout: "fill",
    }),
    example("Target lanes", motionTargetMatrixCode(), {
      compositionOnly: true,
      description:
        "Each replay button scopes to one scene, making the target lane relationship visible without animating every lane demo at once.",
      stageLayout: "fill",
    }),
    example("Motion tokens", motionTokenReferenceCode(), {
      compositionOnly: true,
      description:
        "The full semantic token contract covers timing, easing, distance, scale, blur, opacity, and rotation. Values are read from tokens.json.",
      stageLayout: "fill",
    }),
    example("Utility composition", motionUtilityReferenceCode(), {
      compositionOnly: true,
      description:
        "Generated motion utilities are shown as stateful pieces of UI instead of a static class inventory.",
      stageLayout: "fill",
    }),
    example("System consumers", motionSystemConsumersCode(), {
      compositionOnly: true,
      description:
        "The component catalogue recipe applies the same semantic durations, easings, and reduced-motion contract to controls, overlays, toasts, spinners, and indeterminate progress.",
      stageLayout: "fill",
    }),
    example(
      "Arbitrary component lifecycle",
      `
        <section class="catalog-example example-motion-demo" data-catalog-motion-demo>
          <ui-motion class="example-motion-scene" motion="slide-inline" state="idle" target="content" data-catalog-motion>
            <ui-card title="Billing migration" description="Any authored component can move.">
              <p slot="content">Motion owns the lifecycle; the card remains unaware of it.</p>
            </ui-card>
            <ui-badge slot="indicator" tone="positive">Live</ui-badge>
          </ui-motion>
          <ui-toolbar label="Motion lifecycle controls">
            <ui-button size="small" variant="secondary" data-catalog-motion-state="entering">Enter</ui-button>
            <ui-button size="small" variant="secondary" data-catalog-motion-state="active">Active</ui-button>
            <ui-button size="small" variant="secondary" data-catalog-motion-state="exiting">Exit</ui-button>
            <ui-button size="small" variant="quiet" data-catalog-motion-state="idle">Reset</ui-button>
          </ui-toolbar>
          <output data-catalog-motion-output>Idle</output>
        </section>`,
      {
        compositionOnly: true,
        description:
          "A renderer-neutral state and event contract coordinates an ordinary card without adding animation attributes to ui-card.",
      },
    ),
    example(
      "Layered drop anatomy",
      `
        <section class="catalog-example example-motion-drop" data-catalog-motion-demo>
          <ui-motion class="example-motion-scene" motion="pulse" state="loading" target="overlay" data-catalog-motion>
            <ui-card title="Invoice reconciliation" description="Drop a view before this row"></ui-card>
            <span slot="underlay" class="example-motion-wash"></span>
            <ui-separator slot="overlay" orientation="horizontal">
              <span slot="prefix" aria-hidden="true">●</span>
            </ui-separator>
            <ui-kbd slot="indicator" command="workspace.palette" shortcut="Primary+Shift+P"></ui-kbd>
          </ui-motion>
          <p class="example-support">Underlay, content, overlay, and indicator are independent motion lanes.</p>
        </section>`,
      {
        compositionOnly: true,
        description:
          "The same scene primitive can realize drag feedback, overlays, progress, or any other layered composition.",
      },
    ),
  ],
  "ui-stagger": [
    example("Center-origin entrance", staggerCenterOriginCode(), {
      description:
        "ui-stagger computes deterministic offsets and exposes them as CSS variables on each slotted child. ui-motion consumes the delay without a parent-specific API.",
      stageLayout: "fill",
    }),
    example("Selected-origin pulse", staggerIndexedOriginCode(), {
      description:
        "The index origin mode makes a selected item the temporal anchor, with neighboring children receiving increasing delay by distance.",
      stageLayout: "fill",
    }),
  ],
  "ui-reveal": [
    example("Measured presence", revealMeasuredPresenceCode(), {
      description:
        "ui-reveal measures slotted content, clips one axis, publishes presence states, and delays absence until the exit motion settles.",
      stageLayout: "fill",
    }),
    example("Inline-axis reveal", revealInlineAxisCode(), {
      description:
        "The same measured-presence primitive can reveal inline size for compact status and toolbar affordances.",
      stageLayout: "fill",
    }),
  ],
  "ui-badge": [
    example(
      "Tag matrix",
      `
        <section class="catalog-example example-badge-matrix" aria-label="Badge tag matrix">
          <div class="example-badge-row">
            <span>Status</span>
            <div class="example-badge-set">
              <ui-badge tone="positive">Active</ui-badge>
              <ui-badge tone="warning">Review</ui-badge>
              <ui-badge tone="critical">Blocked</ui-badge>
            </div>
          </div>
          <div class="example-badge-row">
            <span>Category</span>
            <div class="example-badge-set">
              <ui-badge class="example-badge-outline" tone="neutral">Docs</ui-badge>
              <ui-badge class="example-badge-outline">Platform</ui-badge>
              <ui-badge class="example-badge-outline" tone="positive">Ready</ui-badge>
            </div>
          </div>
          <div class="example-badge-row">
            <span>Compact</span>
            <div class="example-badge-set">
              <ui-badge size="small">P2</ui-badge>
              <ui-badge size="small" tone="positive">Stable</ui-badge>
              <ui-badge size="small" tone="warning">Beta</ui-badge>
            </div>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Tag-style metadata maps to ui-badge's existing display-only status contract. Outline treatment stays in the catalogue recipe, not a separate Tag primitive.",
        stageLayout: "start",
      },
    ),
    example(
      "Anchored indicators",
      `
        <section class="catalog-example example-badge-indicators" aria-label="Badge target indicators">
          <ui-badge variant="count" count="12" max="9" size="small" label="12 pending reviews">
            <ui-icon slot="target" name="status.warning" size="large" label=""></ui-icon>
          </ui-badge>
          <ui-badge variant="dot" tone="positive" label="Online">
            <ui-avatar slot="target" size="medium">MR</ui-avatar>
          </ui-badge>
          <ui-badge variant="icon" tone="positive" position="bottom-end" label="Verified">
            <ui-avatar slot="target" size="medium">AX</ui-avatar>
            <ui-icon slot="icon" name="action.confirm" size="small" label=""></ui-icon>
          </ui-badge>
          <ui-badge variant="count" count="0" size="small" label="No unread updates">
            <ui-icon slot="target" name="object.folder" size="large" label=""></ui-icon>
          </ui-badge>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Badge indicators annotate a slotted target with count, dot, or authored icon state while the target keeps its own component contract.",
        stageLayout: "start",
      },
    ),
    example(
      "Marker rows",
      `
        <section class="catalog-example example-marker-feed" aria-label="Project status timeline">
          <div class="example-marker-row" role="status">
            <ui-icon name="action.search" label=""></ui-icon>
            <span class="example-marker-copy">
              <strong><ui-shimmer>Indexing workspace</ui-shimmer></strong>
              <span>32 files remaining</span>
            </span>
            <ui-badge size="small">Now</ui-badge>
          </div>
          <ui-separator>
            <span slot="prefix" class="example-marker-dot" aria-hidden="true"></span>
          </ui-separator>
          <div class="example-marker-row">
            <ui-icon name="action.confirm" label=""></ui-icon>
            <span class="example-marker-copy">
              <strong>Types generated</strong>
              <span>Manifest and Tailwind variants are current.</span>
            </span>
            <ui-badge size="small" tone="positive">Done</ui-badge>
          </div>
          <ui-separator>
            <span slot="prefix" class="example-marker-dot" aria-hidden="true"></span>
          </ui-separator>
          <div class="example-marker-row">
            <ui-icon name="action.dismiss" label=""></ui-icon>
            <span class="example-marker-copy">
              <strong>Visual snapshot missing</strong>
              <span>Run the catalogue before promoting this example.</span>
            </span>
            <ui-badge size="small" tone="warning">Audit</ui-badge>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Markers stay a row composition here: text owns the status, badge owns compact metadata, separator owns the timeline rule, and shimmer remains a short-lived text effect.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-shimmer": [
    example(
      "Text-owned activity",
      `
        <section class="catalog-example example-stack">
          <ui-shimmer>Thinking...</ui-shimmer>
          <ui-shimmer reverse style="--ui-shimmer-duration: 3s; --ui-shimmer-spread: 45%">Indexing files...</ui-shimmer>
          <ui-shimmer once>Preparing preview...</ui-shimmer>
          <p class="example-support">The text remains the layout and accessibility owner. Shimmer only paints a decorative highlight while the surrounding workflow is in flight.</p>
        </section>`,
      {
        description:
          "A short-lived loading label with themeable timing and highlight color, distinct from progress, spinner, and skeleton-style placeholder blocks.",
      },
    ),
  ],
  "ui-skeleton": [
    example(
      "Content placeholder",
      `
        <article class="catalog-example example-skeleton-article" aria-busy="true">
          <ui-skeleton class="example-skeleton-media"></ui-skeleton>
          <div class="example-skeleton-lines">
            <ui-skeleton style="inline-size: 62%; block-size: 1rem;"></ui-skeleton>
            <ui-skeleton class="example-skeleton-muted" style="inline-size: 92%; block-size: 0.875rem;"></ui-skeleton>
            <ui-skeleton class="example-skeleton-muted" style="inline-size: 74%; block-size: 0.875rem;"></ui-skeleton>
          </div>
        </article>`,
      {
        compositionOnly: true,
        description:
          "Skeleton reserves authored layout only. The busy state belongs to the region loading real content; the inert placeholder stays hidden from assistive technology.",
        stageLayout: "start",
      },
    ),
    example(
      "Data rows",
      `
        <section class="catalog-example example-skeleton-table" aria-label="Loading project rows" aria-busy="true">
          <div class="example-skeleton-row">
            <ui-skeleton style="inline-size: 10rem;"></ui-skeleton>
            <ui-skeleton class="example-skeleton-muted" style="inline-size: 6rem;"></ui-skeleton>
            <ui-skeleton class="example-skeleton-muted" style="inline-size: 4rem;"></ui-skeleton>
          </div>
          <div class="example-skeleton-row">
            <ui-skeleton style="inline-size: 14rem;"></ui-skeleton>
            <ui-skeleton class="example-skeleton-muted" style="inline-size: 5rem;"></ui-skeleton>
            <ui-skeleton class="example-skeleton-muted" style="inline-size: 4.5rem;"></ui-skeleton>
          </div>
          <div class="example-skeleton-row">
            <ui-skeleton style="inline-size: 8rem;"></ui-skeleton>
            <ui-skeleton class="example-skeleton-muted" style="inline-size: 7rem;"></ui-skeleton>
            <ui-skeleton class="example-skeleton-muted" style="inline-size: 3rem;"></ui-skeleton>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Table, list, card, and form skeletons are the same inert shape placed into product-owned grid tracks.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-spinner": [
    example(
      "Coordinated loading command",
      `
        <section id="catalog-loading-command" class="catalog-example example-stack" tabindex="0">
          <div class="example-actions">
            <ui-spinner size="medium" label="Loading projects"></ui-spinner>
            <span>Loading project list</span>
          </div>
          <ui-motion motion="pulse" state="loading" target="content">
            <ui-button variant="secondary" loading>
              <ui-spinner slot="prefix" size="small" label=""></ui-spinner>
              Refresh projects
              <ui-kbd slot="suffix" command="project.refresh" shortcut="Primary+R"></ui-kbd>
            </ui-button>
          </ui-motion>
          <ui-gesture-binding for="catalog-loading-command" gesture="key" shortcut="Primary+R" command="project.refresh" prevent-default="recognized"></ui-gesture-binding>
          <p class="example-support">The gesture emits the command, Kbd advertises it, Motion owns lifecycle, and Spinner supplies status.</p>
        </section>`,
      {
        compositionOnly: true,
        description:
          "A loading recipe composes four independent contracts without moving shortcut, animation, or progress behavior into the button.",
      },
    ),
  ],
  "ui-kbd": [
    example(
      "Shortcut vocabulary",
      `
        <div class="catalog-example example-shortcut-list">
          <span><ui-icon name="action.search" label=""></ui-icon>Command search <ui-kbd command="workspace.search" shortcut="Primary+K"></ui-kbd></span>
          <span><ui-icon name="navigation.up" label=""></ui-icon>Move issue <ui-kbd command="issue.move-up" shortcut="Alt+Shift+ArrowUp"></ui-kbd></span>
          <span><ui-icon name="action.dismiss" label=""></ui-icon>Dismiss <ui-kbd command="overlay.dismiss" shortcut="Escape"></ui-kbd></span>
          <span><ui-icon name="action.delete" label=""></ui-icon>Delete backward <ui-kbd command="edit.delete-backward" shortcut="Backspace"></ui-kbd></span>
          <span><ui-icon name="action.confirm" label=""></ui-icon>Commit <ui-kbd command="change.commit" shortcut="Primary+Enter"></ui-kbd></span>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Keyboard modifiers remain portable Unicode text; Carbon supplies only the surrounding action vocabulary.",
      },
    ),
  ],
  "ui-typeset": [
    example(
      "Dynamic type scale",
      `
        <section class="catalog-example example-typeset-specimen">
          <header class="example-typeset-heading">
            <ui-typeset preset="title2">Text Styles and Dynamic Type</ui-typeset>
            <ui-typeset preset="body" tone="secondary">Every sample resolves an independent semantic family, size, weight, and leading token.</ui-typeset>
          </header>
          <div class="example-typeset-scale">
            <div><ui-typeset preset="caption2">Caption 2 · 10/13 medium</ui-typeset><code>caption2</code></div>
            <div><ui-typeset preset="caption1">Caption 1 · 10/13 regular</ui-typeset><code>caption1</code></div>
            <div><ui-typeset preset="footnote">Footnote · supporting context</ui-typeset><code>footnote</code></div>
            <div><ui-typeset preset="subheadline">Subheadline · compact hierarchy</ui-typeset><code>subheadline</code></div>
            <div><ui-typeset preset="callout">Callout · concise emphasis</ui-typeset><code>callout</code></div>
            <div><ui-typeset preset="body">Body · Billing migration replaces the legacy invoicer.</ui-typeset><code>body</code></div>
            <div><ui-typeset preset="headline">Headline · Billing migration</ui-typeset><code>headline</code></div>
            <div><ui-typeset preset="title3">Title 3 · Project activity</ui-typeset><code>title3</code></div>
            <div><ui-typeset preset="title2">Title 2 · Interzone</ui-typeset><code>title2</code></div>
            <div><ui-typeset preset="title1">Title 1 · Workspace</ui-typeset><code>title1</code></div>
            <div><ui-typeset preset="large-title">Large title</ui-typeset><code>large-title</code></div>
            <div><ui-typeset preset="code">/rec/project/billing-migration</ui-typeset><code>code</code></div>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "The component pronounces semantic type tokens without replacing the author's heading, paragraph, link, or other document semantics.",
        stageLayout: "start",
      },
    ),
    example(
      "Label tiers and spacing rhythm",
      `
        <section class="catalog-example example-typeset-specimen">
          <div class="example-typeset-tones">
            <ui-typeset preset="headline" tone="primary">Primary label</ui-typeset>
            <ui-typeset preset="body" tone="secondary">Secondary label</ui-typeset>
            <ui-typeset preset="body" tone="tertiary">Tertiary label</ui-typeset>
            <ui-typeset preset="body" tone="disabled">Disabled label</ui-typeset>
            <ui-typeset preset="label" tone="accent">Accent label</ui-typeset>
            <ui-typeset preset="label" tone="critical">Critical label</ui-typeset>
          </div>
          <div class="example-spacing-rhythm" aria-label="Semantic spacing rhythm">
            <div data-space="group-related"><span></span><ui-typeset preset="label-small" tone="secondary">group-related</ui-typeset></div>
            <div data-space="inline"><span></span><ui-typeset preset="label-small" tone="secondary">inline</ui-typeset></div>
            <div data-space="container-gap"><span></span><ui-typeset preset="label-small" tone="secondary">container-gap</ui-typeset></div>
            <div data-space="region"><span></span><ui-typeset preset="label-small" tone="secondary">region</ui-typeset></div>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Opacity-aware label roles adapt with material vibrancy, while the companion specimen makes semantic spacing steps visible without introducing a stack or spacer primitive.",
        stageLayout: "start",
      },
    ),
    example(
      "Rich text viewport",
      `
        <section class="catalog-example example-text-view" aria-label="Release note preview">
          <ui-scroll-area class="example-text-view-scroll" label="Release note preview" size="large" gutter="stable" mode="always">
            <article class="example-text-view-copy">
              <h2>Release readiness</h2>
              <p>The billing migration can ship once finance signs off the archive import and the deployment note is attached to the project.</p>
              <ul>
                <li><strong>Ready:</strong> generated types, command shortcuts, and table state.</li>
                <li><strong>Needs review:</strong> export retention policy and invoice exception copy.</li>
              </ul>
              <blockquote>Keep rendered markdown outside the primitive; preserve semantic HTML inside the viewport.</blockquote>
              <pre><code>release.status = "review"</code></pre>
              <p><ui-link href="#release-readiness">Open release record</ui-link></p>
            </article>
          </ui-scroll-area>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Rich text views stay a composition boundary: authored HTML keeps document semantics, typeset tokens style the prose, and scroll-area owns the viewport.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-draggable": [
    example(
      "Movable project card",
      `
        <div class="catalog-example example-drag-boundary" data-catalog-drag-boundary>
          <ui-draggable snap-step="16" containment="parent">
            <ui-toolbar slot="handle" class="example-drag-titlebar" label="Move project card">
              <ui-badge>Drag project</ui-badge>
              <span>Billing migration</span>
            </ui-toolbar>
            <ui-card title="Billing migration" description="Interzone project" elevation="raised">
              <p slot="content">Replace the legacy invoice flow before the next billing cycle.</p>
            </ui-card>
          </ui-draggable>
        </div>`,
      {
        compositionOnly: true,
        description:
          "A dedicated toolbar handle moves a real card; parent containment and grid snapping remain ui-draggable concerns.",
        stageLayout: "fill",
      },
    ),
    example(
      "Constrained axes",
      `
        <div class="catalog-example example-drag-boundary" data-catalog-drag-boundary>
          <ui-draggable axis="x" containment="parent" snap-step="24">
            <ui-badge slot="handle">Horizontal only</ui-badge>
            <ui-card title="Timeline handle">Movement remains on the inline axis.</ui-card>
          </ui-draggable>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The same primitive narrows movement without inventing an axis-specific wrapper.",
        stageLayout: "fill",
      },
    ),
    example(
      "Resizable workspace window",
      `
        <div class="catalog-example example-window-stage" data-catalog-drag-boundary>
          <ui-draggable
            class="example-drag-window"
            containment="parent"
            aria-label="Floating billing workspace"
          >
            <ui-toolbar slot="handle" class="example-window-titlebar" label="Move billing workspace">
              <span class="example-window-traffic" aria-hidden="true">● ● ●</span>
              <strong>Billing migration</strong>
              <ui-badge size="small">workspace</ui-badge>
            </ui-toolbar>
            <ui-resizable class="example-window-panes" orientation="horizontal" label="Window panels">
              <ui-resizable-panel size="176" min="128" max="240">
                <ui-tree label="Billing workspace">
                  <ui-tree-item kind="folder" title="Project" expanded>
                    <ui-tree-item slot="children" kind="file" title="Overview" selected></ui-tree-item>
                    <ui-tree-item slot="children" kind="file" title="Invoices"></ui-tree-item>
                    <ui-tree-item slot="children" kind="file" title="Activity"></ui-tree-item>
                  </ui-tree-item>
                </ui-tree>
              </ui-resizable-panel>
              <ui-resizable-handle label="Resize window sidebar"></ui-resizable-handle>
              <ui-resizable-panel min="176">
                <ui-card title="Invoice reconciliation" description="Updated 8 minutes ago">
                  <p slot="content">Drag the title bar, resize the outer window, or move its internal panel separator.</p>
                </ui-card>
              </ui-resizable-panel>
            </ui-resizable>
          </ui-draggable>
        </div>`,
      {
        compositionOnly: true,
        description:
          "ui-draggable owns window movement, native CSS owns the outer resize affordance, and ui-resizable owns the internal panel split.",
        stageLayout: "fill",
      },
    ),
    example(
      "Kanban board",
      `
        <section class="catalog-example example-kanban-board" data-catalog-kanban-workspace>
          <header class="example-kanban-heading">
            <div>
              <span class="example-eyebrow">Interzone</span>
              <h2>Billing launch</h2>
            </div>
            <ui-badge size="small">6 issues</ui-badge>
          </header>
          <div class="example-kanban-columns" data-catalog-drag-boundary>
            <section class="example-kanban-column" data-catalog-kanban-column="backlog">
              <header class="example-kanban-column-heading">
                <strong>Backlog</strong>
                <ui-badge size="small">2</ui-badge>
              </header>
              <div class="example-kanban-list" data-catalog-kanban-list>
                <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card" data-catalog-drag-source="kanban-card" data-catalog-label="Audit invoice states" data-catalog-kanban-id="axi-72">
                  <ui-toolbar slot="handle" class="example-kanban-card-handle" label="Move Audit invoice states">
                    <ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon>
                    <ui-badge size="small">AXI-72</ui-badge>
                  </ui-toolbar>
                  <ui-card title="Audit invoice states" description="Billing migration">
                    <div slot="content" class="example-kanban-card-meta"><ui-avatar fallback="MC" size="small"></ui-avatar><span>Maya · Medium</span></div>
                  </ui-card>
                </ui-draggable>
                <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card" data-catalog-drag-source="kanban-card" data-catalog-label="Archive legacy receipts" data-catalog-kanban-id="axi-74">
                  <ui-toolbar slot="handle" class="example-kanban-card-handle" label="Move Archive legacy receipts">
                    <ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon>
                    <ui-badge size="small">AXI-74</ui-badge>
                  </ui-toolbar>
                  <ui-card title="Archive legacy receipts" description="Records">
                    <div slot="content" class="example-kanban-card-meta"><ui-avatar fallback="AR" size="small"></ui-avatar><span>Alex · Low</span></div>
                  </ui-card>
                </ui-draggable>
              </div>
            </section>
            <section class="example-kanban-column" data-catalog-kanban-column="progress">
              <header class="example-kanban-column-heading">
                <strong>In progress</strong>
                <ui-badge size="small">2</ui-badge>
              </header>
              <div class="example-kanban-list" data-catalog-kanban-list>
                <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card" data-catalog-drag-source="kanban-card" data-catalog-label="Reconcile tax totals" data-catalog-kanban-id="axi-68">
                  <ui-toolbar slot="handle" class="example-kanban-card-handle" label="Move Reconcile tax totals">
                    <ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon>
                    <ui-badge size="small">AXI-68</ui-badge>
                  </ui-toolbar>
                  <ui-card title="Reconcile tax totals" description="Operations">
                    <div slot="content" class="example-kanban-card-meta"><ui-avatar fallback="SO" size="small"></ui-avatar><span>Sam · High</span></div>
                  </ui-card>
                </ui-draggable>
                <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card" data-catalog-drag-source="kanban-card" data-catalog-label="Wire activity events" data-catalog-kanban-id="axi-70">
                  <ui-toolbar slot="handle" class="example-kanban-card-handle" label="Move Wire activity events">
                    <ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon>
                    <ui-badge size="small">AXI-70</ui-badge>
                  </ui-toolbar>
                  <ui-card title="Wire activity events" description="Notifications">
                    <div slot="content" class="example-kanban-card-meta"><ui-avatar fallback="JB" size="small"></ui-avatar><span>Jo · Medium</span></div>
                  </ui-card>
                </ui-draggable>
              </div>
            </section>
            <section class="example-kanban-column" data-catalog-kanban-column="review">
              <header class="example-kanban-column-heading">
                <strong>Review</strong>
                <ui-badge size="small">2</ui-badge>
              </header>
              <div class="example-kanban-list" data-catalog-kanban-list>
                <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card" data-catalog-drag-source="kanban-card" data-catalog-label="Verify billing exports" data-catalog-kanban-id="axi-64">
                  <ui-toolbar slot="handle" class="example-kanban-card-handle" label="Move Verify billing exports">
                    <ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon>
                    <ui-badge size="small">AXI-64</ui-badge>
                  </ui-toolbar>
                  <ui-card title="Verify billing exports" description="Finance">
                    <div slot="content" class="example-kanban-card-meta"><ui-avatar fallback="MC" size="small"></ui-avatar><span>Maya · High</span></div>
                  </ui-card>
                </ui-draggable>
                <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card" data-catalog-drag-source="kanban-card" data-catalog-label="Polish empty states" data-catalog-kanban-id="axi-66">
                  <ui-toolbar slot="handle" class="example-kanban-card-handle" label="Move Polish empty states">
                    <ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon>
                    <ui-badge size="small">AXI-66</ui-badge>
                  </ui-toolbar>
                  <ui-card title="Polish empty states" description="Catalogue">
                    <div slot="content" class="example-kanban-card-meta"><ui-avatar fallback="AR" size="small"></ui-avatar><span>Alex · Low</span></div>
                  </ui-card>
                </ui-draggable>
              </div>
            </section>
          </div>
          <ui-separator class="example-drop-indicator" data-catalog-drop-indicator orientation="horizontal" hidden>
            <span slot="prefix" class="example-drop-indicator-circle" aria-hidden="true"></span>
          </ui-separator>
          <output class="example-support" data-catalog-kanban-status aria-live="polite">Drag a card between columns or anywhere along a column detent.</output>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Cards move and reorder across semantic columns with detent targeting, a prefixed ui-separator insertion preview, ambiguous-drop cancellation, and no Kanban behavior baked into ui-draggable.",
        stageLayout: "fill",
      },
    ),
  ],
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
              <ui-kbd slot="suffix" command="workspace.search" shortcut="Primary+K"></ui-kbd>
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
  "ui-path": [
    example(
      "Breadcrumb navigation",
      `
        <div class="catalog-example example-path-showcase">
          <header class="example-link-heading">
            <span class="example-eyebrow">Namespace</span>
            <h2>Every ancestor remains reachable</h2>
            <p>The terminal title can stay human-readable while each preceding segment resolves to its cumulative path.</p>
          </header>
          <ui-path
            class="example-path-narrow"
            variant="breadcrumb"
            path="/interzone/projects/billing-migration/invoice-reconciliation"
            aria-label="Project namespace"
          >
            <span slot="title">Invoice reconciliation</span>
          </ui-path>
          <p class="example-support">The current segment is preserved at the inline end; clipped ancestors remain discoverable through the progressive edge treatment.</p>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Breadcrumb is a ui-path variant, not a second component. Ancestors use cumulative native destinations and the terminal segment owns aria-current.",
        stageLayout: "start",
      },
    ),
    example(
      "Preview overflow",
      `
        <div class="catalog-example example-path-showcase">
          <header class="example-link-heading">
            <span class="example-eyebrow">Overflow contract</span>
            <h2>Meaning decides which edge survives</h2>
            <p>Pretty titles preserve their beginning; raw paths preserve the terminal namespace.</p>
          </header>
          <div class="example-path-case">
            <span>pretty title · inline start</span>
            <ui-path
              class="example-path-narrow"
              path="/interzone/projects/billing-migration/invoice-reconciliation"
            >
              <span slot="title">Invoice reconciliation requirements for international billing</span>
            </ui-path>
          </div>
          <div class="example-path-case">
            <span>raw path · inline end</span>
            <ui-path
              class="example-path-narrow"
              path="/interzone/projects/billing-migration/invoice-reconciliation"
            ></ui-path>
          </div>
          <div class="example-path-case">
            <span>compact current location</span>
            <ui-path
              class="example-path-narrow"
              size="small"
              current
              path="/interzone/projects/billing-migration/invoice-reconciliation"
            >
              <span slot="title">Invoice reconciliation requirements</span>
            </ui-path>
          </div>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The component emits logical overflow states; the Mash catalogue recipe applies the shared mask and progressive blur tokens.",
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
      "Issue tracker workspace",
      `
        <div id="linear-workspace-command-scope" class="catalog-example example-linear-workspace" data-linear-workspace data-linear-view="list" data-inspector-open="false">
          <aside class="example-linear-sidebar">
            <ui-navigation-menu class="example-linear-navigation" label="Axiomatic workspace">
              <div class="example-linear-identity">
                <ui-avatar size="small">AX</ui-avatar>
                <span class="example-linear-identity-copy">
                  <strong>Axiomatic</strong>
                  <span>Product workspace</span>
                </span>
                <ui-button type="button" size="small" variant="quiet" aria-label="Switch workspace"><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-button>
              </div>

              <ui-input class="example-linear-search" data-linear-search type="search" size="small" label="Search issues" placeholder="Search issues…"></ui-input>

              <div class="example-linear-nav-list">
                <ui-link class="example-linear-nav-link" variant="quiet" href="#inbox"><span slot="prefix" aria-hidden="true">◫</span>Inbox<ui-badge slot="suffix" size="small">4</ui-badge></ui-link>
                <ui-link class="example-linear-nav-link" variant="quiet" href="#my-issues"><span slot="prefix" aria-hidden="true">◉</span>My issues</ui-link>
                <ui-link class="example-linear-nav-link" variant="quiet" href="#issues" current><span slot="prefix" aria-hidden="true">◇</span>Issues<ui-badge slot="suffix" size="small">24</ui-badge></ui-link>
                <ui-link class="example-linear-nav-link" variant="quiet" href="#cycles"><span slot="prefix" aria-hidden="true">↻</span>Cycles</ui-link>
                <ui-link class="example-linear-nav-link" variant="quiet" href="#projects"><span slot="prefix" aria-hidden="true">▣</span>Projects</ui-link>
              </div>

              <ui-separator></ui-separator>

              <div class="example-linear-nav-section">
                <div class="example-linear-nav-heading"><strong>Teams</strong><ui-button type="button" size="small" variant="quiet" aria-label="Add team">＋</ui-button></div>
                <ui-link class="example-linear-nav-link" variant="quiet" href="#product"><span slot="prefix" class="example-linear-team-mark" aria-hidden="true">P</span>Product</ui-link>
                <ui-link class="example-linear-nav-link" variant="quiet" href="#engineering"><span slot="prefix" class="example-linear-team-mark" aria-hidden="true">E</span>Engineering</ui-link>
                <ui-link class="example-linear-nav-link" variant="quiet" href="#design"><span slot="prefix" class="example-linear-team-mark" aria-hidden="true">D</span>Design</ui-link>
              </div>

              <div class="example-linear-cycle">
                <div class="example-linear-cycle-copy"><span>Cycle 42</span><span>64%</span></div>
                <ui-progress value="64" label="Cycle 42 is 64 percent complete"></ui-progress>
                <span>9 days remaining</span>
              </div>
            </ui-navigation-menu>

            <ui-dialog class="example-linear-new-issue" data-linear-create-dialog label="Create issue">
              <ui-button slot="trigger" type="button">＋ New issue <ui-kbd command="issue.create" shortcut="C"></ui-kbd></ui-button>
              <h2 slot="title">Create issue</h2>
              <p slot="description">Add an issue to the Product team backlog.</p>
              <div class="example-stack">
                <ui-field label="Title"><ui-input slot="control" data-linear-create-title name="title" placeholder="Issue title"></ui-input></ui-field>
                <ui-field label="Status">
                  <ui-select slot="control" data-linear-create-status name="status" value="backlog" label="Issue status">
                    <ui-option value="backlog">Backlog</ui-option>
                    <ui-option value="todo">Todo</ui-option>
                    <ui-option value="progress">In progress</ui-option>
                  </ui-select>
                </ui-field>
              </div>
              <div slot="close" class="example-actions">
                <ui-button variant="secondary">Cancel</ui-button>
                <ui-button data-linear-create-action>Create issue</ui-button>
              </div>
            </ui-dialog>
          </aside>

          <main class="example-linear-shell">
            <header class="example-linear-topbar">
              <div class="example-linear-breadcrumb">
                <ui-drawer class="example-linear-mobile-navigation" side="start" label="Workspace navigation">
                  <ui-button slot="trigger" type="button" size="small" variant="quiet" aria-label="Open workspace navigation">☰</ui-button>
                  <h2 slot="title">Axiomatic</h2>
                  <p slot="description">Product workspace</p>
                  <nav class="example-linear-mobile-nav" aria-label="Workspace">
                    <ui-link class="example-linear-nav-link" variant="quiet" href="#inbox"><span slot="prefix" aria-hidden="true">◫</span>Inbox<ui-badge slot="suffix" size="small">4</ui-badge></ui-link>
                    <ui-link class="example-linear-nav-link" variant="quiet" href="#my-issues"><span slot="prefix" aria-hidden="true">◉</span>My issues</ui-link>
                    <ui-link class="example-linear-nav-link" variant="quiet" href="#issues" current><span slot="prefix" aria-hidden="true">◇</span>Issues<ui-badge slot="suffix" size="small">24</ui-badge></ui-link>
                    <ui-link class="example-linear-nav-link" variant="quiet" href="#cycles"><span slot="prefix" aria-hidden="true">↻</span>Cycles</ui-link>
                    <ui-link class="example-linear-nav-link" variant="quiet" href="#projects"><span slot="prefix" aria-hidden="true">▣</span>Projects</ui-link>
                  </nav>
                </ui-drawer>
                <ui-button type="button" size="small" variant="quiet">Product</ui-button>
                <span aria-hidden="true">/</span>
                <strong>All issues</strong>
              </div>
              <div class="example-linear-top-actions">
                <ui-dialog class="example-linear-command" data-linear-command-dialog label="Command menu">
                  <ui-button slot="trigger" type="button" size="small" variant="quiet" aria-label="Open command menu">⌘ K</ui-button>
                  <h2 slot="title">Command menu</h2>
                  <p slot="description">Search or run an action on the active issue selection.</p>
                  <ui-input data-linear-command-search type="search" label="Search commands" placeholder="Type a command…"></ui-input>
                  <div class="example-linear-command-list" role="list" aria-label="Commands">
                    <ui-button type="button" variant="quiet" data-linear-command="status-progress"><span>◒</span><span>Set status: In progress</span><ui-kbd command="issue.status-progress" shortcut="1"></ui-kbd></ui-button>
                    <ui-button type="button" variant="quiet" data-linear-command="status-done"><span>✓</span><span>Mark as done</span><ui-kbd command="issue.status-done" shortcut="2"></ui-kbd></ui-button>
                    <ui-button type="button" variant="quiet" data-linear-command="priority-high"><span>↑</span><span>Set priority: High</span><ui-kbd command="issue.priority-high" shortcut="3"></ui-kbd></ui-button>
                    <ui-button type="button" variant="quiet" data-linear-command="assign-maya"><span>●</span><span>Assign to Maya</span><ui-kbd command="issue.assign-maya" shortcut="4"></ui-kbd></ui-button>
                    <ui-button type="button" variant="quiet" data-linear-command="copy-link"><span>↗</span><span>Copy issue link</span></ui-button>
                  </div>
                </ui-dialog>
                <ui-avatar size="small">MC</ui-avatar>
              </div>
            </header>

            <div class="example-linear-content-grid">
            <ui-scroll-area class="example-linear-scroll" label="Product issues workspace" mode="hover">
              <section slot="content" class="example-linear-main" tabindex="-1">
                <div class="example-linear-page-heading">
                  <div class="example-linear-heading-copy">
                    <span class="example-linear-eyebrow">Product · Issues</span>
                    <h2>All issues</h2>
                    <p>Track product work across the current cycle and backlog.</p>
                  </div>
                  <div class="example-linear-heading-actions">
                    <ui-toggle-group data-linear-view-toggle mode="single" value="list" label="Issue view">
                      <ui-toggle value="list" pressed>List</ui-toggle>
                      <ui-toggle value="board">Board</ui-toggle>
                    </ui-toggle-group>
                    <ui-dialog data-linear-create-dialog label="Create issue">
                      <ui-button slot="trigger" type="button">New issue</ui-button>
                      <h2 slot="title">Create issue</h2>
                      <p slot="description">Capture the work now; refine the details later.</p>
                      <div class="example-stack">
                        <ui-field label="Title"><ui-input slot="control" data-linear-create-title name="quick-title" placeholder="Issue title"></ui-input></ui-field>
                        <ui-field label="Status">
                          <ui-select slot="control" data-linear-create-status value="backlog" label="Issue status">
                            <ui-option value="backlog">Backlog</ui-option>
                            <ui-option value="todo">Todo</ui-option>
                            <ui-option value="progress">In progress</ui-option>
                          </ui-select>
                        </ui-field>
                      </div>
                      <div slot="close" class="example-actions"><ui-button variant="secondary">Cancel</ui-button><ui-button data-linear-create-action>Create</ui-button></div>
                    </ui-dialog>
                  </div>
                </div>

                <ui-toolbar class="example-linear-filters" label="Issue filters">
                  <ui-input class="example-linear-filter-search" data-linear-search type="search" size="small" label="Filter issues" placeholder="Filter issues…"></ui-input>
                  <ui-menu data-linear-view-preset label="Saved issue view">
                    <ui-button slot="trigger" type="button" size="small" variant="secondary"><span data-linear-view-preset-label>All issues</span><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-button>
                    <ui-menu-item value="all">All issues</ui-menu-item>
                    <ui-menu-item value="mine">My issues</ui-menu-item>
                    <ui-menu-item value="release-risk">Release risk</ui-menu-item>
                  </ui-menu>
                  <ui-button id="linear-filter-trigger" type="button" size="small" variant="secondary" data-linear-query-toggle aria-expanded="false" aria-controls="linear-query-panel">
                    <ui-icon name="action.search" label=""></ui-icon>
                    Filters
                    <ui-badge size="small" data-linear-filter-count>0</ui-badge>
                    <ui-kbd command="workspace.filters" shortcut="Primary+Shift+F"></ui-kbd>
                  </ui-button>
                  <ui-menu data-linear-demo-state label="Example data state">
                    <ui-button slot="trigger" type="button" size="small" variant="quiet"><span data-linear-demo-state-label>Ready</span><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-button>
                    <ui-menu-item value="ready">Ready</ui-menu-item>
                    <ui-menu-item value="loading">Loading</ui-menu-item>
                    <ui-menu-item value="error">Error</ui-menu-item>
                  </ui-menu>
                  <ui-button type="button" size="small" variant="quiet" data-linear-clear-filters>Clear</ui-button>
                  <output class="example-linear-view-state" data-linear-view-state aria-live="polite">All issues · match all</output>
                  <output class="example-linear-result-count" data-linear-visible-count aria-live="polite">5 issues</output>
                </ui-toolbar>

                <ui-motion id="linear-query-panel" class="example-linear-query-motion" motion="slide-block" state="idle" target="content" data-linear-query-panel hidden>
                  <section class="example-linear-query-panel" aria-labelledby="linear-query-title">
                    <header class="example-linear-query-panel-header">
                      <div>
                        <strong id="linear-query-title">Filter issues</strong>
                        <span>Combine conditions and nested groups. Changes apply to both list and board views.</span>
                      </div>
                      <ui-button type="button" size="small" variant="quiet" data-linear-query-done aria-label="Close filter editor"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
                    </header>
                    <div class="example-linear-query-builder" data-linear-query-builder aria-label="Issue filter expression"></div>
                    <footer class="example-linear-query-actions">
                      <ui-button type="button" size="small" variant="quiet" data-linear-query-reset>Reset</ui-button>
                      <ui-button type="button" size="small" data-linear-query-done>Done</ui-button>
                    </footer>
                  </section>
                </ui-motion>

                <div class="example-linear-filter-chips" data-linear-filter-chips role="list" aria-label="Active issue filters"></div>
                <ui-gesture-binding for="linear-workspace-command-scope" gesture="key" shortcut="Primary+Shift+F" command="workspace.filters" group="linear-workspace" prevent-default="recognized"></ui-gesture-binding>

                <div class="example-linear-list-heading">
                  <div><strong>Active cycle</strong><ui-badge size="small" data-linear-group-count>5</ui-badge></div>
                  <span>Cycle 42 · Aug 17–30 · <ui-kbd command="issue.next" shortcut="J"></ui-kbd> <ui-kbd command="issue.previous" shortcut="K"></ui-kbd> to navigate</span>
                </div>

                <ui-toolbar class="example-linear-selection-toolbar" data-linear-selection-toolbar hidden label="Selected issue actions">
                  <strong><span data-linear-selection-count>0</span> selected</strong>
                  <ui-separator orientation="vertical"></ui-separator>
                  <ui-button type="button" size="small" variant="quiet" data-linear-command="status-done">✓ Mark done</ui-button>
                  <ui-button type="button" size="small" variant="quiet" data-linear-command="status-progress">◒ In progress</ui-button>
                  <ui-button type="button" size="small" variant="quiet" data-linear-command="assign-maya">● Assign Maya</ui-button>
                  <ui-button type="button" size="small" variant="quiet" data-linear-clear-selection aria-label="Clear selection">×</ui-button>
                </ui-toolbar>

                <div class="example-linear-data-state" data-linear-loading hidden aria-live="polite">
                  <ui-motion motion="pulse" state="loading" target="content">
                    <ui-spinner size="small" label="Loading issues"></ui-spinner>
                    <span>Refreshing issue data…</span>
                  </ui-motion>
                </div>

                <div class="example-linear-data-state" data-linear-error hidden role="alert">
                  <ui-icon name="status.warning" label=""></ui-icon>
                  <strong>Issue data could not be refreshed</strong>
                  <span>The current filters are preserved. Retry when the workspace is available.</span>
                  <ui-button type="button" size="small" variant="secondary" data-linear-retry>Retry</ui-button>
                </div>

                <div class="example-linear-list-view" data-linear-list-view>

                <ui-table class="example-linear-table" label="Product issues" row-count="6" column-count="6">
                  <ui-table-header>
                    <ui-table-row row-index="1">
                      <ui-table-head column-index="1"><ui-checkbox data-linear-select-all><span class="sr-only">Select all visible issues</span></ui-checkbox></ui-table-head>
                      <ui-table-head column-index="2">Key</ui-table-head>
                      <ui-table-head column-index="3">Issue</ui-table-head>
                      <ui-table-head column-index="4">Status</ui-table-head>
                      <ui-table-head column-index="5">Priority</ui-table-head>
                      <ui-table-head column-index="6">Assignee</ui-table-head>
                    </ui-table-row>
                  </ui-table-header>
                  <ui-table-body>
                    <ui-table-row row-index="2" data-linear-list-row data-linear-issue="MAS-142" data-title="Preserve filter state in shared views" data-area="Views" data-status="progress" data-priority="high" data-assignee="maya" data-initials="MC">
                      <ui-table-cell column-index="1"><ui-checkbox data-linear-select data-linear-issue="MAS-142"><span class="sr-only">Select MAS-142</span></ui-checkbox></ui-table-cell>
                      <ui-table-cell column-index="2"><span class="example-linear-key">MAS-142</span></ui-table-cell>
                      <ui-table-cell column-index="3"><span class="example-linear-issue"><ui-link href="#mas-142" data-linear-open-issue="MAS-142">Preserve filter state in shared views</ui-link><span>Views</span></span></ui-table-cell>
                      <ui-table-cell column-index="4"><ui-badge size="small" tone="positive">In progress</ui-badge></ui-table-cell>
                      <ui-table-cell column-index="5"><span class="example-linear-priority" data-priority="high"><span aria-hidden="true">↑</span> High</span></ui-table-cell>
                      <ui-table-cell column-index="6"><span class="example-linear-assignee"><ui-avatar size="small">MC</ui-avatar><span>Maya</span></span></ui-table-cell>
                    </ui-table-row>
                    <ui-table-row row-index="3" data-linear-list-row data-linear-issue="MAS-138" data-title="Ship keyboard navigation for issue lists" data-area="Accessibility" data-status="review" data-priority="urgent" data-assignee="sam" data-initials="SO">
                      <ui-table-cell column-index="1"><ui-checkbox data-linear-select data-linear-issue="MAS-138"><span class="sr-only">Select MAS-138</span></ui-checkbox></ui-table-cell>
                      <ui-table-cell column-index="2"><span class="example-linear-key">MAS-138</span></ui-table-cell>
                      <ui-table-cell column-index="3"><span class="example-linear-issue"><ui-link href="#mas-138" data-linear-open-issue="MAS-138">Ship keyboard navigation for issue lists</ui-link><span>Accessibility</span></span></ui-table-cell>
                      <ui-table-cell column-index="4"><ui-badge size="small" tone="warning">In review</ui-badge></ui-table-cell>
                      <ui-table-cell column-index="5"><span class="example-linear-priority" data-priority="urgent"><span aria-hidden="true">!</span> Urgent</span></ui-table-cell>
                      <ui-table-cell column-index="6"><span class="example-linear-assignee"><ui-avatar size="small">SO</ui-avatar><span>Sam</span></span></ui-table-cell>
                    </ui-table-row>
                    <ui-table-row row-index="4" data-linear-list-row data-linear-issue="MAS-133" data-title="Add cycle progress to team overview" data-area="Cycles" data-status="todo" data-priority="medium" data-assignee="alex" data-initials="AR">
                      <ui-table-cell column-index="1"><ui-checkbox data-linear-select data-linear-issue="MAS-133"><span class="sr-only">Select MAS-133</span></ui-checkbox></ui-table-cell>
                      <ui-table-cell column-index="2"><span class="example-linear-key">MAS-133</span></ui-table-cell>
                      <ui-table-cell column-index="3"><span class="example-linear-issue"><ui-link href="#mas-133" data-linear-open-issue="MAS-133">Add cycle progress to team overview</ui-link><span>Cycles</span></span></ui-table-cell>
                      <ui-table-cell column-index="4"><ui-badge size="small">Todo</ui-badge></ui-table-cell>
                      <ui-table-cell column-index="5"><span class="example-linear-priority"><span aria-hidden="true">→</span> Medium</span></ui-table-cell>
                      <ui-table-cell column-index="6"><span class="example-linear-assignee"><ui-avatar size="small">AR</ui-avatar><span>Alex</span></span></ui-table-cell>
                    </ui-table-row>
                    <ui-table-row row-index="5" data-linear-list-row data-linear-issue="MAS-129" data-title="Clarify archived project permissions" data-area="Projects" data-status="backlog" data-priority="low" data-assignee="priya" data-initials="PJ">
                      <ui-table-cell column-index="1"><ui-checkbox data-linear-select data-linear-issue="MAS-129"><span class="sr-only">Select MAS-129</span></ui-checkbox></ui-table-cell>
                      <ui-table-cell column-index="2"><span class="example-linear-key">MAS-129</span></ui-table-cell>
                      <ui-table-cell column-index="3"><span class="example-linear-issue"><ui-link href="#mas-129" data-linear-open-issue="MAS-129">Clarify archived project permissions</ui-link><span>Projects</span></span></ui-table-cell>
                      <ui-table-cell column-index="4"><ui-badge size="small">Backlog</ui-badge></ui-table-cell>
                      <ui-table-cell column-index="5"><span class="example-linear-priority"><span aria-hidden="true">↓</span> Low</span></ui-table-cell>
                      <ui-table-cell column-index="6"><span class="example-linear-assignee"><ui-avatar size="small">PJ</ui-avatar><span>Priya</span></span></ui-table-cell>
                    </ui-table-row>
                    <ui-table-row row-index="6" data-linear-list-row data-linear-issue="MAS-121" data-title="Normalize compact density tokens" data-area="Foundations" data-status="done" data-priority="medium" data-assignee="maya" data-initials="MC">
                      <ui-table-cell column-index="1"><ui-checkbox data-linear-select data-linear-issue="MAS-121"><span class="sr-only">Select MAS-121</span></ui-checkbox></ui-table-cell>
                      <ui-table-cell column-index="2"><span class="example-linear-key">MAS-121</span></ui-table-cell>
                      <ui-table-cell column-index="3"><span class="example-linear-issue"><ui-link href="#mas-121" data-linear-open-issue="MAS-121">Normalize compact density tokens</ui-link><span>Foundations</span></span></ui-table-cell>
                      <ui-table-cell column-index="4"><ui-badge size="small" tone="positive">Done</ui-badge></ui-table-cell>
                      <ui-table-cell column-index="5"><span class="example-linear-priority"><span aria-hidden="true">→</span> Medium</span></ui-table-cell>
                      <ui-table-cell column-index="6"><span class="example-linear-assignee"><ui-avatar size="small">MC</ui-avatar><span>Maya</span></span></ui-table-cell>
                    </ui-table-row>
                  </ui-table-body>
                </ui-table>
                </div>

                <div class="example-linear-empty" data-linear-empty hidden>
                  <ui-badge size="small">0 results</ui-badge>
                  <strong>No issues match this view</strong>
                  <span>Clear the filters or try a broader search.</span>
                  <ui-button type="button" size="small" variant="secondary" data-linear-clear-filters>Clear filters</ui-button>
                </div>

                <div class="example-linear-board" data-linear-board-view data-linear-kanban-workspace hidden>
                  <section class="example-linear-board-column" data-linear-board-column="progress" data-catalog-kanban-column="progress">
                    <header><span><span class="example-linear-status-dot" data-status="progress"></span><strong data-catalog-kanban-column-label>In progress</strong></span><ui-badge size="small" data-linear-board-count>2</ui-badge></header>
                    <div class="example-linear-card-list" data-catalog-kanban-list>
                      <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card example-linear-board-card" data-catalog-drag-source="kanban-card" data-catalog-label="Preserve filter state in shared views" data-linear-board-card data-linear-issue="MAS-142" data-title="Preserve filter state in shared views" data-area="Views" data-status="progress" data-priority="high" data-assignee="maya" data-initials="MC">
                        <ui-toolbar slot="handle" class="example-linear-card-drag-handle" label="Move MAS-142"><ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon><span class="example-linear-key">MAS-142</span><span class="example-linear-priority" data-priority="high">↑ High</span></ui-toolbar>
                        <ui-card><div slot="header" class="example-linear-card-heading"><ui-checkbox data-linear-select data-linear-issue="MAS-142"><span class="sr-only">Select MAS-142</span></ui-checkbox><ui-badge size="small">Views</ui-badge></div><ui-link slot="content" href="#mas-142" data-linear-open-issue="MAS-142">Preserve filter state in shared views</ui-link><div slot="footer" class="example-linear-card-footer"><span>Cycle 42</span><ui-avatar size="small">MC</ui-avatar></div></ui-card>
                      </ui-draggable>
                      <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card example-linear-board-card" data-catalog-drag-source="kanban-card" data-catalog-label="Ship keyboard navigation for issue lists" data-linear-board-card data-linear-issue="MAS-138" data-title="Ship keyboard navigation for issue lists" data-area="Accessibility" data-status="review" data-priority="urgent" data-assignee="sam" data-initials="SO">
                        <ui-toolbar slot="handle" class="example-linear-card-drag-handle" label="Move MAS-138"><ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon><span class="example-linear-key">MAS-138</span><span class="example-linear-priority" data-priority="urgent">! Urgent</span></ui-toolbar>
                        <ui-card><div slot="header" class="example-linear-card-heading"><ui-checkbox data-linear-select data-linear-issue="MAS-138"><span class="sr-only">Select MAS-138</span></ui-checkbox><ui-badge size="small">Accessibility</ui-badge></div><ui-link slot="content" href="#mas-138" data-linear-open-issue="MAS-138">Ship keyboard navigation for issue lists</ui-link><div slot="footer" class="example-linear-card-footer"><span>Cycle 42</span><ui-avatar size="small">SO</ui-avatar></div></ui-card>
                      </ui-draggable>
                    </div>
                  </section>
                  <section class="example-linear-board-column" data-linear-board-column="planned" data-catalog-kanban-column="planned">
                    <header><span><span class="example-linear-status-dot" data-status="planned"></span><strong data-catalog-kanban-column-label>Planned</strong></span><ui-badge size="small" data-linear-board-count>2</ui-badge></header>
                    <div class="example-linear-card-list" data-catalog-kanban-list>
                      <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card example-linear-board-card" data-catalog-drag-source="kanban-card" data-catalog-label="Add cycle progress to team overview" data-linear-board-card data-linear-issue="MAS-133" data-title="Add cycle progress to team overview" data-area="Cycles" data-status="todo" data-priority="medium" data-assignee="alex" data-initials="AR">
                        <ui-toolbar slot="handle" class="example-linear-card-drag-handle" label="Move MAS-133"><ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon><span class="example-linear-key">MAS-133</span><span class="example-linear-priority">→ Medium</span></ui-toolbar>
                        <ui-card><div slot="header" class="example-linear-card-heading"><ui-checkbox data-linear-select data-linear-issue="MAS-133"><span class="sr-only">Select MAS-133</span></ui-checkbox><ui-badge size="small">Cycles</ui-badge></div><ui-link slot="content" href="#mas-133" data-linear-open-issue="MAS-133">Add cycle progress to team overview</ui-link><div slot="footer" class="example-linear-card-footer"><span>Backlog</span><ui-avatar size="small">AR</ui-avatar></div></ui-card>
                      </ui-draggable>
                      <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card example-linear-board-card" data-catalog-drag-source="kanban-card" data-catalog-label="Clarify archived project permissions" data-linear-board-card data-linear-issue="MAS-129" data-title="Clarify archived project permissions" data-area="Projects" data-status="backlog" data-priority="low" data-assignee="priya" data-initials="PJ">
                        <ui-toolbar slot="handle" class="example-linear-card-drag-handle" label="Move MAS-129"><ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon><span class="example-linear-key">MAS-129</span><span class="example-linear-priority">↓ Low</span></ui-toolbar>
                        <ui-card><div slot="header" class="example-linear-card-heading"><ui-checkbox data-linear-select data-linear-issue="MAS-129"><span class="sr-only">Select MAS-129</span></ui-checkbox><ui-badge size="small">Projects</ui-badge></div><ui-link slot="content" href="#mas-129" data-linear-open-issue="MAS-129">Clarify archived project permissions</ui-link><div slot="footer" class="example-linear-card-footer"><span>Backlog</span><ui-avatar size="small">PJ</ui-avatar></div></ui-card>
                      </ui-draggable>
                    </div>
                  </section>
                  <section class="example-linear-board-column" data-linear-board-column="done" data-catalog-kanban-column="done">
                    <header><span><span class="example-linear-status-dot" data-status="done"></span><strong data-catalog-kanban-column-label>Done</strong></span><ui-badge size="small" data-linear-board-count>1</ui-badge></header>
                    <div class="example-linear-card-list" data-catalog-kanban-list>
                      <ui-draggable tabindex="-1" containment="viewport" class="example-kanban-card example-linear-board-card" data-catalog-drag-source="kanban-card" data-catalog-label="Normalize compact density tokens" data-linear-board-card data-linear-issue="MAS-121" data-title="Normalize compact density tokens" data-area="Foundations" data-status="done" data-priority="medium" data-assignee="maya" data-initials="MC">
                        <ui-toolbar slot="handle" class="example-linear-card-drag-handle" label="Move MAS-121"><ui-icon class="example-drag-grip" name="action.drag" label=""></ui-icon><span class="example-linear-key">MAS-121</span><span class="example-linear-priority">→ Medium</span></ui-toolbar>
                        <ui-card><div slot="header" class="example-linear-card-heading"><ui-checkbox data-linear-select data-linear-issue="MAS-121"><span class="sr-only">Select MAS-121</span></ui-checkbox><ui-badge size="small">Foundations</ui-badge></div><ui-link slot="content" href="#mas-121" data-linear-open-issue="MAS-121">Normalize compact density tokens</ui-link><div slot="footer" class="example-linear-card-footer"><span>Completed</span><ui-avatar size="small">MC</ui-avatar></div></ui-card>
                      </ui-draggable>
                    </div>
                  </section>
                  <output class="example-linear-board-status" data-catalog-kanban-status aria-live="polite">Drag an issue by its handle to reorder it or change status.</output>
                  <ui-separator class="example-drop-indicator" data-catalog-drop-indicator orientation="horizontal" hidden><span slot="prefix" class="example-drop-indicator-circle" aria-hidden="true"></span></ui-separator>
                </div>
              </section>
            </ui-scroll-area>

            <aside class="example-linear-inspector" data-linear-inspector hidden aria-label="Issue details">
              <header class="example-linear-inspector-header">
                <span class="example-linear-key" data-linear-inspector-key>MAS-142</span>
                <div>
                  <ui-button type="button" size="small" variant="quiet" data-linear-command="copy-link" aria-label="Copy issue link">↗</ui-button>
                  <ui-button type="button" size="small" variant="quiet" data-linear-close-inspector aria-label="Close issue details">×</ui-button>
                </div>
              </header>
              <div class="example-linear-inspector-body">
                <div class="example-linear-inspector-title">
                  <ui-badge size="small" data-linear-inspector-status tone="positive">In progress</ui-badge>
                  <h2 data-linear-inspector-title>Preserve filter state in shared views</h2>
                  <p>Keep filtered issue views durable across refreshes, shared links, and workspace navigation.</p>
                </div>

                <ui-card class="example-linear-diff-card">
                  <div slot="header" class="example-linear-diff-heading"><span>◫</span><strong>Diffs</strong><ui-badge size="small" tone="positive">＋248 −31</ui-badge></div>
                  <ui-link slot="content" href="#pull-218">mash#218 · shared-view persistence</ui-link>
                  <span slot="footer">Checks passing · updated 12m ago</span>
                </ui-card>

                <div class="example-linear-properties">
                  <ui-field label="Status">
                    <ui-select slot="control" data-linear-detail-status value="progress" label="Issue status">
                      <ui-option value="backlog">Backlog</ui-option><ui-option value="todo">Todo</ui-option><ui-option value="progress">In progress</ui-option><ui-option value="review">In review</ui-option><ui-option value="done">Done</ui-option>
                    </ui-select>
                  </ui-field>
                  <ui-field label="Priority">
                    <ui-select slot="control" data-linear-detail-priority value="high" label="Issue priority">
                      <ui-option value="low">Low</ui-option><ui-option value="medium">Medium</ui-option><ui-option value="high">High</ui-option><ui-option value="urgent">Urgent</ui-option>
                    </ui-select>
                  </ui-field>
                  <ui-field label="Assignee">
                    <ui-select slot="control" data-linear-detail-assignee value="maya" label="Issue assignee">
                      <ui-option value="maya">Maya Chen</ui-option><ui-option value="sam">Sam Ortiz</ui-option><ui-option value="alex">Alex Rivera</ui-option><ui-option value="priya">Priya Jain</ui-option>
                    </ui-select>
                  </ui-field>
                </div>

                <ui-collapsible class="example-linear-subissues" open>
                  <span slot="trigger">Sub-issues <ui-badge size="small">2 / 3</ui-badge></span>
                  <div class="example-linear-subissue-list">
                    <ui-checkbox checked>Persist text and property filters</ui-checkbox>
                    <ui-checkbox checked>Serialize grouped display options</ui-checkbox>
                    <ui-checkbox>Restore focused issue after navigation</ui-checkbox>
                  </div>
                </ui-collapsible>

                <ui-tabs class="example-linear-activity" value="activity" label="Issue context">
                  <ui-tab slot="tab" value="activity">Activity</ui-tab>
                  <ui-tab slot="tab" value="relations">Relations</ui-tab>
                  <ui-tab-panel slot="panel" value="activity">
                    <ol class="example-linear-activity-list">
                      <li><ui-avatar size="small">SO</ui-avatar><span><strong>Sam</strong> moved this to In progress<small>28 minutes ago</small></span></li>
                      <li><ui-avatar size="small">MC</ui-avatar><span><strong>Maya</strong> linked mash#218<small>12 minutes ago</small></span></li>
                    </ol>
                    <ui-field label="Add a comment"><ui-textarea slot="control" rows="3" placeholder="Leave an update…"></ui-textarea></ui-field>
                  </ui-tab-panel>
                  <ui-tab-panel slot="panel" value="relations"><div class="example-linear-relation"><ui-badge size="small">Blocks</ui-badge><ui-link href="#mas-151">MAS-151 Release saved views</ui-link></div></ui-tab-panel>
                </ui-tabs>
              </div>
            </aside>
            </div>
          </main>
          <output class="sr-only" data-linear-announcer aria-live="polite"></output>
          <ui-toast-stack class="example-linear-toasts" data-linear-toasts placement="bottom-end" limit="3" label="Workspace updates"></ui-toast-stack>
        </div>`,
      {
        compositionOnly: true,
        description:
          "A controlled issue-tracking system with a nested URL-safe filter recipe, shared list and board data, loading/error/empty states, keyboard command routing, bulk actions, creation, and integrated detail inspection—composed entirely from Mash primitives.",
        stageLayout: "fill",
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
    example(
      "Embedded component cells",
      `
        <ui-table class="example-table-components" label="Composable project settings" row-count="4" column-count="4">
          <ui-table-caption slot="caption">Composable project settings</ui-table-caption>
          <ui-table-header>
            <ui-table-row row-index="1">
              <ui-table-head column-index="1">Project</ui-table-head>
              <ui-table-head column-index="2">Labels</ui-table-head>
              <ui-table-head column-index="3">Automation</ui-table-head>
              <ui-table-head column-index="4">Budget</ui-table-head>
            </ui-table-row>
          </ui-table-header>
          <ui-table-body>
            <ui-table-row row-index="2">
              <ui-table-cell column-index="1"><ui-link href="#billing">Billing migration</ui-link></ui-table-cell>
              <ui-table-cell column-index="2"><span class="example-table-chip-list"><ui-chip value="finance" readonly>Finance</ui-chip><ui-chip value="migration" readonly>Migration</ui-chip></span></ui-table-cell>
              <ui-table-cell column-index="3"><ui-switch checked aria-label="Billing automation"></ui-switch></ui-table-cell>
              <ui-table-cell column-index="4">
                <ui-popover label="Edit billing budget" placement="bottom-start">
                  <ui-button slot="trigger" size="small" variant="quiet">$48,000</ui-button>
                  <strong slot="title">Billing budget</strong>
                  <span slot="description">Update the project allocation.</span>
                  <ui-field label="Budget"><ui-number-field slot="control" value="48000" min="0" step="1000" label="Billing budget"></ui-number-field></ui-field>
                  <ui-button slot="close" size="small">Apply</ui-button>
                </ui-popover>
              </ui-table-cell>
            </ui-table-row>
            <ui-table-row row-index="3">
              <ui-table-cell column-index="1"><ui-link href="#reconciliation">Invoice reconciliation</ui-link></ui-table-cell>
              <ui-table-cell column-index="2"><span class="example-table-chip-list"><ui-chip value="operations" readonly>Operations</ui-chip><ui-chip value="review" readonly>Review</ui-chip></span></ui-table-cell>
              <ui-table-cell column-index="3"><ui-switch aria-label="Reconciliation automation"></ui-switch></ui-table-cell>
              <ui-table-cell column-index="4"><ui-intl-formatter kind="currency" value="32500" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
            </ui-table-row>
            <ui-table-row row-index="4">
              <ui-table-cell column-index="1"><ui-link href="#archive">Archive import</ui-link></ui-table-cell>
              <ui-table-cell column-index="2"><span class="example-table-chip-list"><ui-chip value="records" readonly>Records</ui-chip></span></ui-table-cell>
              <ui-table-cell column-index="3"><ui-switch checked aria-label="Archive automation"></ui-switch></ui-table-cell>
              <ui-table-cell column-index="4"><ui-intl-formatter kind="currency" value="18750" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
            </ui-table-row>
          </ui-table-body>
        </ui-table>`,
      {
        compositionOnly: true,
        description:
          "The base table already accepts Chips, Switches, formatters, and an anchored insertion form without adding cell-renderer callbacks.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-data-table": [
    example(
      "Composable workbook",
      `
        <ui-data-table class="catalog-example example-workbook" data-catalog-data-table data-catalog-workbook label="Project planning workbook" selection="cell" selected="3:3" density="compact">
          <div slot="toolbar" class="example-workbook-toolbar">
            <ui-toolbar label="Workbook tools">
              <ui-button type="button" size="small" variant="quiet" aria-label="Undo"><ui-icon name="action.reset" label=""></ui-icon></ui-button>
              <ui-button type="button" size="small" variant="quiet" aria-label="Redo"><ui-icon name="action.refresh" label=""></ui-icon></ui-button>
              <ui-separator orientation="vertical"></ui-separator>
              <ui-toggle size="small">B</ui-toggle>
              <ui-toggle size="small">I</ui-toggle>
              <ui-toggle size="small">%</ui-toggle>
            </ui-toolbar>
            <output class="example-workbook-name-box" data-catalog-data-table-coordinate>B2</output>
            <ui-input-group class="example-workbook-formula">
              <span slot="prefix" aria-hidden="true">ƒx</span>
              <ui-input slot="control" data-catalog-data-table-formula label="Formula" value="=OWNER(&quot;Sam Ortiz&quot;)"></ui-input>
            </ui-input-group>
          </div>
          <ui-table label="Project planning workbook" row-count="5" column-count="6">
            <ui-table-header>
              <ui-table-row row-index="1">
                <ui-table-head scope="none" column-index="1"><span class="example-workbook-corner" aria-hidden="true"></span></ui-table-head>
                <ui-table-head column-index="2" sort="ascending">A · Project</ui-table-head>
                <ui-table-head column-index="3">B · Owner</ui-table-head>
                <ui-table-head column-index="4">C · Status</ui-table-head>
                <ui-table-head column-index="5">D · Budget</ui-table-head>
                <ui-table-head column-index="6">E · Due</ui-table-head>
              </ui-table-row>
            </ui-table-header>
            <ui-table-body>
              <ui-table-row row-index="2">
                <ui-table-head scope="row" column-index="1">1</ui-table-head>
                <ui-table-cell column-index="2" data-formula="=PROJECT(AXI-36)"><ui-link href="#axi-36">Billing migration</ui-link></ui-table-cell>
                <ui-table-cell column-index="3" data-formula="=OWNER(&quot;Maya Chen&quot;)"><span class="example-table-entity"><ui-avatar size="small">MC</ui-avatar><span>Maya Chen</span></span></ui-table-cell>
                <ui-table-cell column-index="4" data-formula="=STATUS(&quot;Active&quot;)"><ui-chip value="active" readonly>Active</ui-chip></ui-table-cell>
                <ui-table-cell column-index="5" editable data-formula="=SUM(42000,6000)"><ui-intl-formatter kind="currency" value="48000" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
                <ui-table-cell column-index="6" data-formula="=DATE(2026,9,12)"><ui-intl-formatter kind="date" value="2026-09-12" locale="en-US"></ui-intl-formatter></ui-table-cell>
              </ui-table-row>
              <ui-table-row row-index="3">
                <ui-table-head scope="row" column-index="1">2</ui-table-head>
                <ui-table-cell column-index="2" data-formula="=PROJECT(AXI-41)"><ui-link href="#axi-41">Invoice reconciliation</ui-link></ui-table-cell>
                <ui-table-cell column-index="3" data-formula="=OWNER(&quot;Sam Ortiz&quot;)"><span class="example-table-entity"><ui-avatar size="small">SO</ui-avatar><span>Sam Ortiz</span></span></ui-table-cell>
                <ui-table-cell column-index="4" data-formula="=STATUS(&quot;Review&quot;)"><ui-chip value="review" readonly>Review</ui-chip></ui-table-cell>
                <ui-table-cell column-index="5" editable data-formula="=32500"><ui-intl-formatter kind="currency" value="32500" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
                <ui-table-cell column-index="6" data-formula="=DATE(2026,9,18)"><ui-intl-formatter kind="date" value="2026-09-18" locale="en-US"></ui-intl-formatter></ui-table-cell>
              </ui-table-row>
              <ui-table-row row-index="4">
                <ui-table-head scope="row" column-index="1">3</ui-table-head>
                <ui-table-cell column-index="2" data-formula="=PROJECT(AXI-48)"><ui-link href="#axi-48">Archive import</ui-link></ui-table-cell>
                <ui-table-cell column-index="3" data-formula="=OWNER(&quot;Alex Rivera&quot;)"><span class="example-table-entity"><ui-avatar size="small">AR</ui-avatar><span>Alex Rivera</span></span></ui-table-cell>
                <ui-table-cell column-index="4" data-formula="=STATUS(&quot;Blocked&quot;)"><ui-chip value="blocked" readonly>Blocked</ui-chip></ui-table-cell>
                <ui-table-cell column-index="5" editable data-formula="=18750"><ui-intl-formatter kind="currency" value="18750" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
                <ui-table-cell column-index="6" data-formula="=DATE(2026,10,2)"><ui-intl-formatter kind="date" value="2026-10-02" locale="en-US"></ui-intl-formatter></ui-table-cell>
              </ui-table-row>
              <ui-table-row row-index="5">
                <ui-table-head scope="row" column-index="1">4</ui-table-head>
                <ui-table-cell column-index="2" data-formula="=PROJECT(AXI-59)"><ui-link href="#axi-59">Token utilities</ui-link></ui-table-cell>
                <ui-table-cell column-index="3" data-formula="=OWNER(&quot;Priya Jain&quot;)"><span class="example-table-entity"><ui-avatar size="small">PJ</ui-avatar><span>Priya Jain</span></span></ui-table-cell>
                <ui-table-cell column-index="4" data-formula="=STATUS(&quot;On track&quot;)"><ui-chip value="on-track" readonly>On track</ui-chip></ui-table-cell>
                <ui-table-cell column-index="5" editable data-formula="=22000"><ui-intl-formatter kind="currency" value="22000" currency="USD" locale="en-US"></ui-intl-formatter></ui-table-cell>
                <ui-table-cell column-index="6" data-formula="=DATE(2026,10,8)"><ui-intl-formatter kind="date" value="2026-10-08" locale="en-US"></ui-intl-formatter></ui-table-cell>
              </ui-table-row>
            </ui-table-body>
          </ui-table>
          <form slot="editor" class="example-workbook-editor" data-catalog-data-table-editor>
            <div class="example-workbook-editor-heading">
              <strong data-catalog-data-table-editor-coordinate>Editing D2</strong>
              <span>Authored form · controlled cell identity</span>
            </div>
            <ui-field label="Value">
              <ui-number-field slot="control" data-catalog-data-table-editor-value name="value" value="32500" min="0" step="1000" label="Budget value"></ui-number-field>
            </ui-field>
            <ui-field label="Formula">
              <ui-input slot="control" data-catalog-data-table-editor-formula name="formula" value="=32500" label="Budget formula"></ui-input>
            </ui-field>
            <div class="example-actions"><ui-button type="reset" size="small" variant="secondary">Cancel</ui-button><ui-button type="submit" size="small">Apply</ui-button></div>
          </form>
          <div slot="loading" class="example-data-table-loading"><ui-spinner size="small" label="Refreshing workbook"></ui-spinner>Refreshing</div>
          <div slot="footer" class="example-data-table-footer">
            <output data-catalog-data-table-selection>Cell B2 selected</output>
            <ui-pagination current-page="1" total-pages="4" visible-pages="3" label="Workbook pages"></ui-pagination>
          </div>
        </ui-data-table>`,
      {
        compositionOnly: true,
        description:
          "A Sheets-like surface assembled from ordinary Mash anatomy: toolbar, formula input, links, avatars, chips, formatters, one slotted form editor, pagination, selectable row and column titles, and controlled Shift-click or Shift-arrow ranges.",
        stageLayout: "fill",
      },
    ),
    example(
      "Selection modes",
      `
        <div class="catalog-example example-data-table-modes">
          <ui-card>
            <strong slot="title">Rows</strong><span slot="description">Parent-owned record selection</span>
            <ui-data-table slot="content" data-catalog-data-table label="Row selection" selection="row" selected="2" density="compact">
              <ui-table label="Row selection" row-count="4" column-count="2">
                <ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1">Project</ui-table-head><ui-table-head column-index="2">State</ui-table-head></ui-table-row></ui-table-header>
                <ui-table-body>
                  <ui-table-row row-index="2"><ui-table-cell column-index="1">Billing</ui-table-cell><ui-table-cell column-index="2"><ui-badge tone="positive">Active</ui-badge></ui-table-cell></ui-table-row>
                  <ui-table-row row-index="3"><ui-table-cell column-index="1">Reconciliation</ui-table-cell><ui-table-cell column-index="2"><ui-badge tone="warning">Review</ui-badge></ui-table-cell></ui-table-row>
                  <ui-table-row row-index="4"><ui-table-cell column-index="1">Archive</ui-table-cell><ui-table-cell column-index="2"><ui-badge tone="critical">Blocked</ui-badge></ui-table-cell></ui-table-row>
                </ui-table-body>
              </ui-table>
            </ui-data-table>
          </ui-card>
          <ui-card>
            <strong slot="title">Columns</strong><span slot="description">Header and cell-band selection</span>
            <ui-data-table slot="content" data-catalog-data-table label="Column selection" selection="column" selected="2" density="compact">
              <ui-table label="Column selection" row-count="4" column-count="3">
                <ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1">Q1</ui-table-head><ui-table-head column-index="2">Q2</ui-table-head><ui-table-head column-index="3">Q3</ui-table-head></ui-table-row></ui-table-header>
                <ui-table-body>
                  <ui-table-row row-index="2"><ui-table-cell column-index="1">18</ui-table-cell><ui-table-cell column-index="2">24</ui-table-cell><ui-table-cell column-index="3">31</ui-table-cell></ui-table-row>
                  <ui-table-row row-index="3"><ui-table-cell column-index="1">22</ui-table-cell><ui-table-cell column-index="2">29</ui-table-cell><ui-table-cell column-index="3">36</ui-table-cell></ui-table-row>
                  <ui-table-row row-index="4"><ui-table-cell column-index="1">27</ui-table-cell><ui-table-cell column-index="2">34</ui-table-cell><ui-table-cell column-index="3">41</ui-table-cell></ui-table-row>
                </ui-table-body>
              </ui-table>
            </ui-data-table>
          </ui-card>
          <ui-card>
            <strong slot="title">Cells</strong><span slot="description">Arrow keys move; Shift extends a range</span>
            <ui-data-table slot="content" data-catalog-data-table label="Cell selection" selection="cell" selected="3:2" density="compact">
              <ui-table label="Cell selection" row-count="4" column-count="3">
                <ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1">A</ui-table-head><ui-table-head column-index="2">B</ui-table-head><ui-table-head column-index="3">C</ui-table-head></ui-table-row></ui-table-header>
                <ui-table-body>
                  <ui-table-row row-index="2"><ui-table-cell column-index="1">A1</ui-table-cell><ui-table-cell column-index="2">B1</ui-table-cell><ui-table-cell column-index="3">C1</ui-table-cell></ui-table-row>
                  <ui-table-row row-index="3"><ui-table-cell column-index="1">A2</ui-table-cell><ui-table-cell column-index="2" editable>B2</ui-table-cell><ui-table-cell column-index="3">C2</ui-table-cell></ui-table-row>
                  <ui-table-row row-index="4"><ui-table-cell column-index="1">A3</ui-table-cell><ui-table-cell column-index="2">B3</ui-table-cell><ui-table-cell column-index="3">C3</ui-table-cell></ui-table-row>
                </ui-table-body>
              </ui-table>
            </ui-data-table>
          </ui-card>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Selection is one controlled contract with Shift-click and Shift-arrow ranges across row, column, and cell granularities.",
        stageLayout: "fill",
      },
    ),
    example(
      "Namespace tree explorer",
      `
        <ui-resizable class="catalog-example example-data-explorer" label="Namespace and record explorer">
          <ui-resizable-panel size="276" min="208" max="384">
            <section class="example-data-explorer-tree" data-catalog-data-explorer>
              <header><strong>Namespaces</strong><ui-button size="small" variant="quiet" aria-label="Add namespace">＋</ui-button></header>
              <ui-scroll-area label="Namespace tree" mode="hover">
                <ui-tree label="Interzone data namespaces" selection-follows-focus>
                  <ui-tree-item value="projects" kind="folder" expanded selected><span slot="label">Projects</span><ui-badge slot="meta">4</ui-badge>
                    <ui-tree-item slot="children" value="billing" kind="file"><span slot="label">Billing migration</span></ui-tree-item>
                    <ui-tree-item slot="children" value="reconciliation" kind="file"><span slot="label">Invoice reconciliation</span></ui-tree-item>
                  </ui-tree-item>
                  <ui-tree-item value="records" kind="folder" expanded><span slot="label">Records</span><ui-badge slot="meta">3</ui-badge>
                    <ui-tree-item slot="children" value="archive" kind="file"><span slot="label">Archive import</span></ui-tree-item>
                    <ui-tree-item slot="children" value="audit" kind="file"><span slot="label">Audit exports</span></ui-tree-item>
                  </ui-tree-item>
                  <ui-tree-item value="tokens" kind="folder"><span slot="label">Tokens</span><ui-badge slot="meta">484</ui-badge></ui-tree-item>
                </ui-tree>
              </ui-scroll-area>
            </section>
          </ui-resizable-panel>
          <ui-resizable-handle label="Resize namespace tree"><ui-separator orientation="vertical"><span slot="prefix" class="example-resize-detent"></span></ui-separator></ui-resizable-handle>
          <ui-resizable-panel min="360">
            <ui-data-table class="example-data-explorer-table" data-catalog-data-table label="Projects namespace records" selection="row" selected="2" density="regular">
              <ui-toolbar slot="toolbar" label="Namespace records tools"><strong data-catalog-data-explorer-title>Projects</strong><ui-button size="small" variant="secondary">Filter</ui-button><ui-button size="small">New record</ui-button></ui-toolbar>
              <ui-table label="Projects namespace records" row-count="4" column-count="4">
                <ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1">Record</ui-table-head><ui-table-head column-index="2">Kind</ui-table-head><ui-table-head column-index="3">State</ui-table-head><ui-table-head column-index="4">Updated</ui-table-head></ui-table-row></ui-table-header>
                <ui-table-body>
                  <ui-table-row row-index="2"><ui-table-cell column-index="1"><ui-path size="small" path="/projects/billing-migration"><span slot="title">Billing migration</span></ui-path></ui-table-cell><ui-table-cell column-index="2"><ui-chip readonly>Project</ui-chip></ui-table-cell><ui-table-cell column-index="3"><ui-badge tone="positive">Active</ui-badge></ui-table-cell><ui-table-cell column-index="4">12m ago</ui-table-cell></ui-table-row>
                  <ui-table-row row-index="3"><ui-table-cell column-index="1"><ui-path size="small" path="/projects/invoice-reconciliation"><span slot="title">Invoice reconciliation</span></ui-path></ui-table-cell><ui-table-cell column-index="2"><ui-chip readonly>Project</ui-chip></ui-table-cell><ui-table-cell column-index="3"><ui-badge tone="warning">Review</ui-badge></ui-table-cell><ui-table-cell column-index="4">1h ago</ui-table-cell></ui-table-row>
                  <ui-table-row row-index="4"><ui-table-cell column-index="1"><ui-path size="small" path="/projects/archive-import"><span slot="title">Archive import</span></ui-path></ui-table-cell><ui-table-cell column-index="2"><ui-chip readonly>Record</ui-chip></ui-table-cell><ui-table-cell column-index="3"><ui-badge tone="critical">Blocked</ui-badge></ui-table-cell><ui-table-cell column-index="4">Yesterday</ui-table-cell></ui-table-row>
                </ui-table-body>
              </ui-table>
              <div slot="footer" class="example-data-table-footer"><output data-catalog-data-table-selection>Row 2 selected</output><span>3 visible records</span></div>
            </ui-data-table>
          </ui-resizable-panel>
        </ui-resizable>`,
      {
        compositionOnly: true,
        description:
          "Tree navigation and tabular records remain peer primitives inside Resizable; neither hierarchy nor record workflow leaks into ui-data-table.",
        stageLayout: "fill",
      },
    ),
  ],
  "ui-card": [
    example(
      "Background materials",
      `
        <div class="catalog-example example-material-stage">
          <div class="example-material-grid">
            <section class="example-material material-ultra-thin">
              <ui-card>
                <strong slot="title">Ultra thin</strong>
                <span slot="description">Minimal tint</span>
                <p slot="content" class="vibrant-label-primary">Edge chrome that should preserve almost all of its surrounding context.</p>
              </ui-card>
            </section>
            <section class="example-material material-thin">
              <ui-card>
                <strong slot="title">Thin</strong>
                <span slot="description">Compact chrome</span>
                <p slot="content" class="vibrant-label-primary">Bars, edge treatments, and controls that retain their context.</p>
              </ui-card>
            </section>
            <section class="example-material material-regular">
              <ui-card>
                <strong slot="title">Regular</strong>
                <span slot="description">Default separation</span>
                <p slot="content" class="vibrant-label-primary">Panels and floating controls over active content.</p>
              </ui-card>
            </section>
            <section class="example-material material-thick">
              <ui-card>
                <strong slot="title">Thick</strong>
                <span slot="description">Content-bearing overlay</span>
                <p slot="content" class="vibrant-label-primary">Sheets and focused surfaces that need stronger isolation.</p>
              </ui-card>
            </section>
            <section class="example-material material-ultra-thick">
              <ui-card>
                <strong slot="title">Ultra thick</strong>
                <span slot="description">Maximum separation</span>
                <p slot="content" class="vibrant-label-primary">Dense overlays where content clarity outweighs background continuity.</p>
              </ui-card>
            </section>
          </div>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Five semantic material roles share one backdrop blur and vary tint contribution. Exported title and description parts composite automatically; authored body copy opts into the same semantic label utility.",
        stageLayout: "start",
      },
    ),
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
  "ui-bubble": [
    example(
      "Grouped message",
      `
        <section class="catalog-example example-message-thread" aria-label="Grouped message">
          <div class="example-message-row">
            <ui-avatar size="small">AM</ui-avatar>
            <div class="example-message-main">
              <div class="example-message-meta"><strong>Avery Moss</strong><ui-intl-formatter kind="time" value="2026-08-20T15:42:00Z" locale="en-US" time-zone="UTC"></ui-intl-formatter></div>
              <ui-bubble-group>
                <ui-bubble alignment="start" variant="secondary">The review note is ready.</ui-bubble>
                <ui-bubble alignment="start" variant="secondary">I split the follow-up into two short items.</ui-bubble>
                <ui-bubble alignment="start" variant="secondary" reaction-side="bottom">
                  Both can travel as ordinary authored content.
                  <ui-button slot="reactions" type="button" size="xsmall" variant="ghost">+2</ui-button>
                </ui-bubble>
              </ui-bubble-group>
              <div class="example-message-footer"><span>Delivered</span><ui-button type="button" size="xsmall" variant="quiet">Reply</ui-button></div>
            </div>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Message identity, time, delivery text, and actions compose around the bubble; the bubble owns only the conversational surface and alignment.",
      },
    ),
    example(
      "Scroller composition",
      `
        <section class="catalog-example example-message-shell" aria-label="Conversation shell">
          <ui-scroll-area class="example-message-scroller" label="Conversation history" mode="always" gutter="stable">
            <div slot="content" class="example-message-thread">
              ${Array.from(
                { length: 5 },
                (_, index) => `
                  <div class="example-message-row${index % 2 ? " example-message-row-end" : ""}">
                    ${index % 2 ? "" : `<ui-avatar size="small">MC</ui-avatar>`}
                    <div class="example-message-main">
                      <div class="example-message-meta"><strong>${index % 2 ? "You" : "Maya Chen"}</strong><span>${15 + index}:4${index}</span></div>
                      <ui-bubble alignment="${index % 2 ? "end" : "start"}" variant="${index % 2 ? "filled" : "secondary"}">${index % 2 ? "I updated the reviewer list and kept the note linked." : "The imported record needs a short status note before the handoff."}</ui-bubble>
                    </div>
                    ${index % 2 ? `<ui-avatar size="small">You</ui-avatar>` : ""}
                  </div>`,
              ).join("")}
            </div>
          </ui-scroll-area>
          <div class="example-message-composer">
            <ui-input-group>
              <ui-input slot="control" type="text" label="Message" placeholder="Write a reply"></ui-input>
              <ui-kbd slot="suffix" command="message.send" shortcut="Enter"></ui-kbd>
            </ui-input-group>
            <ui-button type="button" size="small">Send</ui-button>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Tail-following, unread identity, and composer state stay application-owned; ScrollArea supplies the native viewport while Bubble supplies each message surface.",
        stageLayout: "start",
      },
    ),
    example(
      "Surface variants",
      `
        <div class="catalog-example example-bubble-variants">
          <ui-bubble variant="filled">Primary response</ui-bubble>
          <ui-bubble variant="secondary">Neutral incoming response</ui-bubble>
          <ui-bubble variant="muted">Low-emphasis context</ui-bubble>
          <ui-bubble variant="tinted">Selected response context</ui-bubble>
          <ui-bubble variant="outline">Bounded review note</ui-bubble>
          <ui-bubble variant="ghost">Full-width unframed transcript line</ui-bubble>
          <ui-bubble variant="destructive">Failed: regenerate the invoice sample.</ui-bubble>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Bubble variants resolve through semantic surfaces, action roles, and the critical role.",
      },
    ),
    example(
      "Rich content and actions",
      `
        <ui-bubble class="catalog-example example-bubble-rich" variant="outline" alignment="start" reaction-side="bottom" reaction-alignment="end">
          <div slot="content" class="example-bubble-file">
            <ui-icon name="object.document" label=""></ui-icon>
            <span><ui-label size="small" text="design-notes.pdf"></ui-label><ui-label size="xsmall" text="PDF" secondary="2.4 MB"></ui-label></span>
          </div>
          <ui-button slot="reactions" type="button" size="xsmall" variant="ghost">Open</ui-button>
          <ui-button slot="reactions" type="button" size="xsmall" variant="ghost">Copy link</ui-button>
        </ui-bubble>`,
      {
        compositionOnly: true,
        description:
          "The content slot carries arbitrary layout while reaction controls remain regular buttons in a compact semantic lane.",
      },
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
  "ui-file-upload": [
    example(
      "Image asset field",
      `
        <section class="catalog-example example-file-upload-panel" data-catalog-file-upload-demo>
          <header class="example-file-upload-heading">
            <ui-icon name="object.image" label=""></ui-icon>
            <div class="example-file-upload-copy"><strong>Project cover</strong><span>Workspace header and shared previews</span></div>
            <ui-badge size="small" tone="warning" data-catalog-file-upload-count>Empty</ui-badge>
          </header>
          <ui-file-upload class="example-file-upload" name="cover" accept="image/png,image/jpeg,image/webp" max-size="12582912" required label="Choose a project cover" data-catalog-file-upload>
            <ui-icon slot="prefix" name="action.upload" label=""></ui-icon>
            Choose image
            <span slot="description">PNG, JPEG, or WebP · 12 MB maximum</span>
            <output slot="selection" class="example-file-upload-selection" aria-live="polite" data-catalog-file-upload-output>No files selected</output>
          </ui-file-upload>
        </section>`,
      {
        compositionOnly: true,
        description:
          "The form-associated picker owns native activation, drag state, file policy, and validity while the application retains preview and persistence policy.",
        stageLayout: "start",
      },
    ),
    example(
      "Mixed media queue",
      `
        <section class="catalog-example example-file-upload-panel" data-catalog-file-upload-demo>
          <header class="example-file-upload-heading">
            <ui-icon name="object.video" label=""></ui-icon>
            <div class="example-file-upload-copy"><strong>Media handoff</strong><span>Reference footage, audio, and stills</span></div>
            <ui-button type="button" size="xsmall" variant="quiet" data-catalog-file-upload-clear>Clear</ui-button>
          </header>
          <ui-file-upload class="example-file-upload" name="media" accept="image/*,audio/*,video/*" multiple max-files="4" max-size="104857600" label="Choose project media" data-catalog-file-upload>
            <ui-icon slot="prefix" name="action.upload" label=""></ui-icon>
            Add media
            <span slot="description">Up to four files · 100 MB each</span>
            <output slot="selection" class="example-file-upload-selection" aria-live="polite" data-catalog-file-upload-output>No files selected</output>
          </ui-file-upload>
          <ol class="example-file-upload-queue" aria-label="Selected media" data-catalog-file-upload-queue></ol>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Multiple selection reports one immutable accepted set plus typed rejections; this authored queue is a replaceable consumer of that event.",
        stageLayout: "start",
      },
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
      "Size aliases and no label",
      `
        <div class="catalog-example example-checkbox-sizes">
          <ui-checkbox size="xsmall" checked>Extra small</ui-checkbox>
          <ui-checkbox size="small" checked>Small</ui-checkbox>
          <ui-checkbox size="medium" checked>Medium</ui-checkbox>
          <ui-checkbox size="large" checked>Large</ui-checkbox>
          <ui-checkbox aria-label="Select billing migration" checked></ui-checkbox>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Size aliases map to checkbox indicator and mark dimensions; no-label checkboxes collapse the label lane.",
      },
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
  "ui-switch": [
    example(
      "Settings list",
      `
        <section class="catalog-example example-switch-list" aria-label="Notification settings">
          <div class="example-switch-row">
            <span class="example-switch-copy">
              <strong>Product updates</strong>
              <span>New features and release notes.</span>
            </span>
            <ui-switch name="product-updates" checked aria-label="Product updates"></ui-switch>
          </div>
          <ui-separator></ui-separator>
          <div class="example-switch-row">
            <span class="example-switch-copy">
              <strong>Security alerts</strong>
              <span>Important account activity.</span>
            </span>
            <ui-switch name="security-alerts" aria-label="Security alerts"></ui-switch>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "A switch works best as an immediate binary setting, usually at the trailing edge of a compact row.",
      },
    ),
    example(
      "Sizes and labels",
      `
        <div class="catalog-example example-switch-matrix">
          <ui-switch size="small" checked>Small</ui-switch>
          <ui-switch size="medium" checked>Medium</ui-switch>
          <ui-switch size="medium" label-side="left" checked>Label left</ui-switch>
          <ui-switch size="small" disabled>Disabled off</ui-switch>
          <ui-switch size="medium" checked disabled>Disabled on</ui-switch>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Switch geometry maps to small 28x16 and medium 36x20 tracks, with sm/md aliases accepted by the public size attribute.",
      },
    ),
  ],
  "ui-input": [
    example(
      "Native state matrix",
      `
        <section class="catalog-example example-input-grid" aria-label="Input states">
          <ui-field label="Name" description="Submitted with the containing form." required>
            <ui-input slot="control" name="name" value="Quarterly review"></ui-input>
          </ui-field>
          <ui-field label="Readonly value" description="Can be focused, selected, and copied.">
            <ui-input slot="control" name="readonly-value" value="quarterly-review" readonly></ui-input>
          </ui-field>
          <ui-field label="Disabled value" description="Disabled inputs do not submit a form value.">
            <ui-input slot="control" name="disabled-value" value="Unavailable" disabled></ui-input>
          </ui-field>
          <ui-field label="Patterned code" invalid error="Use three to eight uppercase letters followed by two digits.">
            <ui-input slot="control" name="patterned-code" value="bad-key" pattern="[A-Z]{3,8}[0-9]{2}" minlength="5" maxlength="10" autocomplete="off"></ui-input>
          </ui-field>
        </section>`,
      {
        compositionOnly: true,
        description:
          "The custom element keeps one native input as the edit surface while field context, readonly, disabled, required, and native validity remain observable on the host.",
        stageLayout: "start",
      },
    ),
    example(
      "Command search fragment",
      `
        <section class="catalog-example example-input-command-fragment" aria-label="Command search" data-catalog-input-lab>
          <header class="example-input-command-header">
            <div class="example-link-heading">
              <span class="example-eyebrow">Command scope</span>
              <h2>Find project work</h2>
              <p>Search records, owners, and saved views from one authored row.</p>
            </div>
            <ui-menu label="Search scope" density="compact" sizing="fixed">
              <ui-button slot="trigger" type="button" size="small" variant="secondary">All<ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon></ui-button>
              <ui-menu-item kind="radio" value="all" checked>All<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
              <ui-menu-item kind="radio" value="records">Records<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
              <ui-menu-item kind="radio" value="people">People<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            </ui-menu>
          </header>
          <ui-field label="Search" description="Project index">
            <ui-input-group id="input-search-command" class="example-input-command-search" slot="control">
              <ui-icon slot="prefix" name="action.search" label=""></ui-icon>
              <ui-input slot="control" type="search" name="query" label="Search" value="release" autocomplete="off" clean-on-escape data-catalog-input-focus data-catalog-input-events></ui-input>
              <ui-button slot="suffix" type="button" size="small" variant="quiet" aria-label="Clear search" data-catalog-input-clear><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
              <ui-kbd slot="suffix" command="input.focus" shortcut="Primary+K"></ui-kbd>
            </ui-input-group>
            <ui-gesture-binding for="input-search-command" gesture="key" shortcut="Primary+K" command="input.focus" prevent-default="recognized"></ui-gesture-binding>
          </ui-field>
          <div class="example-input-command-results" role="list" aria-label="Search results">
            <ui-link role="listitem" variant="quiet" href="#release-readiness"><ui-icon slot="prefix" name="object.document" label=""></ui-icon>Release readiness<ui-badge slot="suffix" size="small" tone="positive">Ready</ui-badge></ui-link>
            <ui-link role="listitem" variant="quiet" href="#migration-room"><ui-icon slot="prefix" name="object.folder" label=""></ui-icon>Migration room<ui-badge slot="suffix" size="small">Room</ui-badge></ui-link>
            <ui-link role="listitem" variant="quiet" href="#sam-ortiz"><ui-avatar slot="prefix" size="small">SO</ui-avatar>Sam Ortiz<ui-badge slot="suffix" size="small" tone="warning">Owner</ui-badge></ui-link>
          </div>
          <output class="example-input-log" data-catalog-input-log>value: release</output>
        </section>`,
      {
        compositionOnly: true,
        description:
          "The query remains one native input; scope, shortcuts, clear actions, and results compose around it as a reusable fragment.",
      },
    ),
    example(
      "Secure value composition",
      `
        <ui-field class="catalog-example example-field" label="Secure value" description="The reveal control is an adjacent toggle, not hidden input chrome.">
          <ui-input-group slot="control" data-catalog-password-group>
            <ui-icon slot="prefix" name="object.keyboard" label=""></ui-icon>
            <ui-input slot="control" type="password" name="secure-value" label="Secure value" value="sample-secret" autocomplete="current-password"></ui-input>
            <ui-toggle slot="suffix" size="small" data-catalog-password-toggle>Show</ui-toggle>
          </ui-input-group>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Formats without masking chrome",
      `
        <section class="catalog-example example-input-format-fragment" aria-label="Native input formats">
          <ui-field label="Contact email"><ui-input slot="control" type="email" name="email" label="Contact email" placeholder="team@example.com" autocomplete="email" inputmode="email"></ui-input></ui-field>
          <ui-field label="Support phone"><ui-input slot="control" type="tel" name="phone" label="Support phone" placeholder="+1 555 0100" autocomplete="tel" inputmode="tel"></ui-input></ui-field>
          <ui-field label="Reference URL"><ui-input slot="control" type="url" name="url" label="Reference URL" placeholder="https://example.com" autocomplete="url" inputmode="url"></ui-input></ui-field>
          <ui-field label="Amount">
            <ui-input-group slot="control">
              <span slot="prefix">$</span>
              <ui-input slot="control" name="amount" label="Amount" value="12,500" inputmode="decimal" pattern="[0-9,]+(\\.[0-9]{0,2})?"></ui-input>
              <span slot="suffix">USD</span>
            </ui-input-group>
          </ui-field>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Email, tel, URL, autocomplete, inputmode, pattern, and affixed units stay native or composed. Heavy masking belongs in an app formatter or a number-field wrapper.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-textarea": [
    example(
      "Rows and availability",
      `
        <section class="catalog-example example-textarea-grid" aria-label="Textarea states">
          <ui-field label="Notes" description="Multiline text uses native textarea editing and validation.">
            <ui-textarea slot="control" name="notes" rows="5" maxlength="240" placeholder="Add context"></ui-textarea>
          </ui-field>
          <ui-field label="Readonly text">
            <ui-textarea slot="control" rows="4" readonly value="Readonly text can still be selected and copied."></ui-textarea>
          </ui-field>
          <ui-field label="Locked field">
            <ui-textarea slot="control" rows="4" disabled value="Editing is unavailable while this field is disabled."></ui-textarea>
          </ui-field>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Rows, readonly selection, disabled availability, and native length constraints pass through the custom element without adding visual wrapper anatomy.",
        stageLayout: "start",
      },
    ),
    example(
      "Comment composer",
      `
        <form class="catalog-example example-comment-composer" aria-label="Comment composer" data-catalog-composer>
          <div class="example-composer-header">
            <ui-avatar size="medium">RM</ui-avatar>
            <div class="example-composer-author">
              <strong>Rina Malik</strong>
              <span>Billing migration</span>
            </div>
            <ui-badge size="small">Draft</ui-badge>
          </div>
          <div class="example-composer-editor">
            <ui-field label="Comment" description="Project update for the migration room.">
              <ui-textarea slot="control" name="comment" rows="5" maxlength="280" placeholder="Write a concrete update" data-catalog-composer-text></ui-textarea>
            </ui-field>
            <ui-toolbar label="Comment tools" class="example-composer-toolbar">
              <ui-toggle size="small" aria-label="Bold"><strong>B</strong></ui-toggle>
              <ui-toggle size="small" aria-label="Italic"><em>I</em></ui-toggle>
              <ui-toggle size="small" aria-label="Inline code"><code>&lt;&gt;</code></ui-toggle>
              <ui-separator orientation="vertical"></ui-separator>
              <ui-menu label="Insert into comment" density="compact" sizing="fixed">
                <ui-button slot="trigger" type="button" size="small" variant="quiet" aria-label="Insert content">
                  <ui-icon name="action.add" label=""></ui-icon>
                </ui-button>
                <ui-menu-item value="attachment"><ui-icon slot="prefix" name="object.document" label=""></ui-icon>Attachment</ui-menu-item>
                <ui-menu-item value="link"><ui-icon slot="prefix" name="action.launch" label=""></ui-icon>Link</ui-menu-item>
                <ui-menu-item value="code"><ui-icon slot="prefix" name="object.terminal" label=""></ui-icon>Code block</ui-menu-item>
              </ui-menu>
              <ui-menu label="Comment visibility" density="compact" sizing="fixed">
                <ui-button slot="trigger" type="button" size="small" variant="quiet">
                  Team
                  <ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon>
                </ui-button>
                <ui-menu-item kind="radio" value="team" checked>Team<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
                <ui-menu-item kind="radio" value="private">Private note<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
              </ui-menu>
            </ui-toolbar>
          </div>
          <div class="example-composer-footer">
            <output class="example-composer-status" data-catalog-composer-status>Draft is empty.</output>
            <span class="example-composer-count" data-catalog-composer-count>0 / 280</span>
            <ui-button type="submit" size="small" data-catalog-composer-send disabled>Comment</ui-button>
          </div>
        </form>`,
      {
        compositionOnly: true,
        description:
          "Textarea owns only the edit surface. Identity, formatting commands, insertion menus, visibility, counters, and submission compose as a durable HTML fragment around it.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-input-group": [
    example(
      "Affix anatomy",
      `
        <ui-field class="catalog-example example-field" label="Reference code" description="One authored control sits between optional leading and trailing content.">
          <ui-input-group id="catalog-reference-code" class="part-prefix-separator:bg-border part-suffix-separator:bg-border" slot="control">
            <ui-icon slot="prefix" name="object.keyboard" label=""></ui-icon>
            <ui-input slot="control" label="Reference code" placeholder="ABC123"></ui-input>
            <ui-kbd slot="suffix" command="field.commit" shortcut="Enter"></ui-kbd>
          </ui-input-group>
          <ui-gesture-binding for="catalog-reference-code" gesture="key" shortcut="Enter" command="field.commit" prevent-default="recognized"></ui-gesture-binding>
        </ui-field>`,
      {
        compositionOnly: true,
        description:
          "InputGroup supplies no editing behavior of its own; it exposes stable prefix, control, and suffix slots around exactly one native or Mash control.",
      },
    ),
    example(
      "Tailwind anatomy overrides",
      `
        <ui-field class="catalog-example example-field" label="Namespace filter" description="The recipe remains the default; generated part, slot, and state variants provide the application override layer.">
          <ui-input-group
            class="part-root:border-action part-root:bg-surface-raised part-prefix:px-control-inline-small part-suffix:px-control-inline-small slot-prefix:text-action state-has-prefix:part-prefix:bg-action-subtle"
            slot="control"
          >
            <ui-icon slot="prefix" name="object.folder" label=""></ui-icon>
            <ui-input slot="control" type="search" label="Filter namespace" value="/interzone/projects"></ui-input>
            <ui-button slot="suffix" size="small" variant="quiet" aria-label="Clear namespace filter">
              <ui-icon name="action.dismiss" label=""></ui-icon>
            </ui-button>
          </ui-input-group>
        </ui-field>`,
      {
        compositionOnly: true,
        description:
          "The Custom Elements Manifest generates Tailwind variants for every public part, named slot, and custom state, so applications can extend the active recipe without private selectors.",
      },
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
              <ui-icon slot="prefix" name="action.search" label=""></ui-icon>
              <ui-input slot="control" data-catalog-editor-search label="Find in source" value="Project"></ui-input>
              <ui-button id="editor-find-next" slot="suffix" size="small" variant="secondary" data-catalog-editor-find="next">
                <ui-icon name="navigation.forward" label=""></ui-icon>
                Next
                <ui-kbd command="editor.find-next" shortcut="Enter"></ui-kbd>
              </ui-button>
            </ui-input-group>
            <ui-gesture-binding for="editor-find-next" gesture="key" shortcut="Enter" command="editor.find-next" prevent-default="recognized"></ui-gesture-binding>
            <ui-card slot="completion" elevation="raised" class="example-editor-completion">
              <strong slot="title">ProjectStatus</strong>
              <span slot="description">type alias</span>
              <ui-kbd slot="value" command="editor.accept-completion" shortcut="Tab"></ui-kbd>
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
      "Basic single-select",
      `
        <ui-field class="catalog-example example-field" label="Framework" description="Default UI kit for this project.">
          <ui-select slot="control" name="framework" value="mash" label="Framework">
            <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
            <ui-option value="mash">Mash<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="radix">Radix Themes<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="custom">Custom kit<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="shadcn">shadcn/ui<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Placeholder and clear",
      `
        <ui-field class="catalog-example example-field" label="Deployment region" description="Primary serving region for the workspace.">
          <ui-select slot="control" name="region" value="iad" label="Deployment region" placeholder="Choose a region">
            <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
            <ui-button slot="clear" type="button" size="small" variant="quiet" aria-label="Clear region"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
            <ui-option value="iad">US East<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="sfo">US West<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="fra">Europe Central<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="sin">Asia Pacific<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Searchable countries",
      `
        <ui-field class="catalog-example example-field" label="Country">
          <ui-select slot="control" name="country" value="japan" label="Country" searchable search-placeholder="Search countries">
            <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
            <span slot="empty">No countries found</span>
            <ui-option-group label="Americas">
              <ui-option value="canada">Canada<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="mexico">Mexico<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="united-states">United States<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
            <ui-option-group label="Asia Pacific">
              <ui-option value="japan">Japan<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="singapore">Singapore<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="south-korea">South Korea<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
            <ui-option-group label="Europe">
              <ui-option value="france">France<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="germany">Germany<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="spain">Spain<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Readonly selection",
      `
        <ui-field class="catalog-example example-field" label="Release channel" description="Readonly values remain focusable and participate in form submission.">
          <ui-select slot="control" name="release-channel" value="stable" label="Release channel" readonly>
            <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
            <ui-option value="stable">Stable<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="preview">Preview<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="canary">Canary<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Grouped disabled items",
      `
        <ui-field class="catalog-example example-field" label="Timezone">
          <ui-select slot="control" name="timezone" value="utc-5" label="Timezone">
            <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
            <ui-option-group label="Americas">
              <ui-option value="utc-8">Pacific time<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="utc-5">Eastern time<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
            <ui-option-group label="Europe">
              <ui-option value="utc-0">Greenwich mean time<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="utc-1" disabled>Central European time<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
            <ui-option-group label="Asia Pacific">
              <ui-option value="utc-8-asia" disabled>Singapore time<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="utc-9">Japan standard time<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Sizes and disabled",
      `
        <div class="catalog-example example-select-showcase">
          <ui-field label="Small" description="Dense settings rows.">
            <ui-select slot="control" size="small" name="small-priority" value="low" label="Small priority">
              <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
              <ui-option value="low">Low</ui-option>
              <ui-option value="medium">Medium</ui-option>
              <ui-option value="high">High</ui-option>
            </ui-select>
          </ui-field>
          <ui-field label="Medium" description="Default control rhythm.">
            <ui-select slot="control" name="medium-priority" value="medium" label="Medium priority">
              <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
              <ui-option value="low">Low</ui-option>
              <ui-option value="medium">Medium</ui-option>
              <ui-option value="high">High</ui-option>
            </ui-select>
          </ui-field>
          <ui-field label="Large disabled" description="Prominent but unavailable.">
            <ui-select slot="control" size="large" name="large-priority" value="high" label="Large priority" disabled>
              <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
              <ui-option value="low">Low</ui-option>
              <ui-option value="medium">Medium</ui-option>
              <ui-option value="high">High</ui-option>
            </ui-select>
          </ui-field>
        </div>`,
      { compositionOnly: true, stageLayout: "start" },
    ),
    example(
      "Placement and alignment",
      `
        <ui-field class="catalog-example example-field" label="Issue state" description="The same selection control can anchor above and align to the logical end.">
          <ui-select slot="control" name="issue-state" value="progress" label="Issue state" placement="top" align="end">
            <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
            <ui-option value="backlog">Backlog<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="progress">In progress<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="review">In review<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="done">Done<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Empty state",
      `
        <ui-field class="catalog-example example-field" label="University">
          <ui-select slot="control" name="university" label="University" placeholder="Choose a university" searchable search-placeholder="Search universities">
            <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
            <span slot="empty">No universities available</span>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Menu width and height",
      `
        <ui-field class="catalog-example example-field" label="Food">
          <ui-select class="example-select-bounded" slot="control" name="food" value="watermelon" label="Food">
            <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
            <ui-option value="apple">Apple<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="banana">Banana<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="cherry">Cherry<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="dragonfruit">Dragon fruit<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="elderberry">Elderberry<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="fig">Fig<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="grapefruit">Grapefruit<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="watermelon">Watermelon with a very long menu label that should truncate cleanly<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-select>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Events and gesture control",
      `
        <div class="catalog-example example-select-showcase example-select-open-stage" data-catalog-select-lab>
          <div id="select-command-scope" class="example-select-command-scope" tabindex="0" aria-label="Select commands">
            <ui-toggle id="select-open-toggle" data-catalog-select-open-toggle aria-label="Toggle status menu"><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-toggle>
            <ui-button type="button" size="small" variant="secondary" data-catalog-select-action="show">Show</ui-button>
            <ui-button type="button" size="small" variant="secondary" data-catalog-select-action="dismiss">Dismiss</ui-button>
            <ui-button type="button" size="small" variant="secondary" data-catalog-select-value="done">Set Done</ui-button>
            <ui-button type="button" size="small" variant="quiet" data-catalog-select-action="clear">Clear</ui-button>
          </div>
          <ui-gesture-binding for="select-open-toggle" gesture="press" command="select.toggle" group="select-control"></ui-gesture-binding>
          <ui-gesture-binding for="select-command-scope" gesture="key" shortcut="Primary+ArrowDown" command="select.open" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="select-command-scope" gesture="key" shortcut="Escape" command="select.dismiss" prevent-default="recognized"></ui-gesture-binding>
          <ui-field label="Event status" description="Change, confirm, open state, and semantic commands share one value surface.">
            <ui-select slot="control" name="event-status" value="progress" label="Event status" data-catalog-select-demo data-catalog-select-events>
              <ui-icon slot="icon" name="navigation.chevron-down" label=""></ui-icon>
              <ui-option value="backlog">Backlog<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="progress">In progress<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="review">In review<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="done">Done<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-select>
          </ui-field>
          <output class="example-select-log" data-catalog-select-log>open: false</output>
        </div>`,
      { compositionOnly: true, stageLayout: "start" },
    ),
  ],
  "ui-combobox": [
    example(
      "Basic single-select",
      `
        <ui-field class="catalog-example example-field" label="Framework" description="Searchable single selection with a custom clear affordance.">
          <ui-combobox slot="control" name="framework" value="Next.js" label="Framework" placeholder="Search frameworks">
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
            <ui-button slot="trigger" type="button" size="small" variant="quiet" aria-label="Show frameworks"><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <ui-button slot="clear" type="button" size="small" variant="quiet" aria-label="Clear framework"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
            <span slot="empty">No matching frameworks</span>
            <ui-option value="Next.js">Next.js<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="SvelteKit">SvelteKit<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Nuxt.js">Nuxt.js<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Remix">Remix<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Astro">Astro<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Multi-select chips",
      `
        <ui-field class="catalog-example example-field" label="Frameworks" description="Multiple selection keeps the popup available while chips only request removal.">
          <ui-combobox slot="control" name="frameworks" label="Frameworks" multiple values='["React", "Angular"]' data-catalog-combobox-demo data-catalog-combobox-chips>
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
            <ui-button slot="clear" type="button" size="small" variant="quiet" aria-label="Clear frameworks"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
            <span slot="empty">No matching frameworks</span>
            <ui-option-group label="Frontend">
              <ui-option value="React">React<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Angular">Angular<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="VueJS">VueJS<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Svelte">Svelte<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="SolidJS">SolidJS<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
            <ui-option-group label="Meta frameworks">
              <ui-option value="Next.js">Next.js<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Astro">Astro<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Remix">Remix<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Qwik">Qwik<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Rearrange selected owners",
      `
        <section class="catalog-example example-chip-workspace" data-catalog-drag-boundary aria-label="Owner precedence">
          <ui-combobox name="owners" label="Owners" multiple values='["maya","sam","alex","jo"]'>
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
            <ui-chip slot="chips" value="maya" data-catalog-drag-source="chip" data-catalog-drag-axis="x" data-catalog-label="Maya"><ui-button type="button" size="xsmall" variant="quiet" aria-label="Move Maya" data-catalog-drag-handle><ui-icon name="action.drag" label=""></ui-icon></ui-button>Maya</ui-chip>
            <ui-chip slot="chips" value="sam" data-catalog-drag-source="chip" data-catalog-drag-axis="x" data-catalog-label="Sam"><ui-button type="button" size="xsmall" variant="quiet" aria-label="Move Sam" data-catalog-drag-handle><ui-icon name="action.drag" label=""></ui-icon></ui-button>Sam</ui-chip>
            <ui-chip slot="chips" value="alex" data-catalog-drag-source="chip" data-catalog-drag-axis="x" data-catalog-label="Alex"><ui-button type="button" size="xsmall" variant="quiet" aria-label="Move Alex" data-catalog-drag-handle><ui-icon name="action.drag" label=""></ui-icon></ui-button>Alex</ui-chip>
            <ui-chip slot="chips" value="jo" data-catalog-drag-source="chip" data-catalog-drag-axis="x" data-catalog-label="Jo"><ui-button type="button" size="xsmall" variant="quiet" aria-label="Move Jo" data-catalog-drag-handle><ui-icon name="action.drag" label=""></ui-icon></ui-button>Jo</ui-chip>
            <ui-button slot="clear" type="button" size="small" variant="quiet" aria-label="Clear owners"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
            <span slot="empty">No matching owners</span>
            <ui-option value="maya" data-catalog-combobox-label="Maya">Maya<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="sam" data-catalog-combobox-label="Sam">Sam<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="alex" data-catalog-combobox-label="Alex">Alex<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="jo" data-catalog-combobox-label="Jo">Jo<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-combobox>
          <output class="example-drag-status" data-catalog-chip-status>Owner precedence: Maya, Sam, Alex, Jo</output>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Draggable chip handles reorder selected values while the Combobox keeps the owned value collection and suggestion surface.",
      },
    ),
    example(
      "Grouped disabled items",
      `
        <ui-field class="catalog-example example-field" label="Food" description="Groups stay authored in light DOM, including unavailable choices.">
          <ui-combobox slot="control" name="food" label="Food" placeholder="Search foods">
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
            <span slot="empty">No matching foods</span>
            <ui-option-group label="Fruits">
              <ui-option value="Apples">Apples<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Bananas">Bananas<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Cherries">Cherries<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
            <ui-option-group label="Vegetables">
              <ui-option value="Carrots">Carrots<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Broccoli" disabled>Broccoli<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Spinach">Spinach<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
            <ui-option-group label="Beverages">
              <ui-option value="Tea">Tea<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Coffee" disabled>Coffee<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Juice">Juice<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-option-group>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Custom item rows",
      `
        <ui-field class="catalog-example example-field" label="Industry" description="Options can carry icons, metadata, badges, and their own selected indicator.">
          <ui-combobox slot="control" name="industry" value="Education" label="Industry" filter="none">
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
            <ui-option value="Information technology">
              <span class="example-combobox-row">
                <ui-icon name="object.terminal" label=""></ui-icon>
                <span class="example-combobox-row-copy"><strong>Information technology</strong><span class="example-combobox-meta">Cloud, developer tooling, and data platforms</span></span>
              </span>
              <ui-icon slot="indicator" name="action.confirm" label=""></ui-icon>
            </ui-option>
            <ui-option value="Healthcare">
              <span class="example-combobox-row">
                <ui-icon name="status.information" label=""></ui-icon>
                <span class="example-combobox-row-copy"><strong>Healthcare</strong><span class="example-combobox-meta">Care delivery and operations systems</span></span>
              </span>
              <ui-icon slot="indicator" name="action.confirm" label=""></ui-icon>
            </ui-option>
            <ui-option value="Education">
              <span class="example-combobox-row">
                <ui-icon name="object.document" label=""></ui-icon>
                <span class="example-combobox-row-copy"><strong>Education</strong><span class="example-combobox-meta">Learning products and campus tooling</span></span>
                <ui-badge tone="accent">Featured</ui-badge>
              </span>
              <ui-icon slot="indicator" name="action.confirm" label=""></ui-icon>
            </ui-option>
            <ui-option value="Entertainment">
              <span class="example-combobox-row">
                <ui-icon name="object.folder" label=""></ui-icon>
                <span class="example-combobox-row-copy"><strong>Entertainment</strong><span class="example-combobox-meta">Media catalogs and audience workflows</span></span>
              </span>
              <ui-icon slot="indicator" name="action.confirm" label=""></ui-icon>
            </ui-option>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Footer action",
      `
        <ui-field class="catalog-example example-field" label="University" description="The persistent footer stays outside the listbox while the caller decides what the action creates.">
          <ui-combobox slot="control" name="university" label="University" placeholder="Search universities" data-catalog-combobox-demo>
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
            <span slot="empty">No matching universities</span>
            <ui-option value="Stanford University">Stanford University<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Harvard University">Harvard University<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Massachusetts Institute of Technology">Massachusetts Institute of Technology<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-button slot="footer" type="button" variant="ghost" tone="accent" class="example-combobox-footer-action" data-catalog-combobox-add-option="Princeton University">
              <ui-icon slot="prefix" name="action.add" label=""></ui-icon>
              New university
            </ui-button>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Custom trigger and clear",
      `
        <ui-field class="catalog-example example-field" label="Industry filter" description="Trigger, clear, and value presentation are authored slots around the editable input.">
          <ui-combobox slot="control" name="industry-filter" value="Finance" label="Industry filter" filter="none">
            <ui-badge slot="value" tone="accent">Preferred</ui-badge>
            <ui-button slot="trigger" type="button" variant="secondary" size="small" aria-label="Show industries">
              <span class="example-combobox-trigger-pill">Industry <ui-icon name="navigation.chevron-down" label=""></ui-icon></span>
            </ui-button>
            <ui-button slot="clear" type="button" size="small" variant="quiet" aria-label="Clear industry"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
            <ui-option value="Information technology">Information technology<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Healthcare">Healthcare<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Finance">Finance<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Education">Education<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Sizes and disabled",
      `
        <div class="catalog-example example-combobox-showcase">
          <ui-field label="Small" description="Compact control density.">
            <ui-combobox slot="control" size="small" name="small-framework" label="Small framework" placeholder="Small">
              <ui-option value="Next.js">Next.js</ui-option>
              <ui-option value="Astro">Astro</ui-option>
            </ui-combobox>
          </ui-field>
          <ui-field label="Medium" description="Default catalog density.">
            <ui-combobox slot="control" name="medium-framework" label="Medium framework" placeholder="Medium">
              <ui-option value="SvelteKit">SvelteKit</ui-option>
              <ui-option value="Remix">Remix</ui-option>
            </ui-combobox>
          </ui-field>
          <ui-field label="Large disabled" description="Unavailable controls preserve geometry.">
            <ui-combobox slot="control" size="large" name="large-framework" value="Qwik" label="Large framework" disabled>
              <ui-option value="Qwik">Qwik</ui-option>
              <ui-option value="Nuxt.js">Nuxt.js</ui-option>
            </ui-combobox>
          </ui-field>
        </div>`,
      { compositionOnly: true, stageLayout: "start" },
    ),
    example(
      "Selection limit",
      `
        <ui-field class="catalog-example example-field" label="Framework limit" description="At capacity, unselected items become disabled until a chip is removed.">
          <ui-combobox slot="control" name="limited-frameworks" label="Framework limit" multiple values='["React", "Remix"]' data-catalog-combobox-demo data-catalog-combobox-chips data-catalog-combobox-max="2">
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
            <span slot="empty">No matching frameworks</span>
            <ui-option value="React">React<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Next.js">Next.js<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Angular">Angular<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Remix">Remix<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Astro">Astro<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Pinned overflow count",
      `
        <ui-field class="catalog-example example-field" label="Pinned frameworks" description="Pinned selections stay selected and disabled while the trigger summarizes overflow.">
          <ui-combobox slot="control" name="pinned-frameworks" label="Pinned frameworks" multiple values='["Next.js", "SvelteKit", "React", "Remix"]' data-catalog-combobox-demo data-catalog-combobox-chips data-catalog-combobox-max-visible="2">
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
            <span slot="empty">No matching frameworks</span>
            <ui-option value="Next.js" disabled data-catalog-combobox-pinned>Next.js <ui-badge tone="accent">Pinned</ui-badge><ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="SvelteKit" disabled data-catalog-combobox-pinned>SvelteKit <ui-badge tone="accent">Pinned</ui-badge><ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="React">React<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Remix">Remix<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Astro">Astro<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            <ui-option value="Qwik">Qwik<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
          </ui-combobox>
        </ui-field>`,
      { compositionOnly: true },
    ),
    example(
      "Events and programmatic control",
      `
        <div class="catalog-example example-combobox-showcase example-combobox-open-stage" data-catalog-combobox-lab>
          <div class="example-combobox-toolbar">
            <ui-button type="button" size="small" variant="secondary" data-catalog-combobox-action="show">Show</ui-button>
            <ui-button type="button" size="small" variant="secondary" data-catalog-combobox-action="dismiss">Dismiss</ui-button>
            <ui-button type="button" size="small" variant="secondary" data-catalog-combobox-value="Remix">Select Remix</ui-button>
            <ui-button type="button" size="small" variant="quiet" data-catalog-combobox-action="clear">Clear</ui-button>
          </div>
          <ui-field label="Event framework" description="Input, selection, open changes, and imperative commands share one state surface.">
            <ui-combobox slot="control" name="event-framework" label="Event framework" placeholder="Type or choose" data-catalog-combobox-demo data-catalog-combobox-events>
              <ui-icon slot="icon" name="action.search" label=""></ui-icon>
              <ui-button slot="trigger" type="button" size="small" variant="quiet" aria-label="Show event frameworks"><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-button>
              <ui-option value="Next.js">Next.js<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="SvelteKit">SvelteKit<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Remix">Remix<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
              <ui-option value="Astro">Astro<ui-icon slot="indicator" name="action.confirm" label=""></ui-icon></ui-option>
            </ui-combobox>
          </ui-field>
          <output class="example-combobox-log" data-catalog-combobox-log>open: false</output>
        </div>`,
      { compositionOnly: true, stageLayout: "start" },
    ),
  ],
  "ui-autocomplete": [
    example(
      "Search projects",
      `
        <ui-field class="catalog-example example-field" label="Related project" description="Start typing to narrow the project list.">
          <ui-autocomplete slot="control" name="related-project" label="Related project">
            <ui-icon slot="icon" name="action.search" label=""></ui-icon>
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
    example(
      "Move views between tabs and tree",
      `
        <div class="catalog-example example-tab-workspace" data-catalog-drag-boundary>
          <aside class="example-tab-sidebar">
            <strong>Interzone</strong>
            <ui-tree label="Workspace views">
              <ui-tree-item
                class="example-tab-drop"
                kind="folder"
                path="/interzone/pinned"
                title="Pinned views"
                expanded
                data-catalog-tab-drop
              >
            <ui-icon slot="icon" name="object.folder" label=""></ui-icon>
                <ui-tree-item
                  slot="children"
                  kind="file"
                  value="pinned-timeline"
                  path="/interzone/pinned/timeline"
                  data-catalog-label="Timeline"
                  data-catalog-tab-value="timeline"
                  data-catalog-drag-source="tree-tab"
                  data-catalog-drag-free
                >
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
                  <span slot="label">Timeline</span>
                  <ui-button slot="actions" variant="quiet" size="small" data-catalog-drag-handle aria-label="Move Timeline to the tab bar"><ui-icon name="action.drag" label=""></ui-icon></ui-button>
                </ui-tree-item>
              </ui-tree-item>
            </ui-tree>
            <p class="example-support">Transfer or reorder views along either detent. Press Escape to cancel.</p>
          </aside>
          <main class="example-tab-main">
            <ui-tabs class="example-tabbar-drop" value="overview" label="Project views" data-catalog-tabbar-drop>
              <ui-tab slot="tab" value="overview" data-catalog-label="Overview" data-catalog-drag-source="tab" data-catalog-drag-free>
                <ui-icon class="example-drag-grip" data-catalog-drag-handle name="action.drag" label="Move Overview tab"></ui-icon>Overview
              </ui-tab>
              <ui-tab slot="tab" value="invoices" data-catalog-label="Invoices" data-catalog-drag-source="tab" data-catalog-drag-free>
                <ui-icon class="example-drag-grip" data-catalog-drag-handle name="action.drag" label="Move Invoices tab"></ui-icon>Invoices
              </ui-tab>
              <ui-tab slot="tab" value="activity" data-catalog-label="Activity" data-catalog-drag-source="tab" data-catalog-drag-free>
                <ui-icon class="example-drag-grip" data-catalog-drag-handle name="action.drag" label="Move Activity tab"></ui-icon>Activity
              </ui-tab>
              <ui-tab-panel slot="panel" value="overview">
                <ui-card title="Billing migration" description="Project overview">
                  <p slot="content">Three project views can be promoted into the persistent sidebar tree.</p>
                </ui-card>
              </ui-tab-panel>
              <ui-tab-panel slot="panel" value="invoices">
                <ui-card title="Invoices"><p slot="content">Invoice reconciliation queue.</p></ui-card>
              </ui-tab-panel>
              <ui-tab-panel slot="panel" value="activity">
                <ui-card title="Activity"><p slot="content">Recent project changes.</p></ui-card>
              </ui-tab-panel>
            </ui-tabs>
            <div hidden data-catalog-tab-cache>
              <ui-tab-panel slot="panel" value="timeline">
                <ui-card title="Timeline" description="Restored from pinned views"><p slot="content">Milestones and project decisions retain their panel state while pinned in the tree.</p></ui-card>
              </ui-tab-panel>
            </div>
            <output class="example-drag-status" data-catalog-tab-status>Move a view in either direction.</output>
          </main>
          <ui-separator class="example-drop-indicator" data-catalog-drop-indicator hidden aria-hidden="true">
            <span slot="prefix" class="example-drop-indicator-circle"></span>
          </ui-separator>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Tabs and tree items keep their own contracts; the surrounding workspace transfers or reorders the same view, preserves its panel while pinned, and cancels ambiguous drops.",
        stageLayout: "fill",
      },
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
      "Editing playground",
      `
        <section class="catalog-example example-editing-playground" data-catalog-editing-playground>
          <header class="example-editing-header">
            <ui-path size="small" path="/studio/systems/agent-workbench"><span slot="title">Agent workbench</span></ui-path>
            <span class="example-editing-presence"><span class="example-editing-presence-dot"></span>Saved</span>
            <ui-toolbar class="example-editing-history" label="Document history">
              <ui-button type="button" size="xsmall" variant="quiet" compact aria-label="Undo" title="Undo" data-editing-command="history.undo"><ui-icon name="navigation.back" label=""></ui-icon></ui-button>
              <ui-button type="button" size="xsmall" variant="quiet" compact aria-label="Redo" title="Redo" data-editing-command="history.redo"><ui-icon name="action.refresh" label=""></ui-icon></ui-button>
            </ui-toolbar>
            <ui-avatar size="small">AM</ui-avatar>
            <ui-button type="button" size="small" variant="primary">Publish</ui-button>
            <ui-button type="button" size="small" variant="quiet" compact aria-label="More document actions"><ui-icon name="navigation.more.horizontal" label=""></ui-icon></ui-button>
          </header>
          <div class="example-editing-workspace">
            <aside class="example-editing-outline" aria-label="Document outline">
              <div class="example-editing-panel-heading"><strong>Outline</strong><ui-badge size="small">6</ui-badge></div>
              <nav class="example-editing-outline-list" aria-label="Headings">
                <ui-button type="button" size="small" variant="quiet" data-editing-focus-block="title">Adaptive workbench</ui-button>
                <ui-button type="button" size="small" variant="quiet" data-editing-focus-block="architecture">Architecture</ui-button>
                <ui-button type="button" size="small" variant="quiet" data-editing-focus-block="workstreams">Workstreams</ui-button>
                <ui-button type="button" size="small" variant="quiet" data-editing-focus-block="release">Release gates</ui-button>
                <ui-button type="button" size="small" variant="quiet" data-editing-focus-block="media">Media handoff</ui-button>
                <ui-button type="button" size="small" variant="quiet" data-editing-focus-block="signoff">Sign-off</ui-button>
              </nav>
              <div class="example-editing-panel-meta">
                <ui-icon name="status.information" label=""></ui-icon>
                <span>Systems studio</span>
              </div>
            </aside>
            <main class="example-editing-canvas">
              <article id="editing-playground-surface" class="example-editing-document" aria-label="Adaptive workbench brief" data-editing-surface>
                <section data-editing-block="cover" data-editing-block-kind="image">
                  <div data-editing-block-content>
                    <figure class="example-editing-media example-editing-cover" data-editing-component="image" data-editing-upload-container="image">
                      <ui-image class="example-editing-image-preview" src="/assets/editor-workbench-cover.png" alt="Material samples and interface diagrams arranged on a studio worktable" width="1672" height="941" loading="eager">
                        <span slot="placeholder">Decoding cover</span>
                        <span slot="error">Cover unavailable</span>
                      </ui-image>
                      <figcaption class="example-editing-media-caption">
                        <div><span contenteditable="true" spellcheck="true" data-editing-text>Material studies for a portable interface grammar.</span><small>Systems studio · September 2026</small></div>
                        <ui-file-upload class="example-editing-upload-compact" accept="image/*" label="Replace cover image" max-size="104857600" data-editing-upload="image"><ui-icon slot="prefix" name="object.image" label=""></ui-icon>Replace<span slot="description">Images up to 100 MB</span></ui-file-upload>
                      </figcaption>
                    </figure>
                  </div>
                </section>
                <section data-editing-block="meta" data-editing-block-kind="caption">
                  <div data-editing-block-content>
                    <div class="example-editing-document-meta">
                      <p class="example-editing-kicker" contenteditable="true" spellcheck="true" data-editing-text>WORKING BRIEF · SEPTEMBER 7</p>
                      <div><ui-badge size="small" tone="positive">On track</ui-badge><ui-badge size="small" tone="accent">v0.4</ui-badge><ui-avatar size="small">AM</ui-avatar><ui-avatar size="small">SK</ui-avatar></div>
                    </div>
                  </div>
                </section>
                <section data-editing-block="title" data-editing-block-kind="title">
                  <div data-editing-block-content><h1 contenteditable="true" spellcheck="true" data-editing-text>Adaptive workbench</h1></div>
                </section>
                <section data-editing-block="summary" data-editing-block-kind="body">
                  <div data-editing-block-content><p class="example-editing-lead" contenteditable="true" spellcheck="true" data-editing-text>One document can hold prose, data, controls, media, and future agent output without surrendering its meaning to a single framework.</p></div>
                </section>
                <section data-editing-block="metrics" data-editing-block-kind="metrics">
                  <div data-editing-block-content>
                    <dl class="example-editing-metrics" data-editing-component="metrics">
                      <div class="example-editing-metric"><dt>Block contracts</dt><dd>24</dd><ui-badge size="small" tone="positive">+9 this pass</ui-badge></div>
                      <div class="example-editing-metric"><dt>Renderer coverage</dt><dd>91%</dd><ui-badge size="small" tone="accent">Web baseline</ui-badge></div>
                      <div class="example-editing-metric"><dt>Open decisions</dt><dd>3</dd><ui-badge size="small" tone="warning">Needs review</ui-badge></div>
                    </dl>
                  </div>
                </section>
                <section data-editing-block="decision" data-editing-block-kind="callout">
                  <div data-editing-block-content>
                    <ui-card class="example-editing-callout" data-editing-component="callout">
                      <strong slot="header">Design decision</strong>
                      <p slot="content" contenteditable="true" spellcheck="true" data-editing-text>Stream stable block records; keep files, collaboration, persistence, and rendering adapters replaceable.</p>
                      <ui-badge slot="meta" size="small" tone="accent">Accepted</ui-badge>
                    </ui-card>
                  </div>
                </section>
                <section data-editing-block="architecture" data-editing-block-kind="heading">
                  <div data-editing-block-content><h2 contenteditable="true" spellcheck="true" data-editing-text>Architecture</h2></div>
                </section>
                <section data-editing-block="architecture-copy" data-editing-block-kind="body">
                  <div data-editing-block-content><p contenteditable="true" spellcheck="true" data-editing-text>The document record carries stable IDs, versions, JSON props, and ordered operations. A renderer adapter turns each record into durable HTML, while <span data-editing-initial>selection and commands remain shared context</span> across toolbars, menus, keyboard gestures, and agent insertions.</p></div>
                </section>
                <section data-editing-block="architecture-tabs" data-editing-block-kind="tabs">
                  <div data-editing-block-content>
                    <ui-tabs class="example-editing-tabs" label="Architecture views" value="document" data-editing-component="tabs">
                      <ui-tab slot="tab" value="document">Document</ui-tab>
                      <ui-tab slot="tab" value="agents">Agents</ui-tab>
                      <ui-tab slot="tab" value="handoff">Handoff</ui-tab>
                      <ui-tab-panel slot="panel" value="document"><p contenteditable="true" spellcheck="true" data-editing-text>Authored HTML remains readable before the editor runtime upgrades it.</p></ui-tab-panel>
                      <ui-tab-panel slot="panel" value="agents"><p contenteditable="true" spellcheck="true" data-editing-text>Monotonic frames make partial output deterministic, replayable, and rejectable.</p></ui-tab-panel>
                      <ui-tab-panel slot="panel" value="handoff"><p contenteditable="true" spellcheck="true" data-editing-text>Local file handles become asset IDs only when an application chooses storage.</p></ui-tab-panel>
                    </ui-tabs>
                  </div>
                </section>
                <section data-editing-block="workstreams" data-editing-block-kind="heading">
                  <div data-editing-block-content><h2 contenteditable="true" spellcheck="true" data-editing-text>Workstreams</h2></div>
                </section>
                <section data-editing-block="workstream-table" data-editing-block-kind="table">
                  <div data-editing-block-content>
                    <ui-table label="Release workstreams" row-count="4" column-count="4" data-editing-component="table">
                      <ui-table-header><ui-table-row row-index="1"><ui-table-head column-index="1"><span contenteditable="true">Workstream</span></ui-table-head><ui-table-head column-index="2"><span contenteditable="true">Status</span></ui-table-head><ui-table-head column-index="3"><span contenteditable="true">Owner</span></ui-table-head><ui-table-head column-index="4"><span contenteditable="true">Window</span></ui-table-head></ui-table-row></ui-table-header>
                      <ui-table-body>
                        <ui-table-row row-index="2"><ui-table-cell column-index="1"><span contenteditable="true">Interface schema</span></ui-table-cell><ui-table-cell column-index="2"><ui-badge size="small" tone="warning">In review</ui-badge></ui-table-cell><ui-table-cell column-index="3"><span contenteditable="true">Platform</span></ui-table-cell><ui-table-cell column-index="4">Sep 09</ui-table-cell></ui-table-row>
                        <ui-table-row row-index="3"><ui-table-cell column-index="1"><span contenteditable="true">Media pipeline</span></ui-table-cell><ui-table-cell column-index="2"><ui-badge size="small" tone="positive">Ready</ui-badge></ui-table-cell><ui-table-cell column-index="3"><span contenteditable="true">Studio</span></ui-table-cell><ui-table-cell column-index="4">Sep 11</ui-table-cell></ui-table-row>
                        <ui-table-row row-index="4"><ui-table-cell column-index="1"><span contenteditable="true">Agent renderer</span></ui-table-cell><ui-table-cell column-index="2"><ui-badge size="small" tone="accent">Building</ui-badge></ui-table-cell><ui-table-cell column-index="3"><span contenteditable="true">Systems</span></ui-table-cell><ui-table-cell column-index="4">Sep 14</ui-table-cell></ui-table-row>
                      </ui-table-body>
                    </ui-table>
                  </div>
                </section>
                <section data-editing-block="release" data-editing-block-kind="heading">
                  <div data-editing-block-content><h2 contenteditable="true" spellcheck="true" data-editing-text>Release gates</h2></div>
                </section>
                <section data-editing-block="release-progress" data-editing-block-kind="progress">
                  <div data-editing-block-content><div class="example-editing-progress" data-editing-component="progress"><div class="example-editing-progress-heading"><strong>Release confidence</strong><ui-badge size="small" tone="positive">82%</ui-badge></div><ui-progress value="82" label="Release confidence"></ui-progress></div></div>
                </section>
                <section data-editing-block="release-tasks" data-editing-block-kind="task-list">
                  <div data-editing-block-content><div class="example-editing-task-list" data-editing-component="task-list"><ui-checkbox checked><span contenteditable="true" spellcheck="true" data-editing-text>Lock the semantic block envelope</span></ui-checkbox><ui-checkbox checked><span contenteditable="true" spellcheck="true" data-editing-text>Exercise image and media handoff</span></ui-checkbox><ui-checkbox><span contenteditable="true" spellcheck="true" data-editing-text>Run the cross-renderer fixture matrix</span></ui-checkbox></div></div>
                </section>
                <section data-editing-block="stream-code" data-editing-block-kind="code">
                  <div data-editing-block-content><ui-typeset class="example-editing-code" preset="code" data-editing-component="code"><pre><code contenteditable="true" spellcheck="false" data-editing-text>await stream.append({
  type: "callout",
  props: { tone: "accent", text: delta }
});</code></pre></ui-typeset></div>
                </section>
                <section data-editing-block="media" data-editing-block-kind="heading">
                  <div data-editing-block-content><h2 contenteditable="true" spellcheck="true" data-editing-text>Media handoff</h2></div>
                </section>
                <section data-editing-block="media-copy" data-editing-block-kind="body">
                  <div data-editing-block-content><p contenteditable="true" spellcheck="true" data-editing-text>Drop a recording into this document. The picker validates locally and emits files; the editor owns temporary previews, and a future workspace adapter can exchange them for persistent asset IDs.</p></div>
                </section>
                <section data-editing-block="media-upload" data-editing-block-kind="media">
                  <div data-editing-block-content><figure class="example-editing-media" data-editing-component="media" data-editing-upload-container="media"><ui-file-upload class="example-editing-upload" accept="audio/*,video/*" label="Choose audio or video" max-size="104857600" data-editing-upload="media"><ui-icon slot="prefix" name="action.upload" label=""></ui-icon>Upload audio or video<span slot="description">MP3, WAV, MP4, WebM, or MOV up to 100 MB</span></ui-file-upload></figure></div>
                </section>
                <section data-editing-block="signoff" data-editing-block-kind="heading">
                  <div data-editing-block-content><h2 contenteditable="true" spellcheck="true" data-editing-text>Sign-off</h2></div>
                </section>
                <section data-editing-block="approval" data-editing-block-kind="approval">
                  <div data-editing-block-content><ui-form class="example-editing-approval" data-editing-component="approval"><ui-field label="Review note"><ui-input slot="control" name="review-note" placeholder="Optional context"></ui-input></ui-field><ui-switch name="notify-team" checked>Notify the workspace</ui-switch><div class="example-editing-approval-actions"><ui-button type="button" variant="secondary">Request changes</ui-button><ui-button type="button" variant="primary" data-editing-demo-button>Approve brief</ui-button></div></ui-form></div>
                </section>
                <section data-editing-block="notes" data-editing-block-kind="details">
                  <div data-editing-block-content><ui-collapsible open data-editing-component="collapsible"><span slot="trigger">Implementation notes</span><p contenteditable="true" spellcheck="true" data-editing-text>Overlay blocks will project through explicit triggers and placement policy; they do not become arbitrary floating DOM merely because an agent asks for one.</p></ui-collapsible></div>
                </section>
                <section data-editing-block="quote" data-editing-block-kind="quote">
                  <div data-editing-block-content><blockquote contenteditable="true" spellcheck="true" data-editing-text>A durable interface keeps its meaning when its host changes.</blockquote></div>
                </section>
              </article>
            </main>
            <aside class="example-editing-comments" aria-label="Document comments">
              <div class="example-editing-panel-heading"><strong>Comments</strong><ui-badge size="small" data-editing-comment-count>3</ui-badge></div>
              <div class="example-editing-comment-thread"><ui-bubble variant="secondary">The upload boundary finally reads like a platform primitive, not an app service.</ui-bubble><ui-bubble>Can the stream reject a stale sequence before it mutates the view?</ui-bubble><ui-bubble variant="secondary">Yes. Keep that error visible to the host adapter.</ui-bubble></div>
              <p class="example-editing-comment-latest" data-editing-comment-latest hidden></p>
              <div class="example-editing-comment-author"><ui-avatar size="small">SK</ui-avatar><span>Sam · Systems</span></div>
            </aside>
          </div>
          <footer class="example-editing-footer">
            <output data-editing-status>Ready</output>
            <span><span data-editing-block-count>22</span> blocks · edited just now</span>
          </footer>
          <ui-toolbar class="example-editing-block-bar" data-editing-block-toolbar hidden label="Block actions">
            <ui-button type="button" size="xsmall" variant="quiet" compact aria-label="Insert block below" title="Insert block below" data-editing-add-block><ui-icon name="action.add" label=""></ui-icon></ui-button>
            <ui-button type="button" size="xsmall" variant="quiet" compact aria-label="Move block up" title="Move block up" data-editing-command="block.move-up"><ui-icon name="navigation.up" label=""></ui-icon></ui-button>
            <ui-button type="button" size="xsmall" variant="quiet" compact aria-label="Move block down" title="Move block down" data-editing-command="block.move-down"><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <ui-button type="button" size="xsmall" variant="quiet" compact aria-label="Duplicate block" title="Duplicate block" data-editing-command="block.duplicate"><ui-icon name="object.document" label=""></ui-icon></ui-button>
            <ui-menu class="example-editing-format-menu" label="More block actions" density="compact" sizing="fixed" placement="bottom" align="start" offset="8">
              <ui-button slot="trigger" type="button" size="xsmall" variant="quiet" compact aria-label="More block actions"><ui-icon name="navigation.more.horizontal" label=""></ui-icon></ui-button>
              <ui-menu-label>Block</ui-menu-label>
              <ui-menu-item value="copy" data-editing-command="block.copy">Copy contents</ui-menu-item>
              <ui-menu-item value="delete" tone="critical" data-editing-command="block.delete">Delete</ui-menu-item>
            </ui-menu>
          </ui-toolbar>
          <ui-toolbar class="example-editing-format-bar" data-editing-toolbar hidden label="Selected text formatting">
            <ui-menu class="example-editing-format-menu" label="Block style" density="compact" sizing="fixed" placement="bottom" align="start" offset="8">
              <ui-button class="example-editing-style-trigger" slot="trigger" type="button" size="xsmall" variant="quiet" dropdown-caret aria-label="Block style" data-editing-style-label>Text</ui-button>
              <ui-menu-label>Turn into</ui-menu-label>
              <ui-menu-item kind="radio" value="body" data-editing-command="block.body">Body<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
              <ui-menu-item kind="radio" value="callout" data-editing-command="block.callout">Callout<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
              <ui-menu-item kind="radio" value="heading" data-editing-command="block.heading">Heading<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
              <ui-menu-item kind="radio" value="title" data-editing-command="block.title">Title 3<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            </ui-menu>
            <ui-separator orientation="vertical"></ui-separator>
            <ui-toggle value="bold" aria-label="Bold" title="Bold" data-editing-command="format.bold"><strong>B</strong></ui-toggle>
            <ui-toggle value="italic" aria-label="Italic" title="Italic" data-editing-command="format.italic"><em>I</em></ui-toggle>
            <ui-toggle value="underline" aria-label="Underline" title="Underline" data-editing-command="format.underline"><u>U</u></ui-toggle>
            <ui-toggle class="example-editing-secondary-action" value="strike" aria-label="Strikethrough" title="Strikethrough" data-editing-command="format.strike"><s>S</s></ui-toggle>
            <ui-toggle class="example-editing-secondary-action" value="code" aria-label="Inline code" title="Inline code" data-editing-command="format.code"><code>&lt;&gt;</code></ui-toggle>
            <ui-separator orientation="vertical"></ui-separator>
            <ui-button class="example-editing-secondary-action" type="button" size="xsmall" variant="quiet" compact aria-label="Add link" title="Add link" data-editing-command="format.link"><ui-icon name="action.launch" label=""></ui-icon></ui-button>
            <ui-button class="example-editing-secondary-action" type="button" size="xsmall" variant="quiet" compact aria-label="Add comment" title="Add comment" data-editing-command="format.comment"><ui-icon name="action.edit" label=""></ui-icon></ui-button>
            <ui-menu class="example-editing-format-menu" label="More formatting" density="compact" sizing="fixed" placement="bottom" align="end" offset="8">
              <ui-button slot="trigger" type="button" size="xsmall" variant="quiet" compact aria-label="More formatting"><ui-icon name="navigation.more.horizontal" label=""></ui-icon></ui-button>
              <ui-menu-label class="example-editing-overflow-action">Formatting</ui-menu-label>
              <ui-menu-item class="example-editing-overflow-action" value="strike" data-editing-command="format.strike">Strikethrough</ui-menu-item>
              <ui-menu-item class="example-editing-overflow-action" value="code" data-editing-command="format.code">Inline code</ui-menu-item>
              <ui-menu-item class="example-editing-overflow-action" value="link" data-editing-command="format.link">Add link</ui-menu-item>
              <ui-menu-item class="example-editing-overflow-action" value="comment" data-editing-command="format.comment">Add comment</ui-menu-item>
              <ui-separator class="example-editing-overflow-action"></ui-separator>
              <ui-menu-item value="tone">Tone<ui-icon slot="chevron" name="navigation.disclosure" label=""></ui-icon>
                <ui-menu slot="submenu" label="Text tone" density="compact" sizing="fixed">
                  <ui-menu-item kind="radio" value="secondary" data-editing-command="tone.secondary">Muted<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
                  <ui-menu-item kind="radio" value="accent" data-editing-command="tone.accent">Accent<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
                  <ui-menu-item kind="radio" value="critical" data-editing-command="tone.critical">Critical<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
                </ui-menu>
              </ui-menu-item>
              <ui-menu-item value="insert">Insert component<ui-icon slot="chevron" name="navigation.disclosure" label=""></ui-icon>
                <ui-menu slot="submenu" label="Insert component" density="compact" sizing="fixed">
                  <ui-menu-item kind="checkbox" value="badge" data-editing-command="insert.badge">Badge<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
                  <ui-menu-item kind="checkbox" value="callout" data-editing-command="insert.callout">Callout chip<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
                </ui-menu>
              </ui-menu-item>
            </ui-menu>
          </ui-toolbar>
          <ui-menu class="example-editing-slash-menu" data-editing-slash-menu label="Insert block" density="compact" sizing="fixed" placement="bottom" align="start" offset="6">
            <button class="example-editing-slash-anchor" slot="trigger" type="button" tabindex="-1" aria-hidden="true" data-editing-slash-anchor></button>
            <div class="example-editing-slash-header" slot="header"><ui-icon name="action.search" label=""></ui-icon><span data-editing-slash-heading>Insert</span><ui-kbd>/</ui-kbd></div>
            <div class="example-editing-slash-footer" slot="footer"><output data-editing-slash-count></output><span>blocks</span></div>
          </ui-menu>
          <ui-gesture-binding for="editing-playground-surface" gesture="key" shortcut="Primary+B" command="format.bold" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="editing-playground-surface" gesture="key" shortcut="Primary+I" command="format.italic" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="editing-playground-surface" gesture="key" shortcut="Primary+U" command="format.underline" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="editing-playground-surface" gesture="key" shortcut="Primary+Z" command="history.undo" prevent-default="recognized"></ui-gesture-binding>
          <ui-gesture-binding for="editing-playground-surface" gesture="key" shortcut="Primary+Shift+Z" command="history.redo" prevent-default="recognized"></ui-gesture-binding>
        </section>`,
      {
        compositionOnly: true,
        description:
          "A real editing context projects one selection and command registry through document chrome, history, outline, comments, shortcuts, nested menus, and the contextual format bar.",
        stageLayout: "fill",
      },
    ),
    example(
      "Docked editor tools",
      `
        <div class="catalog-example example-toolbar-dock">
          <span>Canvas</span>
          <ui-toolbar data-catalog-toolbar-dock="top" orientation="horizontal" label="Top tools">
            <ui-toggle pressed aria-label="Select">↖</ui-toggle>
            <ui-toggle aria-label="Text">T</ui-toggle>
          </ui-toolbar>
          <ui-toolbar data-catalog-toolbar-dock="right" orientation="vertical" label="Right tools">
            <ui-toggle aria-label="Comments">◌</ui-toggle>
            <ui-toggle aria-label="Inspect">⊙</ui-toggle>
          </ui-toolbar>
          <ui-toolbar data-catalog-toolbar-dock="bottom" orientation="horizontal" label="Bottom tools">
            <ui-toggle aria-label="Zoom out">−</ui-toggle>
            <ui-toggle aria-label="Zoom in">+</ui-toggle>
          </ui-toolbar>
          <ui-toolbar data-catalog-toolbar-dock="left" orientation="vertical" label="Left tools">
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
      "Focused form",
      `
        <div class="catalog-example example-stack">
          <ui-dialog label="Edit project settings">
            <ui-button slot="trigger">Edit project</ui-button>
            <h2 slot="title">Edit project settings</h2>
            <p slot="description">Keep modal work narrow and return focus to the trigger when it closes.</p>
            <div class="example-dialog-copy">
              <ui-field label="Project name" description="Visible to everyone in Interzone." required>
                <ui-input slot="control" name="project-name" value="Billing migration"></ui-input>
              </ui-field>
              <ui-field label="Owner email">
                <ui-input slot="control" type="email" name="owner-email" value="maya@interzone.test" autocomplete="email"></ui-input>
              </ui-field>
            </div>
            <div slot="close" class="example-actions">
              <ui-button variant="secondary">Cancel</ui-button>
              <ui-button>Save changes</ui-button>
            </div>
          </ui-dialog>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Dialog owns modal focus, Escape/outside dismissal, title/description wiring, and close requests; fields and buttons keep their own semantics.",
      },
    ),
    example(
      "Scrollable review",
      `
        <div class="catalog-example example-stack">
          <ui-dialog label="Review deployment checklist">
            <ui-button slot="trigger" variant="secondary">Review checklist</ui-button>
            <h2 slot="title">Review deployment checklist</h2>
            <p slot="description">Long modal content should scroll inside the dialog surface, not the page behind it.</p>
            <ui-scroll-area class="example-dialog-scroll" label="Deployment checklist" mode="always" gutter="stable">
              <ol slot="content" class="example-dialog-list">
                <li>Verify finance owner approval.</li>
                <li>Confirm invoice replay finished without failed checkpoints.</li>
                <li>Attach the rollback note to the project activity.</li>
                <li>Notify the migration room before enabling writes.</li>
                <li>Keep a manual review notification open until sign-off lands.</li>
                <li>Archive the preview files after the release window closes.</li>
              </ol>
            </ui-scroll-area>
            <div slot="close" class="example-actions">
              <ui-button variant="secondary">Close</ui-button>
              <ui-button>Mark reviewed</ui-button>
            </div>
          </ui-dialog>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Scrollable body content composes through ScrollArea; the dialog does not become a document viewer or own workflow state.",
      },
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
      "Context inspector",
      `
        <div class="catalog-example example-popover-stage">
          <ui-popover label="Billing migration inspector" placement="bottom" align="start" offset="8">
            <ui-button slot="trigger" variant="secondary">Inspect record<ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <strong slot="title">Billing migration</strong>
            <p slot="description">Last edited 14 minutes ago.</p>
            <div class="example-popover-content">
              <div class="example-popover-row"><span>Status</span><ui-badge tone="positive">Active</ui-badge></div>
              <div class="example-popover-row"><span>Owner</span><span class="example-popover-person"><ui-avatar size="small">MC</ui-avatar>Maya Chen</span></div>
              <ui-input-group class="example-popover-search">
                <ui-icon slot="prefix" name="action.search" label=""></ui-icon>
                <ui-input slot="control" type="search" label="Find related records" placeholder="Find related records"></ui-input>
              </ui-input-group>
              <ui-link href="#billing-migration" variant="quiet"><ui-icon slot="prefix" name="action.launch" label=""></ui-icon>Open full record</ui-link>
            </div>
            <ui-toolbar slot="actions" label="Inspector actions" class="example-popover-toolbar">
              <ui-button type="button" size="small" variant="secondary">Follow</ui-button>
              <ui-button type="button" size="small">Open</ui-button>
            </ui-toolbar>
            <ui-button slot="close" type="button" size="small" variant="quiet" aria-label="Close inspector"><ui-icon name="action.dismiss" label=""></ui-icon></ui-button>
          </ui-popover>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Popover owns anchored disclosure and dismissal; the inspector body remains an authored fragment of fields, links, status, and actions.",
      },
    ),
  ],
  "ui-menu": [
    example(
      "Tinycast launcher",
      `
        <div class="example-tinycast-stage">
          <div class="example-tinycast-wallpaper" aria-hidden="true">
            <span class="example-tinycast-wallpaper-plane example-tinycast-wallpaper-plane-a"></span>
            <span class="example-tinycast-wallpaper-plane example-tinycast-wallpaper-plane-b"></span>
          </div>
          <ui-menu class="example-tinycast-menu" label="Tinycast apps and commands" density="compact" sizing="fixed" placement="bottom" align="center" offset="0" close-on-outside="false" open>
            <ui-button class="example-tinycast-trigger" slot="trigger" size="xsmall" variant="secondary">
              <span class="example-tinycast-mark" slot="prefix" aria-hidden="true">T</span>
              Tinycast
              <ui-kbd slot="suffix" command="launcher.open" shortcut="Primary+Space"></ui-kbd>
            </ui-button>
            <ui-input-group class="example-tinycast-search" slot="header">
              <ui-icon slot="prefix" name="action.search" label=""></ui-icon>
              <ui-input slot="control" type="search" size="large" label="Search for apps and commands" placeholder="Search for apps and commands..."></ui-input>
            </ui-input-group>
            <ui-menu-label>Favorites</ui-menu-label>
            <ui-menu-item class="example-tinycast-selected" value="ghostty">
              <span class="example-tinycast-app-icon bg-action text-on-action" slot="prefix" aria-hidden="true">G</span>
              Ghostty
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <ui-menu-item value="zed">
              <span class="example-tinycast-app-icon bg-surface-raised text-text" slot="prefix" aria-hidden="true">Z</span>
              Zed
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <ui-menu-item value="code">
              <span class="example-tinycast-app-icon bg-positive text-on-positive" slot="prefix" aria-hidden="true">C</span>
              Code
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <ui-menu-item value="helium">
              <span class="example-tinycast-app-icon bg-warning text-on-warning" slot="prefix" aria-hidden="true">H</span>
              Helium
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <ui-menu-item value="orbstack">
              <span class="example-tinycast-app-icon bg-critical text-on-critical" slot="prefix" aria-hidden="true">O</span>
              OrbStack
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <ui-menu-label>Applications</ui-menu-label>
            <ui-menu-item value="activity-monitor">
              <span class="example-tinycast-app-icon bg-positive-subtle text-positive" slot="prefix" aria-hidden="true">A</span>
              Activity Monitor
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <ui-menu-item value="alacritty">
              <span class="example-tinycast-app-icon bg-surface-raised text-warning" slot="prefix" aria-hidden="true">A</span>
              Alacritty
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <ui-menu-item value="app-store">
              <span class="example-tinycast-app-icon bg-action-subtle text-action" slot="prefix" aria-hidden="true">A</span>
              App Store
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <ui-menu-item value="appcleaner">
              <span class="example-tinycast-app-icon bg-surface-raised text-critical" slot="prefix" aria-hidden="true">A</span>
              AppCleaner
              <span class="example-tinycast-kind" slot="shortcut">Application</span>
            </ui-menu-item>
            <div class="example-tinycast-footer" slot="footer">
              <ui-button type="button" size="xsmall" variant="secondary" aria-label="Tinycast menu"><ui-icon name="navigation.menu" label=""></ui-icon></ui-button>
              <span class="example-tinycast-actions">
                <ui-button type="button" size="small" variant="quiet">Open Application<ui-kbd slot="suffix" command="launcher.open-selection" shortcut="Enter"></ui-kbd></ui-button>
                <ui-button type="button" size="small" variant="quiet">Actions<ui-kbd slot="suffix" command="launcher.actions" shortcut="Primary+K"></ui-kbd></ui-button>
              </span>
            </div>
          </ui-menu>
        </div>`,
      {
        compositionOnly: true,
        description:
          "A Mash reconstruction of Tinycast's expanded launcher: persistent search and action chrome frame grouped, keyboard-navigable application commands. Reference: github.com/abue-ammar/tinycast.",
        stageLayout: "fill",
      },
    ),
    example(
      "Labelled command groups",
      `
        <div class="catalog-example example-menu-stage">
          <ui-menu label="Workspace view options" density="compact" sizing="fixed">
            <ui-button class="example-menu-trigger" slot="trigger" size="small" variant="secondary">
              View
              <ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon>
            </ui-button>
            <ui-menu-label>Layout</ui-menu-label>
            <ui-menu-item kind="checkbox" value="breadcrumbs">Breadcrumbs<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            <ui-menu-item kind="checkbox" value="sidebar" checked>Show sidebar<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            <ui-separator></ui-separator>
            <ui-menu-label>Theme</ui-menu-label>
            <ui-menu-item kind="radio" value="system" checked>System<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            <ui-menu-item kind="radio" value="light">Light<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            <ui-menu-item kind="radio" value="dark">Dark<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            <ui-separator></ui-separator>
            <ui-menu-label>Danger zone</ui-menu-label>
            <ui-menu-item value="reset" tone="critical">Reset layout</ui-menu-item>
          </ui-menu>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Menu labels are non-interactive section rows that keep icon, check, label, and suffix lanes aligned with sibling commands.",
      },
    ),
    example(
      "Pull-down commands",
      `
        <div class="catalog-example example-menu-stage">
          <ui-menu label="Edit commands" density="compact">
            <ui-button class="example-menu-trigger" slot="trigger" size="small" variant="secondary">Edit<ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <ui-menu-item value="undo"><ui-icon slot="prefix" name="action.reset" label=""></ui-icon>Undo<ui-kbd slot="shortcut" command="edit.undo" shortcut="Primary+Z"></ui-kbd></ui-menu-item>
            <ui-menu-item value="redo"><ui-icon slot="prefix" name="action.refresh" label=""></ui-icon>Redo<ui-kbd slot="shortcut" command="edit.redo" shortcut="Primary+Shift+Z"></ui-kbd></ui-menu-item>
            <ui-separator></ui-separator>
            <ui-menu-item value="paste">Paste<ui-kbd slot="shortcut" command="edit.paste" shortcut="Primary+V"></ui-kbd></ui-menu-item>
            <ui-menu-item value="delete" tone="critical">Delete<ui-kbd slot="shortcut" command="edit.delete-backward" shortcut="Backspace"></ui-kbd></ui-menu-item>
          </ui-menu>
        </div>`,
      {
        compositionOnly: true,
        description:
          "A command menu keeps symbols, labels, and semantic keyboard shortcuts in stable lanes.",
      },
    ),
    example(
      "Checked choices",
      `
        <div class="catalog-example example-menu-stage">
          <ui-menu label="Sort projects" density="compact">
            <ui-button class="example-menu-trigger" slot="trigger" size="small" variant="secondary">Sort<ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <ui-menu-item kind="radio" value="name">Name<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            <ui-menu-item kind="radio" value="updated" checked>Updated<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            <ui-menu-item kind="radio" value="created">Created<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
            <ui-separator></ui-separator>
            <ui-menu-item kind="checkbox" value="descending" checked>Descending<ui-icon slot="selection" name="action.confirm" label=""></ui-icon></ui-menu-item>
          </ui-menu>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Menu choices remain commands with checkbox or radio semantics; they do not become a form value like ui-select.",
      },
    ),
    example(
      "Split dropdown button",
      `
        <div class="catalog-example example-menu-stage example-split-button">
          <ui-button class="example-split-action" size="small">Run build</ui-button>
          <ui-menu label="Build variants" density="compact">
            <ui-button class="example-split-trigger" slot="trigger" size="small" aria-label="Choose build variant"><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <ui-menu-item value="production">Production build</ui-menu-item>
            <ui-menu-item value="preview">Preview build</ui-menu-item>
            <ui-menu-item value="analyze">Analyze bundle</ui-menu-item>
          </ui-menu>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The primary action and menu trigger stay independent while sharing one visual control group.",
      },
    ),
    example(
      "Nested compact leafing",
      `
        <div class="catalog-example example-menu-stage">
          <ui-menu label="Project commands" density="compact" sizing="fixed" open>
            <ui-button class="example-menu-trigger" slot="trigger" size="small" variant="secondary">
              Project
              <ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon>
            </ui-button>
            <ui-menu-item value="open">Open project<ui-kbd slot="shortcut" command="project.open" shortcut="Primary+O"></ui-kbd></ui-menu-item>
            <ui-menu-item value="recent">
              Recent projects
              <ui-icon slot="chevron" name="navigation.disclosure" label=""></ui-icon>
              <ui-menu slot="submenu" label="Recent projects" density="compact" sizing="fixed">
                <ui-menu-item value="billing">Billing migration</ui-menu-item>
                <ui-menu-item value="invoice">Invoice reconciliation</ui-menu-item>
                <ui-menu-item value="archive">Legacy ledger migration with archived receipt attachments</ui-menu-item>
              </ui-menu>
            </ui-menu-item>
            <ui-menu-item value="find">
              Find
              <ui-kbd slot="shortcut" command="project.find" shortcut="Primary+F"></ui-kbd>
              <ui-icon slot="chevron" name="navigation.disclosure" label=""></ui-icon>
              <ui-menu slot="submenu" label="Find" density="compact" sizing="fixed">
                <ui-menu-item value="find-next">Find Next<ui-kbd slot="shortcut" command="project.find-next" shortcut="Primary+G"></ui-kbd></ui-menu-item>
                <ui-menu-item value="find-previous">Find Previous<ui-kbd slot="shortcut" command="project.find-previous" shortcut="Primary+Shift+G"></ui-kbd></ui-menu-item>
              </ui-menu>
            </ui-menu-item>
          </ui-menu>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Nested menus use an anchored child menu, Right/Left/Escape keyboard traversal, and a pointer-safe triangle for diagonal movement into the active branch.",
      },
    ),
    example(
      "Sticky scroll chrome",
      `
        <div class="catalog-example example-menu-stage">
          <ui-menu class="example-menu-scroll" label="Recent projects" density="compact" sizing="fixed" open>
            <ui-button class="example-menu-trigger" slot="trigger" size="small" variant="secondary">Recent<ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <div slot="header" class="example-menu-sticky-header"><strong>Recent projects</strong><ui-badge size="small">9</ui-badge></div>
            <ui-menu-item value="billing">Billing migration</ui-menu-item>
            <ui-menu-item value="ledger">Ledger verification</ui-menu-item>
            <ui-menu-item value="invoice">Invoice reconciliation</ui-menu-item>
            <ui-menu-item value="archive">Archive import</ui-menu-item>
            <ui-menu-item value="tax">Tax reporting</ui-menu-item>
            <ui-menu-item value="payments">Payment routing</ui-menu-item>
            <ui-menu-item value="receipts">Receipt matching</ui-menu-item>
            <ui-menu-item value="forecast">Revenue forecast</ui-menu-item>
            <ui-menu-item value="restore" disabled>Unavailable snapshot</ui-menu-item>
            <div slot="footer" class="example-menu-sticky-footer"><span>Team-visible projects</span><span>Return opens</span></div>
          </ui-menu>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Persistent header and footer slots frame a bounded native viewport; only the command collection scrolls.",
      },
    ),
    example(
      "Disabled commands",
      `
        <div class="catalog-example example-menu-stage">
          <ui-menu label="Project permissions" density="compact">
            <ui-button class="example-menu-trigger" slot="trigger" size="small" variant="secondary">Permissions<ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <ui-menu-label>Available</ui-menu-label>
            <ui-menu-item value="copy-link"><ui-icon slot="prefix" name="action.launch" label=""></ui-icon>Copy link</ui-menu-item>
            <ui-menu-item value="invite"><ui-icon slot="prefix" name="action.add" label=""></ui-icon>Invite member</ui-menu-item>
            <ui-separator></ui-separator>
            <ui-menu-label>Owner only</ui-menu-label>
            <ui-menu-item value="transfer" disabled>Transfer ownership</ui-menu-item>
            <ui-menu-item value="delete" disabled tone="critical">Delete workspace</ui-menu-item>
          </ui-menu>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Sizing and density",
      `
        <div class="catalog-example example-menu-stage example-actions">
          <ui-menu label="Regular menu" density="regular"><ui-button slot="trigger" size="small" variant="secondary">Regular</ui-button><ui-menu-item value="open">Open</ui-menu-item><ui-menu-item value="rename">Rename</ui-menu-item></ui-menu>
          <ui-menu label="Compact menu" density="compact" sizing="fixed"><ui-button slot="trigger" size="small" variant="secondary">Compact</ui-button><ui-menu-item value="open">Open</ui-menu-item><ui-menu-item value="rename">Rename</ui-menu-item></ui-menu>
          <ui-menu label="Mini menu" density="mini" sizing="fixed"><ui-button slot="trigger" size="xsmall" variant="secondary">Mini</ui-button><ui-menu-item value="open">Open</ui-menu-item><ui-menu-item value="rename">Rename</ui-menu-item></ui-menu>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Gesture-bound control",
      `
        <div class="catalog-example example-menu-stage example-menu-lab" data-catalog-menu-lab>
          <ui-toggle id="menu-command-toggle" data-catalog-menu-toggle aria-label="Toggle project commands"><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-toggle>
          <ui-gesture-binding for="menu-command-toggle" gesture="press" command="menu.toggle" group="menu-control"></ui-gesture-binding>
          <ui-menu label="Project commands" density="compact" data-catalog-menu-demo>
            <ui-button class="example-menu-trigger" slot="trigger" size="small" variant="secondary">Commands<ui-icon slot="suffix" name="navigation.chevron-down" label=""></ui-icon></ui-button>
            <ui-menu-item value="open">Open project</ui-menu-item>
            <ui-menu-item value="duplicate">Duplicate project</ui-menu-item>
            <ui-menu-item value="archive" tone="critical">Archive project</ui-menu-item>
          </ui-menu>
          <output class="example-select-log" data-catalog-menu-log>open: false</output>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Draggable row actions",
      `
        <div class="catalog-example example-menu-drag-stage">
          <ui-draggable class="example-menu-draggable" axis="x" containment="parent" snap-step="8">
            <ui-toolbar slot="handle" label="Move Billing migration" class="example-menu-drag-handle"><ui-icon name="action.drag" label=""></ui-icon><strong>Billing migration</strong></ui-toolbar>
            <ui-menu label="Billing migration actions" density="compact">
              <ui-button slot="trigger" size="small" variant="quiet" aria-label="Billing migration actions"><ui-icon name="navigation.chevron-down" label=""></ui-icon></ui-button>
              <ui-menu-item value="open">Open</ui-menu-item>
              <ui-menu-item value="duplicate">Duplicate</ui-menu-item>
              <ui-menu-item value="archive" tone="critical">Archive</ui-menu-item>
            </ui-menu>
          </ui-draggable>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "ui-context-menu": [
    example(
      "Project row",
      `
        <ui-context-menu class="catalog-example example-context-target" label="Project actions" density="compact">
          <ui-card slot="trigger">
            <strong>Billing migration</strong>
            <p>Right-click this project row for actions.</p>
          </ui-card>
          <ui-menu-item value="open"><ui-icon slot="prefix" name="action.launch" label=""></ui-icon>Open project</ui-menu-item>
          <ui-menu-item value="copy-path">Copy project path<ui-kbd slot="shortcut" command="project.copy-path" shortcut="Primary+Shift+C"></ui-kbd></ui-menu-item>
          <ui-menu-item value="share">
            Share
            <ui-icon slot="chevron" name="navigation.disclosure" label=""></ui-icon>
            <ui-menu slot="submenu" label="Share project" density="compact">
              <ui-menu-item value="copy-link">Copy link</ui-menu-item>
              <ui-menu-item value="email">Email</ui-menu-item>
            </ui-menu>
          </ui-menu-item>
          <ui-separator></ui-separator>
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
      "Icon help",
      `
        <div class="catalog-example example-tooltip-row">
          <ui-tooltip label="Create project">
            <ui-button slot="trigger" type="button" aria-label="Create project">
              <ui-icon name="action.add" label=""></ui-icon>
            </ui-button>
            Create a new project
          </ui-tooltip>
          <ui-tooltip label="Archive project" placement="bottom">
            <ui-button slot="trigger" type="button" variant="secondary" tone="critical" aria-label="Archive project">
              <ui-icon name="action.delete" label=""></ui-icon>
            </ui-button>
            Archive this project
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
    example(
      "Shortcut hint",
      `
        <div class="catalog-example example-tooltip-row">
          <ui-tooltip label="Command palette shortcut" open-delay="0">
            <ui-button slot="trigger" type="button" variant="secondary">
              Command palette
              <ui-kbd slot="suffix" command="workspace.palette" shortcut="Primary+K"></ui-kbd>
            </ui-button>
            <span class="example-tooltip-hint">Open command palette <ui-kbd command="workspace.palette" shortcut="Primary+K"></ui-kbd></span>
          </ui-tooltip>
          <ui-popover label="Project actions">
            <ui-button slot="trigger" type="button" variant="secondary">Rich help</ui-button>
            <strong slot="title">Project actions</strong>
            <p slot="description">Interactive controls belong in a popover surface.</p>
            <ui-button slot="close" size="small" variant="quiet">Done</ui-button>
          </ui-popover>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Tooltips stay hover/focus descriptions. The adjacent popover shows where rich or actionable overlay content goes.",
      },
    ),
  ],
  "ui-menubar": [
    example(
      "Workspace commands",
      `
        <ui-menubar class="catalog-example example-toolbar" label="Workspace commands">
          <ui-menu label="Project menu" density="compact">
            <ui-button slot="trigger" variant="quiet">Project</ui-button>
            <ui-menu-item value="new">New project</ui-menu-item>
            <ui-menu-item value="import">Import project</ui-menu-item>
          </ui-menu>
          <ui-menu label="View menu" density="compact">
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
          <ui-menu label="More workspace links" density="compact">
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
  "ui-resizable": [
    example(
      "Handle treatments",
      `
        <section class="catalog-example example-resizable-showcase">
          <header class="example-link-heading">
            <span class="example-eyebrow">Interactive separators</span>
            <h2>One behavior, replaceable pronunciation</h2>
            <p>The full gutter remains the hit target. Hover, keyboard focus, and active dragging strengthen only the visual indicator.</p>
          </header>
          <div class="example-resizable-case">
            <span class="example-resizable-label">Quiet fallback</span>
            <ui-resizable class="example-resizable-split" label="Quiet fallback panels">
              <ui-resizable-panel size="176" min="112" max="248"><div class="example-resizable-pane">Navigator</div></ui-resizable-panel>
              <ui-resizable-handle label="Resize quiet fallback panels"></ui-resizable-handle>
              <ui-resizable-panel min="160"><div class="example-resizable-pane example-resizable-pane-muted">Canvas</div></ui-resizable-panel>
            </ui-resizable>
          </div>
          <div class="example-resizable-case">
            <span class="example-resizable-label">Authored separator</span>
            <ui-resizable class="example-resizable-split" label="Authored separator panels">
              <ui-resizable-panel size="208" min="112" max="280"><div class="example-resizable-pane">Inspector</div></ui-resizable-panel>
              <ui-resizable-handle label="Resize authored separator panels">
                <ui-separator orientation="vertical" aria-hidden="true"></ui-separator>
              </ui-resizable-handle>
              <ui-resizable-panel min="160"><div class="example-resizable-pane example-resizable-pane-muted">Preview</div></ui-resizable-panel>
            </ui-resizable>
          </div>
          <div class="example-resizable-case">
            <span class="example-resizable-label">Persistent rail and detent</span>
            <ui-resizable class="example-resizable-split" label="Rail handle panels">
              <ui-resizable-panel size="144" min="112" max="240"><div class="example-resizable-pane">Layers</div></ui-resizable-panel>
              <ui-resizable-handle class="example-resize-handle-rail" label="Resize rail handle panels">
                <ui-separator class="example-resize-detent-rule" orientation="vertical" aria-hidden="true">
                  <span slot="prefix" class="example-resize-detent"></span>
                </ui-separator>
              </ui-resizable-handle>
              <ui-resizable-panel min="160"><div class="example-resizable-pane example-resizable-pane-muted">Properties</div></ui-resizable-panel>
            </ui-resizable>
          </div>
        </section>`,
      {
        compositionOnly: true,
        description:
          "The primitive exposes behavior, focus, range, and boundary state; the catalogue styles either its fallback grip or authored ui-separator content.",
        stageLayout: "start",
      },
    ),
    example(
      "Nested workspace",
      `
        <ui-resizable class="catalog-example example-resizable-workspace" orientation="horizontal" label="Workspace columns">
          <ui-resizable-panel size="176" min="128" max="256">
            <div class="example-resizable-pane">
              <span class="example-eyebrow">Navigator</span>
              <ui-tree label="Project files">
                <ui-tree-item kind="folder" title="Billing migration" expanded>
                  <ui-tree-item slot="children" kind="file" title="Overview" selected></ui-tree-item>
                  <ui-tree-item slot="children" kind="file" title="Invoices"></ui-tree-item>
                  <ui-tree-item slot="children" kind="file" title="Activity"></ui-tree-item>
                </ui-tree-item>
              </ui-tree>
            </div>
          </ui-resizable-panel>
          <ui-resizable-handle label="Resize project navigator">
            <ui-separator orientation="vertical" aria-hidden="true"></ui-separator>
          </ui-resizable-handle>
          <ui-resizable-panel min="240">
            <ui-resizable class="example-resizable-nested" orientation="vertical" label="Editor and output rows">
              <ui-resizable-panel size="208" min="128" max="288">
                <ui-editor language="html" label="Project source" value="&lt;sh-myth title=&quot;Billing migration&quot;&gt;&lt;/sh-myth&gt;"></ui-editor>
              </ui-resizable-panel>
              <ui-resizable-handle label="Resize editor output">
                <ui-separator orientation="horizontal" aria-hidden="true"></ui-separator>
              </ui-resizable-handle>
              <ui-resizable-panel min="88">
                <div class="example-resizable-pane example-resizable-pane-muted">
                  <span class="example-eyebrow">Output</span>
                  <strong>Preview ready</strong>
                </div>
              </ui-resizable-panel>
            </ui-resizable>
          </ui-resizable-panel>
        </ui-resizable>`,
      {
        compositionOnly: true,
        description:
          "Horizontal and vertical groups compose without adding a layout wrapper; each handle controls only its two adjacent panels.",
        stageLayout: "fill",
      },
    ),
    example(
      "Nested panel constraints",
      `
        <section class="catalog-example example-resizable-demo example-resizable-demo-fill">
          <header class="example-link-heading">
            <span class="example-eyebrow">Nested panels</span>
            <h2>Independent constraints on both axes</h2>
            <p>The upper row owns a three-column split while the outer group independently sizes top, center, and bottom regions.</p>
          </header>
          <ui-resizable class="example-resizable-complex" orientation="vertical" label="Nested panel rows">
            <ui-resizable-panel size="176" min="120" max="240">
              <ui-resizable class="example-resizable-nested" orientation="horizontal" label="Nested panel columns">
                <ui-resizable-panel size="152" min="120" max="300"><div class="example-resizable-pane"><strong>Left</strong><span>120–300px</span></div></ui-resizable-panel>
                <ui-resizable-handle label="Resize left column"><ui-separator orientation="vertical" aria-hidden="true"></ui-separator></ui-resizable-handle>
                <ui-resizable-panel min="180"><div class="example-resizable-pane example-resizable-pane-muted"><strong>Center</strong><span>grows</span></div></ui-resizable-panel>
                <ui-resizable-handle label="Resize right column"><ui-separator orientation="vertical" aria-hidden="true"></ui-separator></ui-resizable-handle>
                <ui-resizable-panel size="184" min="128" max="280"><div class="example-resizable-pane"><strong>Right</strong><span>128–280px</span></div></ui-resizable-panel>
              </ui-resizable>
            </ui-resizable-panel>
            <ui-resizable-handle label="Resize upper row"><ui-separator orientation="horizontal" aria-hidden="true"></ui-separator></ui-resizable-handle>
            <ui-resizable-panel min="128"><div class="example-resizable-pane example-resizable-pane-muted"><strong>Center workspace</strong><span>flexible remainder</span></div></ui-resizable-panel>
            <ui-resizable-handle label="Resize output row"><ui-separator orientation="horizontal" aria-hidden="true"></ui-separator></ui-resizable-handle>
            <ui-resizable-panel size="104" min="80" max="160"><div class="example-resizable-pane"><strong>Output</strong><span>80–160px</span></div></ui-resizable-panel>
          </ui-resizable>
        </section>`,
      {
        compositionOnly: true,
        description:
          "A dense constraint proof: two handles on each axis, two flexible regions, and distinct min/max ranges remain independently operable.",
        stageLayout: "fill",
      },
    ),
    example(
      "Growing neighbor",
      `
        <section class="catalog-example example-resizable-demo">
          <header class="example-link-heading">
            <span class="example-eyebrow">Growing panel</span>
            <h2>A flexible neighbor absorbs the remainder</h2>
            <p>The constrained navigator transfers space to a content panel without requiring a separate grow prop.</p>
          </header>
          <ui-resizable class="example-resizable-stage" label="Growing panel example">
            <ui-resizable-panel size="184" min="120" max="300"><div class="example-resizable-pane"><strong>Navigator</strong><span>120–300px</span></div></ui-resizable-panel>
            <ui-resizable-handle label="Resize navigator"><ui-separator orientation="vertical" aria-hidden="true"></ui-separator></ui-resizable-handle>
            <ui-resizable-panel min="180"><div class="example-resizable-pane example-resizable-pane-muted"><strong>Content</strong><span>flexible remainder</span></div></ui-resizable-panel>
          </ui-resizable>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Omitting an authored size keeps a panel flexible; its constrained neighbor remains directly resizeable.",
        stageLayout: "start",
      },
    ),
    example(
      "Visibility and flex behavior",
      `
        <section class="catalog-example example-resizable-demo" data-catalog-resizable-demo="visibility">
          <header class="example-link-heading">
            <span class="example-eyebrow">Flex behavior</span>
            <h2>Visibility and sizing can change at runtime</h2>
            <p>Orphaned handles disappear automatically, and returning a panel to size zero restores flexible growth.</p>
          </header>
          <ui-toolbar class="example-resizable-actions" label="Panel controls">
            <ui-button size="small" variant="secondary" data-catalog-resizable-visibility="0">Hide navigator</ui-button>
            <ui-button size="small" variant="secondary" data-catalog-resizable-flex="0">Make navigator flexible</ui-button>
          </ui-toolbar>
          <ui-resizable class="example-resizable-stage" label="Visibility and flex panels" data-catalog-resizable-group>
            <ui-resizable-panel size="168" min="112" max="280"><div class="example-resizable-pane"><strong>Navigator</strong><span>fixed at 168px</span></div></ui-resizable-panel>
            <ui-resizable-handle label="Resize navigator"><ui-separator orientation="vertical" aria-hidden="true"></ui-separator></ui-resizable-handle>
            <ui-resizable-panel min="180"><div class="example-resizable-pane example-resizable-pane-muted"><strong>Canvas</strong><span>grows</span></div></ui-resizable-panel>
            <ui-resizable-handle label="Resize inspector"><ui-separator orientation="vertical" aria-hidden="true"></ui-separator></ui-resizable-handle>
            <ui-resizable-panel size="184" min="128" max="300"><div class="example-resizable-pane"><strong>Inspector</strong><span>fixed at 184px</span></div></ui-resizable-panel>
          </ui-resizable>
          <output class="example-resizable-output" data-catalog-resizable-output>Navigator fixed · 3 panels visible</output>
        </section>`,
      {
        compositionOnly: true,
        description:
          "The catalogue owns the controls; ui-resizable continues to own adjacency, constraints, and the resulting handle state.",
        stageLayout: "start",
      },
    ),
    example(
      "Programmatic sizing",
      `
        <section class="catalog-example example-resizable-demo" data-catalog-resizable-demo="programmatic">
          <header class="example-link-heading">
            <span class="example-eyebrow">Programmatic resize</span>
            <h2>Actions use the same constraint resolver as dragging</h2>
            <p>Compact and reset actions call the group API; emitted sizes update the status output below.</p>
          </header>
          <ui-toolbar class="example-resizable-actions" label="Programmatic panel sizing">
            <ui-button size="small" variant="secondary" data-catalog-resizable-size="0:112">Compact navigator</ui-button>
            <ui-button size="small" variant="quiet" data-catalog-resizable-reset="0">Reset navigator</ui-button>
            <ui-button size="small" variant="secondary" data-catalog-resizable-size="2:128">Compact inspector</ui-button>
            <ui-button size="small" variant="quiet" data-catalog-resizable-reset="2">Reset inspector</ui-button>
          </ui-toolbar>
          <ui-resizable class="example-resizable-stage" label="Programmatically sized panels" data-catalog-resizable-group>
            <ui-resizable-panel size="192" min="112" max="320"><div class="example-resizable-pane"><strong>Navigator</strong><span>192px default</span></div></ui-resizable-panel>
            <ui-resizable-handle label="Resize navigator"><ui-separator orientation="vertical" aria-hidden="true"></ui-separator></ui-resizable-handle>
            <ui-resizable-panel min="180"><div class="example-resizable-pane example-resizable-pane-muted"><strong>Workspace</strong><span>grows</span></div></ui-resizable-panel>
            <ui-resizable-handle label="Resize inspector"><ui-separator orientation="vertical" aria-hidden="true"></ui-separator></ui-resizable-handle>
            <ui-resizable-panel size="208" min="128" max="320"><div class="example-resizable-pane"><strong>Inspector</strong><span>208px default</span></div></ui-resizable-panel>
          </ui-resizable>
          <output class="example-resizable-output" data-catalog-resizable-output>Navigator 192px · Workspace flexible · Inspector 208px</output>
        </section>`,
      {
        compositionOnly: true,
        description:
          "resizePanel and resetPanel are demonstrated as consumer-owned actions rather than additional visual component variants.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-virtual-list": [
    example(
      "Document activity fragment",
      `
        <section class="catalog-example example-virtual-workspace" data-catalog-virtual-demo>
          <header class="example-virtual-header">
            <div class="example-link-heading">
              <span class="example-eyebrow">Virtualized fragment</span>
              <h2>Document activity stays authored</h2>
              <p>The list owns range math and scroll targeting; each row remains ordinary Mash markup with links, identity, status, and metadata.</p>
            </div>
            <ui-toolbar class="example-virtual-actions" label="Activity navigation">
              <ui-button type="button" size="small" variant="secondary" data-catalog-virtual-target="0">Top</ui-button>
              <ui-button type="button" size="small" variant="secondary" data-catalog-virtual-target="17" data-catalog-virtual-align="center">Current</ui-button>
              <ui-button type="button" size="small" variant="quiet" data-catalog-virtual-bottom>Latest</ui-button>
            </ui-toolbar>
          </header>
          <ui-virtual-list class="example-virtual-feed" label="Document activity feed" overscan="3" data-catalog-virtual-list>
            ${virtualFeedItems}
          </ui-virtual-list>
          <footer class="example-virtual-footer">
            <output data-catalog-virtual-range>Range pending</output>
            <ui-kbd command="activity.jump" shortcut="J/K"></ui-kbd>
          </footer>
        </section>`,
      {
        compositionOnly: true,
        description:
          "VirtualList exposes visible range and item scrolling while the surrounding fragment owns navigation controls and the rich item contents.",
        stageLayout: "fill",
      },
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
      "No-gutter part recipes",
      `
        <div class="catalog-example example-scroll-no-gutter-grid">
          <ui-card>
            <strong slot="title">Edge overlay</strong>
            <span slot="description">Rail hugs the viewport edge.</span>
            <ui-scroll-area slot="content" class="example-scroll-no-gutter example-scroll-no-gutter-edge" label="Edge overlay scrollbar" gutter="none" size="medium" mode="always">
              <div class="example-scroll-no-gutter-content">${Array.from({ length: 12 }, (_, index) => `<span>Namespace record ${String(index + 1).padStart(2, "0")}</span>`).join("")}</div>
            </ui-scroll-area>
          </ui-card>
          <ui-card>
            <strong slot="title">Inset capsule</strong>
            <span slot="description">The same parts move inward.</span>
            <ui-scroll-area slot="content" class="example-scroll-no-gutter example-scroll-no-gutter-inset" label="Inset capsule scrollbar" gutter="none" size="large" mode="always">
              <div class="example-scroll-no-gutter-content">${Array.from({ length: 12 }, (_, index) => `<span>Project checkpoint ${String(index + 1).padStart(2, "0")}</span>`).join("")}</div>
            </ui-scroll-area>
          </ui-card>
          <ui-card>
            <strong slot="title">Trackless</strong>
            <span slot="description">Only the semantic thumb remains.</span>
            <ui-scroll-area slot="content" class="example-scroll-no-gutter example-scroll-no-gutter-trackless" label="Trackless scrollbar" gutter="none" size="compact" mode="always">
              <div class="example-scroll-no-gutter-content">${Array.from({ length: 12 }, (_, index) => `<span>Renderer event ${String(index + 1).padStart(2, "0")}</span>`).join("")}</div>
            </ui-scroll-area>
          </ui-card>
        </div>`,
      {
        compositionOnly: true,
        description:
          "No gutter leaves the native viewport full-width. CSS parts independently control edge placement, inset, track, thumb, and material treatment.",
        stageLayout: "fill",
      },
    ),
    example(
      "Semantic sizes and reserved gutters",
      `
        <div class="catalog-example example-scroll-size-grid">
          <ui-card>
            <strong slot="title">Compact</strong>
            <span slot="description">Dense data rail</span>
            <ui-scroll-area slot="content" class="example-scroll-size-sample" label="Compact scrollbar" size="compact" gutter="stable" mode="always">
              <div class="example-scroll-size-content">${Array.from({ length: 8 }, (_, index) => `<span>Compact row ${index + 1}</span>`).join("")}</div>
            </ui-scroll-area>
          </ui-card>
          <ui-card>
            <strong slot="title">Medium</strong>
            <span slot="description">Default workspace rail</span>
            <ui-scroll-area slot="content" class="example-scroll-size-sample" label="Medium scrollbar" size="medium" gutter="stable" mode="always">
              <div class="example-scroll-size-content">${Array.from({ length: 8 }, (_, index) => `<span>Medium row ${index + 1}</span>`).join("")}</div>
            </ui-scroll-area>
          </ui-card>
          <ui-card>
            <strong slot="title">Large</strong>
            <span slot="description">Prominent touch rail</span>
            <ui-scroll-area slot="content" class="example-scroll-size-sample" label="Large scrollbar" size="large" gutter="stable" mode="always">
              <div class="example-scroll-size-content">${Array.from({ length: 8 }, (_, index) => `<span>Large row ${index + 1}</span>`).join("")}</div>
            </ui-scroll-area>
          </ui-card>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The gutter reserves layout space while visible track width remains independent from its pointer hit area.",
        stageLayout: "fill",
      },
    ),
    example(
      "Alphabetical target index",
      `
        <ui-card class="catalog-example example-scroll-alpha-card">
          <div slot="header" class="example-card-heading"><strong>Namespace index</strong><ui-kbd command="workspace.search" shortcut="Primary+K"></ui-kbd></div>
          <ui-scroll-area slot="content" class="example-scroll-alpha" label="Alphabetical namespace index" size="large" gutter="stable" mode="always" snap="proximity">
            <div class="example-scroll-alpha-list">${alphabetSections}</div>
            ${alphabetDetents}
          </ui-scroll-area>
        </ui-card>`,
      {
        compositionOnly: true,
        description:
          "Authored A–Z buttons occupy the detent slot and resolve semantic data-scroll-id targets without replacing native scrolling.",
        stageLayout: "fill",
      },
    ),
    example(
      "Detented reading rail",
      `
        <div class="catalog-example example-scroll-reader">
          <ui-scroll-area class="example-scroll-reading" label="Motion system notes" size="large" gutter="stable" mode="always" snap="proximity" data-detents-only>
            <article class="example-scroll-reading-copy">${readingSections}</article>
            ${readingDetents}
            <span class="example-scroll-preview-anchor" slot="block-detents" style="--ui-scroll-detent-position: 56%">
              <button type="button" class="example-scroll-reading-current" data-scroll-target="reading-9" data-scroll-align="center" data-scroll-behavior="smooth" aria-label="Jump to renderer boundaries"></button>
              <ui-card class="example-scroll-preview-card">
                <strong slot="title">Renderer boundaries</strong>
                <span slot="description">Section 09 · current vicinity</span>
                <p slot="content">Native scrolling underneath, authored semantic rail above.</p>
              </ui-card>
            </span>
          </ui-scroll-area>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Dense passive marks map the document while one keyboard-reachable detent reveals a real card preview on hover or focus.",
        stageLayout: "fill",
      },
    ),
    example(
      "Breadcrumb section rail",
      `
        <section class="catalog-example example-scroll-breadcrumb" data-catalog-scroll-breadcrumb>
          <header class="example-scroll-breadcrumb-header">
            <ui-path variant="breadcrumb" path="/interzone/foundations/scrolling/overview" aria-label="Documentation section">
              <span slot="title" data-catalog-scroll-breadcrumb-title>Overview</span>
            </ui-path>
            <ui-badge data-catalog-scroll-target-output>overview</ui-badge>
          </header>
          <ui-scroll-area class="example-scroll-breadcrumb-area" label="Scrolling documentation" size="large" gutter="stable" mode="always" snap="mandatory" data-catalog-scroll-targets>
            <div class="example-scroll-snap-pages">
              <section data-scroll-id="overview" data-scroll-snap><span class="example-eyebrow">01</span><h3>Overview</h3><p>The native viewport remains the behavioral source of truth.</p></section>
              <section data-scroll-id="anatomy" data-scroll-snap><span class="example-eyebrow">02</span><h3>Anatomy</h3><p>Viewport, track, thumb, detents, and corner remain separately styleable.</p></section>
              <section data-scroll-id="states" data-scroll-snap><span class="example-eyebrow">03</span><h3>States</h3><p>Idle, active, hovered, focused, and dragging are observable states.</p></section>
              <section data-scroll-id="targets" data-scroll-snap><span class="example-eyebrow">04</span><h3>Targets</h3><p>Semantic identifiers survive changes to layout and renderer anatomy.</p></section>
            </div>
            <button type="button" class="example-scroll-detent example-scroll-chapter-detent" slot="block-detents" data-scroll-target="overview" data-scroll-behavior="smooth" aria-label="Overview"><span>1</span></button>
            <button type="button" class="example-scroll-detent example-scroll-chapter-detent" slot="block-detents" data-scroll-target="anatomy" data-scroll-behavior="smooth" aria-label="Anatomy"><span>2</span></button>
            <button type="button" class="example-scroll-detent example-scroll-chapter-detent" slot="block-detents" data-scroll-target="states" data-scroll-behavior="smooth" aria-label="States"><span>3</span></button>
            <button type="button" class="example-scroll-detent example-scroll-chapter-detent" slot="block-detents" data-scroll-target="targets" data-scroll-behavior="smooth" aria-label="Targets"><span>4</span></button>
          </ui-scroll-area>
        </section>`,
      {
        compositionOnly: true,
        description:
          "The rail updates an ordinary ui-path composition; neither component needs product-specific breadcrumb-scroll coupling.",
        stageLayout: "fill",
      },
    ),
    example(
      "Hover-revealed menu card",
      `
        <ui-card class="catalog-example example-scroll-menu-card">
          <strong slot="title">Recent commands</strong>
          <span slot="description">Move into the card to reveal its compact rail.</span>
          <ui-scroll-area slot="content" class="example-scroll-menu" label="Recent command history" size="medium" mode="hover" snap="proximity">
            <ui-menu class="example-scroll-command-menu" label="Recent commands">
              <ui-menu-item data-scroll-id="command-open" data-scroll-snap>Open project<ui-kbd slot="shortcut" command="project.open" shortcut="Primary+O"></ui-kbd></ui-menu-item>
              <ui-menu-item data-scroll-id="command-search" data-scroll-snap>Search namespace<ui-kbd slot="shortcut" command="workspace.search" shortcut="Primary+F"></ui-kbd></ui-menu-item>
              <ui-menu-item data-scroll-id="command-move" data-scroll-snap>Move record<ui-kbd slot="shortcut" command="record.move" shortcut="Alt+M"></ui-kbd></ui-menu-item>
              <ui-menu-item data-scroll-id="command-archive" data-scroll-snap>Archive project<ui-kbd slot="shortcut" command="project.archive" shortcut="Primary+Backspace"></ui-kbd></ui-menu-item>
              <ui-menu-item data-scroll-id="command-restore" data-scroll-snap>Restore snapshot<ui-kbd slot="shortcut" command="snapshot.restore" shortcut="Primary+Shift+R"></ui-kbd></ui-menu-item>
              <ui-menu-item data-scroll-id="command-export" data-scroll-snap>Export selection<ui-kbd slot="shortcut" command="selection.export" shortcut="Primary+Shift+E"></ui-kbd></ui-menu-item>
              <ui-menu-item data-scroll-id="command-close" data-scroll-snap>Close workspace<ui-kbd slot="shortcut" command="workspace.close" shortcut="Primary+W"></ui-kbd></ui-menu-item>
            </ui-menu>
            <button type="button" class="example-scroll-detent example-scroll-menu-detent" slot="block-detents" data-scroll-target="command-archive" data-scroll-behavior="smooth" aria-label="Jump to archive command"></button>
          </ui-scroll-area>
        </ui-card>`,
      {
        compositionOnly: true,
        description:
          "Hover mode removes the rail from view at rest but retains native wheel, touch, and keyboard scrolling over the whole card.",
      },
    ),
    example(
      "Bidirectional edge mask",
      `
        <section class="catalog-example example-scroll-bidirectional">
          <header class="example-scroll-bidirectional-header">
            <div><span class="example-eyebrow">Shared viewport part</span><strong>Namespace canvas</strong></div>
            <ui-path size="small" path="/interzone/scrolling/row-1/column-1"><span slot="title">A1</span></ui-path>
          </header>
          <ui-scroll-area class="example-scroll-bidirectional-area example-scroll-edge-mask" label="Bidirectional namespace canvas" size="medium" gutter="stable" mode="always">
            <div class="example-scroll-canvas">${scrollCanvasRows}</div>
            <button type="button" class="example-scroll-detent example-scroll-canvas-block-detent" slot="block-detents" data-scroll-target="row-1" aria-label="Scroll to row 1"></button>
            <button type="button" class="example-scroll-detent example-scroll-canvas-block-detent" slot="block-detents" data-scroll-target="row-4" aria-label="Scroll to row 4"></button>
            <button type="button" class="example-scroll-detent example-scroll-canvas-block-detent" slot="block-detents" data-scroll-target="row-8" aria-label="Scroll to row 8"></button>
            <button type="button" class="example-scroll-detent example-scroll-canvas-block-detent" slot="block-detents" data-scroll-target="row-12" aria-label="Scroll to row 12"></button>
            <button type="button" class="example-scroll-inline-detent" slot="inline-detents" data-scroll-target="column-1" aria-label="Scroll to column A"></button>
            <button type="button" class="example-scroll-inline-detent" slot="inline-detents" data-scroll-target="column-3" aria-label="Scroll to column C"></button>
            <button type="button" class="example-scroll-inline-detent" slot="inline-detents" data-scroll-target="column-6" aria-label="Scroll to column F"></button>
            <button type="button" class="example-scroll-inline-detent" slot="inline-detents" data-scroll-target="column-8" aria-label="Scroll to column H"></button>
            <ui-icon slot="corner" name="action.drag" label="Bidirectional scroll corner"></ui-icon>
          </ui-scroll-area>
        </section>`,
      {
        compositionOnly: true,
        description:
          "Both axes use the same viewport CSS part and intersecting semantic edge-mask recipe; only their logical state and detent lanes differ.",
        stageLayout: "fill",
      },
    ),
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
            <ui-tree-item kind="folder" path="/interzone" expanded>
            <span slot="label">Interzone</span>
            <ui-icon slot="icon" name="object.folder" label=""></ui-icon>
            <ui-badge slot="meta">workspace</ui-badge>
            <ui-tree-item slot="children" kind="folder" path="/interzone/projects" expanded>
              <span slot="label">Projects</span>
            <ui-icon slot="icon" name="object.folder" label=""></ui-icon>
              <span slot="meta">2 records</span>
              <ui-tree-item slot="children" kind="file" path="/interzone/projects/billing-migration" selected>
                <span slot="label">Billing migration</span>
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
                <ui-badge slot="meta" tone="positive">active</ui-badge>
              </ui-tree-item>
              <ui-tree-item slot="children" kind="file" path="/interzone/projects/invoice-reconciliation" current>
                <span slot="label">Invoice reconciliation</span>
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
              </ui-tree-item>
            </ui-tree-item>
            <ui-tree-item slot="children" kind="folder" path="/interzone/archive">
              <span slot="label">Archive</span>
            <ui-icon slot="icon" name="object.folder" label=""></ui-icon>
            </ui-tree-item>
          </ui-tree-item>
        </ui-tree>`,
      { compositionOnly: true },
    ),
    example(
      "Constrained namespace labels",
      `
        <ui-tree class="catalog-example example-tree-narrow" label="Long namespace labels">
          <ui-tree-item kind="folder" path="/interzone/projects" expanded>
            <span slot="label">Interzone project namespace</span>
            <ui-icon slot="icon" name="object.folder" label=""></ui-icon>
            <ui-tree-item
              slot="children"
              kind="file"
              path="/interzone/projects/billing-migration/invoice-reconciliation"
              selected
            >
              <span slot="label">Invoice reconciliation requirements for international billing</span>
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
            </ui-tree-item>
            <ui-tree-item
              slot="children"
              kind="file"
              path="/interzone/projects/archive-import/legacy-ledger-verification"
            >
              <span slot="label">Legacy ledger verification and archive import</span>
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
            </ui-tree-item>
          </ui-tree-item>
        </ui-tree>`,
      {
        compositionOnly: true,
        description:
          "Tree labels consume the same logical overflow states and progressive blur anatomy as ui-path without nesting navigation inside the tree-item button.",
        stageLayout: "start",
      },
    ),
    example(
      "Reorder with handles",
      `
        <div class="catalog-example example-drag-tree-workspace">
          <header class="example-link-heading">
            <span class="example-eyebrow">Controlled order</span>
            <h2>Tree rows keep their tree semantics</h2>
            <p>The actions slot supplies a dedicated grip; the owning example commits the new sibling order.</p>
          </header>
          <ui-tree class="example-drag-tree" label="Project priority" data-catalog-drag-boundary>
            <ui-tree-item value="billing" kind="file" title="Billing migration" data-catalog-drag-source="tree-item" data-catalog-drag-axis="y">
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
              <ui-badge slot="meta" tone="critical">P0</ui-badge>
              <ui-button slot="actions" class="example-drag-handle" data-catalog-drag-handle type="button" size="small" variant="quiet" aria-label="Move Billing migration"><ui-icon name="action.drag" label=""></ui-icon></ui-button>
            </ui-tree-item>
            <ui-tree-item value="invoices" kind="file" title="Invoice reconciliation" data-catalog-drag-source="tree-item" data-catalog-drag-axis="y">
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
              <ui-badge slot="meta" tone="warning">P1</ui-badge>
              <ui-button slot="actions" class="example-drag-handle" data-catalog-drag-handle type="button" size="small" variant="quiet" aria-label="Move Invoice reconciliation"><ui-icon name="action.drag" label=""></ui-icon></ui-button>
            </ui-tree-item>
            <ui-tree-item value="archive" kind="file" title="Archive import" data-catalog-drag-source="tree-item" data-catalog-drag-axis="y">
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
              <ui-badge slot="meta">P2</ui-badge>
              <ui-button slot="actions" class="example-drag-handle" data-catalog-drag-handle type="button" size="small" variant="quiet" aria-label="Move Archive import"><ui-icon name="action.drag" label=""></ui-icon></ui-button>
            </ui-tree-item>
          </ui-tree>
          <output class="example-drag-status" data-catalog-tree-status>Priority: Billing migration, Invoice reconciliation, Archive import</output>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The headless controller attaches directly to each ui-tree-item, preserving the tree's authored hierarchy and actions-slot anatomy.",
        stageLayout: "start",
      },
    ),
    example(
      "Nest into leaves",
      `
        <div class="catalog-example example-tree-leaf-workspace" data-catalog-tree-leaf-workspace>
          <header class="example-link-heading">
            <span class="example-eyebrow">Leaf promotion</span>
            <h2>Drop a row into another leaf</h2>
            <p>The nearest valid leaf becomes a branch; dropping outside the tree cancels without changing the hierarchy.</p>
          </header>
          <ui-tree class="example-drag-tree" label="Migration work" data-catalog-tree-leaf-zone>
            <ui-tree-item kind="folder" title="Migration work" expanded>
            <ui-icon slot="icon" name="object.folder" label=""></ui-icon>
              <ui-tree-item slot="children" value="billing" kind="file" title="Billing migration" data-catalog-label="Billing migration" data-catalog-drag-source="tree-leaf" data-catalog-drag-free data-catalog-tree-leaf-drop>
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
                <ui-button slot="actions" class="example-drag-handle" data-catalog-drag-handle type="button" size="small" variant="quiet" aria-label="Move Billing migration"><ui-icon name="action.drag" label=""></ui-icon></ui-button>
              </ui-tree-item>
              <ui-tree-item slot="children" value="invoices" kind="file" title="Invoice reconciliation" data-catalog-label="Invoice reconciliation" data-catalog-drag-source="tree-leaf" data-catalog-drag-free data-catalog-tree-leaf-drop>
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
                <ui-button slot="actions" class="example-drag-handle" data-catalog-drag-handle type="button" size="small" variant="quiet" aria-label="Move Invoice reconciliation"><ui-icon name="action.drag" label=""></ui-icon></ui-button>
              </ui-tree-item>
              <ui-tree-item slot="children" value="archive" kind="file" title="Archive import" data-catalog-label="Archive import" data-catalog-drag-source="tree-leaf" data-catalog-drag-free data-catalog-tree-leaf-drop>
            <ui-icon slot="icon" name="object.document" label=""></ui-icon>
                <ui-button slot="actions" class="example-drag-handle" data-catalog-drag-handle type="button" size="small" variant="quiet" aria-label="Move Archive import"><ui-icon name="action.drag" label=""></ui-icon></ui-button>
              </ui-tree-item>
            </ui-tree-item>
          </ui-tree>
          <output class="example-drag-status" data-catalog-tree-leaf-status>Drag a row onto a leaf to nest it.</output>
        </div>`,
      {
        compositionOnly: true,
        description:
          "The tree stays a controlled semantic hierarchy; the owning example validates the target, promotes a leaf to a branch, and cancels invalid drops.",
        stageLayout: "start",
      },
    ),
  ],
  "ui-toast": [
    example(
      "Notification anatomy",
      `
        <ui-toast class="catalog-example" open tone="warning" duration="0">
          <ui-icon slot="icon" name="status.warning" label=""></ui-icon>
          <strong slot="title">Connection interrupted</strong>
          Sync paused while the workspace reconnects.
          <ui-button slot="actions" type="button" size="small" variant="secondary">Retry now</ui-button>
        </ui-toast>`,
      {
        compositionOnly: true,
        description:
          "A toast owns the live-region announcement and dismissal lifecycle; title, message, icon, and action controls are authored content.",
      },
    ),
    example(
      "Semantic outcomes",
      `
        <div class="catalog-example example-toast-list">
          <ui-toast open tone="positive" duration="0"><ui-icon slot="icon" name="action.confirm" label=""></ui-icon><strong slot="title">Project saved</strong>Preferences were stored for this workspace.</ui-toast>
          <ui-toast open tone="warning" duration="0"><ui-icon slot="icon" name="status.warning" label=""></ui-icon><strong slot="title">Review needed</strong>The migration note is missing a finance owner.</ui-toast>
          <ui-toast open tone="critical" duration="0"><ui-icon slot="icon" name="status.error" label=""></ui-icon><strong slot="title">Replay failed</strong>Invoice replay stopped before the last checkpoint.</ui-toast>
        </div>`,
      { compositionOnly: true },
    ),
    example(
      "Auto-hide and persistent",
      `
        <div class="catalog-example example-toast-list">
          <ui-toast open tone="neutral" duration="5000" pause-on-hover><strong slot="title">Saved draft</strong>Hover or focus pauses the remaining timeout.</ui-toast>
          <ui-toast open tone="warning" duration="0"><strong slot="title">Manual review</strong>This notification stays open until dismissed.</ui-toast>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Auto-hide uses a duration; important or action-bearing notices stay open with duration zero.",
      },
    ),
  ],
  "ui-toast-stack": [
    example(
      "Notification layer",
      `
        <ui-toast-stack placement="top-end" limit="3" label="Workspace notifications">
          <ui-toast open duration="0" tone="positive"><ui-icon slot="icon" name="action.confirm" label=""></ui-icon><strong slot="title">Project saved</strong>Billing migration was updated.</ui-toast>
          <ui-toast open duration="0"><strong slot="title">Review requested</strong>Maya asked for a deployment-note pass.</ui-toast>
          <ui-toast open duration="0" tone="warning"><ui-icon slot="icon" name="status.warning" label=""></ui-icon><strong slot="title">Migration needs attention</strong>One imported record has no owner.</ui-toast>
        </ui-toast-stack>`,
      {
        compositionOnly: true,
        description:
          "The stack places authored toasts and coordinates collapse/expansion; queue IDs and replacement policy stay with application state.",
      },
    ),
    example(
      "Long-running operation",
      `
        <ui-toast-stack placement="bottom-end" limit="2" label="Upload notifications">
          <ui-toast open duration="0" tone="neutral">
            <ui-icon slot="icon" name="status.loading" label=""></ui-icon>
            <strong slot="title">Uploading archive</strong>
            42 of 64 records processed.
            <ui-progress slot="actions" value="66" max="100" label="Upload progress"></ui-progress>
          </ui-toast>
          <ui-toast open duration="0" tone="positive"><strong slot="title">Preview ready</strong>The generated summary can be opened from the project activity.</ui-toast>
        </ui-toast-stack>`,
      {
        compositionOnly: true,
        description:
          "Progress and replacement semantics are composed into the toast rather than creating a separate notification subtype.",
      },
    ),
    example(
      "Logical placements",
      `
        <div class="catalog-example example-toast-placement-grid">
          <ui-toast-stack placement="top-start" limit="1" label="Top start notifications">
            <ui-toast open duration="0"><strong slot="title">Top start</strong>Logical start respects document direction.</ui-toast>
          </ui-toast-stack>
          <ui-toast-stack placement="bottom-end" limit="1" label="Bottom end notifications">
            <ui-toast open duration="0" tone="positive"><strong slot="title">Bottom end</strong>Common transient app feedback.</ui-toast>
          </ui-toast-stack>
        </div>`,
      { compositionOnly: true },
    ),
  ],
  "sh-tree": [
    example(
      "Inline path lanes",
      `
        <div class="catalog-example example-sh-tree-hover-stage" data-catalog-gesture-demo data-shrine-path-preview-stage>
          <ui-context-menu class="example-sh-tree-context" data-shrine-tree-context label="Shrine path actions" density="compact">
            <sh-tree slot="trigger" variant="inline" class="example-sh-tree example-sh-tree-inline">
            <ui-tree slot="tree" label="Addressable Shrine path history">
              <ui-tree-item value="KTK-1" path="/work/KTK-1" title="Stitch revision topology" kind="folder" expanded current selected data-shrine-lane="0" data-shrine-parents="MIR-8">
                <ui-path id="shrine-path-ktk-1" slot="label" size="small" path="/work/KTK-1"><span slot="title">Stitch revision topology</span></ui-path>
                <span slot="meta">current</span>
                <ui-menu slot="actions" label="KTK-1 actions" density="mini">
                  <ui-button slot="trigger" size="small" variant="quiet" aria-label="Open KTK-1 actions">•••</ui-button>
                  <ui-menu-item value="open">Open path</ui-menu-item>
                  <ui-menu-item value="overlay">Show overlays</ui-menu-item>
                  <ui-menu-item value="copy">Copy address</ui-menu-item>
                </ui-menu>
                <ui-tree-item slot="children" value="KTK-1/overlay" path="/work/KTK-1/overlays/invoice" title="Invoice overlay" data-shrine-lane="1" data-shrine-parents="KTK-1">
                  <ui-path id="shrine-path-ktk-overlay" slot="label" size="small" path="/work/KTK-1/overlays/invoice"><span slot="title">Invoice overlay</span></ui-path>
                  <ui-badge slot="meta" size="small" tone="warning">x→x</ui-badge>
                </ui-tree-item>
                <ui-tree-item slot="children" value="KTK-1/source" path="/work/KTK-1/source" title="Source witness" data-shrine-lane="2" data-shrine-parents="KTK-1">
                  <ui-path id="shrine-path-ktk-source" slot="label" size="small" path="/work/KTK-1/source"><span slot="title">Source witness</span></ui-path>
                  <span slot="meta">child</span>
                </ui-tree-item>
              </ui-tree-item>
              <ui-tree-item value="MIR-8" path="/work/MIR-8" title="Reconcile namespace witnesses" kind="folder" expanded data-shrine-lane="0" data-shrine-parents="BASE-1">
                <ui-path id="shrine-path-mir-8" slot="label" size="small" path="/work/MIR-8"><span slot="title">Reconcile namespace witnesses</span></ui-path>
                <span slot="meta">parent</span>
                <ui-menu slot="actions" label="MIR-8 actions" density="mini">
                  <ui-button slot="trigger" size="small" variant="quiet" aria-label="Open MIR-8 actions">•••</ui-button>
                  <ui-menu-item value="open">Open path</ui-menu-item>
                  <ui-menu-item value="new-child">Create child</ui-menu-item>
                  <ui-menu-item value="copy">Copy address</ui-menu-item>
                </ui-menu>
                <ui-tree-item slot="children" value="MIR-8/records" path="/work/MIR-8/records" title="Projected records" data-shrine-lane="3" data-shrine-parents="MIR-8">
                  <ui-path id="shrine-path-mir-records" slot="label" size="small" path="/work/MIR-8/records"><span slot="title">Projected records</span></ui-path>
                  <ui-badge slot="meta" size="small">overlay</ui-badge>
                </ui-tree-item>
              </ui-tree-item>
              <ui-tree-item value="BASE-1" path="/work/BASE-1" title="Addressable Shrine lineage" data-shrine-lane="0">
                <ui-path id="shrine-path-base-1" slot="label" size="small" path="/work/BASE-1"><span slot="title">Addressable Shrine lineage</span></ui-path>
                <span slot="meta">root</span>
              </ui-tree-item>
              </ui-tree>
            </sh-tree>
            <ui-menu-item value="open"><ui-icon slot="prefix" name="action.launch" label=""></ui-icon>Open <span data-shrine-context-title>path node</span></ui-menu-item>
            <ui-menu-item value="reveal">Reveal in namespace tree</ui-menu-item>
            <ui-menu-item value="copy-path">Copy <code data-shrine-context-path>/</code><ui-kbd slot="shortcut" command="path.copy" shortcut="Primary+Shift+C"></ui-kbd></ui-menu-item>
            <ui-menu-item value="overlay">Inspect x→x overlays</ui-menu-item>
            <ui-separator></ui-separator>
            <ui-menu-item value="detach" tone="critical">Detach projection</ui-menu-item>
          </ui-context-menu>
          <ui-preview-card class="example-sh-tree-hover-preview" data-shrine-path-preview label="Shrine path preview" trigger="manual" placement="right" align="center" offset="12" collision-padding="12" open-delay="140" close-delay="320">
            <sh-myth variant="preview" kind="Branch" title="Stitch revision topology" path="/work/KTK-1" data-shrine-preview-myth>
              <sh-limb>
                <sh-slot slot="label" title="node"></sh-slot>
                <sh-pail slot="value" text="KTK-1" data-shrine-preview-value></sh-pail>
              </sh-limb>
              <sh-limb>
                <sh-slot slot="label" title="lane"></sh-slot>
                <sh-pail slot="value" text="0" data-shrine-preview-lane></sh-pail>
              </sh-limb>
              <sh-limb>
                <sh-slot slot="label" title="children"></sh-slot>
                <sh-pail slot="value" text="2" data-shrine-preview-children></sh-pail>
              </sh-limb>
              <sh-limb>
                <sh-slot slot="label" title="relation"></sh-slot>
                <ui-badge slot="value" size="small" data-shrine-preview-relation>current</ui-badge>
              </sh-limb>
              <nav slot="actions" class="example-sh-tree-preview-actions" aria-label="Previewed path actions">
                <ui-link data-shrine-preview-open href="#KTK-1"><ui-icon slot="prefix" name="action.launch" label=""></ui-icon>Open path</ui-link>
                <ui-link data-shrine-preview-reveal href="#KTK-1-reveal">Reveal in namespace</ui-link>
              </nav>
            </sh-myth>
          </ui-preview-card>
          <ui-gesture-binding for="shrine-path-ktk-1" gesture="hover" command="preview.shrine-path" group="shrine-path-preview"></ui-gesture-binding>
          <ui-gesture-binding for="shrine-path-ktk-overlay" gesture="hover" command="preview.shrine-path" group="shrine-path-preview"></ui-gesture-binding>
          <ui-gesture-binding for="shrine-path-ktk-source" gesture="hover" command="preview.shrine-path" group="shrine-path-preview"></ui-gesture-binding>
          <ui-gesture-binding for="shrine-path-mir-8" gesture="hover" command="preview.shrine-path" group="shrine-path-preview"></ui-gesture-binding>
          <ui-gesture-binding for="shrine-path-mir-records" gesture="hover" command="preview.shrine-path" group="shrine-path-preview"></ui-gesture-binding>
          <ui-gesture-binding for="shrine-path-base-1" gesture="hover" command="preview.shrine-path" group="shrine-path-preview"></ui-gesture-binding>
        </div>`,
      {
        compositionOnly: true,
        description:
          "Each row begins beside its own data lane while ui-tree still owns hierarchy, disclosure, roving focus, and selection. Declarative hover bindings emit preview commands that the recipe realizes as a right-anchored provenance card; focus, row actions, and right-click commands remain independently available.",
        stageLayout: "start",
      },
    ),
    example(
      "Mixed node forms",
      `
        <sh-tree variant="inline" class="catalog-example example-sh-tree example-sh-tree-inline">
          <ui-tree slot="tree" label="Mixed Shrine node pronunciations">
            <ui-tree-item value="HEAD" path="/revisions/head" title="Current revision" current selected data-shrine-capsule="HEAD" data-shrine-lane="0" data-shrine-parents="MAIN">
              <ui-path slot="label" size="small" path="/revisions/head"><span slot="title">Current revision</span></ui-path>
              <span slot="meta">capsule opt-in</span>
            </ui-tree-item>
            <ui-tree-item value="PATCH" path="/revisions/patch" title="Overlay patch" data-shrine-lane="2" data-shrine-parents="MAIN">
              <ui-path slot="label" size="small" path="/revisions/patch"><span slot="title">Overlay patch</span></ui-path>
              <span slot="meta">regular node</span>
            </ui-tree-item>
            <ui-tree-item value="MAIN" path="/revisions/main" title="Main witness" data-shrine-lane="0">
              <ui-path slot="label" size="small" path="/revisions/main"><span slot="title">Main witness</span></ui-path>
              <span slot="meta">regular node</span>
            </ui-tree-item>
          </ui-tree>
        </sh-tree>`,
      {
        compositionOnly: true,
        description:
          "Regular nodes are the inline default. data-shrine-capsule opt-in changes only a node's pronunciation; it keeps the same path identity and selection contract.",
        stageLayout: "start",
      },
    ),
    example(
      "KTK-1 trace ledger",
      `
        <sh-tree variant="ledger" class="catalog-example example-sh-tree example-sh-tree-ledger">
          <ui-tree slot="tree" label="KTK-1 Shrine trace ledger">
            <ui-tree-item value="KTK-1" title="Stitch revision topology into the Shrine tree" current selected data-shrine-lane="0" data-shrine-parents="MIR-8">
              <ui-path slot="label" size="small" path="/trace/KTK-1"><span slot="title">Stitch revision topology into the Shrine tree</span></ui-path>
              <ui-badge slot="meta" tone="positive">KTK-1 · current</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="MIR-8" title="Reconcile projected namespace witnesses" data-shrine-lane="0" data-shrine-parents="AXL-6 VEL-3">
              <ui-path slot="label" size="small" path="/trace/MIR-8"><span slot="title">Reconcile projected namespace witnesses</span></ui-path>
              <span slot="meta">MIR-8 · now</span>
            </ui-tree-item>
            <ui-tree-item value="AXL-6" title="Admit stable path identities" data-shrine-lane="0" data-shrine-parents="AXL-5">
              <ui-path slot="label" size="small" path="/trace/AXL-6"><span slot="title">Admit stable path identities</span></ui-path>
              <ui-badge slot="meta">main trace</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="VEL-3" title="Carry revision provenance through the catalogue" data-shrine-lane="3" data-shrine-parents="VEL-2">
              <ui-path slot="label" size="small" path="/trace/VEL-3"><span slot="title">Carry revision provenance through the catalogue</span></ui-path>
              <ui-badge slot="meta" tone="warning">projection</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="AXL-5" title="Sew semantic handles into record rows" data-shrine-lane="0" data-shrine-parents="AXL-4 ORB-2">
              <ui-path slot="label" size="small" path="/trace/AXL-5"><span slot="title">Sew semantic handles into record rows</span></ui-path>
              <span slot="meta">AXL-5 · 14m</span>
            </ui-tree-item>
            <ui-tree-item value="ORB-2" title="Prototype alternate locator pronunciation" data-shrine-lane="5" data-shrine-parents="ORB-1">
              <ui-path slot="label" size="small" path="/trace/ORB-2"><span slot="title">Prototype alternate locator pronunciation</span></ui-path>
              <ui-badge slot="meta" tone="critical">detached</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="VEL-2" title="Normalize trace color roles" data-shrine-lane="3" data-shrine-parents="JOIN-4">
              <ui-path slot="label" size="small" path="/trace/VEL-2"><span slot="title">Normalize trace color roles</span></ui-path>
              <span slot="meta">VEL-2 · 31m</span>
            </ui-tree-item>
            <ui-tree-item value="AXL-4" title="Preserve tree keyboard ownership" data-shrine-lane="0" data-shrine-parents="BASE-1">
              <ui-path slot="label" size="small" path="/trace/AXL-4"><span slot="title">Preserve tree keyboard ownership</span></ui-path>
              <span slot="meta">AXL-4 · 42m</span>
            </ui-tree-item>
            <ui-tree-item value="ORB-1" title="Test an independent material branch" data-shrine-lane="5" data-shrine-parents="JOIN-4">
              <ui-path slot="label" size="small" path="/trace/ORB-1"><span slot="title">Test an independent material branch</span></ui-path>
              <span slot="meta">ORB-1 · 1h</span>
            </ui-tree-item>
            <ui-tree-item value="JOIN-4" title="Join projected histories without rewriting identity" data-shrine-lane="2" data-shrine-parents="BASE-1">
              <ui-path slot="label" size="small" path="/trace/JOIN-4"><span slot="title">Join projected histories without rewriting identity</span></ui-path>
              <ui-badge slot="meta" tone="positive">witnessed</ui-badge>
            </ui-tree-item>
            <ui-tree-item value="BASE-1" title="Establish the first addressable Shrine lineage" data-shrine-lane="0">
              <ui-path slot="label" size="small" path="/trace/BASE-1"><span slot="title">Establish the first addressable Shrine lineage</span></ui-path>
              <span slot="meta">BASE-1 · yesterday</span>
            </ui-tree-item>
          </ui-tree>
        </sh-tree>`,
      {
        compositionOnly: true,
        description:
          "A Shrine-native history view: flat records, dense colored topology, no nested branch guides, and the same ui-tree keyboard and selection contract.",
        stageLayout: "start",
      },
    ),
    example(
      "Revision graph",
      `
        <sh-tree class="catalog-example example-sh-tree">
          <ui-tree slot="tree" label="Shrine revision graph">
            <ui-tree-item value="head" title="AXI-37 Shrine revision graph" current selected data-shrine-lane="0" data-shrine-parents="merge">
              <span slot="icon" aria-hidden="true">◆</span>
              <span slot="meta"><ui-badge tone="positive">HEAD</ui-badge></span>
            </ui-tree-item>
            <ui-tree-item value="merge" title="Merge catalogue conformance" data-shrine-lane="0" data-shrine-parents="main feature-a">
              <span slot="meta">0bce38b · 8m</span>
            </ui-tree-item>
            <ui-tree-item value="main" title="Normalize component recipes" data-shrine-lane="0" data-shrine-parents="base">
              <span slot="meta"><ui-badge>main</ui-badge></span>
            </ui-tree-item>
            <ui-tree-item value="feature-a" title="Add progressive path masks" data-shrine-lane="2" data-shrine-parents="feature-b">
              <span slot="meta"><ui-badge tone="warning">AXI-62</ui-badge></span>
            </ui-tree-item>
            <ui-tree-item value="feature-b" title="Expose semantic overflow parts" data-shrine-lane="2" data-shrine-parents="base">
              <span slot="meta">ae91d4c · 2h</span>
            </ui-tree-item>
            <ui-tree-item value="base" title="Establish Mash component foundations" data-shrine-lane="0">
              <span slot="meta">c4a23f1 · yesterday</span>
            </ui-tree-item>
          </ui-tree>
        </sh-tree>`,
      {
        compositionOnly: true,
        description:
          "Revision lanes are a decorative projection. The slotted ui-tree remains the only owner of selection, roving focus, typeahead, and ARIA.",
        stageLayout: "start",
      },
    ),
    example(
      "Expandable change sets",
      `
        <sh-tree class="catalog-example example-sh-tree">
          <ui-tree slot="tree" label="Expandable Shrine changes">
            <ui-tree-item value="rev-current" kind="folder" title="Checkpoint namespace migration" expanded current data-shrine-lane="0" data-shrine-parents="rev-parent">
              <ui-badge slot="meta" tone="positive">current</ui-badge>
              <ui-tree-item slot="children" value="path-preserved" title="/foo" kind="folder" expanded data-shrine-graph="none">
                <ui-badge slot="meta">preserved</ui-badge>
                <ui-tree-item slot="children" value="path-preserved-leaf" title="/foo/baz" data-shrine-graph="none">
                  <span slot="meta">addressable child</span>
                </ui-tree-item>
              </ui-tree-item>
              <ui-tree-item slot="children" value="path-compacted" title="/records/archive/import" data-shrine-graph="none" data-shrine-compressed-from="/records /records/archive">
                <ui-badge slot="meta" tone="warning">compacted projection</ui-badge>
              </ui-tree-item>
            </ui-tree-item>
            <ui-tree-item value="rev-parent" title="Define namespace contracts" data-shrine-lane="0" data-shrine-parents="rev-branch">
              <span slot="meta">parent</span>
            </ui-tree-item>
            <ui-tree-item value="rev-branch" title="Admit projected records" data-shrine-lane="1">
              <span slot="meta"><ui-badge>branch</ui-badge></span>
            </ui-tree-item>
          </ui-tree>
        </sh-tree>`,
      {
        compositionOnly: true,
        description:
          "Meaningful intermediate namespaces remain real tree items. A semantically empty linear chain may instead be compacted by the authoring projection and records its source explicitly.",
        stageLayout: "start",
      },
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
          <ui-path slot="locator" path="/interzone/projects/billing-migration"><span slot="title">Billing migration</span></ui-path>
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
  "ui-bubble-group": { parent: "ui-bubble", example: "Message rows" },
  "ui-chip": { parent: "ui-combobox", example: "Multi-select chips" },
  "ui-color-swatch": { parent: "ui-color-picker" },
  "ui-menu-item": { parent: "ui-menu", openParent: true },
  "ui-menu-label": {
    parent: "ui-menu",
    example: "Labelled command groups",
    openParent: true,
  },
  "ui-option": { parent: "ui-select", openParent: true },
  "ui-option-group": {
    parent: "ui-select",
    example: "Grouped disabled items",
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
