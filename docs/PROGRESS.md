# Progress log

Newest first. Note contract changes here.

## 2026-11-14 (Nimalan / Lane B)
- Full UI for B1–B8 on branch `claude/project-thread-awt5jb`, PR #2. B9 Pages workflow is
  ready and needs Settings → Pages → Source: GitHub Actions.
- No contract changes. Contract questions and engine observations are in `docs/LANE_B.md`.

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
