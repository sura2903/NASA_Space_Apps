"""Slim per-place summary for the map pages (0.25 deg grid, RESEARCH_LOG I-38): web/data/grid/summary.json.

The Policy view colours its map from only a few fields per place, but loads every full grid file (~110 KB each,
~20 MB for 185 places). This file holds just those fields (~40 KB) so the map can draw from one request and the
full <id>.json can be fetched only when someone clicks a place (the crop-switch what-if needs it).

    python pipeline/grid_summary.py
"""
from __future__ import annotations

import json
from pathlib import Path

GRID = Path(__file__).resolve().parents[1] / "web" / "data" / "grid"
TREND_KEYS = ("precip_mm_per_decade", "power_precip_mm_per_decade", "heat_days_per_decade", "root_soil_wetness_per_decade")


def main():
    idx = json.loads((GRID / "index.json").read_text(encoding="utf-8"))
    rows = []
    for p in idx["points"]:
        s = json.loads((GRID / f"{p['id']}.json").read_text(encoding="utf-8"))
        t = s.get("trends") or {}
        rows.append({"id": p["id"], "name": p["name"], "name_ta": p.get("name_ta"), "lat": p["lat"], "lon": p["lon"],
                     "period": s.get("period"),
                     "trends": {k: t.get(k) for k in TREND_KEYS},
                     "groundwater": {"lwe_trend_cm_per_year": (s.get("groundwater") or {}).get("lwe_trend_cm_per_year")},
                     "has_soil": bool(s.get("soil"))})
    out = {"cell_deg": idx["cell_deg"], "fields": "the per-place fields the Policy map reads; full data in <id>.json",
           "points": rows}
    (GRID / "summary.json").write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"{len(rows)} places -> summary.json ({(GRID / 'summary.json').stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
