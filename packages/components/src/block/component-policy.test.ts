import manifest from "../../custom-elements.json" with { type: "json" };
import { describe, expect, it } from "vitest";

import { componentBlockIntegration } from "./component-policy.js";

interface ManifestDeclaration {
  customElement?: boolean;
  tagName?: string;
}

describe("component block integration policy", () => {
  it("classifies every shipped component exactly once", () => {
    const tags = manifest.modules
      .flatMap((module) => (module.declarations ?? []) as ManifestDeclaration[])
      .filter((declaration) => declaration.customElement && declaration.tagName)
      .map((declaration) => declaration.tagName!)
      .sort();
    const classified = Object.keys(componentBlockIntegration).sort();

    expect(classified).toEqual(tags);
  });

  it("keeps overlay and structural elements out of direct document insertion", () => {
    expect(componentBlockIntegration["ui-dialog"]).toBe("overlay");
    expect(componentBlockIntegration["ui-menu-item"]).toBe("structural");
    expect(componentBlockIntegration["ui-gesture-binding"]).toBe("behavior");
    expect(componentBlockIntegration["ui-image"]).toBe("content");
  });
});
