import { resolve } from "node:path";
import { build } from "esbuild";
import type { Plugin } from "vite";
import type { ComponentSchema } from "./src/schema.js";
import type { CatalogExample } from "./src/examples.js";

type Page = { component: ComponentSchema; variants: (CatalogExample & { elements: string[] })[] };
const indexId = "virtual:mash/catalog-index";
const behaviorId = "virtual:mash/behavior-urls";
const loadersId = "virtual:mash/element-loaders";
const pagePrefix = "virtual:mash/page/";

/** Generate route-sized documentation from the same authoritative example registry used by audits. */
export function catalogData(): Plugin {
  let command: "serve" | "build" = "build";
  let snapshot: Promise<Page[]> | undefined;
  const sourceRoot = resolve(import.meta.dirname, "src");
  const read = () =>
    (snapshot ??= (async () => {
      const result = await build({
        stdin: {
          contents: `import { components } from "./schema.ts"; import { examplesFor } from "./examples.ts";
export const pages = components.map(component => ({ component, variants: examplesFor(component) }));`,
          resolveDir: sourceRoot,
          sourcefile: "catalogue-data.ts",
          loader: "ts",
        },
        bundle: true,
        platform: "node",
        format: "cjs",
        write: false,
        logLevel: "silent",
      });
      const module = { exports: {} as { pages: Page[] } };
      new Function("module", "exports", result.outputFiles[0]!.text)(module, module.exports);
      const pages = module.exports.pages;
      const known = new Set(pages.map((page) => page.component.tagName));
      for (const page of pages)
        for (const variant of page.variants) {
          variant.elements = [
            ...new Set(
              `${variant.code}\n${variant.script ?? ""}`.match(/(?:ui|sh)-[a-z][a-z0-9-]+/g) ?? [],
            ),
          ].filter((tag) => known.has(tag));
        }
      return pages;
    })());
  return {
    name: "mash:catalogue-data",
    configResolved(config) {
      command = config.command;
    },
    resolveId(id) {
      if (id === indexId || id === behaviorId || id === loadersId || id.startsWith(pagePrefix))
        return `\0${id}`;
      return null;
    },
    async load(id) {
      if (!id.startsWith("\0virtual:mash/")) return;
      const pages = await read();
      if (id === `\0${indexId}`) {
        const visible = pages.filter(
          ({ component }) =>
            component.packageName === "@mash/ui" || component.tagName === "sh-tree",
        );
        return `export const catalogue = [${visible.map(({ component }) => `{tagName:${JSON.stringify(component.tagName)},summary:${JSON.stringify(component.summary ?? "")},load:()=>import(${JSON.stringify(pagePrefix + component.tagName)})}`).join(",")}];`;
      }
      if (id === `\0${loadersId}`) {
        return `export const elementLoaders = {${pages
          .map(({ component }) => {
            const path = component.registerPath
              ?.replace(/^dist\//, "")
              .replace(/\/register\.js$/, "");
            if (!path) throw new Error(`No public registration module for ${component.tagName}`);
            return `${JSON.stringify(component.tagName)}:()=>import(${JSON.stringify(`${component.packageName}/${path}`)})`;
          })
          .join(",")}};`;
      }
      if (id === `\0${behaviorId}`) {
        const specifiers = new Set(
          pages.flatMap((page) =>
            page.variants.flatMap((variant) =>
              [...(variant.script ?? "").matchAll(/import\(["'](@mash\/ui\/[^"']+)["']\)/g)].map(
                (match) => match[1]!,
              ),
            ),
          ),
        );
        const entries: string[] = [];
        for (const specifier of specifiers) {
          const resolved = await this.resolve(specifier);
          if (!resolved) throw new Error(`Cannot resolve example behavior ${specifier}`);
          const url =
            command === "serve"
              ? JSON.stringify(`/@fs/${resolved.id}`)
              : `import.meta.ROLLUP_FILE_URL_${this.emitFile({ type: "chunk", id: resolved.id, preserveSignature: "strict" })}`;
          entries.push(`${JSON.stringify(specifier)}:${url}`);
        }
        return `export const behaviorUrls = {${entries.join(",")}};`;
      }
      const selectedPage = pages.find((page) => id === `\0${pagePrefix}${page.component.tagName}`);
      if (selectedPage) {
        const variants = selectedPage.variants.map((variant) => {
          const json = JSON.stringify(variant);
          return variant.scoped && variant.script
            ? `${json.slice(0, -1)},mount:async(root,signal)=>{${variant.script}\n}}`
            : json;
        });
        return `export default {component:${JSON.stringify(selectedPage.component)},variants:[${variants.join(",")}]};`;
      }
      return null;
    },
    configureServer(server) {
      server.watcher.add([
        resolve(sourceRoot, "examples"),
        resolve(sourceRoot, "examples.ts"),
        resolve(sourceRoot, "schema.ts"),
        resolve(sourceRoot, "../../../packages/components/custom-elements.json"),
        resolve(sourceRoot, "../../../packages/shrine-components/custom-elements.json"),
      ]);
    },
    handleHotUpdate(context) {
      if (
        !context.file.includes("/examples/") &&
        !context.file.endsWith("/examples.ts") &&
        !context.file.endsWith("/custom-elements.json") &&
        !context.file.endsWith("/schema.ts")
      )
        return;
      snapshot = undefined;
      for (const module of context.server.moduleGraph.idToModuleMap.values()) {
        if (module.id?.startsWith("\0virtual:mash/"))
          context.server.moduleGraph.invalidateModule(module);
      }
      context.server.ws.send({ type: "full-reload" });
      return [];
    },
  };
}
