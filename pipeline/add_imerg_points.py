"""Add new places' IMERG summaries (0.25 deg grid refinement, RESEARCH_LOG I-38) to the three IMERG data files.

Input: one JSON posted from the browser (NASA Giovanni, user's Earthdata session), computed from GPM IMERG Final daily
V07 2001-2024 with the SAME definitions as the original files (checked: identical results for g1075_7875):
  { monthly: {id: {query_lat, query_lon, grid_lat, grid_lon, days, months{YYYY-MM: [total, heavy_days, max_day]}}},
    maxima:  {id: {lat, lon, years{YYYY: {rx1, rx1_date, rx3, rx5}}}},
    dry:     {id: {dry_spells{...}, ne_onset{search_from, years}, sowing_rain_onset{...}}} }
Merges into pipeline/data/imerg_grid_monthly_2001_2024.json, imerg_annual_maxima.json and imerg_dryspells_onset.json
(existing entries are kept; new ids are added). Then run merge_imerg.py --grid, merge_dryspells.py, extremes.py.

    python pipeline/add_imerg_points.py <posted.json>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

D = Path(__file__).resolve().parent / "data"


def main():
    new = json.loads(Path(sys.argv[1]).read_text())
    files = {"monthly": D / "imerg_grid_monthly_2001_2024.json", "maxima": D / "imerg_annual_maxima.json",
             "dry": D / "imerg_dryspells_onset.json"}
    for key, f in files.items():
        data = json.loads(f.read_text())
        before = len(data["sites"])
        for pid, v in new[key].items():
            data["sites"].setdefault(pid, v)          # never overwrite an existing place
        f.write_text(json.dumps(data, separators=(",", ":")) if key == "monthly" else json.dumps(data, indent=1))
        print(f"{f.name}: {before} -> {len(data['sites'])} places")


if __name__ == "__main__":
    main()
