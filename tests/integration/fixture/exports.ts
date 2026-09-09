/** Exercise published entry points in a fresh browser registry. */
const tags = ["ui-button", "ui-card", "shrine-confirm"];
const defined = () => tags.filter((tag) => customElements.get(tag) !== undefined);
const report = {
  definedAfterComponentImports: [] as string[],
  definedAfterPackageImports: [] as string[],
  completePackage: false,
  requiredChildrenDefined: false,
  identical: {} as Record<string, boolean>,
  constructible: {} as Record<string, boolean>,
  error: null as string | null,
};
try {
  await import("@mash/ui/tabs");
  await import("@mash/ui/menu");
  await import("@mash/ui/tree");
  report.requiredChildrenDefined = [
    "ui-tab",
    "ui-tab-panel",
    "ui-menu-item",
    "ui-menu-label",
    "ui-tree-item",
  ].every((tag) => Boolean(customElements.get(tag)));
  const button = await import("@mash/ui/button");
  const card = await import("@mash/ui/card");
  const confirm = await import("@mash/shrine/confirm");
  report.definedAfterComponentImports = defined();
  const ui = await import("@mash/ui");
  const shrine = await import("@mash/shrine");
  report.definedAfterPackageImports = defined();
  report.completePackage = [
    "ui-option",
    "ui-table-cell",
    "ui-menu-item",
    "ui-tree-item",
    "ui-progress",
    "sh-myth",
    "sh-pail",
    "sh-tree",
  ].every((tag) => Boolean(customElements.get(tag)));
  report.identical = {
    "ui-button": ui.UIButton === button.UIButton,
    "ui-card": ui.UICard === card.UICard,
    "shrine-confirm": shrine.ShrineConfirm === confirm.ShrineConfirm,
  };
  for (const tag of tags) {
    const Constructor = customElements.get(tag);
    report.constructible[tag] = Constructor ? new Constructor() instanceof HTMLElement : false;
  }
} catch (cause) {
  report.error = cause instanceof Error ? cause.message : String(cause);
}
const output = document.createElement("pre");
output.dataset.testid = "export-report";
output.textContent = JSON.stringify(report);
document.body.append(output);
