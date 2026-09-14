// A full dark-theme sweep is useful for releases; PRs also retain targeted
// theme-boundary, inverse-surface, chart, and focus/contrast checks.
export const catalogueThemes =
  process.env.MASH_FULL_CATALOGUE === "1" ? ["light", "dark"] : ["light"];
