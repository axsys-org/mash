/**
 * Consume the packages exactly as an application would.
 *
 * Every import below goes through a published `exports` subpath, not a relative
 * path into `dist/`. That is the point: a stale target in the exports map, a
 * missing emitted file, or a build path that drifted is invisible to the
 * component tests — which import their neighbours relatively — and shows up
 * only when someone installs the package.
 *
 * The order also encodes the package's central promise. The definition imports
 * run first and must register nothing; only the `register` imports afterwards
 * may touch the CustomElementRegistry.
 */

import { UIButton, UICard } from "@mash/ui";
import { UIButton as UIButtonSubpath } from "@mash/ui/button";
import { UICard as UICardSubpath } from "@mash/ui/card";
import { ShrineConfirm } from "@mash/shrine";
import { ShrineConfirm as ShrineConfirmSubpath } from "@mash/shrine/confirm";

interface ExportReport {
  /** Tags that were already defined before any register module was imported. */
  definedAfterDefinitionImports: string[];
  /** Tags defined once the register modules had been imported. */
  definedAfterRegisterImports: string[];
  /** Whether the barrel and the subpath export the identical class object. */
  identical: Record<string, boolean>;
  /** Whether each class is a constructible custom element. */
  constructible: Record<string, boolean>;
  error: string | null;
}

const TAGS = ["ui-button", "ui-card", "shrine-confirm"];
const defined = () => TAGS.filter((tag) => customElements.get(tag) !== undefined);

const report: ExportReport = {
  definedAfterDefinitionImports: defined(),
  definedAfterRegisterImports: [],
  identical: {
    "ui-button": UIButton === UIButtonSubpath,
    "ui-card": UICard === UICardSubpath,
    "shrine-confirm": ShrineConfirm === ShrineConfirmSubpath,
  },
  constructible: {},
  error: null,
};

try {
  // Side-effectful on purpose, and dynamic so they are guaranteed to evaluate
  // after the snapshot above — static imports are all hoisted together.
  await import("@mash/ui/button/register");
  await import("@mash/ui/card/register");
  await import("@mash/shrine/confirm/register");

  report.definedAfterRegisterImports = defined();

  for (const tag of TAGS) {
    const Constructor = customElements.get(tag);
    report.constructible[tag] = Constructor ? new Constructor() instanceof HTMLElement : false;
  }
} catch (cause) {
  report.error = cause instanceof Error ? cause.message : String(cause);
}

// Handed to Playwright through the DOM rather than a global, so the spec reads
// the same way whether or not the module graph finished loading.
const output = document.createElement("pre");
output.dataset.testid = "export-report";
output.textContent = JSON.stringify(report);
document.body.append(output);
