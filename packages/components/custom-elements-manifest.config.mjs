import { mashManifestConfig } from "../../scripts/cem-plugins.mjs";

/**
 * Every component package emits its manifest through the same shared config,
 * so the schemas stay identical in shape. See scripts/cem-plugins.mjs.
 */
export default mashManifestConfig({ tagPrefix: "ui" });
