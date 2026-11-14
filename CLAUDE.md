# Field Shift — NASA Space Apps 2026 (10-hour build)

Challenge: https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/

## Goal
A farmer-friendly decision-support web tool: pick a location, enter the current
rotation and priorities, and see **at least 3 rotation strategies (including the
current one)** compared side by side. Each strategy shows: why it was suggested,
the NASA-data evidence behind it, benefits, information gaps, and risks needing
local review. The tool supports farmer judgment; it never replaces it.

## Scope rules (10 hours — protect these)
- **One data source done well first: NASA POWER** (no login, simple API). Add
  SMAP / GPM / MODIS NDVI only if hours 1–6 are on schedule.
- **3 demo sites** precomputed (Tirunelveli, Madurai, Thanjavur). Live
  "click anywhere" is a stretch goal.
- **Rule-based, explainable scoring** in the browser. No black-box ML. An LLM
  is optional for wording only, never for the numbers.
- Every number shown in the UI must come from `web/data/*.json`. Nothing hardcoded.

## Region (decided)
Tamil Nadu, India: monsoon uncertainty and water shortage. Hero site
**Tirunelveli** (team member's family village; canal-fed paddy, banana, dry crops),
plus Madurai and Thanjavur. Farmer-first UI with an "Expert details" toggle and
Tamil crop names. The task list lives in `docs/TASKS.md` and the log in `docs/PROGRESS.md`.

## Two lanes (two people, two Claude Code sessions, one repo)
| Lane | Owner | Owns these paths only |
|---|---|---|
| A — Data, agronomy, scoring engine | Siddarth | `pipeline/`, `web/data/`, `web/js/scoring.js` |
| B — Web app, UX, story | Nimalan | `web/` except `web/data/` and `web/js/scoring.js` |

Shared and edited by both only together: `CLAUDE.md`, `docs/data_contract.md`.
The **data contract** (`docs/data_contract.md`) is the only interface between
lanes. Change it only after telling the other person.

## Timeline
- 0–1h: together: pick sites, read this file, agree on the contract.
- 1–4h: A runs `pipeline/fetch_power.py` for the sites and fills
  `web/data/crops.json`. B builds the UI against `web/data/sites/sample_site.json`.
- ~4h: integrate real site files.
- 4–7h: scoring and explanations (B implements `web/js/scoring.js` from the
  rules in the contract; A checks the agronomy makes sense).
- 7–8h: polish, uncertainty and "ask a local expert" notes, glossary (NDVI,
  evapotranspiration, soil moisture anomaly, frost risk).
- 8–10h: deploy to GitHub Pages, demo video, slides, submission.

## Conventions
- Python 3.10+, `pip install -r pipeline/requirements.txt`.
- Front end: plain HTML + JS modules, no build step. Chart.js and Leaflet from CDN.
- Commit small, push often, pull before starting work.
- Never commit raw downloads: `data/raw/` is gitignored.
- Crop values in `crops.json` are approximate. Cite a source in each crop's
  `source` field when you can.
