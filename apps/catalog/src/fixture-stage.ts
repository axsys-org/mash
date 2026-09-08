/// <reference types="vite/client" />
import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "./fixture-stage.css";

// Each fixture gets a fresh registry populated only by its displayed imports.
const modules = import.meta.glob("../../../packages/components/dist/*/register.js");
const tags = new URL(location.href).searchParams.get("tags")?.split(",") ?? [];
try {
  await Promise.all(
    tags.filter(Boolean).map(async (tag) => {
      const key = `../../../packages/components/dist/${tag.replace(/^ui-/, "")}/register.js`;
      const register = modules[key];
      if (!register) throw new Error(`No registration for ${tag}`);
      await register();
      if (!customElements.get(tag)) throw new Error(`Registration did not define ${tag}`);
    }),
  );
  document.documentElement.dataset.stageReady = "true";
} catch (error) {
  document.documentElement.dataset.stageError = String(error);
}
