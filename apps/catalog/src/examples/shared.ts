import type { CatalogExample } from "../examples.js";

export const sample = (name: string, code: string, description?: string): CatalogExample => ({
  name,
  code: `<div data-mash-catalogue="mash" class="mash-stack">\n${code.trim()}\n</div>`,
  description,
  portable: true,
});
