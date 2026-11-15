"""Attach the statewide ENSO/IOD evidence (RESEARCH_LOG I-22) to web/data/climate_indices.json.

Numbers come from the year-level permutation test run in the browser on the engine (web/js/scoring.js):
for each crop at its best sowing month, the share of the 47 grid points that came through each season
2001-2024, grouped by the season's ENSO / IOD phase; p = permutation test (5000 shuffles of the phase labels
over the 24 seasons) on the spread of phase means. Re-run that test if the engine or data change.
Also stores the long-record check (POWER NE-monsoon rain 1981-2024 vs ONI) showing the link is not stable.

    python pipeline/add_enso_evidence.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "web" / "data" / "climate_indices.json"

EVIDENCE = {
    "method": ("Statewide (47 grid points), seasons 2001-2024. Share of points where the crop came through, by the "
               "season's phase. p = permutation test over the 24 seasons (not over points, which share the same years)."),
    "crops": {
        "rice_long": {"water_source": "tank", "el_nino": 0.48, "la_nina": 0.67, "neutral": 0.16, "enso_p": 0.002, "iod_p": 0.449,
                      "verdict": "odds differ by ENSO phase (2001-2024); neutral seasons included the 2016 and 2012 droughts"},
        "groundnut": {"water_source": "rainfed", "el_nino": 0.44, "la_nina": 0.59, "neutral": 0.32, "enso_p": 0.008, "iod_p": 0.876,
                      "verdict": "odds differ by ENSO phase (2001-2024)"},
        "cotton": {"water_source": "rainfed", "el_nino": 0.74, "la_nina": 0.66, "neutral": 0.55, "enso_p": 0.182, "iod_p": 0.828,
                   "verdict": "no reliable difference by phase"},
        "black_gram": {"water_source": "rainfed", "el_nino": 0.84, "la_nina": 0.91, "neutral": 0.79, "enso_p": 0.552, "iod_p": 0.900,
                       "verdict": "steady in every phase"},
        "sesame": {"water_source": "rainfed", "el_nino": 0.93, "la_nina": 0.91, "neutral": 0.91, "enso_p": 0.895, "iod_p": 0.870,
                   "verdict": "steady in every phase"},
        "kodo_millet": {"water_source": "rainfed", "el_nino": 0.96, "la_nina": 0.94, "neutral": 0.95, "enso_p": 0.867, "iod_p": 0.833,
                        "verdict": "steady in every phase"},
    },
    "rain_link": {
        "summary": ("NE-monsoon rain vs ONI is weak and unstable: 2001-2024 IMERG at 50 points median rho -0.28 (La Nina "
                    "seasons +19%, El Nino -4%, neutral -23%); POWER 1981-2024 rho Tirunelveli +0.24, Madurai -0.12, Thanjavur "
                    "-0.10, none significant, and the sign flipped inland between 1981-2000 and 2001-2024."),
        "usable_as_forecast": False,
    },
}


def main() -> None:
    d = json.loads(PATH.read_text())
    d["evidence"] = EVIDENCE
    PATH.write_text(json.dumps(d, indent=1))
    print("evidence added for:", list(EVIDENCE["crops"]))


if __name__ == "__main__":
    main()
