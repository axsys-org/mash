/// <reference types="vite/client" />
import { elementLoaders } from "virtual:mash/element-loaders";
import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "./fixture-stage.css";

document.documentElement.dataset.mashCatalogue = "mash";

// The catalogue derives needed tags from each example, including dynamically created elements.
// Plain fixture URLs retain full registration for public-package integration tests.
window.mashPreviewReady = (async () => {
  const params = new URL(location.href).searchParams;
  const requested = params.has("elements")
    ? params.get("elements")!.split(",")
    : Object.keys(elementLoaders);
  await Promise.all(requested.map((tag) => elementLoaders[tag]?.()));
  if (params.has("shrine")) {
    await import("@mash/shrine");
    await import("@mash/shrine/catalogue/mash.css");
  }
  document.documentElement.dataset.stageReady = "true";
})();
window.mashPreviewReady.catch((error) => {
  document.documentElement.dataset.stageError = String(error);
});
