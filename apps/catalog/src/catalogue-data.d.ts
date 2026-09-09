declare module "virtual:mash/catalog-index" {
  export const catalogue: {
    tagName: string;
    summary: string;
    load: () => Promise<{
      default: {
        component: import("./schema.js").ComponentSchema;
        variants: (import("./examples.js").CatalogExample & { elements: string[] })[];
      };
    }>;
  }[];
}
declare module "virtual:mash/element-loaders" {
  export const elementLoaders: Record<string, () => Promise<unknown>>;
}
interface Window {
  mashPreviewReady?: Promise<void>;
}
