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
| B9 GitHub Pages deploy | 🔄 | see below |

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

Known gaps / next:
- B9 Pages deploy (needs a repo setting, see the PR).
- Story framing (T3): Tirunelveli family farm, 2016 failed monsoon, Dec 2023 flood.
- Chart.js and Leaflet load from CDN per CLAUDE.md; without internet the map hides and
  charts are skipped, but the cards still work.
