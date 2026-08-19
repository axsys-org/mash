/** Vite resolves CSS imports at runtime; TypeScript only needs to know they are valid. */
declare module "*.css";

declare module "*.css?inline" {
  const css: string;
  export default css;
}

/**
 * Deployment metadata, substituted at build time by Vite's `define`.
 *
 * Declared here rather than imported so that the constant folding is total:
 * a production build inlines the object literal and the branches that depend
 * on it collapse. See vite.config.ts and src/build-info.ts.
 */
declare const __BUILD_INFO__: import("./build-info.js").BuildInfo;
