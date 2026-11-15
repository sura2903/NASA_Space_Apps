# Tasks: who does what

**Project:** Field Shift, Tamil Nadu. A crop-rotation decision tool for monsoon
uncertainty and water shortage. The hero site is Tirunelveli, with Madurai and
Thanjavur as contrasts. See `docs/APPROACH.md` for the why and
`docs/data_contract.md` for the interfaces.

Status keys: ✅ done · 🔄 in progress · ⬜ to do · ⭐ stretch

## Lane A: Siddarth (data + scoring engine)
Owns: `pipeline/`, `web/data/`, `web/js/scoring.js`

| # | Task | Status |
|---|---|---|
| A1 | NASA POWER pipeline: monthly climatology, trends, per-year history (`by_year`), heavy-rain days, 38 °C heat days | ✅ |
| A2 | SoilGrids soil texture / carbon / pH per site | ✅ |
| A3 | Tamil Nadu sites: Tirunelveli, Madurai, Thanjavur | ✅ |
| A4 | Tamil Nadu crop table (16 crops, Tamil names, sowing months, water need, MSP) | ✅ (values approximate) |
| A5 | Season-based scoring engine: calendar, water from rain + soil + canal/tank/borewell, heat/flood checks, 24-year replay, sub-scores, plain-language why/evidence/risks/gaps, strategy generator | ✅ first version |
| A6 | `pipeline/points.csv` for the AppEEARS request (MODIS NDVI, SMAP, ECOSTRESS, SRTM) | ✅ |
| A7 | Earthdata account + submit AppEEARS point request | ✅ submitted, waiting on results |
| A8 | Load AppEEARS CSVs → `ndvi` (observed bare months) + SMAP soil-moisture anomaly per site | ✅ demo sites (`merge_appeears.py`, RESEARCH_LOG I-31); SMAP into the engine ⬜ |
| A9 | Cross-check POWER rainfall with GPM IMERG; IMERG now the rainfall source (Tirunelveli 948 vs POWER 1300 mm/yr) | ✅ |
| A10 | Tune crop values against official TN sources (TN Agri Dept Crop Production Guide + TNAU notes) | ✅ (family/farmer sanity review still welcome) |
| A11 | ⭐ GRACE groundwater trend panel for Tamil Nadu | ⭐ |
| A12 | Tamil Nadu 0.5° grid (47 points): POWER + SoilGrids + IMERG rain → `web/data/grid/` | ✅ |
| A13 | Engine `rankCrops` + `cropSuitability` for the heatmap and "click anywhere" (IDEAS I3/I4) | ✅ |
| A14 | **Climate change, Layer 1:** extend POWER to 1981–2024; Mann–Kendall + Sen trends, then-vs-now shifts for heat, monsoons, heavy rain, dry spells, ET0 (see APPROACH "Next direction") | ✅ 3 demo sites (`web/data/trends/`); grid ⬜ |
| A15 | **Layer 2:** compare observed trends with IPCC AR6 / IMD / CMIP6 historical for South India ("consistent with", never "caused by") | ⬜ |
| A16 | **Layer 3:** NASA NEX-GDDP-CMIP6 change factors (5 models × SSP2-4.5 / SSP5-8.5, 2041–60) → future-like years → future replay | ✅ demo sites (`web/data/projections/`); ✅ grid, 47 points × 5 models (`fetch_nex_grid.py`, RESEARCH_LOG I-33); 2081–2100 ⬜ |
| A17 | Engine: `futureRange()` returns today + min/median/max across models | ✅ |
| A18 | **1-in-100-year events (FIELD_NOTES E4):** IMERG annual 1/3/5-day maxima → pooled GEV (L-moments) + NE-monsoon drought (gamma), bootstrap ranges, NEX shift; `extremeYearCheck()` | ✅ 50 points (`web/data/extremes/`) |
| A19 | **Last 10 years vs full record (E6):** `memoryCheck()` incl. every-decade window range and `as_of` | ✅ |
| A20 | **Wind / cyclone exposure (E5):** NASA POWER wind at 50 points, `wind_tolerance` in crops.json, `windRisk()`; IBTrACS tracks next | ✅ POWER; IBTrACS ⬜ |
| A21 | **Statewide risk file** for the Policy view (`statewide_risk.json`, all layers + engine lists per grid point) | ✅ incl. future layers |
| A22 | **Seasonal canal/tank water from dam state** (user request): canal water per season depends on whether and when the dam opens and its storage at sowing: Mettur (delta: normal opening 12 Jun, closing 28 Jan), Papanasam/Manimuthar (Thamirabarani), Vaigai/Periyar (Madurai). Plan: (1) per-season canal budget in the engine (Kuruvai needs Mettur open by ~mid-June; Samba/Thaladi depend on Aug–Oct storage), (2) historical dam data per year (have Mettur opening dates/releases in `pipeline/data/mettur_releases.json`; add others from TN WRD / India-WRIS / CWC reservoir bulletins), (3) a "dam opened on time / late / not yet" input for this season, since I-18 found the opening date isn't predictable from June information | ✅ delta (Mettur, `damCheck()`, RESEARCH_LOG I-29); Papanasam / Vaigai data ⬜ |
| A23 | **Storage / perishability factor** (user request, IDEAS I28): `storage` field per crop + "Can store and sell later" priority; combine with prices (E3) later | ✅ engine + data (RESEARCH_LOG I-32); UI slider ⬜ (Lane B); prices ⬜ |
| A24 | **Pest and disease resistance (IDEAS I29, user request):** weather-driven pest/disease risk per crop from NASA POWER humidity and temperature, plus resistant varieties from the TN crop guides | ⬜ planned |

## Lane B: Nimalan (web app + story)
Owns: `web/` except `web/data/` and `web/js/scoring.js`. Start from
`web/dev/engine-test.html` to see the engine output, and use
`web/data/sites/sample_site.json`.

| # | Task | Status |
|---|---|---|
| B1 | Layout + site picker (Leaflet map of the 3 sites + dropdown); farmer-first view with an "Expert details" toggle | ✅ |
| B2 | Inputs: current rotation editor (crop + sowing month per slot, Tamil names via `cropLabel`), water source, 7 priority sliders (`PRIORITIES`) | ✅ |
| B3 | Site panel: `siteHighlights()` bullets + monthly rain / ET bar chart + NE-monsoon year-by-year chart (Chart.js, from `monthly` and `by_year`) | ✅ |
| B4 | **Field Calendar:** 12-month ribbon per strategy (crop / green manure / bare) over rain and heat bands; hovering an evidence chip highlights its months | ✅ |
| B5 | **Strategy cards** ×3: tag, label, score, replay "came through X of 24 years", why / evidence / benefits / risks / gaps | ✅ |
| B6 | **Climate-shift sliders** (+°C, ±rain %) with a "continue the observed trend" button (`trendScenario`); re-run with ~250 ms debounce | ✅ |
| B7 | Glossary tooltips: evapotranspiration, water balance, NDVI, heavy-rain day, MSP, northeast monsoon, green manure | ✅ |
| B8 | Printable "take this to your agriculture officer" sheet (print CSS) | ✅ |
| B9 | Deploy to GitHub Pages (serve `/web`) | ✅ |
| B10 | Crop suitability heatmap + click-anywhere top-3 panel on the grid (IDEAS I3/I4) | ✅ |
| B11 | "How has my climate changed?" panel (trend charts + verdicts with confidence) | ✅ |
| B12 | "Today / 2040s / 2080s" + SSP switch; cards show today vs future with model ranges | ⬜ |

## Together
| # | Task | When |
|---|---|---|
| T1 | Agree on the plan and contract (this doc) | hour 0–1 |
| T2 | Integration check: real data in the UI | ~hour 4 |
| T3 | Story: Tirunelveli family-farm framing, 2016 failed monsoon, Dec 2023 floods (209 mm in one day in the data) | hour 7–8 |
| T4 | 30-second demo video, slides, Space Apps submission form | hour 8–10 |

## Working agreement
- Pull before you start; commit small; push often.
- Only edit files in your own lane. Contract changes go through both people and are logged in `docs/PROGRESS.md`.
- Each Claude Code session reads `CLAUDE.md` first.
