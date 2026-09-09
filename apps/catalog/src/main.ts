import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "@mash/ui/select";
import "./showcase.css";
import { leaveCatalogue, showCatalogue } from "./showcase.js";
const root = document.querySelector<HTMLElement>("#app")!;
document.documentElement.dataset.mashCatalogue = "mash";
let disposeStory: (() => void) | undefined;
let navigationVersion = 0;
const navigate = () => {
  const version = ++navigationVersion;
  disposeStory?.();
  disposeStory = undefined;
  if (location.pathname === "/stories" || location.pathname.startsWith("/stories/")) {
    leaveCatalogue();
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
  void showCatalogue(root).then(() => {
    if (version !== navigationVersion) return;
    if (!location.hash && !new URL(location.href).searchParams.has("example"))
      window.scrollTo({ top: 0 });
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
