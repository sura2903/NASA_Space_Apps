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
| A8 | Load AppEEARS CSVs → `ndvi` (observed bare months) + SMAP soil-moisture anomaly per site | ⬜ |
| A9 | Cross-check POWER rainfall with GPM IMERG; IMERG now the rainfall source (Tirunelveli 948 vs POWER 1300 mm/yr) | ✅ |
| A10 | Tune crop values against TNAU Agritech; sanity-review suggestions with family/farmers | ⬜ |
| A11 | ⭐ GRACE groundwater trend panel for Tamil Nadu | ⭐ |

## Lane B: Nimalan (web app + story)
Owns: `web/` except `web/data/` and `web/js/scoring.js`. Start from
`web/dev/engine-test.html` to see the engine output, and use
`web/data/sites/sample_site.json`.

| # | Task | Status |
|---|---|---|
| B1 | Layout + site picker (Leaflet map of the 3 sites + dropdown); farmer-first view with an "Expert details" toggle | ⬜ |
| B2 | Inputs: current rotation editor (crop + sowing month per slot, Tamil names via `cropLabel`), water source, 7 priority sliders (`PRIORITIES`) | ⬜ |
| B3 | Site panel: `siteHighlights()` bullets + monthly rain / ET bar chart + NE-monsoon year-by-year chart (Chart.js, from `monthly` and `by_year`) | ⬜ |
| B4 | **Field Calendar:** 12-month ribbon per strategy (crop / green manure / bare) over rain and heat bands; hovering an evidence chip highlights its months | ⬜ |
| B5 | **Strategy cards** ×3: tag, label, score, replay "came through X of 24 years", why / evidence / benefits / risks / gaps | ⬜ |
| B6 | **Climate-shift sliders** (+°C, ±rain %) with a "continue the observed trend" button (`trendScenario`); re-run with ~250 ms debounce | ⬜ |
| B7 | Glossary tooltips: evapotranspiration, water balance, NDVI, heavy-rain day, MSP, northeast monsoon, green manure | ⬜ |
| B8 | Printable "take this to your agriculture officer" sheet (print CSS) | ⬜ |
| B9 | Deploy to GitHub Pages (serve `/web`) | ⬜ |

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
