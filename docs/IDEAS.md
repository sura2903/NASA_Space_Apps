# Ideas backlog

Ideas to iterate on later. Newest first. Each idea has a status, a rough approach and what
it depends on, so either lane can pick it up.

Status keys: 💡 idea · 🔄 in progress · ✅ done · ⏸ parked

| # | Idea | From | Status |
|---|---|---|---|
| I15 | Policy brief export: one-page PDF per district | Sid | 💡 |
| I14 | Equity lens: tank-fed and smallholder-heavy blocks first | Sid | 💡 |
| I13 | Policy scenario levers: canal shortfall, tank rehabilitation, borewell caps | Sid | 💡 |
| I12 | Crop-insurance (PMFBY) risk view: failure frequency per crop × district | Sid | 💡 |
| I11 | Climate hotspots: Layer 1 trends + Layer 3 projections on the grid | Sid | 💡 (A14 grid / A16) |
| I10 | Groundwater stress flag: CGWB over-exploited blocks + GRACE trend | Sid | 💡 |
| I9 | **Backtest against real yields:** do our "bad years" match low-yield years? | Sid | ✅ lift 1.36 overall, r=0.70 by year; no skill for irrigated rice (`web/data/backtest.json`, RESEARCH_LOG I-14) |
| I8 | Programme targeting: Millet Mission, rice-fallow pulses, diversification schemes | Sid | 💡 |
| I7 | Water-saving scenarios: "shift X% of rice in district Y to millets → MCM saved" | Sid | 💡 |
| I6 | **Mismatch map:** what is grown today vs what the climate supports, per district | Sid | 💡 **high priority** |
| I5 | Reframe the UI for a policy maker: district view, statewide ranking, uncertainty first | Sid | 💡 **high priority** |
| I4 | Click anywhere on the map → top 3 crops for that spot | Nimalan | ✅ live on Sid's 47-point grid (`web/explore.html`), uses engine `rankCrops` |
| I3 | Crop suitability heatmap: pick a crop, see where in Tamil Nadu it fits best | Nimalan | ✅ live on Sid's 47-point grid (`web/explore.html`), uses engine `cropSuitability` |
| I2 | English / Tamil button that switches the whole site (not both side by side) | Nimalan | ✅ UI done; engine sentences still English |
| I1 | Live "click anywhere" site (stretch goal in CLAUDE.md) | plan | 💡 |

## Brainstorm (Sid, 2026-11-14): making Field Shift useful for a **Tamil Nadu policy maker**

The audience is now an agriculture-department decision maker, not one farmer. They ask *where*, *how
much* and *what if* across districts. These are the directions, roughly by value per hour.

**High priority (strongest demo + most decision-relevant)**
- **I5 Policy framing.** Open on a statewide view, not one farm.
  - District as the unit: aggregate the 47 grid points to the 38 districts, area-weighted.
  - Rank districts and crops; uncertainty and data caveats up front.
  - The farm-level rotation page becomes the "drill-down".
- **I6 Mismatch map.** Overlay what is *actually grown* (district crop area from the TN Dept of Economics &
  Statistics *Season and Crop Report*, or the ICRISAT district-level database) on what our replay says is
  climate-robust. Example: "District X puts N% of its area in rain-fed rice, which came through 2 of 24
  seasons here". This is the clearest policy story.
- **I9 Backtest.** Compare our replay's failure years with real district yield anomalies (DES / ICRISAT
  yield series). If our bad years (2016, 2012, 2003…) line up with low yields, the tool is validated.
  If not, we learn where the model is wrong. Huge credibility gain for judges and officials.

**Medium**
- **I7 Water budget.** Convert rotations to irrigation demand (mm × hectares → million cubic metres) per
  district; slider "shift X% of area from crop A to B" → water saved. Needs I6's area data.
- **I8 Programme targeting.** Where are the state's millet / pulse / diversification schemes most
  climate-robust? Example: rice-fallow black gram in the delta. Rank districts by suitability × current area gap.
- **I10 Groundwater flag.** Mark CGWB "over-exploited" blocks and the GRACE storage trend; never recommend
  borewell-dependent options there.
- **I11 Climate hotspots.** Run Layer 1 trends on all 47 grid points (where are nights warming fastest,
  where is the monsoon becoming less reliable). Then Layer 3 projections → "where does today's
  suitability fall by 2050?".
- **I12 Insurance risk.** Failure frequency per crop × district from the replay = an independent view of
  PMFBY crop-insurance risk.

**Later / nice to have**
- **I13 Scenario levers for policy.** Canal release shortfall (e.g. Mettur/Cauvery), tank rehabilitation
  (raises the tank budget), borewell caps; show the effect on maps.
- **I14 Equity lens.** Highlight tank-fed, rain-fed and smallholder-heavy blocks; these are hit hardest by monsoon failure.
- **I15 District brief.** One-page printable PDF per district: top robust crops, risky current crops,
  trends, caveats. (Extends the existing print sheet.)

**Model-quality work these depend on (Lane A)**
- ✅ Suitability now discriminates. A diagnostic found the old score put cowpea #1 at 46/47 points;
  the new blend gives 5–9 distinct #1 crops and family-diverse top 3s (RESEARCH_LOG I-13).
- Water source should vary by place: use district irrigation-source shares (canal / tank / well /
  rain-fed, from DES) instead of one source for the whole state. Today "canal" makes rice look the same everywhere.
- Cowpea still leads ~20/47 points: revisit its traits (market "low" but high fodder / nitrogen) with
  an agronomist; consider a "cash crops only" toggle for policy views.

---

## Crop map page (I3 + I4): what exists now, and the data it is waiting for

`web/explore.html` ("🗺 Crop map" in the header) is live in Lane B:
- Pick a crop → each place is coloured by the share of 2001–2024 seasons that crop came through
  (or by fit score), one green hue, fixed 0–100% scale, with a table of places.
- Click anywhere → snaps to the nearest place with data (says how far away) and shows the top 3
  crops there, from 3 different crop families, plus a list of all crops.
- Each crop is scored by `scoreRotation(site, crops, [[{crop, sow}]], prefs)` at each of its
  sowing months; the best month is kept. ~20 ms per place, so ~60 grid points is ~1–2 s in the
  browser. No precomputed suitability file is needed.
- It now runs on Lane A's 47-point 0.5° grid (`web/data/grid/`), falling back to the 3 demo sites if
  the grid is missing. Scoring goes through the engine's `cropSuitability` and `rankCrops`.
- "Try a comparison" buttons: Rice on rain only (best place 7/24 seasons) vs Rice with canal water
  (24/24 near Tenkasi / Tirunelveli).
- Known: two coastal cells are partly sea (Sid's note).

**Proposed grid format for Lane A (Sid), no change to the site format:**
```
web/data/grid/index.json
{ "cell_deg": 0.5,                       // optional; when present cells are drawn as squares
  "points": [ { "id": "g_08.75_77.75", "lat": 8.75, "lon": 77.75, "name": "Near Tirunelveli" }, ... ] }

web/data/grid/<id>.json                  // exactly the same shape as web/data/sites/<id>.json
                                         // (monthly, by_year, soil, precip_source ...)
```
Suggested coverage: 0.5° cells over Tamil Nadu land (~60 points), POWER + IMERG + SoilGrids at
each centre, same `build_all.py` path. `name` should be a nearby town so farmers recognise it.
If 60 files are too heavy, `by_year` is the only large part and the page needs it for the replay.

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
