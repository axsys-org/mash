import { ShrineSlot } from "./slot.js";

if (!customElements.get("sh-slot")) {
  customElements.define("sh-slot", ShrineSlot);
}

declare global {
  interface HTMLElementTagNameMap {
    "sh-slot": ShrineSlot;
  }
}

export { ShrineSlot };

export * from "./slot.js";
