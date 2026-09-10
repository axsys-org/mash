export function siteHeader(active: "components" | "stories", theme: string): string {
  return `<header class="site-header"><nav aria-label="Site"><a ${active === "components" ? 'aria-current="page"' : ""} href="/components/ui-button">Components</a><a ${active === "stories" ? 'aria-current="page"' : ""} href="/stories">Stories</a></nav><button class="theme-toggle" aria-label="Switch color theme">${theme === "dark" ? "☀" : "☾"}</button></header>`;
}
