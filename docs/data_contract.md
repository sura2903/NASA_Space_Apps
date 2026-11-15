# Data contract

The interface between lanes. Change it only after telling the other person, and
log the change in `docs/PROGRESS.md`.

- Data files: `web/data/` (plain JSON), produced by Lane A.
- Scoring engine: `web/js/scoring.js` (ES module), owned by Lane A.
- The UI (Lane B) reads the JSON and calls only the engine's exported functions.
  It never re-implements scoring.

---

## 1. `web/data/sites/index.json`
```json
[{ "id": "tirunelveli", "name": "Tirunelveli (Thamirabarani valley)", "lat": 8.70, "lon": 77.75 },
 { "id": "madurai",     "name": "Madurai (Vaigai / Periyar command)", "lat": 10.03, "lon": 78.33 },
 { "id": "thanjavur",   "name": "Thanjavur (Cauvery delta)",          "lat": 10.85, "lon": 79.25 }]
```
US backup sites live in `web/data/sites/_us_backup/` (not listed, not used by the UI).

## 1b. `web/data/grid/index.json` + `web/data/grid/<id>.json` (statewide grid)
47 points at 0.5° over Tamil Nadu, for the suitability heatmap and "click anywhere":
```json
{ "cell_deg": 0.5,
  "points": [{ "id": "g0875_7775", "name": "near Tirunelveli (5 km)", "lat": 8.75, "lon": 77.75 }] }
```
Each `<id>.json` has exactly the site format in section 2: rain from GPM IMERG, temperature/ET0 from
POWER, plus SoilGrids soil; `ndvi` is null. Total ~4.6 MB, so load lazily (only when the map view
opens), e.g. `Promise.all(index.map(p => fetch(...)))`. Snap clicks to the nearest point; cells are 0.5°.

## 1c. `web/data/districts.json` (mismatch map + district what-ifs, by `pipeline/mismatch_build.py`)
Lane B's requested format (PROGRESS.md, request 5), extended with mismatch metrics. 37 districts (no Chennai).
```jsonc
{ "meta": { "source": "...", "fail_cut": 0.5, "caveats": ["irrigation_share is unknown ...", ...] },
  "districts": [ {
    "id": "ramanathapuram", "name": "Ramanathapuram", "hq": [9.37, 78.83],
    "points": ["g0925_7875", ...], "rep_point": "g0925_7875",     // grid ids; rep_point used for the engine run
    "area_ha": { "rice_long": 121000, "cotton": 9000, ... },      // avg 2018-22, modelled crops (rice = all rice)
    "tree_crops_ha": 2100, "other_crops_ha": 15400, "irrigation_share": null,   // null = not in the data
    "crops": { "rice_long": { "area_ha": 121000, "rainfed_share": 0.08, "irrigation_mm": 610, "water_mcm": 738 } },
    "mismatch": { "modelled_area_ha": 140000, "rainfed_reliability": 0.11,   // area-weighted, 0-1
                  "water_dependent_share": 0.86, "mismatch_index": 86,      // % area failing most years on rain alone
                  "irrigation_demand_mcm": 896, "largest_crop": "rice_long", "largest_crop_share": 0.86,
                  "confidence": "normal" | "low", "confidence_reasons": [...], "rep_point_km": 16 },
    "top_rainfed": [ { "crop": "pearl_millet", "share": 0.92, "suitability": 77, "sow": 9 }, ... ],
    "switch_scenarios": [ { "fraction_switched": 0.25, "to_crop": "pearl_millet", "area_moved_ha": 30000,
                            "rainfed_reliability": 0.29, "irrigation_demand_mcm": 672, "water_saved_mcm": 224 },
                          { "fraction_switched": 1.0, ... } ] } ] }
```
**Read a high mismatch index as "depends on irrigation"**, not "failing": irrigation shares are unknown.
Grey out `confidence: "low"` districts. 1 MCM = 1 million m³.

## 2. `web/data/sites/<id>.json`, produced by `pipeline/build_all.py`
```jsonc
{
  "id": "tirunelveli", "name": "...", "lat": 8.70, "lon": 77.75,
  "source": "NASA POWER daily, community=AG",
  "period": { "start": 2001, "end": 2024 },
  "heat_threshold_c": 38,             // heat_days count days with tmax above this
  "precip_source": "GPM IMERG Final daily V07 at 8.75N 77.75E (0.1° grid); temperature/ET0 from NASA POWER",
  "rain_comparison": {                // POWER vs IMERG, for a "two NASA datasets" panel
    "power_annual_mean_mm": 1300, "imerg_annual_mean_mm": 948,
    "power_ne_monsoon_mean_mm": 543, "imerg_ne_monsoon_mean_mm": 515,
    "monthly_correlation": 0.78, "ne_monsoon_correlation": 0.83,
    "driest_ne_year_power": 2016, "driest_ne_year_imerg": 2016 },
  // Every precip_mm below is IMERG; the POWER value is kept alongside as power_precip_mm.

  "monthly": [                        // 12 entries Jan..Dec, 2001-2024 climatology
    { "month": 1, "tmax_c": 30.1, "tmin_c": 21.0,
      "precip_mm": 40.2, "et0_mm": 120.0, "water_balance_mm": -79.8,
      "root_soil_wetness": 0.55,      // GWETROOT 0..1
      "frost_days": 0, "heat_days": 0.1,
      "heavy_rain_days": 0.1 }        // days >= 64.5 mm (IMD "heavy rain")
  ],
  "frost": { ... },                   // null fields / 365 frost-free days in Tamil Nadu
  "trends": { "tmax_c_per_decade": 0.68, "precip_mm_per_decade": -283,
              "heat_days_per_decade": 1.3, "root_soil_wetness_per_decade": -0.01 },
  "annual":  [ { "year": 2001, "precip_mm": 1250, "tmax_c": 33.1, "heat_days": 4, "frost_days": 0 } ],
  "by_year": [                        // drives the historical replay
    { "year": 2001, "last_spring_frost_doy": null, "first_fall_frost_doy": null, "frost_free_days": 365,
      "months": [ { "precip_mm": 20.1, "et0_mm": 110, "water_balance_mm": -89.9,
                    "heat_days": 0, "frost_days": 0, "tmax_c": 30.2,
                    "heavy_rain_days": 0, "max_daily_precip_mm": 12.3 } /* x12 */ ] }
  ],
  "soil": { "source": "ISRIC SoilGrids 2.0 (250 m)", "clay_pct": 33, "sand_pct": 38, "silt_pct": 29,
            "soc_g_per_kg": 17.8, "ph": 7.0, "texture_class": "clay loam" },
  "ndvi": null,                       // filled from AppEEARS when available (see APPROACH.md)

  // From GPM IMERG daily 2001-2024 (pipeline/merge_dryspells.py); in sites/ and grid/ files:
  "dry_spells": { "threshold_mm": 2.5, "window_days": 30, "source": "...", "definition": "...",
                  "by_sow_month": { "10": { "years": 24, "ge10": 5, "ge15": 2 }, ... } },  // ge10 = years with a 10+ day dry spell
  "ne_onset": { "method": "...", "search_from": "10-10", "median_doy": 289, "median_date": "16 Oct",
                "years_without_onset": 3,                 // e.g. 2016: no qualifying onset at 30/50 places
                "years": [{ "year": 2001, "doy": 291 }, { "year": 2016, "doy": null }, ...] },     // doy null = none
  "sowing_rain_onset": { ...same shape..., "search_from": "09-15" },  // first reliable sowing rains (Purattasi pattam)

  // Cauvery-command places only (thanjavur + 8 grid points; pipeline/add_canal_index.py):
  "canal_index": { "method": "0.6 x this year's + 0.4 x last year's upper-Cauvery JJAS rain / mean",
                   "raw_index": { "2002": 0.60, ... }, "years": { "2002": 0.67, ... } }
  // The engine scales the canal budget by (index - 0.5)/0.5 for these places (upstream use first).
}
```

### 2a-dam. `dam` in Cauvery-delta site/grid files (`pipeline/add_dam_season.py`)
```jsonc
"dam": { "name": "Mettur (Stanley) reservoir, Cauvery delta canals", "source": "...",
         "normal": { "open": "06-12", "close": "01-28" }, "median_release_tmc": 193.2,
         "years": { "2016": { "open": "2016-08-21", "close": "2017-01-11", "release_tmc": 69.3, "release_index": 0.36 } },
         "notes": [...] }
```
Engine: with `water_source: "canal"` the canal serves only months whose 15th falls inside that year's
open–close window, with budget × `release_index`. `prefs.dam = { open: "MM-DD" | null, release_index?: 1 }`
overrides every year (null = canals stay shut).
`damCheck(site, crops, rotation, prefs)` → `{ dam, normal, overall: {good, n},
  history: { on_time|late|very_late: { good, n, years: [{year, ok, opened}] } },
  what_if: { on_time|late|very_late|not_opened: { open, good_years, total_years, irrigation_mm } }, note }`
(null for places without `dam`). `DAM_OPTIONS` = { on_time: "06-12", late: "08-01", very_late: "09-15", not_opened: null }.
UI idea (delta farm page): "Has Mettur opened? [on time] [late] [very late] [not yet]" → "With the dam opening in
August, Kuruvai on canal water came through 0 of 24 seasons. You need a borewell, or sow Samba instead (24 of 24)."

### 2a-appeears. `ndvi`, `smap`, `elevation_m` in the demo-site files (`pipeline/merge_appeears.py`)
```jsonc
"ndvi": { "source": "NASA AppEEARS: MODIS MOD13Q1.061 ...", "years": [2015, 2024],
          "monthly_median": [12 values], "bare_months": [], "by_year": { "2015": [12, null where missing] } },
"smap": { "source": "...SPL3SMP_E.006...", "units": "m3/m3 (surface 0-5 cm)", "years": [2015, 2024],
          "quality": "recommended-quality retrievals" | "...not recommended (standing water)...; use with care",
          "monthly_mean": [12], "by_year": { "2015": [12] }, "latest": { "month": "2024-12", "value": 0.325, "anomaly": 0.039 } },
"elevation_m": { "source": "...SRTMGL1_NC.003...", "mean": 148, "range": [144, 151] }
```
Demo sites only (3 points each). `smap.latest` is the last month in the bundle (Dec 2024), not live data.

## 2b. `web/data/trends/<id>.json` (climate-change Layer 1, produced by `pipeline/climate_trends.py`)
For the "How has my climate changed?" panel (B11). One file per demo site, plus `trends/index.json`.
```jsonc
{ "id": "tirunelveli", "name": "...", "period": [1981, 2024], "split_year": 2000,
  "warm_night_threshold_c": 24.1,
  "caveats": ["10 indicators show a change point around 2008 ... reanalysis artefact ...",
              "Satellite rain (GPM IMERG, 2001–2024) disagrees with NASA POWER on ..."],   // show these!
  "method": "Mann-Kendall + Sen's slope ...",
  "indicators": {
    "warm_nights": {
      "label": "Warm nights (above the 1981–2010 90th percentile)", "unit": "nights/yr",
      "group": "heat",                       // heat | rain | extremes | water
      "higher_is_worse": true,               // true / false / null (neutral), for colouring
      "series": [{ "year": 1981, "value": 28 }, ...],   // 44 points, for the chart
      "sen_per_decade": 11.97, "sen_ci95": [7.1, 16.2], "mk_p": 0.0001,
      "direction": "rising",                 // rising | falling | no clear change
      "confidence": "clear",                 // clear (p<0.05) | likely (p<0.10) | uncertain | none
      "then": { "years": [1981, 2000], "mean": 34.5, "sd": 9.8 },
      "now":  { "years": [2001, 2024], "mean": 55.8, "sd": 14.1 },
      "then_vs_now_p": 0.0002, "variability_change_p": 0.21,
      "change_point": { "year": 2009, "p": 0.003 },
      "source": "NASA POWER daily (MERRA-2 based), 1981–2024",
      "sentence": "Warm nights ...: rising by +12.0 nights/yr per decade (clear trend, p<0.01). 1981–2000 average 35 → 2001–2024 average 56 nights/yr.",
      "imerg_check": { ... }                 // rain indicators only: satellite trend 2001–2024 and same_direction
    }, ... 12 indicators: tmax_mean, hot_days, warm_nights, annual_rain, ne_rain, sw_rain,
                          heavy_days, max_1day, ne_dry_spell, et0_annual, water_balance, soil_wetness
  } }
```
`confidence: "uncertain"` means POWER shows a significant trend but satellite rain (IMERG)
disagrees on direction since 2001. Show it greyed out, never as a finding.

## 2c. `web/data/backtest.json` (does the model work? produced by `pipeline/backtest_eval.py`)
Backtest of the replay against real Tamil Nadu district yields (DES Crop Statistics, 2001-02 → 2022-23).
```jsonc
{ "description": "...", "n_series": 212,
  "overall":  { "p_bad_given_fail": 0.33, "p_bad_given_pass": 0.242, "lift": 1.36, "fisher_p": 0.0,
                "median_anomaly_fail": -0.036, "median_anomaly_pass": 0.005, "table": {...}, "n_years": 4522 },
  "year_level": { "pearson_r": 0.705, "pearson_p": 0.0003, ... },
  "by_crop":  { "black_gram": { ...same fields... }, ... },
  "by_year":  { "2016": { "model_fail_share": 0.85, "bad_yield_share": 0.70, "series": 210 }, ... },
  "per_series": { "Tirunelveli|black_gram": { ...same fields..., "district", "crop", "water_source" } } }
```
Use for a "Does it work?" panel: a year chart of `by_year` (model vs real), plus the lift per crop.
`by_target` has the same model failures scored against **yield, planted area and production**:
`by_target.area.by_crop.rice_long.lift` = 2.11, `by_target.production.by_crop.rice_long.lift` = 2.22. Rice
responds by farmers not planting, so show rice on area/production. Green gram still shows no skill.

## 2d. `web/data/projections/<id>.json` (climate-change Layer 3, by `pipeline/nex_deltas.py`)
NASA NEX-GDDP-CMIP6, 5 models, baseline 1995–2014 vs future 2041–2060, SSP2-4.5 and SSP5-8.5. Demo sites only (grid later).
```jsonc
{ "id": "thanjavur", "baseline": [1995, 2014], "future": [2041, 2060],
  "models": ["ACCESS-CM2", "EC-Earth3", "MPI-ESM1-2-HR", "MRI-ESM2-0", "NorESM2-MM"],
  "scenarios": { "ssp245": "SSP2-4.5 (middle of the road)", "ssp585": "SSP5-8.5 (high emissions)" },
  "deltas":   { "ssp245": { "ACCESS-CM2": { "d_tmax": [12], "d_tmin": [12], "p_ratio": [12],
                                            "d_heat": [12], "d_heavy": [12], "et0_ratio": [12] } } },
  "summary":  { "ssp245": { "ACCESS-CM2": { "d_tmax_annual": 0.9, "rain_change_pct": 4.1, "ne_rain_change_pct": 1.0,
                                            "d_heat_days_annual": 17, "d_heavy_days_annual": 0.2 } } },
  "ensemble": { "ssp245": { "d_tmax_annual": { "min": 0.49, "median": 0.9, "max": 1.51 }, ... } } }
```
Engine: `futureRange(site, crops, rotation, prefs, projection, ssp)` →
`{ ssp, period, today: {good_years, total_years, total, irrigation_mm}, models: [{model, good_years, total, irrigation_mm}],
   good_years: {min, median, max}, total: {...}, irrigation_mm: {...} }`. Always show the **range across models**,
not a single number. Note: the engine applies each model's temperature change to the observed baseline
for hot days (it doesn't use `d_heat` directly; see RESEARCH_LOG I-20).

## 2e. `web/data/climate_indices.json` (El Niño / IOD odds; `pipeline/fetch_indices.py` + `add_enso_evidence.py`)
```jsonc
{ "rules": { "enso": "OND ONI >= +0.5 El Nino, <= -0.5 La Nina", "iod": "SON DMI >= +0.4 positive ..." },
  "latest": { "oni": { "year": 2026, "season": "ASO", "value": 2.46 }, "dmi": { ... } },   // "this season"
  "years": { "2016": { "oni_ond": -0.7, "enso": "la_nina", "dmi_son": -0.2, "iod": "neutral" }, ... },  // 1981-2025
  "evidence": { "crops": { "rice_long": { "el_nino": 0.48, "la_nina": 0.67, "neutral": 0.16, "enso_p": 0.002,
                                          "verdict": "odds differ by ENSO phase ..." }, "black_gram": { ..., "verdict": "steady in every phase" } },
                "rain_link": { "summary": "...weak and unstable...", "usable_as_forecast": false } } }
```
Engine: `phaseOdds(site, crops, rotation, prefs, indices)` →
`{ by_enso: { el_nino: {good, n, years}, la_nina, neutral }, by_iod: {...}, current: {enso, oni, season},
   evidence: { cropId: {...verdict} | null }, overall: {good, n} }`.
**UI rule:** show "In past El Niño seasons this came through X of N" next to the statewide `verdict`. Never call it a
forecast. Where the verdict says "steady in every phase", say that's the safer choice when the season is uncertain.

## 2f. "Avoid this season" (engine only, no new data file)
`avoidThisSeason(site, crops, prefs, opts?)` (~10–15 ms per place) →
```jsonc
{ "normal_ne_mm": 515, "rule": "NE monsoon (Oct-Dec) vs 2001-2024 mean: deficient <= -20%, excess >= +20% (IMD)",
  "years": { "deficient": [2001, 2003, 2016, ...], "normal": [...], "excess": [2006, 2015, 2023, ...] },
  "not_suitable_here": ["rice_short", "sugarcane", "banana"],   // fail >= 2/3 of NORMAL seasons with this water source
  "avoid":  { "deficient": ["rice_long"], "excess": ["groundnut", "cotton", ...] },  // fine normally, < 50% in that season type
  "safer":  { "deficient": ["black_gram", "sesame", ...], "excess": [...] },        // >= 80% in that season type
  "crops":  [{ "crop", "crop_name", "tamil_name", "sow", "sow_label",
               "counts": { "deficient": {good, n}, "normal": {...}, "excess": {...} },
               "share": { "deficient": 0.0, "normal": 0.56, "excess": 1.0 },
               "failure_causes": { "deficient": { "water": 7 }, "excess": { "waterlogging": 3 } } }] }
```
UI idea: "In a drought-type year (like 2016) avoid: long rice (came through 0 of 7). Safer: black gram 7/7, sesame…".
Pair it with early signals (sowing-rain onset, `phaseOdds`), since the season type isn't known for sure at sowing.

## 2g. `web/data/extremes/<id>.json` (1-in-100-year events; `pipeline/extremes.py`)
One file per point (3 demo sites + 47 grid) plus `index.json`. Return levels pool each point with neighbours within
0.6° (index-flood method), 2001–2024 IMERG; ranges are 5–95% from a 300-draw year bootstrap.
```jsonc
{ "id": "tirunelveli", "neighbours": 5, "years": [2001, 2024],
  "rain": { "rx1": { "median_annual_max_mm": 61,                      // also rx3, rx5 (3- and 5-day totals)
                     "levels": { "10": {"mm": 93, "range": [84, 102]}, "25": {...}, "50": {...}, "100": {"mm": 138, "range": [115, 154]} },
                     "record": { "year": 2023, "mm": 124, "date": "2023-12-17", "return_period_yr": 49.7,
                                 "beyond_record": false, "label": "about 1-in-50" } } },
  "drought": { "normal_ne_mm": 515,                                   // NE monsoon (Oct-Dec) total
               "levels": { "100": {"mm": 235, "pct_of_normal": 46, "range": [..]} , ... },
               "record": { "year": 2016, "pct_of_normal": 43, "label": "rarer than 1-in-100 (beyond what 24 years can pin down)" } },
  "lifetime_chance": { "1_in_10": 0.96, "1_in_25": 0.71, "1_in_50": 0.45, "1_in_100": 0.26 }, "lifetime_years": 30,
  "future": { "ssp245": { "period": [2041, 2060], "todays_100yr_rain_becomes_1_in": [53, 68, 75],   // demo sites only
                          "todays_100yr_drought_becomes_1_in": [72, 110, 1028] } } }       // [min, median, max] of 5 models
```
Engine: `extremeYearCheck(site, crops, prefs, extremes)` (~20 ms) →
`{ events: [{ kind: "drought"|"heavy_rain", year, what, label, return_period_yr, came_through[], hit_by_event[], failed_other[] }],
   levels: { rain_1day_mm: {T: mm}, rain_3day_mm, ne_drought_mm, normal_ne_mm }, lifetime_chance, lifetime_years, future }`.
Each crop row is `{crop, crop_name, sow_label, reason}`. `hit_by_event` = failed for the event's own reason (water
shortage / waterlogging); `failed_other` = failed that year for something else (e.g. heat), so it isn't blamed on the event.
UI idea: "A 1-in-100 day of rain here is about 140 mm (115–154). Over 30 years there's a 1-in-4 chance of seeing one.
In 2016, a drought rarer than 1-in-100, black gram and millets came through; rice and groundnut didn't."
Always show ranges, and say "rarer than 1-in-100" rather than printing extrapolated numbers like 1-in-795.

## 2h. "Your last 10 years" (engine only, no new data file)
`memoryCheck(site, crops, prefs, { recent = 10, as_of?, rotation? })` (~20–60 ms) →
```jsonc
{ "recent_years": [2015, 2024], "full_years": [2001, 2024],
  "climate": { "ne_rain_mm": {full, recent}, "hot_days_per_year": {...}, "heavy_rain_days_per_year": {...},
               "worst_ne_monsoon": { year: 2016, mm: 152, remembered: true }, "wettest_day": { year, mm, remembered } },
  "crops": [{ crop, crop_name, tamil_name, sow_label,
              full: {good, n, share}, recent: {good, n, share},
              verdict: "recent_looks_safer" | "recent_looks_riskier" | "same_story",   // gap >= 15 points
              window_range: [0.2, 0.6],          // share across every 10-year window in the record
              best_window: {from, to, share}, worst_window: {...}, missed_failures: [2001, 2016, ...] }],
  "looks_safer": [...], "looks_riskier": [...], "decade_dependent": [...],   // window range >= 0.3
  "chance_memory_has_none": { "1_in_10": 0.35, "1_in_25": 0.66, "1_in_50": 0.82, "1_in_100": 0.9 },
  "note": "A 10-year memory misses a 1-in-100 event 90% of the time.",
  "rotation": { label, ...same fields as a crop }            // only when opts.rotation is given
}
```
`as_of: 2014` remembers 2005–2014 (a memory made just before the 2016 drought), which is the strongest demo.

## 2i. `web/data/wind/<id>.json` (wind / cyclone exposure; `pipeline/fetch_wind.py`)
```jsonc
{ "id", "name", "lat", "lon", "source": "NASA POWER daily (MERRA-2) ...", "years": [2001, 2024],
  "thresholds": { "strong_wind_ms": 10, "storm_rain_mm": 50, "note": "relative exposure" },
  "annual": { "strong_days_per_year": 3.9, "storm_days_per_year": 0.25, "years_with_storm_day": 5 },
  "monthly": [{ month, mean_wind_ms, strong_days_per_year, storm_days_per_year }] x12,
  "by_year": { "2008": { "strong_days": [12], "storm_days": [12], "max_wind_ms": [12] } },
  "windiest_days": [{ date, max_wind_ms, rain_mm }] x8 }
```
Engine: `windRisk(site, crops, prefs, wind)` (~25 ms) →
`{ annual, storm_months: ["Nov","Dec"], windiest_days, most_exposed: [crop ids, >= 25% of seasons],
   crops: [{ crop, crop_name, wind_tolerance, sow_label, exposed_months, seasons_hit, seasons, share_hit, hit_years }], note }`.
Not part of pass/fail. UI idea: "Cyclone months here: Nov–Dec. Samba rice was hit by strong wind near harvest in
11 of 23 seasons; black gram and groundnut stand up to it." Note that compact cyclones (Gaja 2018) are under-read.

## 2j. `web/data/statewide_risk.json` (Policy view; `pipeline/statewide_risk.py`)
```jsonc
{ "meta": { "water_sources_in_engine": ["rainfed", "tank"], "sources": [...], "engine_run": "..." },
  "layers": [{ "key": "extremes.rain_1day_100yr_mm", "label": "1-in-100-year day of rain", "unit": "mm",
               "worse": "high", "available": 47, "range": [107, 362] }, ...],   // "colour the map by" options
  "points": [{
    "id": "g1075_7875", "name": "near Tiruchirappalli (9 km)", "lat", "lon",
    "district": { id, name, mismatch_index, rainfed_reliability },
    "climate": { ne_monsoon_mm, ne_monsoon_cv_pct, hot_days_per_year },
    "extremes": { rain_1day_100yr_mm, rain_1day_100yr_range, rain_3day_100yr_mm, drought_100yr_pct_of_normal,
                  worst_drought: { year, pct_of_normal, label } },
    "wind": { storm_days_per_year, years_with_storm_day, storm_months: [11, 12] },
    "future": { period, ssp245: { tmax_change_c, hot_days_change, ne_rain_change_pct, ne_rain_change_range,
                                  rain_change_pct }, ssp585: {...} } | null,   // null until grid projections finish
    "engine": { "rainfed": {...}, "tank": {
        top: [{crop, share, suitability, sow}] x3, rice_long: {share, suitability, sow},
        avoid_drought, avoid_wet, safer_drought, not_suitable,                     // crop id lists
        memory_now_looks_safer, memory_2014_looks_safer, decade_dependent, wind_most_exposed,
        drought_2016: { came_through: [...], hit: [...] },
        future: { rice_long: { ssp245: {today, n, min, median, max}, ssp585 }, top_crop: { crop, ssp245, ssp585 } } | null } } }] }
```
UI: read `layers` for the picker, colour each point by `key` (dot path), and use `worse` for the colour direction.
One click on a point shows its `engine` lists ("avoid in a drought year", "came through 2016", "wind-exposed").

## 3. `web/data/crops.json` (Tamil Nadu crops)
```jsonc
{ "id": "black_gram", "name": "Black gram (urad)", "tamil_name": "உளுந்து",
  "type": "cash",                     // cash | forage | green_manure
  "sow_months": [1, 2, 6, 9, 10],     // months it is normally sown (TN seasons / pattams)
  "duration_days": 75,
  "water_need_mm": 300,               // seasonal crop water use
  "heat_tolerance": "medium",         // low | medium | high
  "flood_tolerance": "low",           // low | medium | high (waterlogging)
  "nitrogen_fixing": true,
  "root_depth": "medium",             // shallow | medium | deep
  "erosion_control": "low", "organic_matter": "low", "forage_value": "medium",
  "pest_family": "legume",
  "market": "medium", "msp": true,    // msp = Govt of India minimum support price exists
  "source": "approximate; ..." }
```

### 3a. `storage` per crop (IDEAS I28)
`"storage": { "level": "high" | "medium" | "low", "keeps_months": 12, "main_risk": "pulse beetle", "source": "..." }`,
null for green manures. The engine's `storage` sub-score uses it (see `EXTRA_PRIORITIES` in §4).

## 4. Scoring API (`web/js/scoring.js`)

### Inputs
```js
// A rotation is a cycle of 1-2 years. Each year is a list of slots {crop, sow}.
// Kar rice (June) then Pishanam rice (October), every year:
const rotation = [[{ crop: "rice_short", sow: 6 }, { crop: "rice_long", sow: 10 }]];
// Two-year rotation: year 1 rice + rice-fallow black gram, year 2 cotton
const rot2 = [[{ crop: "rice_long", sow: 9 }, { crop: "black_gram", sow: 2 }], [{ crop: "cotton", sow: 9 }]];

const prefs = {
  weights: { water: 3, income: 3, soil_structure: 3, nitrogen: 3,
             erosion: 3, forage: 1, reliability: 4 },   // 0..5 each (labels: PRIORITIES)
  water_source: "canal",                                // rainfed | tank | canal | borewell
  scenario: { dT_c: 0, dPrecip_pct: 0 }                 // climate-shift sliders
};
```

### Exports
```js
generateStrategies(site, crops, currentRotation, prefs, n = 2) -> Strategy[]  // [current, "Bigger shift", "Small step"]
scoreRotation(site, crops, rotation, prefs)                    -> Strategy    // score any custom rotation
siteHighlights(site, prefs)                                    -> string[]    // plain-language site facts
trendScenario(site, years = 10)                                -> { dT_c, dPrecip_pct }  // "extend observed trend" preset
statewideContext(sites, crops, prefs)                          -> { median_share: {cropId: 0..1} }
   // compute once per water source / scenario over all grid sites (~0.6 s), pass as `context` below
rankCrops(site, crops, prefs, n = 3, context?)                 -> CropPick[]  // ordered by suitability; first picks
                                                                  // come from different crop families
cropSuitability(site, crops, cropId, prefs, context?)          -> CropPick    // one crop at one spot (heatmap cell)
   // CropPick also has: suitability (0-100, COLOUR THE "FIT" MAP BY THIS, not `total`) and
   //   advantage (share minus statewide median share; null without context)
   // suitability = 50% reliability + 30% priority fit (total) + 20% advantage vs the state median
   // CropPick = { crop, crop_name, tamil_name, sow, sow_label, total, good_years, total_years,
   //              share (good_years/total_years: colour the heatmap by this), water_need_mm,
   //              irrigation_mm, worst[] }; rankCrops items also carry .strategy (full Strategy for a card)
   // ~10-25 ms per site; a full 47-point heatmap for one crop is ~20-60 ms in the browser.
scenarioMonthly(site, scenario)                                -> [{month, precip_mm, et0_mm, water_balance_mm,
                                                                    heat_days, heavy_rain_days, tmax_c}] x12
                                                                  // same adjusted climate the scores use (for calendar bands)
extremeYearCheck(site, crops, prefs, extremes)                 -> see §2g          // 1-in-100 events + crops in the worst years
memoryCheck(site, crops, prefs, opts)                          -> see §2h          // last 10 years vs full record
windRisk(site, crops, prefs, wind)                             -> see §2i          // wind / cyclone exposure per crop
damCheck(site, crops, rotation, prefs)                         -> see §2a-dam      // "has the dam opened?" (delta)
EXTRA_PRIORITIES  -> { storage: "Can store and sell later" }     // engine-ready priorities not yet in PRIORITIES;
                                                                  // add a slider + Tamil label, then pass weights.storage
DEFAULT_CURRENT[siteId]  -> { rotation, water_source }          // starting point per demo site
WATER_SOURCES, PRIORITIES, MONTHS                               // labels for UI controls
cropLabel(crop)          -> "Black gram · உளுந்து"
```
`generateStrategies` takes ~1–1.5 s with 21 crops (was ~0.4 s with 16). Debounce slider changes by about 250 ms and show a "re-scoring…" state.

### `Strategy`
```jsonc
{
  "tag": "Bigger shift",               // "Your current rotation" | "Bigger shift" | "Small step" | "Alternative"
  "label": "Daincha green manure (May) → Pearl millet (Jun) → Cotton (Sep)",
  "rotation": [[{ "crop": "daincha", "sow": 5 }, ...]],
  "water_source": "canal",
  "is_current": false, "feasible": true, "issues": [],
  "total": 83,                          // 0..100
  "subscores": { "water": 0.95, "income": 0.77, "soil_structure": 0.91, "nitrogen": 1,
                 "erosion": 0.89, "forage": 1, "reliability": 0.75, "pest": 1 },
  "replay": { "good_years": 18, "total_years": 24,
              "worst": [{ "year": 2016, "crop": "rice_long", "reason": "Rice, long duration: water: ~205 mm available vs 1200 mm need" }],
              "years": [ { "year": 2001, "ok": true,  "share": 1,   "reason": null },
                         { "year": 2016, "ok": false, "share": 0,   "reason": "Rice, long duration: water: ~219 mm available vs 1200 mm need" } ] },
              // years: every calendar year in order. share = fraction of checks that passed
              // (a year can be checked as either year of a 2-year rotation); ok = share >= 0.5.
  "water_use": { "need_mm": 1200, "irrigation_mm": 64 },   // per year
  "calendar": [ [ { "state": "crop", "crop": "cotton" }, { "state": "bare", "crop": null }, /* x12 */ ] ],
  "why":      ["Better on \"Save water\" (38 → 95 out of 100)", "Uses ~45% less water than your current rotation"],
  "evidence": [{ "text": "Cotton (Sep–Jan): ~640 mm rain in season vs ~700 mm crop need", "months": [9,10,11,12,1] }],
  "benefits": ["..."], "risks": ["2016: ..."], "gaps": ["..."]
}
```
- `calendar[row][month]`: `state` is `crop | cover | bare`. `cover` means green manure.
- `evidence[].months` tells the UI which calendar months to highlight when hovered.
