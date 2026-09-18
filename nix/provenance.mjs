import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";

// Run before generating dist/ or installing any generated source artifacts.
// Match the downstream source digest without relying on .git in a Nix source.
async function files(directory = ".") {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === "node_modules" || entry.name === ".git") return [];
      const path = directory === "." ? entry.name : `${directory}/${entry.name}`;
      return entry.isDirectory() ? files(path) : [path];
    }),
  );
  return paths.flat();
}

const hash = createHash("sha256");
for (const path of (await files()).sort()) {
  if (
    path === "pnpm-lock.yaml" ||
    path === "pnpm-workspace.yaml" ||
    path.endsWith("package.json") ||
    /^(packages\/|apps\/catalog\/src\/mash.iife|apps\/catalog\/vite)/.test(path)
  ) {
    hash.update(path + "\0");
    hash.update(await readFile(path));
  }
}
const revision = JSON.parse(process.argv[2]);
const { packageManager } = JSON.parse(await readFile("package.json", "utf8"));
await writeFile(
  "mash-nix.json",
  JSON.stringify(
    {
      version: 1,
      repository: "https://github.com/axsys-org/mash.git",
      revision,
      dirty: revision === null,
      sourceSha256: hash.digest("hex"),
      packageManager,
    },
    null,
    2,
  ) + "\n",
);
