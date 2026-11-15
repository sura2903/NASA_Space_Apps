# Progress log

Newest first. Note contract changes here.

## 2026-11-15 (Nimalan / Lane B): Tamil switch + crop map page
- English / Tamil button on both pages (one language at a time). Engine sentences are still English;
  a Tamil option in `scoring.js` would finish it (`docs/IDEAS.md` I2).
- New `web/explore.html` crop map: pick a crop → how it fares at each place; click anywhere → top 3
  crops at the nearest place. Runs on the 3 sites now. **Request for Lane A:** a grid in
  `web/data/grid/` (format proposed in `docs/IDEAS.md`); the page picks it up with no code change.
- UI now uses `replay.years` and `scenarioMonthly`. No contract changes.

## 2026-11-14 late night (Siddarth / Lane A): crop values tuned to official TN sources (A10)
- **Sources:** TN Dept of Agriculture *Crop Production Guide* chapter PDFs (tnagriculture.in/dashboard/CPG/…)
  for sowing seasons and durations by zone and district; TNAU agronomy course notes (eagri.org AGRO103
  lec07) for total crop water need. TNAU's Agritech portal has an expired TLS certificate, so it wasn't used.
  Every crop's `source` field now cites where its numbers came from.
- **Main changes:**
  - Sowing windows now follow the official southern-zone and delta pattams. Examples: rice_short adds
    Early Kar Apr–May and Kar May; groundnut Thai Jan–Feb (Tirunelveli); millets and sorghum add Chithirai
    Apr–May; cotton winter Aug–Sep and summer Feb–Mar; sugarcane Dec–May.
  - Water needs: rice short 1100 / long 1250 (TNAU 1100–1250), cotton 700→600, groundnut 525, ragi 400→350,
    sorghum 425.
  - Durations: groundnut 105, sorghum 100, black gram 70.
- Banana, daincha and sunnhemp stay approximate (no season table in the field-crops guide).
- **Engine speed:** more sowing months meant ~2 s per site. Bitmask overlap checks and a per-(site, scenario)
  climate cache bring it to ~0.8–1.0 s. "Small step" candidates are now always shortlisted.
- Results now: Tirunelveli rice–rice 20/24 → Small step (daincha → pearl millet May → Samba rice Aug) 24/24,
  25% less water. Madurai tank rice 11/24 → Bigger shift (cotton + pearl millet) 22/24.

## 2026-11-14 night (Siddarth / Lane A): Lane B engine requests done; Pages live
- **GitHub Pages enabled** (source: GitHub Actions). Live at https://sura2903.github.io/NASA_Space_Apps/
  The site is public even though the repo is private.
- `replay.years` added: a per-year pass/fail list (with share and reason) for drawing 24 squares in order.
- New export `scenarioMonthly(site, scenario)`: the scenario-adjusted monthly climate, so calendar bands can move.
- Two-year rotations no longer repeat the same crop's evidence line.
- Sanity check on "drier scenario improves Bigger shift": a **real artefact**. Scaling a 2-heavy-day year by
  0.97 dropped it under the waterlogging limit. Fixes: heavy-rain counts are rounded before the check, and
  heavy days scale ~7%/°C with only half of any rainfall change. Drier/hotter scenarios now never improve outcomes
  (Madurai rice 13→6/24 at −15% rain; Thanjavur Kuruvai 14→8/24 at +1.5 °C).

## 2026-11-14 evening: PR #2 merged into main (Lane B web app, incl. IMERG labels + two-datasets box)

## 2026-11-14 (Nimalan / Lane B)
- Full UI for B1–B8 on branch `claude/project-thread-awt5jb`, PR #2. B9 Pages workflow is
  ready and needs Settings → Pages → Source: GitHub Actions.
- No contract changes. Contract questions and engine observations are in `docs/LANE_B.md`.

## 2026-11-14 evening (Siddarth / Lane A): IMERG is now the rainfall source
- Pulled **GPM IMERG Final daily V07** (0.1° grid) for 2001–2024 at all 3 sites via the NASA GES DISC
  Giovanni Time Series API (the old Data Rods service is retired; AppEEARS has no IMERG).
  Monthly aggregates are in `pipeline/data/imerg_monthly_2001_2024.json`; `pipeline/merge_imerg.py` merges them.
- **POWER vs IMERG:** Tirunelveli POWER 1300 vs IMERG 948 mm/yr. The excess is in Jun–Sep, Western Ghats
  rain leaking into POWER's ~50 km cell. Oct–Dec agrees (543 vs 515). Madurai 1004 vs 1010, Thanjavur 1055 vs 1177.
  Monthly correlation 0.78 / 0.94 / 0.97. Both sources agree 2016 was the driest NE monsoon at every site.
  The −283 mm/decade Tirunelveli trend was a POWER artefact (IMERG: +56).
- **Contract v2.1 (additive, nothing removed):** site JSON gains `precip_source` and `rain_comparison`
  (good for a "two NASA datasets agree / disagree" panel), plus `power_precip_mm` next to every `precip_mm`.
  Rain fields now hold IMERG; temperature and ET0 stay POWER.
- Engine: "Small step" = at most 1 new main crop; "Bigger shift" = 2 or more (they were near-duplicates).
- Tirunelveli now: rice–rice 20/24 years OK; Small step (daincha → sorghum → Pishanam rice) 23/24 with 20%
  less water; Bigger shift (pearl millet → cotton) 20/24 with 45% less water.
- **Note for Lane B:** browsers cache ES modules hard. If engine changes don't show up, hard-reload or import
  with `?v=` (see `web/dev/engine-test.html`).
- Caveat: IMERG also smooths extremes. Dec 2023 shows 124 mm max/day, while stations recorded far more.

## 2026-11-14 later (Siddarth / Lane A)
- MODIS NDVI (ORNL, 3×3 km median, 2019–2024) is now in all three TN site files. No bare
  months show up because the window mixes in trees, so it needs per-pixel AppEEARS data.
- AppEEARS point request `field-shift-tn-points` submitted (MOD13Q1 NDVI + reliability,
  SMAP SPL3SMP_E AM soil moisture, SRTM DEM; 9 points; 2015-04-01 → 2024-12-31). Status: pending.
- New site fields: `heat_threshold_c`, `heavy_rain_days`, `max_daily_precip_mm` (in contract v2).

## 2026-11-14 (Siddarth / Lane A)
- **Region decided: Tamil Nadu.** Hero site Tirunelveli (family village); Madurai and
  Thanjavur as contrasts. Default "current rotation" for Tirunelveli: Kar rice (Jun) +
  Pishanam rice (Oct) on canal water.
- Pipeline produces per-year history, heavy-rain days (≥64.5 mm), 38 °C heat days and
  SoilGrids soil for all three sites. US sites kept in `web/data/sites/_us_backup/`.
- **Contract v2:** rotations are season-based (`[[{crop, sow}]]`) instead of frost-based;
  added `water_source`, `tamil_name`, `sow_months`, `flood_tolerance`, `msp`.
- Scoring engine v1 working (`web/dev/engine-test.html`), ~0.4 s per site. First results:
  - Tirunelveli rice–rice on canal: 21/24 years OK; fails 2016, 2012, 2022 (water).
  - Madurai tank-fed Samba rice: only 11/24 years. Cotton + black-gram rotation: 21/24.
  - The data shows the Dec 2023 Tirunelveli flood (209 mm in one day).
- Known issues:
  - POWER rainfall for Tirunelveli (~1300 mm/yr) looks high, probably because the ~50 km
    grid cell includes the Western Ghats. Cross-check with GPM IMERG (A9).
  - Heavy-rain waterlogging rule (≥2 heavy days per season for flood-intolerant crops)
    may be strict. Review it.
  - Crop values are approximate (TNAU check pending).

## 2026-11-15 · Lane B · B11 "How has my climate changed?" panel
- New panel on the main page under the site panel, fed only by `web/data/trends/<id>.json` (contract §2b); hidden if the file is missing.
- "What has clearly changed" list (clear + likely trends only), the site's `caveats` in a "Read with care" box, and a fold-out with all 12 indicators: 1981–2000 vs 2001–2024 averages, a 44-year sparkline with both averages, direction chip and confidence.
- `confidence: "uncertain"` indicators are greyed out with a dashed border, labelled "Datasets disagree", and show the IMERG vs POWER slopes; they never appear as findings.
- Orange = harder for crops, green = easier (from `higher_is_worse`), grey = no clear change. Sen's slope, CI, Mann–Kendall p and change points sit behind Expert details.
- English + Tamil labels; the caveat and method sentences come from the data in English.
- TASKS.md: B1–B8, B10, B11 marked done.

## 2026-11-15 · Lane B · Sow now or wait, dry spells, Policy view (IDEAS I16, I17, I20, I23)
- **Main page, "Sow now or wait?" panel (I16 + I17).** For a crop from the farmer's rotation (or any crop), every allowed
  sowing month is replayed with `scoreRotation` against the 24 real seasons using the farmer's water source. It says
  sow now / wait for {month} / think again, and suggests a shorter variety of the same family or a hardier crop when the
  odds are poor. Dry spells: the NE-monsoon season from `trends/<id>.json` `ne_dry_spell` (share of years with 10+,
  15+, 20+ day breaks). Usual soil wetness from `monthly[].root_soil_wetness`.
- **New `web/policy.html` (I20 + I23).** Climate-exposure map on the 47-point grid: each place is ranked within Tamil Nadu
  on rain trend (IMERG), very-hot-day trend and (when it lands) GRACE groundwater trend, plus an optional soil-drying
  trend; the score is the mean rank (0–100). It warns that IMERG and POWER disagree on the rain-trend sign at 31 of 47
  places. "What if farms switch": irrigation saved = engine `irrigation_mm` difference × 10 m³/ha/mm × area × share,
  with the 24-season reliability of both crops. Farm area now fills in from `districts.json` (DES 2018–22) for the clicked place's district; low-confidence districts are dimmed.
- **Crop map:** now passes `statewideContext` to `cropSuitability` / `rankCrops` and colours "Suitability" by
  `suitability` (contract update in ac2a179).

### Data requests for Lane A (Sid): new fields, all optional, the UI already reads them when present
1. **Dry spells after sowing** (I17), using Sid's definition (≥ 10 days < 2.5 mm within 30 days after sowing on the 1st):
   in every `sites/<id>.json` and `grid/<id>.json`,
   `dry_spells: { threshold_mm: 2.5, window_days: 30, by_sow_month: { "10": { years: 24, ge10: 18, ge15: 9 }, ... } }`.
   The UI then adds a "10+ dry days soon after sowing" column per sowing month (it already reads this shape).
2. **NE-monsoon onset per year** (I16): `ne_onset: { method, years: [{ year, doy }] }` (e.g. IMD-style: first day after
   1 Oct with ≥ 20 mm over 3 days and no 10-day dry spell in the next 30 days).
3. **Latest SMAP soil moisture** (I16): `smap_recent: { date, root_zone, surface, anomaly }` (SMAP L4, last available
   week), so "sow now" can use this season's soil, not just the usual month.
4. **GRACE groundwater trend per grid point** (I20): `groundwater: { source, period, lwe_trend_cm_per_year }` in
   `grid/<id>.json` (GRACE / GRACE-FO mascons). It joins the exposure score automatically.
5. **District crop areas** (I23, also I6 / I21): `web/data/districts.json` =
   `[{ id, name, area_ha: { rice_long, rice_short, ... }, irrigation_share: { canal, tank, borewell, rainfed }, points: [grid ids] }]`
   (DES Season and Crop Report; `pipeline/data/apy_tamil_nadu.csv` from the backtest already has district areas). Then the what-if fills the area in and the map can show districts.
6. Optional: district boundaries (`web/data/districts.geojson`) to draw districts instead of 0.5° squares.
