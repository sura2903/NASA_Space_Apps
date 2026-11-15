# Lane B log: web app + story (Nimalan)

Newest first. Lane B owns `web/` except `web/data/` and `web/js/scoring.js`.
Work happens on branch `claude/project-thread-awt5jb` and reaches `main` through a pull
request, so it never collides with Lane A's direct pushes. Rebase on `origin/main`
before every push.

## 2026-11-14: first full UI (B1–B8)

Run it: `python -m http.server 8000 --directory web`, then open http://localhost:8000/.

| Task | Status | Where |
|---|---|---|
| B1 Layout, site picker (Leaflet map + dropdown), Expert details toggle | ✅ | `index.html`, `js/ui/map.js`, `js/app.js` |
| B2 Rotation editor (crop + sowing month per slot, 1–2 year cycles, Tamil names), water source, 7 priority sliders | ✅ | `js/ui/inputs.js` |
| B3 Site panel: `siteHighlights()` bullets, monthly rain vs ET chart, NE-monsoon year-by-year chart (IMD "deficient" years marked), NDVI chart in expert view | ✅ | `js/ui/charts.js` |
| B4 Field Calendar ribbon (crop / green manure / bare) under rain, dry, heat and downpour bands; evidence chips highlight their months | ✅ | `js/ui/calendar.js` |
| B5 Three strategy cards: tag, rotation with Tamil names, score, "came through X of N years" strip, water need, why / evidence / benefits / risks / gaps, sub-scores in expert view | ✅ | `js/ui/cards.js` |
| B6 Climate-shift sliders (°C, rain %) + "continue the observed trend" (`trendScenario`) + reset; 250 ms debounce | ✅ | `js/ui/inputs.js` |
| B7 Glossary tooltips (hover, focus or tap) auto-applied to engine text, plus a glossary list | ✅ | `js/ui/glossary.js` |
| B8 Printable "take this to your agriculture officer" sheet (print CSS, A4) | ✅ | `js/ui/printsheet.js`, `css/app.css` |
| B9 GitHub Pages deploy | 🔄 workflow ready; needs Settings → Pages → Source: GitHub Actions | `.github/workflows/pages.yml` |

How it uses the contract:
- Calls only `generateStrategies`, `siteHighlights`, `trendScenario`, `DEFAULT_CURRENT`,
  `WATER_SOURCES`, `PRIORITIES`, `MONTHS`, `cropLabel`. No scoring in the UI.
- Every number on screen comes from `web/data/*.json` or the engine output. The only
  numbers in UI code are slider defaults/ranges, the 10-year trend preset length, and the
  IMD definitions (heavy rain ≥ 64.5 mm, "deficient" monsoon = 20%+ below average).
- Cards show the current rotation first, then the alternatives sorted by score; the
  highest score gets a "Best fit for your priorities" badge.
- Choosing a site resets the rotation and water source to `DEFAULT_CURRENT[site]`.
- The URL keeps the site (`#site=madurai`) so a link opens the same place.

Contract questions for Lane A (not changed, just noted):
- `replay` gives counts plus the 3 worst years. A per-year pass/fail list
  (`replay.years: [{year, ok}]`) would let the UI draw the 24 squares in year order and
  mark 2016 / 2023 directly.
- `evidence` items with `months: []` (replay, soil) are shown as plain facts with no
  calendar link. Fine as is.
- The calendar stress bands use the observed `monthly` averages, not the climate-shift
  scenario (the engine does not export its adjusted climate). The card scores do include
  the scenario. Exporting the adjusted monthly array would let the bands move too.

Engine observations from UI testing (for Lane A to judge, nothing changed):
- In a 2-year rotation that repeats a crop, `evidence` lists the same crop line twice
  (one per year), which reads as a duplicate on the card.
- Tirunelveli: "Bigger shift" (daincha → pearl millet → cotton) and the third option can
  differ only by daincha vs sunnhemp. A rule that the third pick must differ in a cash
  crop would make the comparison more useful.
- Tirunelveli with the trend preset (+0.7 °C, −15% rain): the Bigger shift goes from 18 to
  23 good years, probably because fewer heavy-rain days means fewer waterlogging fails.
  Plausible, but worth a sanity check before the demo.

Known gaps / next:
- B9 Pages deploy (needs a repo setting, see the PR).
- Story framing (T3): Tirunelveli family farm, 2016 failed monsoon, Dec 2023 flood.
- Chart.js and Leaflet load from CDN per CLAUDE.md; without internet the map hides and
  charts are skipped, but the cards still work.

### Contract changes seen 2026-11-15 01:48Z (main d4441ac)
- `dry_spells.by_sow_month`, `ne_onset`, `sowing_rain_onset` in site and grid files (§2). The sowing panel now shows the
  10+ dry-day odds per sowing month, the NE-monsoon onset and the sowing-rain onset (null `doy` = no onset that year).
- `canal_index` for Cauvery-command places; the engine scales the canal budget with it (no UI change needed).
- WIP Layer 3 (`futureRange` in scoring.js, NEX-GDDP-CMIP6): nothing to show yet; B12 waits for the data.

### Contract changes seen 2026-11-15 04:21Z (main ba9db09)
- §2d projections (Layer 3), §2e `climate_indices.json` + `phaseOdds()`, §2f `avoidThisSeason()`, §2g
  `extremes/<id>.json` + `extremeYearCheck()`, five small millets in crops.json. All additive: the current UI
  still runs clean on main (smoke tests t3/t5/t7/t9). None of these are shown in the UI yet; candidates for
  the next Lane B panels (El Niño odds and "avoid this season" on the main page, extremes in the Policy view).

### Contract changes seen 2026-11-15 05:18Z (main 2a7f622)
- §2j `web/data/statewide_risk.json` for the Policy view: per grid point climate, 1-in-100-year extremes, storm
  wind, NEX-GDDP future (null until grid projections finish) and precomputed engine results (top 3, avoid lists,
  2016 drought replay) for rainfed and tank. Additive; the current UI runs clean on it (t3/t5/t7/t8/t9/t14).
  Candidate "colour the map by" layers for the Policy view exposure map.

### Contract changes seen 2026-11-15 06:30Z (main 9114792)
- §2a-dam `dam` (Mettur season) in Cauvery-delta files + `damCheck()`; §2a-appeears `ndvi`, `smap`, `elevation_m`
  in the demo-site files; §3a `storage` per crop (perishability sub-score). All additive; the UI runs clean
  (t3/t5/t7/t8/t9/t14).
- Done (Lane B): the sowing panel now reads `site.smap.latest` (fallback from `site.smap_recent`); the data has `site.smap.latest`
  ({month, value, anomaly}, surface 0–5 cm), shown as "latest available (Dec 2024)" with a care note where `smap.quality` is not recommended (Thanjavur).
