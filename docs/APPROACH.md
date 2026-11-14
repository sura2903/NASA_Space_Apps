# Approach: how Field Shift stands out

Most teams will build "NASA data dashboard + chatbot that suggests crops". We
answer the challenge's hardest asks (evidence, uncertainty, farmer-centered
design) with five ideas that are each cheap to build on our data.

## The five ideas

### 1. Historical replay → resilience score (core differentiator)
Instead of judging a rotation against *average* weather, we replay it through
**every real year 2001–2024** of NASA POWER data. Each crop is checked against each
year's actual season: rain vs. need, heat days in season, late spring / early fall
frost. Output: *"This rotation would have come through 21 of 24 seasons without
water or heat stress; worst year was 2012 (Jul water balance −140 mm)."*
- Gives **evidence** from what actually happened, not a guess.
- Gives honest **uncertainty**: a range of outcomes, not one number.
- Surfaces drought years (2012 corn belt) that farmers remember. That builds trust.

### 2. Field Calendar: see the bare months
A month-by-month ribbon for each rotation year: crop / cover crop / **bare soil**,
drawn on top of climate stress bands (frost, heat, water deficit, heavy-rain
months). Bare soil during the wettest months is visibly an erosion risk.
Directly answers "highlight times when fields are typically bare".
*Stretch:* overlay MODIS NDVI (satellite greenness) to show when fields at that
spot are **actually** bare.

### 3. Climate shift slider
Sliders for "+°C" and "± rainfall %" (default preset: extend the site's own
observed 2001–2024 trend 10 years forward). All strategies re-score live.
Labeled clearly as illustrative, not a forecast.

### 4. Priority sliders → live re-ranking with plain-language "why"
The farmer sets 0–5 weights: save water, income, soil structure, nitrogen,
erosion control, forage, reliability. Strategies re-rank instantly. Every reason
is a sentence that cites a number from the data ("evidence chips"); clicking a
chip highlights that month on the calendar.

### 5. "Take this to your extension agent" sheet
A printable one-page summary: the 3 strategies, the evidence, and an
auto-generated checklist of **what the data can't tell us** (soil test, local
pests, markets, irrigation rights, equipment). This hands off to the local expert,
which is exactly the "supports, doesn't replace" spirit the challenge asks for.

## Data plan (from the challenge Resources tab)

About half the listed resources are **US-only**: USDA Web Soil Survey, SSURGO,
CropScape CDL, PRISM, NAIP, NLCD, CoCoRaHS, NWIS, AMS Market News, NASS
QuickStats, OpenET, LANDFIRE. Outside the US we rely on the **global** ones,
which are the NASA missions themselves: SMAP, GPM IMERG, Landsat, MODIS/VIIRS,
POWER, SRTM, ECOSTRESS, GLDAS, GEDI, FAO GAEZ, plus ESA's Sentinel-2 and ERA5.

### Tier 1: no login, scripted (hours 0–3)
| Source | Use | Status |
|---|---|---|
| NASA POWER | daily temp, precip, root-zone soil wetness → seasons, heat days, water balance (Hargreaves ET0), trends, per-year replay | working |
| ISRIC SoilGrids 2.0 (non-NASA, global) | texture, organic carbon, pH → water-holding buffer and erosion notes | API confirmed |

### Tier 2: one free NASA Earthdata login, via **AppEEARS point samples** (submit in hour 1, results arrive later)
AppEEARS (appeears.earthdatacloud.nasa.gov) returns a CSV time series for a list of
points, covering four of the listed NASA datasets in one request:
| Product | Use |
|---|---|
| MODIS MOD13Q1 NDVI (250 m, 16-day) | **observed** greenness calendar → real bare-soil months, vegetation stress |
| SMAP L4 root-zone soil moisture (SPL4SMGP, 9 km) | satellite soil-moisture anomalies → dry-season stress evidence |
| ECOSTRESS ET / LST (70 m, irregular) | heat and evapotranspiration hotspots (sparse; supporting evidence only) |
| SRTM elevation | slope context for erosion risk |
A teammate creates the Earthdata account and submits the request (the AppEEARS web
UI is fine; upload `pipeline/points.csv`). Save the CSVs to `data/raw/appeears/`.
**Submit early**, since the processing queue can take an hour or more.

### Tier 3: stretch
| Source | Use |
|---|---|
| GPM IMERG via Giovanni (area-averaged time series → CSV) | monsoon / rainfall reliability, extreme-rain days; cross-check POWER precip |
| GRACE / GRACE-FO mascons | regional groundwater-storage decline → "water shortage" evidence panel |
| FAO GAEZ crop suitability | sanity check on the crop table and suggested crops |
| GLDAS | backup soil moisture and ET if SMAP is late |

If the demo sites are in the US, add SSURGO (soil), CropScape (actual past
rotations), and NASS (yields) as ground truth.

## Requirement → feature map
| Challenge asks for | Where we deliver it |
|---|---|
| NASA EO + local soil + crop traits + farmer priorities | POWER + SoilGrids + `crops.json` + priority sliders |
| Compare ≥3 rotations incl. existing | current rotation + top 2 generated alternatives |
| Why / evidence / benefits / gaps / risks per strategy | strategy card sections, every sentence data-backed |
| Bare-field periods, vulnerable seasons | Field Calendar + stress bands |
| Pest cycles, water demand, infiltration, income | pest-break, water, soil, income sub-scores |
| Uncertainty, where local expertise is needed | replay range ("21/24 years"), gaps list, extension-agent sheet |
| Explain terms (ET, NDVI, anomalies, frost risk) | glossary tooltips |
| Maps, timelines, scenario sliders | site map, annual time series, climate-shift slider |
| Farmer-friendly, limited technical experience | plain language, big controls, no jargon without a tooltip |

## Honest limits (we say these in the demo)
- POWER is a ~50 km grid, so it describes the region, not a single field.
- Crop traits are approximate, and the scoring rules are simple heuristics we can explain, not a trained model.
- Climate-shift adjustments are rough scalings for exploration only.
