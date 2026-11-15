"""Mismatch map step 1: district crop areas (recent average) + grid points per district.

Areas: DES Crop Statistics (pipeline/data/apy_tamil_nadu.csv), average 2018-19 .. 2022-23 over the
years each district reports (new districts split off in 2019-20 have fewer years).
Grid points: each 0.5 deg grid point goes to its nearest district HQ; the representative point for
the engine run is the grid point nearest the HQ.
Writes pipeline/data/district_areas.json and web/dev/mismatch_targets.json (read by web/dev/mismatch.html).
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd

from backtest_prep import hq

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
APY = HERE / "data" / "apy_tamil_nadu.csv"
GRID = ROOT / "web" / "data" / "grid" / "index.json"
RECENT = range(2018, 2023)

# APY crop -> engine crop id (rice is not split by season in APY; it maps to rice_long)
CROP_IDS = {
    "Rice": "rice_long", "Groundnut": "groundnut", "Ragi": "finger_millet", "Bajra": "pearl_millet",
    "Jowar": "sorghum", "Maize": "maize", "Urad": "black_gram", "Moong(Green Gram)": "green_gram",
    "Sesamum": "sesame", "Cotton(Lint)": "cotton", "Sugarcane": "sugarcane", "Banana": "banana",
    "Cowpea(Lobia)": "cowpea",
}
PERENNIAL_TREES = {"Coconut", "Cashewnut", "Arecanut"}


def km(a, b):
    return 111 * math.hypot(a[0] - b[0], (a[1] - b[1]) * math.cos(math.radians(a[0])))


def main() -> None:
    df = pd.read_csv(APY)
    df = df[df.season != "Total"]
    df["y0"] = df.year.str.slice(0, 4).astype(int)
    rec = df[df.y0.isin(RECENT)]
    grid = json.loads(GRID.read_text())
    pts = grid["points"] if isinstance(grid, dict) else grid

    districts = {}
    for d, g in rec.groupby("district_name"):
        loc = hq(d)
        if loc is None or d == "Chennai":
            continue
        nyears = g.y0.nunique()
        per_crop = g.groupby("crop_name").area.sum() / nyears
        modelled = {CROP_IDS[c]: round(float(a)) for c, a in per_crop.items() if c in CROP_IDS and a > 0}
        trees = round(float(per_crop[per_crop.index.isin(PERENNIAL_TREES)].sum()))
        other = round(float(per_crop[~per_crop.index.isin(set(CROP_IDS) | PERENNIAL_TREES)].sum()))
        districts[d] = {"name": d, "hq": loc, "years": sorted(int(y) for y in g.y0.unique()),
                        "area_ha": modelled, "tree_crops_ha": trees, "other_crops_ha": other, "points": []}

    for p in pts:   # each grid point -> nearest district HQ
        d = min(districts.values(), key=lambda x: km((p["lat"], p["lon"]), x["hq"]))
        d["points"].append(p["id"])
    targets = []
    for d in districts.values():
        rep = min(pts, key=lambda p: km((p["lat"], p["lon"]), d["hq"]))
        d["rep_point"] = rep["id"]
        if not d["points"]:
            d["points"] = [rep["id"]]
        targets.append({"district": d["name"], "grid_id": rep["id"], "crops": sorted(d["area_ha"])})
    (HERE / "data" / "district_areas.json").write_text(json.dumps(districts, indent=1))
    (ROOT / "web" / "dev" / "mismatch_targets.json").write_text(json.dumps(targets))
    tot = sum(sum(d["area_ha"].values()) for d in districts.values())
    print(f"{len(districts)} districts; modelled crop area {tot/1e6:.2f} Mha; "
          f"districts without own grid point: {sum(1 for d in districts.values() if d['points'] == [d['rep_point']])}")


if __name__ == "__main__":
    main()
