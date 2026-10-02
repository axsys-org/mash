import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};
export const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const invariant = (condition, message) => {
  if (!condition) throw new Error(message);
};

// The published schema uses this deliberately small, dependency-free subset of
// JSON Schema. Unknown validation keywords fail closed instead of being ignored.
export function validateSchema(value, schema, path = "$") {
  const annotations = ["$schema", "$id", "title", "description"];
  const keywords = [
    "type",
    "const",
    "enum",
    "minimum",
    "exclusiveMinimum",
    "maximum",
    "minLength",
    "pattern",
    "properties",
    "required",
    "additionalProperties",
  ];
  for (const key of Object.keys(schema))
    invariant(
      annotations.includes(key) || keywords.includes(key),
      `unsupported schema keyword ${key}`,
    );
  if ("const" in schema)
    invariant(
      canonical(value) === canonical(schema.const),
      `${path}: expected ${canonical(schema.const)}`,
    );
  if ("enum" in schema)
    invariant(
      schema.enum.some((item) => canonical(item) === canonical(value)),
      `${path}: unsupported value`,
    );
  if ("type" in schema) {
    const valid =
      schema.type === "object"
        ? value !== null && typeof value === "object" && !Array.isArray(value)
        : schema.type === "integer"
          ? Number.isInteger(value)
          : schema.type === "number"
            ? typeof value === "number" && Number.isFinite(value)
            : typeof value === schema.type;
    invariant(valid, `${path}: expected ${schema.type}`);
  }
  if ("minimum" in schema) invariant(value >= schema.minimum, `${path}: below minimum`);
  if ("exclusiveMinimum" in schema)
    invariant(value > schema.exclusiveMinimum, `${path}: must be positive`);
  if ("maximum" in schema) invariant(value <= schema.maximum, `${path}: above maximum`);
  if ("minLength" in schema) invariant(value.length >= schema.minLength, `${path}: too short`);
  if ("pattern" in schema)
    invariant(new RegExp(schema.pattern).test(value), `${path}: invalid format`);
  if (schema.type === "object") {
    for (const key of schema.required ?? [])
      invariant(Object.hasOwn(value, key), `${path}.${key}: missing`);
    for (const [key, entry] of Object.entries(value)) {
      if (Object.hasOwn(schema.properties ?? {}, key))
        validateSchema(entry, schema.properties[key], `${path}.${key}`);
      else invariant(schema.additionalProperties !== false, `${path}.${key}: unexpected field`);
    }
  }
}

// Verify the data the server reads against the actual bundled sfnt tables.
// These pinned ASCII subsets use the Unicode BMP format-4 cmap.
export function checkFontMetrics(bytes, metrics, name, vertical) {
  const tables = new Map();
  for (let i = 0; i < bytes.readUInt16BE(4); i++) {
    const offset = 12 + i * 16;
    tables.set(bytes.toString("ascii", offset, offset + 4), bytes.readUInt32BE(offset + 8));
  }
  for (const tag of ["head", "hhea", "hmtx", "cmap"])
    invariant(tables.has(tag), `${name}: missing ${tag}`);
  invariant(
    bytes.readUInt16BE(tables.get("head") + 18) === metrics.unitsPerEm,
    `${name}: unitsPerEm mismatch`,
  );
  if (vertical) {
    const hhea = tables.get("hhea");
    invariant(vertical.unitsPerEm === metrics.unitsPerEm, `${name}: vertical units mismatch`);
    invariant(vertical.ascent === bytes.readInt16BE(hhea + 4), `${name}: ascent mismatch`);
    invariant(vertical.descent === -bytes.readInt16BE(hhea + 6), `${name}: descent mismatch`);
    invariant(vertical.lineGap === bytes.readInt16BE(hhea + 8), `${name}: line gap mismatch`);
  }
  const cmap = tables.get("cmap");
  let format4;
  for (let i = 0; i < bytes.readUInt16BE(cmap + 2); i++) {
    const record = cmap + 4 + i * 8;
    const platform = bytes.readUInt16BE(record);
    const subtable = cmap + bytes.readUInt32BE(record + 4);
    if ((platform === 0 || platform === 3) && bytes.readUInt16BE(subtable) === 4)
      format4 = subtable;
  }
  invariant(format4 !== undefined, `${name}: missing Unicode format-4 cmap`);
  const count = bytes.readUInt16BE(format4 + 6) / 2;
  const ends = format4 + 14;
  const starts = ends + count * 2 + 2;
  const deltas = starts + count * 2;
  const offsets = deltas + count * 2;
  const glyphFor = (code) => {
    for (let i = 0; i < count; i++) {
      if (code < bytes.readUInt16BE(starts + i * 2) || code > bytes.readUInt16BE(ends + i * 2))
        continue;
      const delta = bytes.readInt16BE(deltas + i * 2);
      const address = offsets + i * 2;
      const offset = bytes.readUInt16BE(address);
      if (!offset) return (code + delta) & 0xffff;
      const glyph = bytes.readUInt16BE(
        address + offset + 2 * (code - bytes.readUInt16BE(starts + i * 2)),
      );
      return glyph ? (glyph + delta) & 0xffff : 0;
    }
    return 0;
  };
  const metricCount = bytes.readUInt16BE(tables.get("hhea") + 34);
  invariant(metrics.advances.length === 95, `${name}: expected 95 ASCII advances`);
  for (let code = 32; code <= 126; code++) {
    const glyph = glyphFor(code);
    invariant(glyph !== 0, `${name}: missing ASCII glyph ${code}`);
    const advance = bytes.readUInt16BE(tables.get("hmtx") + 4 * Math.min(glyph, metricCount - 1));
    invariant(advance === metrics.advances[code - 32], `${name}: advance mismatch at ${code}`);
  }
}

function styleCSS(style, profile) {
  const face = profile.fonts[style.face];
  const border = style.insetX || style.insetY ? profile.geometry.controlBorder : 0;
  invariant(
    style.insetX >= border * 2 && style.insetY >= border * 2,
    `insets cannot contain border for ${style.face}`,
  );
  return `font-family:${JSON.stringify(face.family)};font-size:calc(${style.pixels}px * var(--goo-text-scale,1));font-weight:${face.weight};font-style:${face.style};line-height:${style.lineHeight};letter-spacing:${style.tracking}px;padding:${style.insetY / 2 - border}px ${style.insetX / 2 - border}px;border-width:${border}px;border-style:solid;`;
}

export function generateCSS(profile, paint) {
  const lines = [`/* Generated from @mash/goo-profile ${profile.id} v${profile.version}. */`];
  for (const face of Object.values(profile.fonts)) {
    const vertical = face.verticalMetrics;
    const percentage = (value) => (value / vertical.unitsPerEm) * 100;
    lines.push(
      `@font-face{font-family:${JSON.stringify(face.family)};src:url("./${face.file}") format("truetype");font-weight:${face.weight};font-style:${face.style};font-display:block;ascent-override:${percentage(vertical.ascent)}%;descent-override:${percentage(vertical.descent)}%;line-gap-override:${percentage(vertical.lineGap)}%;}`,
    );
  }
  lines.push(`.goo-surface,.goo-surface *{box-sizing:border-box;}`);
  lines.push(`.goo-surface{margin:0;padding:0;border:0;min-width:0;}`);
  lines.push(
    `.goo-surface,.goo-surface .goo-node{${styleCSS(profile.textStyles.default, profile)}font-kerning:none;font-variant-ligatures:none;font-feature-settings:"kern" 0,"liga" 0,"clig" 0;font-optical-sizing:none;font-synthesis:none;text-rendering:geometricPrecision;text-transform:none;text-indent:0;}`,
  );
  lines.push(
    `.goo-surface .goo-node{position:relative;min-width:0;flex-shrink:0;margin:0;appearance:none;}`,
  );
  lines.push(`.goo-surface .goo-group:not(.goo-text){display:flex;flex-direction:column;}`);
  lines.push(
    `.goo-surface .goo-row:not(.goo-text){display:flex;flex-shrink:0;min-width:0;margin:0;padding:0;border:0;}`,
  );
  lines.push(
    `.goo-surface .goo-text,.goo-surface .goo-code:not(.goo-text){white-space:pre-wrap;overflow-wrap:anywhere;}`,
  );
  for (const [role, style] of Object.entries(profile.textStyles.roles)) {
    lines.push(`.goo-surface .goo-text.goo-${role}{${styleCSS(style, profile)}}`);
  }
  for (const [kind, style] of Object.entries(profile.textStyles.kinds)) {
    lines.push(`.goo-surface .goo-${kind}:not(.goo-text){${styleCSS(style, profile)}}`);
  }
  for (const kind of ["avatar", "presence", "bar"]) {
    lines.push(
      `.goo-surface .goo-${kind}:not(.goo-text){height:${profile.geometry.heights[kind]}px;}`,
    );
  }
  lines.push(
    ["avatar", "presence", "media", "bar"]
      .map((kind) => `.goo-surface .goo-${kind}:not(.goo-text)`)
      .join(",") + "{white-space:nowrap;}",
  );
  const media = profile.geometry.heights.media;
  lines.push(
    `.goo-surface .goo-media:not(.goo-text){aspect-ratio:${media.aspectRatio};min-height:${media.minimum}px;}`,
  );
  lines.push(
    `.goo-surface .goo-ascii-line:not(.goo-text){display:block;white-space:pre;overflow-wrap:normal;word-break:normal;min-height:1lh;margin:0;padding:0;border:0;}`,
  );
  const status = profile.geometry.status;
  lines.push(
    `.goo-surface .goo-status-mark:not(.goo-text){display:inline-block;width:calc(${status.markerPixels}px * var(--goo-text-scale,1));height:calc(${status.markerPixels}px * var(--goo-text-scale,1));margin-inline-end:${status.gap}px;border-radius:50%;background:currentColor;vertical-align:baseline;}`,
  );
  return `${lines.join("\n")}\n${paint}`;
}

export async function artifacts(sourceRoot = join(packageRoot, "source")) {
  const profile = JSON.parse(await readFile(join(sourceRoot, "profile.json"), "utf8"));
  const schemaBytes = await readFile(join(sourceRoot, "profile.schema.json"));
  validateSchema(profile, JSON.parse(schemaBytes));
  invariant(
    !Object.hasOwn(profile, "revision"),
    "source revision must be calculated, not authored",
  );
  const metricsBytes = await readFile(join(sourceRoot, "fonts/metrics.json"));
  const metrics = JSON.parse(metricsBytes);
  const outputs = new Map([
    ["metrics.json", metricsBytes],
    ["profile.schema.json", schemaBytes],
  ]);
  for (const [id, face] of Object.entries(profile.fonts)) {
    const bytes = await readFile(join(sourceRoot, "fonts", face.file));
    invariant(Object.hasOwn(metrics, face.metricsKey), `${id}: missing metrics`);
    const info = metrics[face.metricsKey];
    invariant(info.fontSHA256 === sha256(bytes), `${id}: font hash mismatch`);
    invariant(info.weight === face.weight, `${id}: font weight mismatch`);
    checkFontMetrics(bytes, info, id, face.verticalMetrics);
    outputs.set(face.file, bytes);
    outputs.set(face.license, await readFile(join(sourceRoot, "fonts", face.license)));
  }
  invariant(
    Object.keys(metrics).length === Object.keys(profile.fonts).length,
    "unreferenced font metrics",
  );
  const paint = await readFile(join(sourceRoot, "paint.css"), "utf8");
  outputs.set("profile.css", Buffer.from(generateCSS(profile, paint)));
  const inventory = () =>
    [...outputs]
      .map(([path, bytes]) => ({ path, sha256: sha256(bytes), bytes: bytes.length }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const revision = `sha256:${sha256(canonical({ profile, files: inventory() }))}`;
  outputs.set("profile.json", Buffer.from(json({ ...profile, revision })));
  outputs.set(
    "assets.json",
    Buffer.from(
      json({
        formatVersion: 1,
        id: profile.id,
        version: profile.version,
        revision,
        files: inventory(),
      }),
    ),
  );
  return outputs;
}

export async function build(destination = join(packageRoot, "dist")) {
  const outputs = await artifacts();
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const [name, bytes] of outputs) await writeFile(join(destination, name), bytes);
  return outputs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--validate")) {
    await artifacts();
    process.stdout.write("Goo profile, schema and pinned font metrics are valid.\n");
  } else if (process.argv.includes("--check")) {
    const outputs = await artifacts();
    const actual = (await readdir(join(packageRoot, "dist"))).sort();
    invariant(
      canonical(actual) === canonical([...outputs.keys()].sort()),
      "profile artifact inventory is stale",
    );
    for (const [path, bytes] of outputs)
      invariant(bytes.equals(await readFile(join(packageRoot, "dist", path))), `${path} is stale`);
    process.stdout.write("Goo profile artifacts are current.\n");
  } else {
    const outputs = await build();
    process.stdout.write(`Built ${outputs.size} Goo profile artifacts.\n`);
  }
}
