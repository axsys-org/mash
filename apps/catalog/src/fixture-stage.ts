/// <reference types="vite/client" />
import "@mash/ui";
import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "./fixture-stage.css";

document.documentElement.dataset.mashCatalogue = "mash";

// The fixture uses the same normal package imports shown in Usage.
try {
  if (new URL(location.href).searchParams.has("shrine")) {
    await import("@mash/shrine");
    await import("@mash/shrine/catalogue/mash.css");
  }
  document.documentElement.dataset.stageReady = "true";
} catch (error) {
  document.documentElement.dataset.stageError = String(error);
}
