# Ideas backlog

Ideas to iterate on later. Newest first. Each idea has a status, a rough approach and what
it depends on, so either lane can pick it up.

Status keys: 💡 idea · 🔄 in progress · ✅ done · ⏸ parked

| # | Idea | From | Status |
|---|---|---|---|
| I33 | E-commerce: links from a plan to order its seed, fertiliser and materials (trusted, labelled sellers; advice stays independent) | Subramanian | 💡 future work |
| I32 | Improved and GM varieties per crop (short-duration, drought/pest-tolerant; only Bt cotton is widely approved GM in India) | Subramanian | 💡 future work |
| I31 | Water and fertiliser per crop: irrigation amount and timing by growth stage; fertiliser doses from soil tests (TNAU STCR) and product composition (urea 46% N, DAP 18-46-0, MOP 60% K₂O) | Subramanian | 💡 future work |
| I30 | Soil type detection from data: SoilGrids + SMAP drying rate after rain + Landsat/Sentinel-2 bare-soil colour + Soil Health Card results | Subramanian | 💡 future work |
| I29 | Pest and disease resistance: weather-driven pest/disease risk per crop + resistant varieties | Subramanian | 💡 **medium** (NASA humidity/temperature already in POWER) |
| I28 | Storage and perishability: how long each crop keeps after harvest, as a farmer factor (sell when prices are good vs forced quick sale) | Subramanian | 💡 **medium-high** (crop field + priority; pairs with E3 prices) |
| I27 | Least-resource land suitability: water productivity ("crop per drop") + soil/terrain constraints per place | Subramanian | 💡 **high** (mostly existing data) |
| I26 | Import-dependence lens: pulses and oilseeds as "national priority" crops; later, climate analogues abroad | Subramanian | 💡 **medium** (priority flag is quick) |
| I25 | Hill-region fruits (strawberry, avocado; kiwi, raspberry) for Nilgiris / Kodaikanal | Subramanian | ⏸ later: needs elevation-corrected temperature + a perennial-crop model |
| I24 | More millets and grains: the five small millets from the TN crop guide | Subramanian | ✅ added (21 crops); kodo's unsourced deep roots fixed in RESEARCH_LOG I-28, no crop dominates now |
| I23 | Policy: "what if X% of farms switch" → water saved per place (overlaps I7) | Nimalan | 🔄 Lane B, Policy view page |
| I22 | Policy: early drought warning from SMAP soil moisture / NDVI anomalies, ahead of insurance and relief decisions | Nimalan | 💡 needs near-real-time SMAP + NDVI |
| I21 | Policy: crop-to-water mismatch (rice grown on rain only) → case for millet / pulse switching subsidies (overlaps I6) | Nimalan | 💡 needs district crop areas |
| I20 | Policy: vulnerability map: GRACE groundwater decline + rain trend + heat-day trend → one score per place (overlaps I10, I11) | Nimalan | 🔄 Lane B, Policy view page; GRACE placeholder |
| I19 | Farmers: water budget: rain + tank / canal supply vs rotation need → expected borewell pumping | Nimalan | 💡 |
| I18 | Farmers: flood / cyclone exposure from heavy-rain days + SRTM low-lying land (Dec 2023 floods as the example) | Nimalan | 💡 needs SRTM elevation |
| I17 | Farmers: dry-spell risk by sowing month: chance of a 10+ day dry spell after sowing → nudge to short-duration varieties | Nimalan | 🔄 Lane B, main page |
| I16 | Farmers: sowing window alert: "sow now or wait" from NE-monsoon onset history + SMAP soil moisture | Nimalan | 🔄 Lane B, main page |
| I15 | Policy brief export: one-page PDF per district | Subramanian | 💡 |
| I14 | Equity lens: tank-fed and smallholder-heavy blocks first | Subramanian | 💡 |
| I13 | Policy scenario levers: canal shortfall, tank rehabilitation, borewell caps | Subramanian | 💡 |
| I12 | Crop-insurance (PMFBY) risk view: failure frequency per crop × district | Subramanian | 💡 |
| I11 | Climate hotspots: Layer 1 trends + Layer 3 projections on the grid | Subramanian | 💡 (A14 grid / A16) |
| I10 | Groundwater stress flag: CGWB over-exploited blocks + GRACE trend | Subramanian | 💡 |
| I9 | **Backtest against real yields:** do our "bad years" match low-yield years? | Subramanian | ✅ lift 1.36 overall, r=0.70 by year; no skill for irrigated rice (`web/data/backtest.json`, RESEARCH_LOG I-14) |
| I8 | Programme targeting: Millet Mission, rice-fallow pulses, diversification schemes | Subramanian | 💡 |
| I7 | Water-saving scenarios: "shift X% of rice in district Y to millets → MCM saved" | Subramanian | 💡 |
| I6 | **Mismatch map:** what is grown today vs what the climate supports, per district | Subramanian | 💡 **high priority** |
| I5 | Reframe the UI for a policy maker: district view, statewide ranking, uncertainty first | Subramanian | 💡 **high priority** |
| I4 | Click anywhere on the map → top 3 crops for that spot | Nimalan | ✅ live on Subramanian's 47-point grid (`web/explore.html`), uses engine `rankCrops` |
| I3 | Crop suitability heatmap: pick a crop, see where in Tamil Nadu it fits best | Nimalan | ✅ live on Subramanian's 47-point grid (`web/explore.html`), uses engine `cropSuitability` |
| I2 | English / Tamil button that switches the whole site (not both side by side) | Nimalan | ✅ UI done; engine sentences still English |
| I1 | Live "click anywhere" site (stretch goal in CLAUDE.md) | plan | 💡 |

## Nimalan's picks (2026-11-15): 4 farmer + 4 policy features

Picked to build now: **I16, I17** (farmers) and **I20, I23** (policy makers). The other four are logged for later.

**I16 Sowing window "sow now or wait"** (main page). For the farmer's first crop, test every allowed sowing
month against the 24 real seasons with `scoreRotation` and compare the month they plan to sow with the best
one. Says "sow now" if the planned month comes through about as often as the best month, otherwise "wait for
{month}". Needs from Lane A for the full version: NE-monsoon onset date per year (daily rain), and a recent
SMAP soil-moisture reading. Until then it uses the replay plus the usual soil wetness for that month.

**I17 Dry-spell risk** (main page). The chance of a 10+ day dry spell in the first weeks after sowing, by
sowing month, from the real years. Today only the NE-monsoon season has it (`trends/<id>.json`
`ne_dry_spell` series, 1981–2024). Needs from Lane A: longest dry spell per month per year in `by_year` (see
PROGRESS.md request).

**I20 Vulnerability map** (new `policy.html`). One score per grid point = the average of within-state ranks
for rain trend (falling = worse), very-hot-day trend (rising = worse) and GRACE groundwater trend (falling =
worse). Rain and heat come from each grid file's `trends` today; GRACE is a placeholder until Lane A adds
it. Places where IMERG and POWER disagree on the rain trend direction are marked. District boundaries
would let us show districts instead of 0.5° squares.

**I23 What-if water saving** (`policy.html`). Pick a place, a current crop and a switch-to crop (default: the
top-ranked crop there), the water source and the % of farms that switch. Water saved = irrigation difference
(mm, from the engine) × 10 m³/ha per mm × farm area × share. Farm area is typed in until Lane A adds district
crop areas (DES Season and Crop Report), the same data I6 / I21 need.

**Later:** I18 flood / cyclone exposure (heavy-rain days + SRTM low-lying land), I19 farm water budget
(expected borewell pumping), I21 crop-to-water mismatch (needs district crop areas), I22 early drought
warning (needs near-real-time SMAP / NDVI anomalies).

---

## Subramanian's future plans (2026-11-15, evening): soil, water, fertiliser, varieties, ordering

**I30 Soil type detection from data.**
- **Today:** one SoilGrids texture per place (250 m, sampled at the cell centre).
- **Idea:** estimate the soil at the farmer's field by combining several signals:
  - SoilGrids texture;
  - how fast NASA SMAP soil moisture falls after rain (sandy soils dry within days, clay holds water longer);
  - bare-soil colour in Landsat / Sentinel-2 images in the fallow months, which the NDVI work already finds;
  - the farmer's Soil Health Card results (pH, EC, N, P, K) where they have one.
- **Use:** feed the soil type into crop fit and the soil water the replay starts with.

**I31 Water and fertiliser per crop.**
- **Water:** the engine already computes each crop's seasonal irrigation need in mm. Turn it into a schedule: how
  much to apply, at which growth stages (sowing, flowering, grain fill), adjusted for soil water holding and rain so
  far. Warn against waterlogging.
- **Fertiliser:** recommended N-P-K doses per crop from TNAU's soil-test crop-response (STCR) guidance. Show the
  chemical composition of common products: urea 46% N; DAP 18% N and 46% P₂O₅; MOP 60% K₂O; and complexes such as
  17-17-17. Convert a dose into bags, and suggest organic options (green manure such as daincha, already in the
  crop list; compost).

**I32 Improved and GM varieties.**
- For each crop, list varieties suited to the place and season (short-duration, drought-tolerant, pest-resistant)
  from TNAU and the Tamil Nadu crop guides.
- **GM:** be precise about what is legal. In India, Bt cotton is the only GM crop widely approved for commercial
  cultivation, so other GM suggestions would be research notes, not advice.

**I33 E-commerce: order what a plan needs.**
- From a chosen plan, link to buying its seed, fertiliser and other materials.
- **Where:** prefer government and cooperative outlets, and trusted sellers.
- **Neutrality rules:** label every link; keep recommendations independent of sellers (no paid ranking); never
  collect payment in the app.

## Subramanian's ideas (2026-11-15): millets, hill fruits, import dependence, least resources

**I29 Pest and disease resistance (medium; Subramanian, 2026-11-15).**
Today the engine only rewards rotating crop families (the `pest` sub-score breaks pest cycles). It does not know
which seasons favour a crop's main pests and diseases, or which varieties resist them.
- **Weather-driven risk:** count "pest-favourable" days in each crop's season from NASA POWER daily humidity,
  temperature, rain and leaf wetness proxies. Examples to source from TNAU / TN CPG pest pages:
  - rice blast and sheath blight: humid, warm spells with heavy dew;
  - rice leaf folder and brown planthopper: humid, cloudy weeks;
  - pod borer in pulses: cloudy, humid flowering;
  - fall armyworm in maize.
- **Engine:** a per-crop `pests` list `{name, favoured_by: {rh_min, tmin..tmax, rain_days}, months}`. The replay then
  reports "pest-favourable in X of 24 seasons", as a risk note (not pass/fail) until it can be validated.
- **Resistant varieties:** the CPGs list resistant varieties per crop (e.g. blast-resistant rice). Show them as
  "ask for these varieties" when the risk is high.
- **Validate:** against district pest-outbreak reports, if available (TN Agriculture Department / NCIPM), before
  scoring.
- **Depends on:** a sourced pest table; POWER RH2M / T2M are already fetchable.

**I28 Storage and perishability (medium-high; Subramanian, 2026-11-15).**
Some crops keep for a year or more after harvest; others must be sold within days. That changes a farmer's risk:
a storable crop can wait out a price slump or be eaten by the family in a bad year; a perishable one forces a
quick sale at whatever the market pays.
- **Crop field:** `storage` = { `keeps_months` (typical on-farm storage with basic care), `level`
  (high / medium / low), `main_risk` (e.g. pulse beetles, aflatoxin, ripening), `source` }. Rough starting
  points to be sourced from TNAU / ICAR post-harvest guides:
  - **Very storable:** millets (small millets keep for years with little loss), sorghum.
  - **Months:** rice (paddy 6–12), pulses (6–12, bruchid beetles), groundnut in shell (6–9, aflatoxin if damp),
    sesame (6–12), maize (3–6 in humid TN, aflatoxin), cotton lint (stores well, quality falls).
  - **Days:** banana (ripens in about a week).
  - **Must be processed at once:** sugarcane (crush within 1–2 days; depends on the mill), cowpea grown as fodder.
- **Engine:** a new priority "Can store and sell later" (sub-score from `storage.level`) next to Income and
  Reliability. A farmer who has no storage or needs cash right after harvest can turn it down.
- **With prices (E3):** storable crops can use the price rise after harvest season; perishable crops carry the
  full harvest-time price swing. That makes income risk = yield risk × price risk × "can you wait?".
- **Policy view:** storage capacity (godowns, cold chain) is a lever for the state. Flag places pushed toward
  perishable crops without nearby storage.
- **Depends on:** a sourced post-harvest table (TNAU agritech post-harvest pages have an expired certificate,
  so use ICAR / FAO / CPG PDFs).

**I24 More millets and grains (high priority, quick).**
- **Why:** millets are getting more popular, the state runs a Millet Mission, and 2023 was the International Year
  of Millets. They're drought-hardy, low-input and nutritious.
- **Today:** pearl millet, finger millet and sorghum are modelled.
- **Add:** the five **small millets**, using seasons, durations and water needs from the TN Crop Production Guide
  chapter `02_Small_Millets.pdf` (same source as the other crops):
  - kodo (varagu), little (samai), foxtail (thinai), barnyard (kuthiraivali), proso (panivaragu).
- **Engine:** no changes needed. They flow into the heatmap, top-3 and mismatch "switch to" suggestions.
- **Check after adding:** do they diversify the top picks, or just replace cowpea everywhere? (Discrimination rule.)

**I25 Hill-region fruits (later).**
- **Where:** strawberry and avocado are already grown around Kodaikanal and the Nilgiris. Raspberry is possible
  at altitude. Kiwi needs winter chilling and is probably marginal in Tamil Nadu (it grows in the NE Indian hills
  and Himachal); we should say so honestly.
- **Blockers:**
  1. Our 0.5° grid averages hills with plains. Hill temperatures need an elevation correction (SRTM elevation,
     ~6.5 °C cooler per km), and SRTM is in the pending AppEEARS request.
  2. Fruits are multi-year perennials with chilling and frost needs, a different model from seasonal crops.
- **Recommendation:** park until SRTM arrives, then a small "hill crops" add-on for the Nilgiris / Dindigul hills.

**I26 Import-dependence lens (medium).**
- **Why:** India imports a large share of its pulses and edible oils.
- **Quick version:** tag pulses (black gram, green gram, cowpea; later red gram, Bengal gram) and oilseeds
  (groundnut, sesame, sunflower) as "national priority / import-substituting". Add an optional priority slider
  "Reduce import dependence" so the policy view can rank districts where these crops are climate-robust.
- **Bigger version (later):** climate analogues. Find dryland regions abroad with similar rain and heat (e.g.
  parts of Australia, Israel, East Africa) and check which crops they rely on that we don't model yet.

**I27 Least-resource land suitability (high, mostly existing data).**
- **Water productivity:** income or yield per mm of water. A crop that gets through most seasons on rain alone
  ranks above one needing irrigation.
- **Soil constraints from SoilGrids:** pH, texture and organic carbon. Flag crops that dislike heavy clay or
  acidic/alkaline soils.
- **Terrain:** SRTM slope when available.
- **Output:** a per-place "least-resource crop set" view and a "land suitability by crop type" map layer
  (cereals / pulses / oilseeds / millets), feeding the policy view.

---

## Brainstorm (Subramanian, 2026-11-14): making Field Shift useful for a **Tamil Nadu policy maker**

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
- Known: two coastal cells are partly sea (Subramanian's note).

**Proposed grid format for Lane A (Subramanian), no change to the site format:**
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
