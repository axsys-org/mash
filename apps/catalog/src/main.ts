import "@mash/tokens/tokens.css";
import "@mash/ui/catalogue/mash.css";
import "@mash/ui";
import "./showcase.css";
import { showCatalogue } from "./showcase.js";
const root = document.querySelector<HTMLElement>("#app")!;
document.documentElement.dataset.mashCatalogue = "mash";
showCatalogue(root);
