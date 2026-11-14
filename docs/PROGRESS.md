# Progress log

Newest first. Note contract changes here.

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
