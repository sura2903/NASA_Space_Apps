# Field notes: user research

Conversations with farmers and other users, logged as close to what was said as possible, then mapped
to what Field Shift does today and what it doesn't. Newest first. No personal details are recorded.

---

## FN-1 · Farmer interview (2026-11-15, by Siddarth)

### What the farmer said (notes)
1. **Timing:** which crop to plant in which **season / month**.
2. **Weather they care about:** weather patterns, **wind speeds**, **El Niño** and climate change.
3. **Extremes:** **once-in-100-year events** and natural disasters (floods, droughts, cyclones).
4. **Memory is short:** farmers usually remember only the **last ~10 years** when judging risk.
5. **What to avoid matters as much as what to plant.** Example: rice needs good water in the soil, so
   **in a drought year you shouldn't plant it**. Alternatives: **black gram (urad)**, **sesame**, etc.
   They want guidance on **what not to plant during droughts, floods**, etc.
6. **Crop economics is central:** it affects the farmer every day. It shapes what they can buy and family
   decisions, and ripples from household (micro) to state (macro) economy.
7. **Prices matter:** prices of different crops, how **resilient a crop is to supply/demand swings**, and
   **state food reserves** in relation to famine risk.
8. **Daily-life impact** on the farmer and family is the real measure of success.

### Siddarth's comment
> The challenge is to **predict floods, droughts, etc. in advance, reliably**.

### How this maps to Field Shift today

| Need | Today | Gap |
|---|---|---|
| 1 Crop by season/month | ✅ sowing-month analysis per crop; "sow now or wait"; dry-spell risk by sowing month; monsoon onset dates | Present it as a simple month-by-month crop calendar per place |
| 2 Wind speed | ❌ not used | NASA POWER has daily wind (WS2M / WS10M): add wind / cyclone-gust exposure |
| 2 El Niño | ❌ not used | Tag each replay year with ENSO / IOD phase (NOAA ONI, IOD index); show "in El Niño years this crop failed X of Y" |
| 2 Climate change | ✅ Layer 1–2 trends; 🔄 Layer 3 NEX-GDDP projections | Finish projections |
| 3 Once-in-100-year events | Partly: replay covers 2001–2024 (Dec 2023 flood, 2016 drought) | 24 years can't show 1-in-100. Extend with POWER/IMERG back to 1981/2000 and fit return periods (GEV) for extreme rain and drought; say plainly what the record can't tell us |
| 4 Short memory (last 10 years) | ✅ the 24-year replay is literally a longer memory than people have | Make this a headline: "your last 10 years vs the last 24 / 44 years" |
| 5 What to avoid | Partly: risks shown per strategy; the mismatch map flags water-dependent crops | Add an explicit **"avoid this season"** list per place and condition (drought-year / flood-year), e.g. "drought year: avoid rice; consider black gram, sesame" |
| 5 Drought-year switching | Partly: "Bigger shift" options; dry-spell risk | A **conditional plan**: if the monsoon is weak / onset late, then switch to X (needs an early-season signal, see FN-1 comment) |
| 6–7 Economics, prices, resilience | Partly: `market` level and MSP flag only | Add real **price history** (Agmarknet / state mandi prices, MSP series): expected income, **price volatility**, income risk. Combine yield risk × price risk into "income reliability" |
| 7 State food reserves | ❌ | Policy view: link crop shifts to food security (FCI / state procurement and stocks); flag shifts that cut staple supply |
| 8 Daily-life impact | Partly: income sub-score | Express results in household terms: expected income range, bad-year income, water and labour needs |
| Advance prediction (comment) | ❌ we explain the past and project the far future | **Seasonal forecast layer**, see below |

### On predicting floods and droughts in advance (Siddarth's comment)
Honest framing for the team:
- **Weather (days–2 weeks):** IMD / ECMWF forecasts are skilful for heavy rain a few days ahead. Useful for
  flood warnings, not for choosing a crop.
- **Seasonal (1–3 months):** skill exists but is moderate. The NE monsoon over Tamil Nadu is linked to
  **ENSO** (El Niño tends to help it, La Niña tends to hurt it) and the **Indian Ocean Dipole** (positive IOD
  helps). IMD issues a seasonal NE-monsoon outlook around late September; NMME / C3S multi-model seasonal
  forecasts are public.
- **Plausible approach for us:**
  1. Tag our 24 replay years by ENSO/IOD phase to measure how much each crop's success depends on them.
  2. Use the current-season ENSO/IOD outlook (+ SMAP soil moisture at sowing) to tilt the odds:
     "with El Niño + positive IOD forecast, black gram's chance is 22/24 vs 18/24 in neutral years".
  3. Always show it as **odds, not a promise**, and validate it with the same backtest approach (hindcast).
- **What not to promise:** reliable month-ahead prediction of specific floods or droughts. Once-in-100-year
  events are by definition outside a short record; we can estimate their likelihood, not their date.

### Candidate work items (to discuss before building)
- E1 ENSO / IOD tagging of replay years + "odds this season" (seasonal outlook). **✅ done (RESEARCH_LOG I-22):**
  the ENSO rain link is weak/unstable; rice and groundnut odds shift by phase; black gram, sesame and millets are
  steady in every phase. Current season: strong El Niño.
- E2 "Avoid this season" lists per place for drought / flood / normal years. **✅ done (RESEARCH_LOG I-23):**
  `avoidThisSeason()`; e.g. tank rice is "avoid in a drought year" at all demo sites, and black gram / sesame /
  millets are safer.
- E3 Price history and income risk (Agmarknet / MSP), yield × price = income reliability.
- E4 Extreme-event return periods (1-in-10 / 1-in-50 / 1-in-100 rain and drought) from the longer record. **✅ done (RESEARCH_LOG I-24):** pooled GEV
  on IMERG 2001–2024; 1-in-100 day of rain 107–362 mm across the state; 2016 was a rarer-than-1-in-100 NE-monsoon
  drought everywhere; `extremeYearCheck()` shows which crops came through it.
- E5 Wind / cyclone exposure from NASA POWER wind.
- E6 "Your last 10 years vs the full record" memory view.
- E7 Food-security lens in the Policy view (staple supply vs reserves).
