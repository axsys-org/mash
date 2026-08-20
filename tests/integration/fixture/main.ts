/**
 * Fixture bootstrap.
 *
 * Imports the workspace packages exactly as an application would, so the
 * integration suite exercises the real published entry points rather than a
 * test-only build of the components.
 */

import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "@mash/ui/register";

// Integration exercises the public opt-in Mash presentation as well as the
// behaviour contracts. Definition modules remain fully usable without this.
document.documentElement.dataset.mashCatalogue = "mash";

// --- Form composition -------------------------------------------------------

const form = document.querySelector<HTMLFormElement>("#signup");
const status = document.querySelector<HTMLElement>('[data-testid="form-status"]');

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = new FormData(form).get("email");
  if (status) status.textContent = `submitted:${String(email ?? "")}`;
});

form?.addEventListener("reset", () => {
  if (status) status.textContent = "reset";
});

// --- Keyboard log -----------------------------------------------------------

const log = document.querySelector<HTMLElement>('[data-testid="kb-log"]');

for (const id of ["kb-first", "kb-disabled", "kb-last"]) {
  document.querySelector(`[data-testid="${id}"]`)?.addEventListener("click", () => {
    if (log) log.textContent = `${log.textContent ?? ""}${id};`;
  });
}
