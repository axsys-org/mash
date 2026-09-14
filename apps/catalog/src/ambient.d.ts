/** Vite resolves CSS imports at runtime; TypeScript only needs to know they are valid. */
declare module "*.css";

declare module "*.css?inline" {
  const css: string;
  export default css;
}
