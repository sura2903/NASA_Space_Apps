# Data contract (Lane A → Lane B)

All files live in `web/data/` and are plain JSON.

## `web/data/sites/index.json`
```json
[{ "id": "iowa_ames", "name": "Ames, Iowa", "lat": 42.03, "lon": -93.62 }]
```

## `web/data/sites/<id>.json`, produced by `pipeline/fetch_power.py`
```jsonc
{
  "id": "iowa_ames", "name": "Ames, Iowa", "lat": 42.03, "lon": -93.62,
  "source": "NASA POWER daily, community=AG",
  "period": { "start": 2001, "end": 2024 },
  "monthly": [            // 12 entries, Jan..Dec, climatology over the period
    { "month": 1,
      "tmax_c": 0.5, "tmin_c": -10.2,          // mean daily max/min air temp
      "precip_mm": 22.0,                        // mean monthly total
      "root_soil_wetness": 0.62,                // GWETROOT 0..1
      "frost_days": 27.1,                       // mean days with tmin < 0 C
      "heat_days": 0.0,                         // mean days with tmax > 35 C
      "water_balance_mm": -5.0                  // precip - Hargreaves ET0
    }
  ],
  "frost": {
    "last_spring_frost_doy_median": 118,
    "first_fall_frost_doy_median": 285,
    "frost_free_days_median": 167
  },
  "trends": {             // linear slope per decade over the period
    "tmax_c_per_decade": 0.21,
    "precip_mm_per_decade": 14.0,
    "heat_days_per_decade": 1.3,
    "root_soil_wetness_per_decade": -0.01
  },
  "annual": [             // one entry per year, for time-series charts
    { "year": 2001, "precip_mm": 820, "tmax_c": 15.1, "heat_days": 4, "frost_days": 140 }
  ]
}
```

## `web/data/crops.json`, hand-curated by Lane A
```jsonc
[{
  "id": "soybean", "name": "Soybean", "type": "cash",   // cash | cover | forage
  "season": "summer",                                   // summer | winter | perennial
  "days_to_maturity": 110,
  "min_frost_free_days": 100,
  "frost_tolerant": false,
  "heat_tolerance": "medium",                           // low | medium | high
  "water_need_mm": 500,                                 // seasonal
  "nitrogen_fixing": true,
  "root_depth": "medium",                               // shallow | medium | deep
  "erosion_control": "low",                             // low | medium | high
  "organic_matter": "low",
  "forage_value": "low",
  "pest_family": "legume",                              // used for pest-cycle breaks
  "market": "high",
  "source": "approximate; verify with local extension service"
}]
```

## Scoring (implemented in `web/js/scoring.js`)
Inputs: site JSON, crops, current rotation (list of crop ids), farmer priority
weights 0–5 for: `water`, `income`, `soil_structure`, `nitrogen`, `erosion`, `forage`.

Per candidate rotation (2–4 crops, including the current one):
1. **Feasibility (hard filters):** each crop fits frost-free days; winter crops need
   `frost_tolerant`; high heat-day months penalize `heat_tolerance: low`.
2. **Sub-scores 0–1:** water fit (crop water need vs growing-season precip and
   water balance), soil (N-fixing, root depth, organic matter), erosion (cover in
   bare months), pest break (distinct `pest_family` in sequence), income (`market`),
   forage.
3. **Total** = weighted sum by priorities. Show the top 2 alternatives plus the current rotation.
4. **Explanation:** each sub-score emits a sentence that cites the data,
   e.g. "Jul–Aug water balance is −85 mm, so a high-water crop is risky."
5. **Gaps and risks:** always list what the data doesn't cover (soil type, local
   pests, markets, irrigation) and flag low-confidence calls.
