import manifest from "../../custom-elements.json" with { type: "json" };
import { describe, expect, it } from "vitest";

import { shrineComponentBlockIntegration } from "./component-policy.js";

interface ManifestDeclaration {
  customElement?: boolean;
  tagName?: string;
}

describe("Shrine component block integration policy", () => {
  it("classifies every shipped Shrine component exactly once", () => {
    const tags = manifest.modules
      .flatMap((module) => (module.declarations ?? []) as ManifestDeclaration[])
      .filter((declaration) => declaration.customElement && declaration.tagName)
      .map((declaration) => declaration.tagName!)
      .sort();

    expect(Object.keys(shrineComponentBlockIntegration).sort()).toEqual(tags);
  });

  it("keeps confirmation in overlay policy and record fields in authored structure", () => {
    expect(shrineComponentBlockIntegration["shrine-confirm"]).toBe("overlay");
    expect(shrineComponentBlockIntegration["sh-myth"]).toBe("container");
    expect(shrineComponentBlockIntegration["sh-pail"]).toBe("content");
    expect(shrineComponentBlockIntegration["sh-slot"]).toBe("inline");
  });
});
