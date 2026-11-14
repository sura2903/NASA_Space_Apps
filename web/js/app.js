// Lane B entry point. Confirms the data files load; replace with the real UI.
import { scoreRotation } from "./scoring.js";

const sites = await (await fetch("data/sites/index.json")).json();
const crops = await (await fetch("data/crops.json")).json();
const site = await (await fetch(`data/sites/${sites[0].id}.json`)).json();

const demo = scoreRotation(site, crops, ["corn", "soybean"], {
  water: 3, income: 3, soil_structure: 3, nitrogen: 3, erosion: 3, forage: 0,
});

document.getElementById("out").textContent = JSON.stringify(
  { sites: sites.map((s) => s.name), crops: crops.length, frost: site.frost, demo },
  null, 2,
);
