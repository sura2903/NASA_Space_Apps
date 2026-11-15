"""Give Cauvery-fed places a canal water index from upstream catchment rain (rice skill fix, RESEARCH_LOG I-17).

The delta's canal water comes from Mettur dam, filled by the June-September monsoon over the upper Cauvery
catchment in the Western Ghats, not by local rain. The engine's default canal budget scales with *local*
Jun-Dec rain, which gave no backtest skill for delta rice. This adds to Cauvery-command site/grid files:
  canal_index: { source, method, years: { "2001": 0.78, ... } }   (catchment JJAS / 2001-2024 mean)
scoring.js uses it (when present) to scale the canal budget for the water-year starting that June.

Cauvery command here = Thanjavur demo site + grid points with lat 10.25-11.25 and lon >= 78.75
(Tiruchirappalli, Thanjavur, Thiruvarur, Nagapattinam, Mayiladuthurai area).

    python pipeline/add_canal_index.py      (run after merge_imerg.py / merge_dryspells.py)
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = json.loads((Path(__file__).resolve().parent / "data" / "cauvery_catchment_jjas.json").read_text())


def main() -> None:
    years = sorted(SRC["jjas_mm"]["kodagu"])
    series = np.array([[SRC["jjas_mm"][p][y] for y in years] for p in SRC["jjas_mm"]], dtype=float).mean(axis=0)
    raw = {y: float(v / series.mean()) for y, v in zip(years, series)}
    # Reservoir carry-over: Mettur storage at season start reflects last year's inflow too. Tested against delta
    # rice production anomalies (2001-2022): rho +0.32 for this year alone, +0.36 with 60/40 carry-over, and
    # planted area responds to last year's index (+0.26). Local NE rain: -0.01 (no signal). RESEARCH_LOG I-17.
    idx = {}
    for i, y in enumerate(years):
        prev = raw[years[i - 1]] if i > 0 else raw[y]
        idx[y] = round(0.6 * raw[y] + 0.4 * prev, 3)
    block = {"source": SRC["source"], "points": SRC["points"],
             "method": ("0.6 x this year's + 0.4 x last year's June-September IMERG rain over the upper-Cauvery "
                        "catchment (each divided by the 2001-2024 mean); the 0.4 term stands for Mettur storage carry-over"),
             "raw_index": {y: round(v, 3) for y, v in raw.items()},
             "years": idx}
    targets = [ROOT / "web" / "data" / "sites" / "thanjavur.json"]
    grid = json.loads((ROOT / "web" / "data" / "grid" / "index.json").read_text(encoding="utf-8"))
    for p in grid["points"]:
        if 10.25 <= p["lat"] <= 11.25 and p["lon"] >= 78.75:
            targets.append(ROOT / "web" / "data" / "grid" / f"{p['id']}.json")
    for path in targets:
        site = json.loads(path.read_text(encoding="utf-8"))
        site["canal_index"] = block
        path.write_text(json.dumps(site, indent=2, allow_nan=False), encoding="utf-8")
    low = sorted(idx, key=idx.get)[:4]
    print(f"canal_index added to {len(targets)} files: {[t.stem for t in targets]}")
    print(f"driest catchment years: {[(y, idx[y]) for y in low]}")


if __name__ == "__main__":
    main()
