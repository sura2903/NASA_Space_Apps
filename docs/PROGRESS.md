# Progress log

Newest first. Note contract changes here.

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
