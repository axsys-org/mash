import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "./showcase.css";
type CatalogueModule = typeof import("./showcase.js");
const root = document.querySelector<HTMLElement>("#app")!;
document.documentElement.dataset.mashCatalogue = "mash";
let disposeStory: (() => void) | undefined;
let navigationVersion = 0;
let catalogue: CatalogueModule | undefined;
let catalogueRequest: Promise<CatalogueModule> | undefined;
const loadCatalogue = () =>
  (catalogueRequest ??= import("./showcase.js")
    .then((module) => (catalogue = module))
    .catch((error: unknown) => {
      catalogueRequest = undefined;
      throw error;
    }));
const navigate = () => {
  const version = ++navigationVersion;
  disposeStory?.();
  disposeStory = undefined;
  catalogue?.leaveCatalogue();
  root.removeAttribute("aria-busy");
  if (location.pathname === "/stories" || location.pathname.startsWith("/stories/")) {
    root.innerHTML = '<main class="story-loading" role="status">Opening Stories…</main>';
    void import("./stories.js")
      .then(async ({ mount }) => {
        if (version !== navigationVersion) return;
        const dispose = await mount(root);
        if (version !== navigationVersion) dispose();
        else disposeStory = dispose;
      })
      .catch(() => {
        if (version !== navigationVersion) return;
        root.innerHTML =
          '<main class="story-loading" role="alert"><p>Stories could not load.</p><button type="button">Try again</button></main>';
        root.querySelector("button")!.addEventListener("click", navigate, { once: true });
      });
    return;
  }
  void loadCatalogue()
    .then(async (module) => {
      if (version !== navigationVersion) return;
      await module.showCatalogue(root);
      if (version !== navigationVersion) return;
      if (!location.hash && !new URL(location.href).searchParams.has("example"))
        window.scrollTo({ top: 0 });
    })
    .catch(() => {
      if (version !== navigationVersion) return;
      root.removeAttribute("aria-busy");
      root.innerHTML =
        '<main class="story-loading" role="alert"><p>The catalogue could not load.</p><button type="button">Try again</button></main>';
      root.querySelector("button")!.addEventListener("click", navigate, { once: true });
    });
};
navigate();
window.addEventListener("popstate", navigate);
document.addEventListener("click", (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
  if (!link || link.target || link.hasAttribute("download")) return;
  const url = new URL(link.href);
  if (
    url.origin !== location.origin ||
    !/^\/(components(?:\/|$)|stories(?:\/|$))/.test(url.pathname)
  )
    return;
  if (url.pathname === location.pathname && url.search === location.search) return;
  event.preventDefault();
  history.pushState(null, "", url);
  navigate();
});
