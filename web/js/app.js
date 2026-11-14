// Lane B entry point. Placeholder that proves data + engine load; replace with the real UI.
// See docs/TASKS.md (B1-B9) and web/dev/engine-test.html for full engine output.
import { generateStrategies, siteHighlights, DEFAULT_CURRENT } from "./scoring.js";

const sites = await (await fetch("data/sites/index.json")).json();
const crops = await (await fetch("data/crops.json")).json();
const site = await (await fetch(`data/sites/${sites[0].id}.json`)).json();
const def = DEFAULT_CURRENT[site.id];

const prefs = {
  weights: { water: 3, income: 3, soil_structure: 3, nitrogen: 3, erosion: 3, forage: 1, reliability: 4 },
  water_source: def.water_source,
  scenario: { dT_c: 0, dPrecip_pct: 0 },
};
const strategies = generateStrategies(site, crops, def.rotation, prefs);

document.getElementById("out").textContent = JSON.stringify(
  {
    site: site.name,
    highlights: siteHighlights(site, prefs),
    strategies: strategies.map((s) => ({ tag: s.tag, label: s.label, total: s.total, replay: `${s.replay.good_years}/${s.replay.total_years}` })),
  },
  null, 2,
);
