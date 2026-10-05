import type { SceneSnapshot } from "../contract.js";
import { validateScene } from "../scene.js";
/** Backend helper: safe inert JSON. Content comes exclusively from goo_html/fragment. */
export function sceneScript(scene: SceneSnapshot): string {
  return `<script type="application/json" data-patch-scene>${JSON.stringify(validateScene(scene)).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029")}</script>`;
}
const escape = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
/** A trusted HTML backend boundary, never a function accepting remote user labels as HTML.
 * Port controls must already be present in each prepared node's ordinary Goo HTML.
 */
export function emitPatch(
  scene: SceneSnapshot,
  content: {
    readonly label: string;
    readonly nodes: ReadonlyMap<string, string>;
    readonly connections: ReadonlyMap<string, string>;
    readonly controlsHTML?: string;
  },
): string {
  const s = validateScene(scene);
  const nodes = s.nodes
    .map((n) => {
      const html = content.nodes.get(n.key);
      if (html === undefined) throw new Error("missing-node-html");
      return `<goo-patch-node data-key="${escape(n.key)}">${html}</goo-patch-node>`;
    })
    .join("");
  const connections = s.connections
    .map((c) => {
      const html = content.connections.get(c.key);
      if (html === undefined) throw new Error("missing-connection-html");
      return `<goo-patch-connection data-key="${escape(c.key)}">${html}</goo-patch-connection>`;
    })
    .join("");
  return `<goo-patch role="region" aria-label="${escape(content.label)}">${sceneScript(s)}${nodes}${connections}${content.controlsHTML ?? ""}</goo-patch>`;
}
