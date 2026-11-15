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

## Open questions / likely next pivots
- **Rice skill:** add reservoir storage (e.g. Mettur/Papanasam levels) or a canal-release index so the
  irrigated-rice replay reflects water actually delivered, then re-run the backtest.
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
