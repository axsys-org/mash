import { parseNotebook, seedNotebook, type Notebook } from "./documents-model.js";
export const notebookStorageKey = "mash-documents-notebook-v1";
export function readNotebook(): Notebook {
  const stored = localStorage.getItem(notebookStorageKey);
  return stored ? parseNotebook(stored) : seedNotebook();
}
