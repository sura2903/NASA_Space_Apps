"""Backtest step 1: district yield anomalies + targets for the engine replay.

- Reads pipeline/data/apy_tamil_nadu.csv (fetch_apy.py).
- Per district x crop: yield = total production / total area across seasons, 2001-2022 crop years,
  detrended with a Theil-Sen line (technology trend). Bad year = bottom 25% of detrended anomalies.
- Maps each district HQ to the nearest grid point (web/data/grid).
Writes pipeline/data/yield_anomalies.json and web/dev/backtest_targets.json (read by
web/dev/backtest.html, which runs the engine replay in the browser).
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

from build_grid import TOWNS

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
APY = HERE / "data" / "apy_tamil_nadu.csv"
GRID = ROOT / "web" / "data" / "grid" / "index.json"

# APY crop name -> engine crop id, and the water source used in the replay
CROP_MAP = {
    "Rice": ("rice_long", "tank"), "Groundnut": ("groundnut", "rainfed"), "Ragi": ("finger_millet", "rainfed"),
    "Bajra": ("pearl_millet", "rainfed"), "Jowar": ("sorghum", "rainfed"), "Maize": ("maize", "rainfed"),
    "Urad": ("black_gram", "rainfed"), "Moong(Green Gram)": ("green_gram", "rainfed"),
    "Sesamum": ("sesame", "rainfed"), "Cotton(Lint)": ("cotton", "rainfed"),
}
# district HQ coordinates: TOWNS from build_grid plus the newer districts / APY spellings
EXTRA_HQ = {
    "Ariyalur": (11.14, 79.08), "Chengalpattu": (12.69, 79.98), "Kallakurichi": (11.74, 78.96),
    "Mayiladuthurai": (11.10, 79.65), "Ranipet": (12.93, 79.33), "Tirupathur": (12.50, 78.57),
}
ALIASES = {"Kancheepuram": "Kanchipuram", "Kanniyakumari": "Nagercoil (Kanyakumari)",
           "The Nilgiris": "Udhagamandalam (Nilgiris)", "Thiruvallur": "Tiruvallur", "Thiruvarur": "Tiruvarur",
           "Thoothukkudi": "Thoothukudi", "Viluppuram": "Villupuram"}
YEARS = range(2001, 2023)   # crop years 2001-02 .. 2022-23 (start year)
MIN_YEARS = 15


def hq(d: str):
    if d in EXTRA_HQ:
        return EXTRA_HQ[d]
    name = ALIASES.get(d, d)
    for t, la, lo in TOWNS:
        if t == name:
            return la, lo
    return None


def main() -> None:
    df = pd.read_csv(APY)
    df = df[df.season != "Total"]
    df["y0"] = df.year.str.slice(0, 4).astype(int)
    df = df[df.crop_name.isin(CROP_MAP) & df.y0.isin(YEARS)]
    g = df.groupby(["district_name", "crop_name", "y0"])[["area", "production"]].sum().reset_index()
    g = g[(g.area > 0) & (g.production > 0)]
    g["yield"] = g.production / g.area

    grid = json.loads(GRID.read_text())
    pts = grid["points"] if isinstance(grid, dict) else grid

    def nearest(la, lo):
        return min(pts, key=lambda p: (p["lat"] - la) ** 2 + ((p["lon"] - lo) * math.cos(math.radians(la))) ** 2)

    anomalies, targets = {}, []
    for (d, c), s in g.groupby(["district_name", "crop_name"]):
        s = s.sort_values("y0")
        if len(s) < MIN_YEARS or s.area.median() < 500:   # skip tiny / short series
            continue
        loc = hq(d)
        if loc is None:
            continue
        x, y = s.y0.to_numpy(float), s["yield"].to_numpy(float)
        slope, icpt, _, _ = stats.theilslopes(y, x)
        trend = icpt + slope * x
        anom = (y - trend) / trend
        bad_cut = np.quantile(anom, 0.25)
        crop_id, water = CROP_MAP[c]
        p = nearest(*loc)
        key = f"{d}|{crop_id}"
        anomalies[key] = {
            "district": d, "apy_crop": c, "crop": crop_id, "water_source": water, "grid_id": p["id"],
            "median_area_ha": float(s.area.median()),
            "years": {int(yr): {"anomaly": round(float(a), 4), "bad": bool(a <= bad_cut)} for yr, a in zip(s.y0, anom)},
        }
        targets.append({"key": key, "grid_id": p["id"], "crop": crop_id, "water_source": water})
    (HERE / "data" / "yield_anomalies.json").write_text(json.dumps(anomalies, indent=1))
    (ROOT / "web" / "dev" / "backtest_targets.json").write_text(json.dumps(targets))
    print(f"{len(targets)} district x crop series; districts={len({a['district'] for a in anomalies.values()})}; "
          f"by crop: {pd.Series([a['crop'] for a in anomalies.values()]).value_counts().to_dict()}")


if __name__ == "__main__":
    main()
