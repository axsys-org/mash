import { readFile } from "node:fs/promises";
import path from "node:path";

/** Read one public CSS entrypoint and its local imports, once per file. */
export async function catalogueFiles(file, seen = new Set()) {
  if (seen.has(file)) return [];
  seen.add(file);
  const source = await readFile(file, "utf8");
  const files = [{ file, source }];
  for (const match of source.matchAll(/@import\s+"(\.\/[^"]+\.css)";/g)) {
    files.push(...(await catalogueFiles(path.resolve(path.dirname(file), match[1]), seen)));
  }
  return files;
}
