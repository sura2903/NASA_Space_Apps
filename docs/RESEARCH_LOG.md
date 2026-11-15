# Research direction log

How our thinking has moved: each pivot, why we made it, and what it cost or bought us.
`PROGRESS.md` records *what got built*; this file records *why the direction changed*.
Newest iteration at the bottom. Add an entry whenever we pivot. Use the template at the end.

---

## Current direction (one paragraph, keep updated)
**Field Shift**: a climate-robust cropping decision tool for **Tamil Nadu agricultural policy makers**
(I-13), with a farm-level drill-down. It answers: *"given monsoon uncertainty, water shortage and a
warming climate, which crops and rotations hold up where in the state, and where is today's cropping
pattern risky?"*
- **Core idea:** replay crops and rotations through **every real year 2001–2024** of NASA data (GPM IMERG
  rain, NASA POWER heat/ET, SoilGrids soil) on a **47-point statewide grid** plus three demo sites, with
  Tirunelveli (team member's family village) as the hero story.
- **Climate change:** Layer 1 trends (1981–2024) and a Layer 2 consistency check against IPCC / MoES / IMD
  are done for the demo sites. Next: NASA NEX-GDDP-CMIP6 projections, so the replay also covers
  *future-like* years (I-11).

---

## Iteration log

### I-1 · Pick the challenge: "Dancing with the SARs" vs "Field Shift (farms)"
- **Options:** NISAR radar change-detection app vs crop-rotation decision tool.
- **First call:** SARs. It's narrower, more visual, fits an aerospace background, and has fewer teams.
- **Pivot:** the team chose **Farms**, so we went with it.
- **Why it worked out:** NASA POWER needs no login, so we had real data within the hour. The farms
  challenge also rewards the evidence, uncertainty and farmer-centred design that we could differentiate on.
- **Cost:** a broad, fuzzy scope. We had to defend the scope hard (see the rules in CLAUDE.md).

### I-2 · First scaffold: US demo sites, frost-based seasons
- Started with Iowa, Fresno and Garden City because US-only resources (SSURGO, CropScape, PRISM) are rich.
- Model was frost-based: summer and winter crops placed by frost-free days.
- **Kept:** pipeline structure, data contract idea, two-lane split. The US sites remain as backup data.

### I-3 · Find the differentiator (read the challenge again)
- Most teams will build "NASA dashboard + chatbot". We chose five ideas instead:
  **historical replay → resilience score**, **Field Calendar**, **climate-shift slider**, **priority
  sliders with plain-language "why"**, and an **agriculture-officer printout**. Details are in APPROACH.md.
- This is the spine of the project; later pivots changed the region and data, not these ideas.

### I-4 · Region pivot: Western Europe vs **Tamil Nadu**
- **Options:** Western Europe (wildfire + water shortage) or Tamil Nadu (monsoon uncertainty + water shortage).
- **Decision: Tamil Nadu.** Reasons:
  - Personal tie: the challenge text itself cites multigenerational farming.
  - Monsoon uncertainty maps perfectly onto the replay idea.
  - A real decision exists: water-hungry rice/sugarcane vs millets/pulses.
  - Wildfire links only weakly to rotation choices.
- **Consequences:**
  - Rewrote the engine from frost-based to **sowing-season (pattam) based**.
  - Rebuilt the crop table with Tamil names and MSP.
  - Moved heat threshold to 38 °C; added heavy-rain days (IMD ≥64.5 mm).
- **Lost:** the US-only datasets (SSURGO, CropScape, NASS…). **Gained:** a story and global NASA missions as the core.

### I-5 · Data access reality check (challenge Resources tab)
- About half the listed resources are US-only, so we tiered our data:
  - Tier 1: no-login (POWER, SoilGrids).
  - Tier 2: one Earthdata login → AppEEARS (MODIS NDVI, SMAP, SRTM).
  - Tier 3: stretch (IMERG, GRACE, GAEZ).
- AppEEARS point request submitted early because its queue is slow (at 27% at last check).
- MODIS NDVI via ORNL (3×3 km) is flaky and mixes trees and fields: no bare months show. We wait for per-pixel AppEEARS.

### I-6 · Hero-site framing
- Family background from multiple-choice answers: paddy, banana, pulses/millets/cotton, coconut; canal water;
  no specific hardship story. Audience: farmer-first with an expert toggle.
- Default "current rotation" for Tirunelveli: **Kar rice + Pishanam rice on canal water**.
- Coconut is left out of the rotation model (permanent tree crop).

### I-7 · Rainfall source pivot: NASA POWER → **GPM IMERG**
- **Trigger:** POWER gave Tirunelveli ~1300 mm/yr and a −283 mm/decade trend. Both looked wrong.
- **Check:** pulled IMERG Final daily (0.1°) via the GES DISC Giovanni time-series API.
  The old Data Rods service is retired, and AppEEARS has no IMERG.
- **Finding:** Tirunelveli is 948 mm/yr. POWER's ~50 km cell picks up Western Ghats Jun–Sep rain, and the
  trend was an artefact. Madurai and Thanjavur agree well. Both datasets agree 2016 was the driest monsoon.
- **Decision:** IMERG for rain; POWER stays for temperature and ET0.
- **Bonus:** the disagreement became a demo feature, the "two NASA datasets, side by side" box.
- **Caveat:** IMERG smooths extremes too (Dec 2023 shows 124 mm/day vs much higher station totals).

### I-8 · Engine honesty fixes from teammate testing
- "Small step" and "Bigger shift" were near-duplicates (differed only by green manure). They are now defined by
  the number of new main crops (≤1 vs ≥2).
- Nimalan spotted "a drier climate makes the bigger shift *more* reliable". Root cause: event-count scaling
  pushed 2 heavy-rain days to 1.94, under the limit. Fixed with rounding, and extremes now scale ~7%/°C with only
  half of any mean-rain change.
- **Lesson:** sanity-check every scenario direction. Drier or hotter should never quietly *help*.

### I-9 · Crop values → official sources
- Replaced approximate crop traits with the **TN Agriculture Dept Crop Production Guide** (seasons, durations by
  district) and **TNAU course notes** (water needs). Each crop now cites its source.
- TNAU's Agritech portal has an expired TLS certificate, so it wasn't used; the CPG chapter PDFs cover the same content.
- Effect: wider, realistic sowing windows. Tirunelveli Small step now gets through 24/24 years.
  Search got slower; caching fixed it.

### I-10 · Breadth: three demo sites → statewide grid (from Nimalan's ideas)
- **Trigger:** Nimalan's `IDEAS.md`: a crop suitability heatmap (I3), click anywhere for the top 3 crops (I4),
  and a Tamil/English toggle (I2).
- **Decision:** build a **47-point 0.5° Tamil Nadu grid** (POWER + SoilGrids, IMERG rain via a browser
  download) plus engine `rankCrops` / `cropSuitability`. The heatmap is computed live in the browser, so it
  re-colours when the water source changes.
- **Trade-off:** this moves away from "depth on Tirunelveli". Accepted because the heatmap is the strongest
  map visual and answers the challenge's interactive-map ask. Tirunelveli stays the hero story.

### I-11 · (planned) From the past to the future: climate change and projections
- **Trigger:** team wants more than a 24-year replay. Is the climate changing here, does that match climate
  change, and what does it mean for future rotations?
- **Plan (details in APPROACH.md "Next direction"):**
  1. **Detect change:** POWER 1981–2024 with Mann–Kendall/Sen trends and then-vs-now shifts.
  2. **Consistency check** against IPCC AR6 / IMD / CMIP6 historical ("consistent with", never "caused by").
  3. **Project:** NASA NEX-GDDP-CMIP6 change factors (multi-model, SSP2-4.5/5-8.5) applied to observed years
     → "future-like years" → the same replay engine, reported as model ranges.
- **Why this shape:** it reuses the replay spine, stays explainable, and uses a NASA projection product. We
  avoid fitting ML to 24–44 points per site.
- **Risks:** NEX-GDDP access and size; short records make trends noisy, so we must report significance honestly.

---

### I-10b · (Lane B view of I-10) From 3 demo sites toward a Tamil Nadu crop map
- **Trigger:** Nimalan's ideas: "pick a crop, see where to plant it" (heatmap) and "click a region, get the top 3 crops".
- **Options considered:** A) wait for a statewide grid; B) precompute suitability in the pipeline; C) build the page now on the 3 sites, scoring in the browser with `scoreRotation`, and swap in a grid file later.
- **Decision:** C. Scoring one crop at one place takes ~20 ms, so a ~60-point grid needs no precompute, and the page is useful today.
- **Consequences:** new `web/explore.html` (Lane B). Lane A is asked for `web/data/grid/index.json` + per-point files in the existing site format (see `docs/IDEAS.md`). The UI also gained an English / Tamil switch.
- **Lost / gained:** with 3 points the "heatmap" is 3 coloured dots, which is honest but thin until the grid lands. Gained: the "click anywhere" stretch goal and a second demo story ("where should black gram go?").
- *Update:* the 47-point grid landed (eb912cd/6b4210f) and PR #4 is merged, so the heatmap is live with real cells.

### I-12 · Climate-change Layer 1 results: heat is real, rain is murky
- **Done** without AppEEARS: NASA POWER 1981–2024, 12 indicators per demo site; Mann–Kendall + Sen's slope,
  then-vs-now (1981–2000 vs 2001–2024), Pettitt change points; rain cross-checked with GPM IMERG 2001–2024.
- **Robust signal: nights are warming.**
  - Tirunelveli: warm nights 35 → 56 per year (+12/decade, p<0.01) and daytime highs +0.3 °C/decade.
  - Madurai: warm nights +5/decade (p≈0.05).
  - This is consistent with the warming expected for South India (Layer 2 will check it properly).
- **Rain trends are not trustworthy yet.**
  - Tirunelveli POWER shows SW-monsoon rain down 44% and heavy-rain days halving, but satellite IMERG disagrees on
    direction since 2001 (now flagged "uncertain").
  - 10 of 12 indicators there shift around 2007–2009 at once, a classic sign of a reanalysis input change, not climate.
  - Thanjavur shows a similar cluster around 2004.
- **Surprises to explain, not hide:** Thanjavur has *fewer* very hot days and a wetter root zone. Plausibly
  irrigation/land-use effects in the delta, or the same data artefact. Needs a check before any claim.
- **Lesson:** a 44-year record from one reanalysis isn't enough on its own for rain. Every rain claim needs a
  second dataset.
- **Next:** Layer 2 (compare with IPCC AR6 / IMD), Layer 1 for the grid, then Layer 3 projections.

### I-13 · Audience pivot to policy makers + Layer 2 + "does the model discriminate?"
- **Audience:** the team reframed the user as a **Tamil Nadu agricultural policy maker** rather than a single
  farmer. Questions become *where / how much / what if* across districts. The brainstorm is in IDEAS.md
  (I5–I15); top three: policy framing (I5), a mismatch map of actual vs climate-suited crops (I6), and a
  backtest against real yields (I9).
- **Layer 2 done** (`pipeline/climate_consistency.py`). Each trend is labelled against published
  expectations (IPCC AR6 Asia, MoES 2020, IMD NE-monsoon monograph):
  - Tirunelveli: warming nights and highs are **consistent with climate change**, but their shift lines up
    with the 2008 reanalysis cluster, so they're flagged.
  - Fewer heavy-rain days: opposite to expectations, so marked **probable data artefact**.
  - Thanjavur: fewer hot days and lower ET0 are **opposite to expectations** → check local causes
    (delta irrigation, humidity) before any claim.
- **Discrimination check (new standing rule: always run diagnostics on new results):**
  - On the 47-point grid the old ranking put **cowpea #1 at 46/47 rain-fed points**, and the "fit score"
    varied only ~2 points across the state. Cause: crop-trait sub-scores (identical everywhere) swamped the
    site-dependent ones.
  - Tested 5 formulas. Chose suitability = 50% reliability + 30% priority fit + 20% advantage over the
    statewide median, with family-diverse top 3s.
  - Result: 5–9 distinct #1 crops (was 3–4), 13–19 distinct top-3 sets (was 3–6), map spread sd up to ~12–16 points.
  - Rejected pure "advantage over state": most diverse, but it ranked rain-fed rice #1 where it fails 70%+ of years.
- **Known remaining weakness:** one water source for the whole state ("canal" makes rice uniform). Needs
  district irrigation-source shares.

### I-14 · Backtest against real yields: the replay has skill (except irrigated rice)
- **Data:** Govt of India DES Crop Statistics (district APY), via the India Data Portal open CKAN API:
  Tamil Nadu, 38 districts, 1997–2022.
- **Method:**
  - 212 district × crop series (28 districts, 10 crops, ≥15 years, ≥500 ha).
  - Yields Theil–Sen detrended; bad year = bottom 25%.
  - The engine replays each crop at the district HQ's nearest grid point: best sowing month, rice tank-irrigated,
    others rain-fed.
- **Result:**
  - Overall, when the model predicts failure, a bad-yield year follows **33%** of the time vs **24%**
    otherwise (**lift 1.36, p<0.001**).
  - Across years, the predicted and actual bad shares correlate at **r = 0.70** (p = 0.0003).
  - **2016**: the model fails 85% of series; 70% really had bad yields.
- **By crop:**
  - Skill: black gram 1.95×, sorghum 1.92×, maize 1.61×, cotton 1.57×, groundnut 1.42× (all significant).
  - **No skill: tank-irrigated rice (1.05×) and green gram (0.91×).**
- **Why rice fails:** irrigated rice yield depends on reservoir/canal releases (and fertiliser/management),
  which our monsoon-scaled tank budget doesn't capture. Next: reservoir storage or canal-release data, and
  irrigation-source shares per district.
- **Misses to study:** 2003–04 bad yields under-predicted (lagged effect of the failed 2002 monsoon on storage?);
  2018 over-predicted.
- **Why it matters:** it turns "trust us" into "it would have warned about 2016". This is our strongest
  credibility point for judges and policy makers.

### I-15 · Mismatch map: where today's crops depend on water the climate doesn't reliably give
- **Data:**
  - Real district crop areas (DES APY, avg 2018–22, 37 districts, 4.5 Mha of modelled crops).
  - The engine's rain-fed reliability and irrigation need per crop at each district's grid point.
  - Output `web/data/districts.json`, in Lane B's requested format.
- **Mismatch index** = % of modelled area in crops that fail most years on rain alone. It ranges 13–99 across
  districts (sd 26); area-weighted rain-fed reliability is 0.02–0.72.
- **Story it tells:**
  - The tank-fed southern rice districts top the list: **Ramanathapuram (86), Sivaganga (94),
    Pudukkottai (83)**, where rice is ~80–90% of modelled area.
  - The delta follows (Thanjavur 83, Thiruvarur 75), but it has canal water.
  - Dryland sorghum/millet districts in the west are lowest (Coimbatore 19, Dindigul 18).
  - Switching 25% of the water-dependent area to each district's best rain-fed crop saves ~15–320 MCM per district.
- **Honest limits:**
  - Irrigation shares are unknown, so high mismatch = "depends on irrigation", not "failing".
  - Rice isn't split by season.
  - 8 districts are low-confidence (tiny modelled area, e.g. Nilgiris; or the nearest grid point is >30 km
    away, e.g. Kanniyakumari's sits in the drier rain shadow).
- **Sanity:** spread is large and the ranking matches agronomic intuition. Best rain-fed alternatives span 6
  different crops.
- **Next:** DES Season & Crop Report irrigation sources per district; average several grid points per district.

### I-16 · Sowing advice data: dry spells after sowing + monsoon onset (Lane B requests 1–2)
- Computed from **IMERG daily** (not POWER) at all 50 points (3 sites + 47 grid) in the browser.
- **Dry spells:** chance of a 10+ day dry spell (<2.5 mm) in the 30 days after sowing on the 1st.
  - Jan–Mar sowing: ~100%. Oct–Nov sowing: lowest (21–38% at the demo sites).
  - October risk ranges 4–54% across the grid: useful spread.
- **Onset, sanity-checked against IMD:**
  - First version (searching from 1 Oct) put 34% of onsets on 1–3 Oct, picking up late-SW/transition rain.
  - Split into `ne_onset` (from 10 Oct): medians 11–23 Oct (demo sites 16–17 Oct), close to IMD's normal ~20 Oct.
  - And `sowing_rain_onset` (from 15 Sep): first reliable sowing rains, 21 Sep–14 Oct, which matters for
    Purattasi-pattam sowing.
  - 2016: no qualifying onset at 30/50 points, consistent with the failed monsoon.
- **Caveat:** onset still clusters at the search start (40% in the first 3 days). It is an agro-meteorological
  rule, not IMD's official declaration (winds + coastal stations).

### I-17 · Rice skill fixed: farmers respond by not planting, and the delta drinks Karnataka's rain
- **Diagnosis:** rice yield doesn't respond to water shortage (rank correlation with local NE rain −0.02);
  **planted area does (+0.49, 17/29 districts)**. In 2016 rice area fell 36%, production 66%, yield only 20%.
  Farmers leave fields fallow rather than plant into a shortage.
- **Backtest now scores yield, area and production.** Rice: yield 1.05× → **area 2.11×, production 2.22×** (p<0.001).
  - Rice is now among the strongest crops.
  - By system: tank-fed south production **13.5×**; Thamirabarani area **11×** (hero site); other districts ~1.8×.
- **Cauvery delta was the exception** (1.2×). Its canal water comes from Mettur, filled by the Western Ghats
  monsoon in Karnataka.
  - Delta rice production vs local NE rain: −0.01. Vs upper-Cauvery catchment JJAS rain (IMERG): **+0.32**.
  - With Mettur carry-over (0.6 this year + 0.4 last year): **+0.36**. Area follows last year's catchment rain (+0.26).
- **Engine change:** sites/grid points in the Cauvery command carry `canal_index` (upstream catchment, with
  carry-over), and `scoring.js` scales the canal budget by (index − 0.5)/0.5. One stated assumption: about half
  of normal flow is used upstream before the delta.
  - Thanjavur's Kuruvai + Thaladi rotation now fails for water in **2001, 2002, 2003, 2016**, the known Cauvery crisis years.
- **What didn't work (kept for honesty):**
  - Treating Thamirabarani rice as canal-fed made the model never fail (0/44), so it stays tank-fed.
  - In the backtest's single long-rice replay, the delta still fails only in 2002. The upstream signal is right
    but a single-season replay is too coarse. **Next:** model Kuruvai (short, Jun–Sep, fully Mettur-dependent)
    separately in the backtest.
- **New issue spotted:** Kuruvai "heat" failures in 8 delta years (POWER shows many Jun–Aug days >38 °C). The heat
  rule is probably too strict for flooded irrigated rice; revisit with canopy/water-temperature reasoning.

### I-18 · Kuruvai: the upstream index is validated, but Kuruvai runs on groundwater
- **No seasonal backtest possible:** DES splits delta rice by season (Autumn = Kuruvai) only from 2017–18 (6 years).
- **Instead, validated against official Mettur records** (TN Agri Dept tables VII.8 / VII.10, 2001–2020,
  `pipeline/data/mettur_releases.json`, `pipeline/kuruvai_check.py`). This year's upper-Cauvery IMERG rain
  predicts:
  - storage at opening: **+0.64** (p=0.002);
  - season release: **+0.51** (p=0.02);
  - opening delay: −0.43 (p=0.06).
  - So the canal_index from I-17 is backed by independent official data. Policy use: by end-September the
    catchment rain already signals the Samba-season water supply.
- **Negative result (kept):**
  - Mettur opened after mid-July in **15/20 years**, and what's known in June (last year's index) can't
    predict it: leave-one-out 60% vs 75% for always guessing "late".
  - So no opening-date rule was added. It would make the model worse.
  - Conclusion: delta Kuruvai depends mostly on **groundwater (pumpsets)**, not Mettur. Its real risks are
    groundwater depletion (GRACE, I-10/I20) and heat.
- **Heat fix:**
  - Before: irrigated Kuruvai "failed" from heat in 8/24 years, although it's grown every year.
  - Flooded, fully watered rice canopies are cooler than air, so the heat-day limit is doubled for flood-tolerant
    crops whose water need is met.
  - Now Kuruvai fails only in 2002/2009. Thanjavur's Kuruvai+Thaladi comes through 19/24 (was 12), with failures in
    2001–03 and 2016 (water) and 2009 (heat).
  - Backtest unchanged (rice area 2.11×, production 2.22×; overall 1.36×; year r=0.71), so no skill was lost.

### I-19 · First farmer interview (user research), logged before deciding anything
- Full notes and a needs-to-features map are in **`docs/FIELD_NOTES.md` (FN-1)**.
- **Headlines:**
  - Farmers want crop **timing** (which month).
  - They care as much about **what to avoid** in a drought or flood year (e.g. skip rice in a drought
    year; black gram or sesame instead) as about what to plant.
  - They think in **El Niño**, wind, and rare **1-in-100-year** events, but **remember only ~10 years**.
  - **Crop economics and prices** drive daily life, from household to state food reserves.
- **Team question (Siddarth):** can floods and droughts be **predicted in advance reliably**?
  Working answer: days ahead yes (weather forecasts); a season ahead only as **odds** (ENSO/IOD + soil
  moisture); exact dates of rare extremes no.
- **Candidate work (E1–E7 in FIELD_NOTES, not started):**
  - ENSO/IOD-conditioned odds;
  - "avoid this season" lists;
  - price history and income risk;
  - extreme-event return periods;
  - wind/cyclone exposure;
  - a "last 10 years vs full record" memory view;
  - a food-security lens.
- **Status:** to review together before building.

### I-20 · Layer 3 future projections (NASA NEX-GDDP-CMIP6) for the demo sites
- **Data:**
  - 5 CMIP6 models (ACCESS-CM2, EC-Earth3, MPI-ESM1-2-HR, MRI-ESM2-0, NorESM2-MM), daily, 0.25°,
    bias-corrected, from NCCS THREDDS point subsets.
  - Baseline 1995–2014 vs 2041–2060 under SSP2-4.5 and SSP5-8.5; 2,700 extracts.
  - Two bugs fixed first: missing time range, and the gn/gr grid label.
- **Method:** monthly change factors per model applied to every observed year 2001–2024 → future-like years
  → the same replay; results reported as a min–max range across models.
- **Sanity vs IPCC:**
  - Highs warm **+0.9 °C** (SSP2-4.5) / **+1.2 °C** (SSP5-8.5) by mid-century, at the lower end of the
    South Asia range, as expected for coastal tropical Tamil Nadu.
  - Rain leans **wetter** (SSP5-8.5 +15–20%); SSP2-4.5 models straddle zero.
  - Heavy-rain days rise slightly.
- **Bug caught by the discrimination check:**
  - Adding each model's own hot-day change (+17 to +42 days at Thanjavur) to POWER's observed baseline
    double-counted the threshold jump, so every Thanjavur rotation failed (0/24).
  - Fix: apply the model's temperature change to the observed baseline (same relation as the sliders).
- **Results (range across models):**
  - Tirunelveli rice holds or improves slightly (wetter).
  - Madurai tank rice is very uncertain (8–19 of 24 under SSP2-4.5 vs 11 today).
  - Thanjavur rotations decline from heat, but the millet + Samba "small step" stays most robust (14–19 vs current 12–16).
- **Next:** grid-wide projections (future-suitability heatmap), a "Today / 2050s" switch in the UI (Lane B, B12).

### I-21 · Five small millets added (IDEAS I24)
- Foxtail (thinai), little (samai), kodo (varagu), proso (panivaragu) and barnyard (kuthiraivali).
  - Seasons (Masi / Adi / Purattasi) and durations come from the TN Crop Production Guide small-millets chapter.
  - Water needs are approximate (250–350 mm; not in the guide).
- **Diagnostics (47-point grid):**
  - Distinct #1 crops rain-fed / tank / canal: 6/9/5 → 8/12/6. Distinct top-3 sets: 13/19/19 → 17/21/21.
  - Best rain-fed alternatives across districts: 6 → 8 crops.
- **Caveat:**
  - Kodo millet became #1 rain-fed at 19/47 points (cowpea dropped from 20 to 8).
  - Its lead partly rests on our approximate water need and a deep-root assumption the guide doesn't state.
  - **Next:** source small-millet water use and rooting depth, and consider a market/price signal
    (FN-1 E3) before presenting kodo as a headline recommendation.

### I-22 · El Niño odds (FIELD_NOTES E1): a weak rain signal, but a clear crop message
- **Data:** NOAA ONI (OND) and NOAA PSL DMI (SON), 1981–2025 → each NE-monsoon season tagged El Niño / La Niña / neutral
  and IOD +/−/neutral. Latest: **ONI +2.46 (ASO 2026), a strong El Niño**.
- **Rain link, tested against the textbook (El Niño → wetter NE monsoon):**
  - In 2001–2024 at 50 points, La Niña seasons were *wetter* (+19%), El Niño −4%, neutral −23%.
  - In POWER 1981–2024: weak and unstable. Tirunelveli +0.24, Madurai −0.12, Thanjavur −0.10, none significant,
    and the sign flipped inland between decades.
  - **Conclusion: ENSO alone can't forecast this season's monsoon here.** Consistent with literature on a
    non-stationary ENSO–NE-monsoon link.
- **Crop outcomes:** year-level permutation test over 24 seasons (not inflated by spatially correlated points).
  - Water-hungry crops' odds **do** differ by phase: tank rice El Niño 48% / La Niña 67% / neutral 16% (p=0.002);
    groundnut 44/59/32% (p=0.008).
  - Drought-hardy crops are **steady in every phase**: black gram 79–91%, sesame 91–93%, kodo millet 94–96% (p>0.5).
  - IOD: no usable signal.
- **Message for farmers and policy:** when the season is uncertain, the robust move is the farmer's own instinct
  (black gram / sesame / millets). ENSO-phase odds for rice are a recent pattern, shown with that caveat.
- **Engine:** `phaseOdds()` + `web/data/climate_indices.json` (evidence block). Not yet: forecast-based (NMME/IMD)
  outlooks; hindcast of phase-conditioned advice against real yields.

### I-23 · "Avoid this season" lists (FIELD_NOTES E2)
- **Method:**
  - Each place's 24 seasons are classed by NE-monsoon rain using IMD categories: deficient ≤ −20% (drought-type),
    excess ≥ +20% (flood-prone), else normal.
  - Every crop is replayed at its usual best sowing month and the outcomes counted per season type.
  - Lists: **avoid** = fine in normal seasons but < 50% in that type; **safer** = ≥ 80%.
  - **Not suitable here** = fails ≥ 2/3 of normal seasons with that water source, kept separate so season lists
    mean "risky this time".
- **Results match the farmer's own advice:**
  - On tank water, long-duration rice is "avoid in a drought year" at all three demo sites. At Tirunelveli it
    came through 0/7 drought-type seasons vs 7/7 wet ones.
  - Safer in drought: black gram, sesame, green gram, millets.
  - Flood-prone seasons are place-specific: the Cauvery delta warns against pulses, cotton and maize
    (waterlogging); Madurai and Tirunelveli have no flood-specific avoid list.
- **Two refinements from the sanity check:**
  - Rain-fed rice showed on every list, so it was split out as "not suitable".
  - The first 50% cut labelled Madurai tank rice (6/13 normal) "not suitable", so the cut moved to 1/3 and it is
    now "avoid in drought".
- **Grid diversity (tank):** 6 distinct drought-avoid lists, 15 distinct flood-avoid lists across 47 points.
- **Limits:**
  - Season type isn't known at sowing, so it's paired with early signals (onset, ENSO odds) rather than presented
    as a forecast.
  - Sample sizes are small (5–8 seasons per type), so the UI should show "X of N", not percentages alone.

### I-24 · 1-in-100-year events (FIELD_NOTES E4): what 24 years can and can't say
- **Is there a NASA model already?** Checked before building. NASA has no ready-made rainfall return-period product
  for India:
  - **GFMS** (Global Flood Monitoring System) flags floods with 95th-percentile runoff thresholds.
  - **LHASA** (landslide hazard) uses IMERG 95th/99th-percentile rain plus SMAP.
  - **GRACE drought indicators** give groundwater/soil-moisture percentiles (a candidate for later).
  - **NHyFAS** covers Africa/Middle East only.
  So we followed the method used in IMERG extreme-rain studies: annual maxima → GEV.
- **Method:**
  - **Data:** the browser pulled IMERG Final daily (Giovanni) for all 50 points. Per year we kept the largest 1-, 3-
    and 5-day rain totals (`pipeline/data/imerg_annual_maxima.json`).
  - **Pooling:** 24 years per point is too short for a 1-in-100 fit, so each point is pooled with neighbours within
    0.6° after dividing by its local median (regional "index-flood" method).
  - **Fits:** GEV by L-moments (Hosking), tail shape clipped to ±0.4. NE-monsoon drought uses a gamma fit (SPI-style).
  - **Uncertainty:** 300-draw bootstrap over years, keeping neighbours together.
  - **Climate shift (demo sites):** rain extremes scaled 7%/°C by NEX-GDDP warming, NE totals by projected NE-rain change.
  - **Speed:** maximum-likelihood fits took ~2 min per point, so we switched to L-moments (whole run 90 s).
- **Results:**
  - **1-in-100 day of rain**, best estimate (range):

    | Place | 1-in-100 day of rain |
    |---|---|
    | Tirunelveli | 138 mm (115–154) |
    | Madurai | 144 mm (112–165) |
    | Thanjavur | 189 mm (145–220) |
    | Whole grid | 107–362 mm, median 180 |

  - **Spread follows known climatology.** Lowest in the western interior / Ghats rain shadow (Coimbatore, Tiruppur
    ~110–130 mm); highest on the north coast (Chennai/Cuddalore, 270–360 mm; the Chennai cell's record is
    1 Dec 2015). The pipeline also picks out Cyclone Nisha (Thanjavur, Nov 2008: 321 mm in 3 days, ≈1-in-100).
  - **Drought:**
    - 2016 is the driest NE monsoon at 49/50 points: 26–43% of normal at the demo sites, rarer than 1-in-100 everywhere.
    - A 1-in-100 NE monsoon is ~40–46% of normal (grid median 38%).
    - Return periods beyond 100 years are labelled "rarer than 1-in-100" instead of printing extrapolated numbers
      like 1-in-795.
  - **Dec 2023 Tirunelveli flood:** IMERG records 124 mm on 17 Dec (≈1-in-50). Rain gauges recorded far more, so
    satellite rain **under-reads local extremes** and our levels are conservative.
  - **Future (2041–60, SSP2-4.5):** today's 1-in-100 day of rain becomes ~1-in-66 to 1-in-76 (model median). Drought
    change is too uncertain to call (model range 1-in-39 to 1-in-1000), consistent with the wetter-leaning but
    disagreeing NE-monsoon projections.
  - **Over a 30-year farming life:** 26% chance of at least one 1-in-100 event, 45% for 1-in-50.
- **Crop link (`extremeYearCheck`):**
  - We can't replay an event we never saw, so we replay the place's actual worst drought (2016) and its wettest
    3-day burst, and split failures into "hit by the event" vs "failed for another reason".
  - **Tank water, 2016:** rice and groundnut were hit at all demo sites; black gram, sesame and millets came through.
    Rain-fed: only sesame and small millets (and green gram / pearl millet at Tirunelveli).
  - **Thanjavur, 2008 cyclone:** maize, cotton and banana were waterlogged even with canal water.
- **Limits:**
  - **Canal and borewell show no 2016 damage.** The delta's canal index for 2016 is 0.905, only slightly below
    normal: the upper-Cauvery monsoon was near normal, and the real 2016 crisis came from Mettur releases and the
    interstate water dispute, which rainfall can't capture. Groundwater depletion isn't modelled either.
  - **Short record:** 24 years per point (pooling helps; IMD 1901+ gridded rain would help more, ~250 MB download
    not yet approved).
  - **Calendar years:** maxima use calendar years, so a late-December event and an early-January one count in
    different years.

### I-25 · "Your last 10 years vs the full record" (FIELD_NOTES E6)
- **Why:** the farmer said people judge risk by roughly the last 10 seasons. The 24-year replay is a longer memory
  than anyone has, so we show what a 10-year memory gets right and wrong.
- **Method:** `memoryCheck(site, crops, prefs, {recent: 10, as_of?, rotation?})`.
  - Each crop's "came through" share in the remembered decade vs all 24 years, flagged when the gap is ≥ 15 points.
  - The range across **every** 10-year window in the record.
  - Which record years (worst NE monsoon, wettest day) fall outside the memory.
  - The chance a 10-year memory holds no 1-in-T event: (1 − 1/T)^10, i.e. 90% for 1-in-100.
- **Results:**
  - **Today's memory (2015–2024) is a fair one** at the demo sites. It contains both 2016 and Dec 2023, so no crop
    "looks safer" than the full record there.
  - **The real lesson is how much the remembered decade matters.** On tank water, Madurai long rice comes through
    20–60% depending on the decade; Thanjavur rice 60–90%.
  - **Across the grid,** each point has 2–3 crops whose verdict swings ≥ 30 points by decade. "Recent looks safer"
    appears for 0.4 (tank) to 0.8 (rain-fed) crops per point.
  - **A memory made just before 2016** (`as_of: 2014`, remembering 2005–2014) over-trusts rice more than any other crop (11
    point-crop cases on tank water: long rice 6, short rice 5; the next crop has 1). Thanjavur tank rice came through 9/10 in that memory vs 16/23 in the full record. The same memory
    under-rates maize and cotton there (4/10 vs 14–15/23).
- **UI idea:** "If you remember 2005–2014, long rice looked safe (9 of 10). Over 24 years it came through 16 of 23,
  and 2016, the worst monsoon on record, came right after."

### I-26 · Wind and cyclone exposure from NASA POWER (FIELD_NOTES E5)
- **Data:** NASA POWER daily (MERRA-2, ~0.5°) for 50 points, 2001–2024 (`pipeline/fetch_wind.py`):
  - WS10M (mean wind at 10 m), WS10M_MAX (strongest hourly wind of the day) and rain.
  - A **strong-wind day** is WS10M_MAX ≥ 10 m/s. A **storm day** is a strong-wind day with ≥ 50 mm rain, the
    cyclone / deep-depression signature.
- **Validation against known cyclones:**
  - **Caught:** Thane (2011), Nisha (2008), Nilam (2012), Nivar (2020), Mandous (2022), Michaung (2023) and
    Ockhi (2017) appear among the 8 windiest days at 4–8 points each. Vardah (2016) ranks 16th at Chennai.
  - **Missed:** **Gaja (Nov 2018), the most damaging delta cyclone, ranks only ~400th at Thanjavur.** It was compact
    and fast, and a 50 km daily average smooths it away. POWER sees large, slow systems but misses compact ones.
- **Geography looks right:**
  - Storm days cluster on the north and delta coast (Chennai–Cuddalore 0.6–0.9 per year; storm months Nov–Dec).
  - The interior has almost none (Madurai 0).
  - Tirunelveli's strong-wind days are June–August, the southwest-monsoon wind through the Aralvaimozhi gap
    (wind-farm country), which matters for banana.
- **Crop link (`windRisk`), an exposure layer kept out of the replay's pass/fail:**
  - New `wind_tolerance` per crop in crops.json (approximate): low for banana, sugarcane, maize and rice (lodging);
    medium for millets, sorghum, cotton and sesame; high for pulses and groundnut.
  - A season counts as exposed if a storm day (or, for low-tolerance crops, ≥ 3 strong-wind days) falls in the
    second half of the crop's season (the whole season for banana and sugarcane).
  - **Results:** coastal Cuddalore/Puducherry Samba rice exposed in 11/23 seasons, cotton 8–11/23. Banana and
    sugarcane are exposed in most years at Tirunelveli and Thanjavur, while Madurai is nearly unexposed.
  - **Grid:** 11 distinct "most exposed" lists; 10 of 47 points have none.
- **Next (needs approval):** NOAA IBTrACS cyclone tracks (North Indian basin, 1980+) would count real cyclone
  passes within ~100 km of each point and catch compact storms like Gaja. Small CSV download.

## Open questions / likely next pivots
- **Delta Kuruvai water:** model it as groundwater-fed (borewell), and add a groundwater-stress signal
  (GRACE / CGWB block categories) as its real constraint.
- **Long-term rain truth:** can we get IMD 0.25° gridded rainfall (1901–present) to settle the POWER-vs-IMERG
  rain-trend disagreements? It's station-based and long, so it's the natural referee.
- **Satellite truth for the calendar:** does per-pixel MODIS NDVI from AppEEARS show real bare months? If yes,
  "observed vs modelled bare months" becomes a headline feature.
- **SMAP soil moisture:** use it to validate the water-balance model in dry spells (2016, 2023)?
- **Groundwater (GRACE):** is a borewell-depletion panel worth the time, or is IMERG + replay enough evidence?
- **Extremes:** both POWER and IMERG under-read the Dec 2023 flood. Mention a station source, or keep as a stated limit?
- **Scope risk:** breadth (grid, I-10) vs depth (future projections, I-11). Both are now planned; if time runs
  short, cut grid-wide projections first (P2) and keep the hero-site future replay.
- **Which CMIP6 models?** Pick ~5 that do well on the Indian monsoon in the literature, rather than an arbitrary few.
- **Story:** family framing for the demo. Need 1–2 real anecdotes or photos if possible.

---

## Template for new entries
```
### I-N · <short name of the pivot>
- **Trigger:** what made us reconsider (finding, feedback, constraint)
- **Options considered:** A / B / C
- **Decision:** what we chose, and the key reason in one line
- **Consequences:** what changed in data / engine / UI / story
- **Lost / gained:** honest trade-off
```
