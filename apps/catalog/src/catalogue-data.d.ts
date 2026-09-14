declare module "virtual:mash/catalog-index" {
  export const catalogue: {
    tagName: string;
    summary: string;
    load: () => Promise<{
      default: {
        component: import("./schema.js").ComponentSchema;
        variants: (import("./examples.js").CatalogExample & {
          elements: string[];
          mount?: (root: HTMLElement, signal: AbortSignal) => void | Promise<void>;
        })[];
      };
    }>;
  }[];
}
declare module "virtual:mash/element-loaders" {
  export const elementLoaders: Record<string, () => Promise<unknown>>;
}
interface Window {
  mashPreviewReady?: Promise<void>;
  mashSharedPreview?: {
    reveal: (id: string) => void;
    zoom: (value: string) => void;
    dispose: () => void;
  };
}

declare module "virtual:mash/behavior-urls" {
  export const behaviorUrls: Record<string, string>;
}
