import { GooPatch } from "./patch.js";
import { GooPatchNode, GooPatchPort, GooPatchConnection } from "./render.js";
if (!customElements.get("goo-patch")) customElements.define("goo-patch", GooPatch);
if (!customElements.get("goo-patch-node")) customElements.define("goo-patch-node", GooPatchNode);
if (!customElements.get("goo-patch-port")) customElements.define("goo-patch-port", GooPatchPort);
if (!customElements.get("goo-patch-connection"))
  customElements.define("goo-patch-connection", GooPatchConnection);
export { GooPatch, GooPatchNode, GooPatchPort, GooPatchConnection };
export * from "./contract.js";
export type { PatchAdapter, ProjectionFrame, PreparedDOM, CapturedActivation } from "./adapter.js";
declare global {
  interface HTMLElementTagNameMap {
    "goo-patch": GooPatch;
    "goo-patch-node": GooPatchNode;
    "goo-patch-port": GooPatchPort;
    "goo-patch-connection": GooPatchConnection;
  }
}
