/**
 * What commit is this?
 *
 * A preview deployment is only useful for review if you can tell which commit
 * you are looking at. The values come from the deployment platform's own
 * environment at build time and are frozen into the bundle by Vite's `define`
 * (see vite.config.ts) — this module never reads `process.env` itself, so all
 * deployment-specific environment handling lives in exactly two places: the
 * `buildInfo()` reader in the Vite config, and the shape below.
 *
 * Every field is optional. Locally there is no branch, no SHA and no PR, and
 * the badge simply says "local development".
 */

import { el } from "./dom.js";

export interface BuildInfo {
  /** "production" | "preview" | "development" (Vercel), "ci", or "local". */
  env: string;
  branch: string | null;
  sha: string | null;
  /** Pull request number, as a string. Only set for a PR preview build. */
  pr: string | null;
  /** Repository slug, e.g. `owner/repo`, when the platform reports one. */
  repo: string | null;
}

export const buildInfo: BuildInfo = __BUILD_INFO__;

const shortSha = (sha: string): string => sha.slice(0, 7);

/**
 * The one-line description of this build.
 *
 *   PR #184 · feat/tree-item
 *   main
 *   local development
 */
export function describeBuild(info: BuildInfo = buildInfo): string {
  const parts: string[] = [];
  if (info.pr) parts.push(`PR #${info.pr}`);
  if (info.branch) parts.push(info.branch);
  if (parts.length === 0) {
    return info.env === "local" ? "local development" : info.env;
  }
  return parts.join(" · ");
}

/** A link to the commit, when we know enough to build one. */
function commitHref(info: BuildInfo): string | null {
  if (!info.repo || !info.sha) return null;
  return `https://github.com/${info.repo}/commit/${info.sha}`;
}

/**
 * The build badge.
 *
 * Unobtrusive by design: it sits in the masthead as small muted text and uses
 * the same semantic utility recipes as the rest of the catalogue chrome. Its
 * plain-text content remains present even if a visual token is being debugged.
 */
export function buildBadge(info: BuildInfo = buildInfo): HTMLElement {
  const href = commitHref(info);
  const sha = info.sha ? shortSha(info.sha) : null;

  return el(
    "p",
    { class: "build-info", title: `build environment: ${info.env}` },
    el("span", { class: "build-ref", text: describeBuild(info) }),
    sha
      ? href
        ? el("a", { class: "build-sha", href, rel: "noreferrer", target: "_blank", text: sha })
        : el("code", { class: "build-sha", text: sha })
      : null,
  );
}
