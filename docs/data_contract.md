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
  "sowing_rain_onset": { ...same shape..., "search_from": "09-15" }   // first reliable sowing rains (Purattasi pattam)
}
```

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
Be honest: rice (tank-irrigated) and green gram show **no skill** (lift ≈ 1).

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
DEFAULT_CURRENT[siteId]  -> { rotation, water_source }          // starting point per demo site
WATER_SOURCES, PRIORITIES, MONTHS                               // labels for UI controls
cropLabel(crop)          -> "Black gram · உளுந்து"
```
`generateStrategies` takes ~0.4 s. Debounce slider changes by about 250 ms.

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
