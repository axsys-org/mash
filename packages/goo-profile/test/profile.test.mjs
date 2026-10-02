import assert from "node:assert/strict";
import { mkdtemp, cp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  artifacts,
  canonical,
  checkFontMetrics,
  generateCSS,
  packageRoot,
  sha256,
  validateSchema,
} from "../scripts/build.mjs";

const source = join(packageRoot, "source");
const profile = JSON.parse(await readFile(join(source, "profile.json"), "utf8"));
const schema = JSON.parse(await readFile(join(source, "profile.schema.json"), "utf8"));

async function withSource(action) {
  const temporary = await mkdtemp(join(tmpdir(), "mash-goo-profile-"));
  try {
    await cp(source, temporary, { recursive: true });
    await action(temporary);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

test("distribution can independently verify every byte and its profile revision", async () => {
  const outputs = await artifacts();
  const manifest = JSON.parse(outputs.get("assets.json"));
  const emitted = JSON.parse(outputs.get("profile.json"));
  assert.equal(manifest.files.length, outputs.size - 1);
  assert.deepEqual(
    manifest.files.map((item) => item.path),
    manifest.files.map((item) => item.path).sort(),
  );
  for (const { path, bytes, sha256: hash } of manifest.files) {
    assert.equal(outputs.get(path).length, bytes, path);
    assert.equal(sha256(outputs.get(path)), hash, path);
    assert.ok(!path.includes("/"), "deployment assets must be flat");
  }
  const { revision, ...authored } = emitted;
  const files = manifest.files.filter((item) => item.path !== "profile.json");
  assert.equal(revision, `sha256:${sha256(canonical({ profile: authored, files }))}`);
  assert.equal(manifest.revision, revision);
  assert.deepEqual(authored, profile);
  validateSchema(emitted, schema);
});

test("repeated generation is deterministic and exposes no network font fallback", async () => {
  const first = await artifacts();
  const second = await artifacts();
  assert.deepEqual(first, second);
  const css = first.get("profile.css").toString();
  assert.doesNotMatch(css, /local\(|https?:|@import/);
  for (const face of Object.values(profile.fonts)) {
    assert.ok(css.includes(`url("./${face.file}")`));
    assert.ok(first.has(face.file));
    assert.ok(first.has(face.license));
  }
  assert.match(css, /font-kerning:none/);
  assert.match(css, /font-synthesis:none/);
  assert.match(css, /ascent-override:96.875%;descent-override:24.12109375%;line-gap-override:0%/);
});

test("measurement inputs and CSS change together under a new revision", async () => {
  const original = await artifacts();
  await withSource(async (directory) => {
    const changed = structuredClone(profile);
    changed.textStyles.roles.title.pixels = 24;
    changed.textStyles.kinds.input.insetX = 30;
    await writeFile(join(directory, "profile.json"), JSON.stringify(changed));
    const next = await artifacts(directory);
    assert.notEqual(
      JSON.parse(original.get("profile.json")).revision,
      JSON.parse(next.get("profile.json")).revision,
    );
    assert.equal(JSON.parse(next.get("profile.json")).textStyles.roles.title.pixels, 24);
    assert.match(
      next.get("profile.css").toString(),
      /\.goo-text\.goo-title\{[^}]*font-size:calc\(24px/,
    );
    assert.match(
      next.get("profile.css").toString(),
      /\.goo-input:not\(\.goo-text\)\{[^}]*padding:9px 14px/,
    );
  });
});

test("paint changes are part of the immutable revision", async () => {
  const original = await artifacts();
  await withSource(async (directory) => {
    const path = join(directory, "paint.css");
    await writeFile(path, `${await readFile(path, "utf8")}\n/* changed paint */\n`);
    const next = await artifacts(directory);
    assert.notEqual(
      JSON.parse(original.get("profile.json")).revision,
      JSON.parse(next.get("profile.json")).revision,
    );
  });
});

test("schema rejects missing styles, unknown ownership and misspelled measurements", () => {
  const missing = structuredClone(profile);
  delete missing.textStyles.roles.title;
  assert.throws(() => validateSchema(missing, schema), /title: missing/);
  const wrongOwner = structuredClone(profile);
  wrongOwner.measurement.authority = "browser";
  assert.throws(() => validateSchema(wrongOwner, schema), /authority: expected/);
  const typo = structuredClone(profile);
  typo.textStyles.roles.title.lineheight = 1.2;
  assert.throws(() => validateSchema(typo, schema), /lineheight: unexpected field/);
  const wrongFace = structuredClone(profile);
  wrongFace.textStyles.roles.title.face = "system";
  assert.throws(() => validateSchema(wrongFace, schema), /face: unsupported/);
  const badGeometry = structuredClone(profile);
  badGeometry.geometry.heights.media.aspectRatio = 0;
  assert.throws(() => validateSchema(badGeometry, schema), /aspectRatio: must be positive/);
  assert.throws(
    () => validateSchema({}, { unknownValidation: true }),
    /unsupported schema keyword/,
  );
});

test("corrupt fonts and mismatched font metrics cannot be distributed", async () => {
  await withSource(async (directory) => {
    const path = join(directory, "fonts", profile.fonts.sans400.file);
    const bytes = await readFile(path);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(path, bytes);
    await assert.rejects(artifacts(directory), /font hash mismatch/);
  });
  const metrics = JSON.parse(await readFile(join(source, "fonts/metrics.json"), "utf8"));
  const font = await readFile(join(source, "fonts", profile.fonts.sans400.file));
  metrics.Sans400.advances[33]++;
  assert.throws(() => checkFontMetrics(font, metrics.Sans400, "Sans400"), /advance mismatch at 65/);
  const cleanMetrics = JSON.parse(await readFile(join(source, "fonts/metrics.json"), "utf8"));
  assert.throws(
    () =>
      checkFontMetrics(font, cleanMetrics.Sans400, "Sans400", {
        ...profile.fonts.sans400.verticalMetrics,
        ascent: 1000,
      }),
    /ascent mismatch/,
  );
});

test("CSS follows fixed inset and scale conventions without replanning server lines", () => {
  const css = generateCSS(profile, "");
  assert.match(
    css,
    /\.goo-button:not\(\.goo-text\)\{[^}]*line-height:1.4;[^}]*padding:8px 12px;border-width:1px/,
  );
  assert.match(css, /\.goo-text\.goo-badge\{[^}]*padding:3px 6px;border-width:1px/);
  assert.match(css, /\.goo-text\.goo-title\{[^}]*letter-spacing:-0.65px/);
  assert.match(
    css,
    /\.goo-ascii-line:not\(\.goo-text\)\{[^}]*white-space:pre;overflow-wrap:normal;word-break:normal/,
  );
  assert.match(css, /margin-inline-end:5px/);
  for (const kind of ["avatar", "presence", "media", "bar"]) {
    assert.match(
      css,
      new RegExp(`\\.goo-${kind}:not\\(\\.goo-text\\)[^}]*\\{white-space:nowrap;\\}`),
    );
  }
  assert.doesNotMatch(css, /(?:^|\n)(?:body|button|input|\*)\s*\{/);
});
