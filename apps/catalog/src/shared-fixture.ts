import { catalogue } from "virtual:mash/catalog-index";
import { elementLoaders } from "virtual:mash/element-loaders";
import { exampleScript } from "./example-script.js";
import { formatMarkup } from "./format-markup.js";
import "@mash/ui/catalogue/mash.css";
import "@mash/tokens/tokens.css";
import "./shared-fixture.css";

const lifecycle = new AbortController();
const examples = document.querySelector<HTMLElement>(".shared-examples")!;
const params = new URL(location.href).searchParams;
document.documentElement.dataset.theme = params.get("theme") ?? "light";
const sheets = new CSSStyleSheet();
// Read the loaded public recipe, rather than shipping a second CSS copy inside
// JavaScript. One constructed sheet is then adopted by every example root.
function recipeRules(rules: CSSRuleList): string {
  return [...rules]
    .map((rule) => {
      if (rule instanceof CSSImportRule && rule.styleSheet)
        return recipeRules(rule.styleSheet.cssRules);
      return rule instanceof CSSLayerBlockRule && rule.name === "mash.catalogue"
        ? rule.cssText
        : "";
    })
    .join("\n");
}
sheets.replaceSync(
  [...document.styleSheets].map((sheet) => recipeRules(sheet.cssRules)).join("\n") +
    `
:host { display:block; min-inline-size:0; padding:24px; }
[data-example-root] { inline-size:min(100%,44rem); margin-inline:auto; }
`,
);
const sections = new Map<string, { section: HTMLElement; mount: () => Promise<void> }>();
let pendingAnchor =
  location.hash.slice(1) ||
  params
    .get("example")
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
const placeAnchor = () => {
  const section = pendingAnchor ? sections.get(pendingAnchor)?.section : undefined;
  if (section) window.scrollTo(0, scrollY + section.getBoundingClientRect().top - 24);
};
for (const event of ["wheel", "pointerdown", "keydown", "touchstart"])
  document.addEventListener(
    event,
    () => {
      pendingAnchor = undefined;
    },
    { signal: lifecycle.signal, capture: true },
  );
const size = new ResizeObserver(placeAnchor);
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        void sections.get(entry.target.id)?.mount();
      }
  },
  { rootMargin: "400px" },
);
const dispose = () => {
  lifecycle.abort();
  observer.disconnect();
  size.disconnect();
  examples.replaceChildren();
  sections.clear();
};
window.addEventListener("pagehide", dispose, { once: true });
window.mashSharedPreview = {
  reveal(id) {
    pendingAnchor = id;
    const item = sections.get(id);
    if (item) {
      void item.mount();
      placeAnchor();
    }
  },
  zoom(value) {
    examples.style.zoom = value;
  },
  dispose,
};
window.mashPreviewReady = (async () => {
  const route = catalogue.find((entry) => entry.tagName === params.get("component"));
  if (!route || !["ui-tabs", "ui-chart"].includes(route.tagName))
    throw new Error("Unsupported shared preview");
  const { default: page } = await route.load();
  for (const variant of page.variants) {
    const section = document.createElement("section");
    section.className = "shared-section";
    section.id = variant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    section.dataset.variant = variant.name;
    const heading = document.createElement("h2");
    heading.textContent = variant.name;
    section.append(heading);
    if (variant.description) {
      const description = document.createElement("p");
      description.className = "variant-description";
      description.textContent = variant.description;
      section.append(description);
    }
    const host = document.createElement("div");
    host.className = "shared-example";
    host.style.minHeight = route.tagName === "ui-chart" ? "368px" : "180px";
    section.append(host);
    const details = document.createElement("details");
    details.className = "reference-code";
    const summary = document.createElement("summary");
    summary.textContent = "Code";
    const pre = document.createElement("pre");
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    const source = () => {
      if (!pre.textContent) {
        const script = exampleScript(variant);
        pre.textContent = `import "@mash/ui";\nimport "@mash/tokens/tokens.css";\nimport "@mash/ui/catalogue/mash.css";\n\n${formatMarkup(variant.code)}${script ? `\n\n<script type="module">\n${script}\n</script>` : ""}`;
      }
    };
    details.addEventListener(
      "toggle",
      () => {
        if (details.open) source();
      },
      { signal: lifecycle.signal },
    );
    copy.addEventListener(
      "click",
      async () => {
        source();
        try {
          await navigator.clipboard.writeText(pre.textContent!);
          copy.textContent = "Copied";
        } catch {
          copy.textContent = "Select code to copy";
        }
      },
      { signal: lifecycle.signal },
    );
    details.append(summary, copy, pre);
    section.append(details);
    examples.append(section);
    let mounted: Promise<void> | undefined;
    const mount = () =>
      (mounted ??= (async () => {
        try {
          if (variant.script && !variant.mount) throw new Error("Example needs scoped setup");
          await Promise.all(variant.elements.map((tag) => elementLoaders[tag]?.()));
          if (lifecycle.signal.aborted) return;
          const root = host.attachShadow({ mode: "open" });
          root.adoptedStyleSheets = [sheets];
          root.innerHTML = variant.code;
          const content = root.firstElementChild as HTMLElement;
          content.dataset.exampleRoot = "";
          content.inert = true;
          content.style.visibility = "hidden";
          await Promise.all(
            [...root.querySelectorAll("*")].map(
              (element) =>
                (element as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete,
            ),
          );
          if (lifecycle.signal.aborted) return;
          await variant.mount?.(content, lifecycle.signal);
          if (lifecycle.signal.aborted) return;
          content.inert = false;
          content.style.visibility = "";
          host.style.minHeight = "";
          host.dataset.exampleReady = "true";
        } catch (error) {
          host.dataset.exampleError = String(error);
          host.textContent = `Preview could not load: ${String(error)}`;
        }
      })());
    sections.set(section.id, { section, mount });
    size.observe(section);
    observer.observe(section);
  }
  const first = sections.values().next().value;
  await Promise.all([
    first?.mount(),
    pendingAnchor ? sections.get(pendingAnchor)?.mount() : undefined,
  ]);
  document.documentElement.dataset.stageReady = "true";
  placeAnchor();
})();
window.mashPreviewReady.catch((error) => {
  document.documentElement.dataset.stageError = String(error);
});
