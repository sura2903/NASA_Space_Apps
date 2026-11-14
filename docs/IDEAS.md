# Ideas backlog

Ideas to iterate on later. Newest first. Each idea has a status, a rough approach and what
it depends on, so either lane can pick it up.

Status keys: 💡 idea · 🔄 in progress · ✅ done · ⏸ parked

| # | Idea | From | Status |
|---|---|---|---|
| I4 | Click anywhere on the map → top 3 crops for that spot | Nimalan | 💡 |
| I3 | Crop suitability heatmap: pick a crop, see where in Tamil Nadu it fits best | Nimalan | 💡 |
| I2 | English / Tamil button that switches the whole site (not both side by side) | Nimalan | 🔄 |
| I1 | Live "click anywhere" site (stretch goal in CLAUDE.md) | plan | 💡 |

## I4. Click a region → top 3 crops

**What:** the farmer clicks a place on the map (not just the 3 demo sites) and sees the 3
crops (or short rotations) that fit that spot best, each with the same why / evidence /
risks as the strategy cards.

**Rough approach:**
- Needs climate for the clicked point. Two options:
  1. *Precomputed grid (recommended for the hackathon):* Lane A runs the pipeline for a grid of
     points over Tamil Nadu (e.g. 0.5° POWER cells, ~60 points; IMERG at 0.1° could be sampled at
     the same points) and writes `web/data/grid/<id>.json` in the same site format plus a
     `web/data/grid/index.json`. Clicking snaps to the nearest grid point.
  2. *Live fetch:* call the NASA POWER API from the browser for the clicked lat/lon and build the
     site object client-side. POWER allows CORS, but the year-by-year replay needs 24 years of
     daily data (slow, ~10 MB), and IMERG and SoilGrids would also be needed. Too heavy for now.
- Ranking: score each crop as a 1-crop rotation (or each crop's best single-season slot) with
  `scoreRotation`, using the farmer's current priorities and water source, and keep the top 3.
  Better as an engine export, e.g. `rankCrops(site, crops, prefs, n = 3)`, so the UI stays
  free of scoring logic.

**Depends on:** Lane A grid data (option 1) and a `rankCrops` export. Lane B: map click
handler, nearest-point snap, a "top 3 crops here" panel reusing the card components.

## I3. Crop suitability heatmap

**What:** choose a crop (e.g. black gram) and the map colours Tamil Nadu by how well that
crop would have done there: share of the 2001–2024 seasons it came through, or its score.
Doubles as "where should this crop be planted?".

**Rough approach:**
- Reuses the I4 grid: for every grid point × crop, precompute a score (or replay pass rate)
  in the pipeline and write `web/data/grid/suitability.json`
  (`{ crop_id: { point_id: { score, good_years, total_years } } }`). Precomputing avoids
  running the engine ~60 × 16 times in the browser.
- UI: a crop dropdown over the map, Leaflet rectangles or circles per grid cell coloured with
  a single-hue sequential scale (light = poor, dark = good), a legend, and a hover tooltip
  with the numbers. Clicking a cell opens I4 for that point.
- Honest-limits note on the map: regional climate grid, not field-level; water source assumed.

**Depends on:** Lane A grid pipeline + precomputed suitability. Possibly FAO GAEZ as a
cross-check (listed in APPROACH.md Tier 3).

## I2. English / Tamil language button

**What:** one button switches the whole site between English and Tamil, instead of showing
both side by side.

**Status:** 🔄 Lane B is building it. Everything the UI writes (labels, buttons, headings,
summary line, glossary, crop and month names, charts, print sheet) switches. Sentences the
scoring engine writes (why / evidence / benefits / risks / gaps, site highlights) are still
English.

**Next step for full Tamil:** Lane A adds a language option to the engine text, e.g.
`prefs.lang = "ta"`, or returns message keys + values that the UI fills from a Tamil
template table. The Tamil wording should be checked by a native speaker (the Tirunelveli
family) before the demo.

## I1. Live "click anywhere" site

Stretch goal from CLAUDE.md. Folded into I4 above.
