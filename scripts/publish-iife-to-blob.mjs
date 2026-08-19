import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { put } from "@vercel/blob";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "apps/catalog/dist");
const BUNDLE = path.join(DIST, "mash.js");
const MANIFEST = path.join(DIST, "mash-blob.json");

const env = process.env;

if (env.VERCEL !== "1") {
  console.log("Blob publish skipped: this is not a Vercel deployment.");
  process.exit(0);
}

const environment = env.VERCEL_TARGET_ENV ?? env.VERCEL_ENV;

if (!environment || environment === "development") {
  console.log("Blob publish skipped: only deployed environments publish browser bundles.");
  process.exit(0);
}

if (!(env.BLOB_READ_WRITE_TOKEN || (env.VERCEL_OIDC_TOKEN && env.BLOB_STORE_ID))) {
  throw new Error(
    "Vercel Blob is not connected to this project. Connect a public Blob store with OIDC " +
      "so VERCEL_OIDC_TOKEN and BLOB_STORE_ID are available to production and preview builds.",
  );
}

const deploymentId = env.VERCEL_DEPLOYMENT_ID ?? env.VERCEL_GIT_COMMIT_SHA ?? env.VERCEL_URL;

if (!deploymentId) {
  throw new Error(
    "Cannot publish mash.js without VERCEL_DEPLOYMENT_ID, VERCEL_GIT_COMMIT_SHA, or VERCEL_URL.",
  );
}

function slug(value) {
  const readable = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 8);
  return `${readable || "deployment"}-${hash}`;
}

const environmentSlug = slug(environment);
const deploymentSlug = slug(deploymentId);
const branch = env.VERCEL_GIT_COMMIT_REF ?? null;

const immutablePath = `mash/deployments/${environmentSlug}/${deploymentSlug}/mash.js`;

const body = await readFile(BUNDLE);
const common = {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "text/javascript; charset=utf-8",
};

// Deployment-specific URLs cannot race with another preview, and a Vercel
// rollback continues to point at the artifact built by that exact deployment.
const immutable = await put(immutablePath, body, {
  ...common,
  cacheControlMaxAge: 31_536_000,
});

const manifest = {
  schemaVersion: 1,
  format: "iife",
  environment,
  branch,
  commit: env.VERCEL_GIT_COMMIT_SHA ?? null,
  deploymentId,
  blob: {
    pathname: immutable.pathname,
    url: immutable.url,
  },
  scriptTag: `<script defer src="${immutable.url}"></script>`,
};

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Published immutable IIFE: ${immutable.url}`);
