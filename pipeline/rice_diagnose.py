"""Why does the backtest show no skill for rice? Quick diagnostics (prints only).

For each district with rice: detrended anomalies of rice yield, area and production (2001-2022), and
their rank correlation with local rain indices from the district's grid point (IMERG): NE monsoon
(Oct-Dec) and Jun-Dec totals, for the same crop year and the previous one (storage carry-over).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

from backtest_prep import hq

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
df = pd.read_csv(HERE / "data" / "apy_tamil_nadu.csv")
df = df[(df.season != "Total") & (df.crop_name == "Rice")]
df["y0"] = df.year.str.slice(0, 4).astype(int)
g = df[df.y0.between(2001, 2022)].groupby(["district_name", "y0"])[["area", "production"]].sum().reset_index()
g["yield"] = g.production / g.area
areas = json.loads((HERE / "data" / "district_areas.json").read_text())


def detrend(x, y):
    s, i, _, _ = stats.theilslopes(y, x)
    t = i + s * x
    return (y - t) / t


rows = []
for d, s in g.groupby("district_name"):
    if d not in areas or len(s) < 15 or s.area.median() < 5000:
        continue
    site = json.loads((ROOT / "web" / "data" / "grid" / f"{areas[d]['rep_point']}.json").read_text())
    by = {y["year"]: y["months"] for y in site["by_year"]}
    ne = {y: sum(m["precip_mm"] for m in ms[9:12]) for y, ms in by.items()}
    jd = {y: sum(m["precip_mm"] for m in ms[5:12]) for y, ms in by.items()}
    s = s.sort_values("y0")
    x = s.y0.to_numpy(float)
    an = {k: detrend(x, s[k].to_numpy(float)) for k in ("yield", "area", "production")}
    yrs = s.y0.to_numpy()
    for k, a in an.items():
        for name, idx, lag in (("NE", ne, 0), ("NE_prev", ne, 1), ("JunDec", jd, 0)):
            v = np.array([idx.get(y - lag, np.nan) for y in yrs])
            ok = ~np.isnan(v)
            rho, p = stats.spearmanr(a[ok], v[ok])
            rows.append({"district": d, "target": k, "index": name, "rho": rho, "p": p})
r = pd.DataFrame(rows)
summary = r.groupby(["target", "index"]).agg(median_rho=("rho", "median"), share_sig_pos=("p", lambda p: 0))
for (t, i), grp in r.groupby(["target", "index"]):
    print(f"{t:10s} vs {i:8s}: median rho {grp.rho.median():+.2f} | districts with rho>0 & p<0.1: "
          f"{((grp.rho > 0) & (grp.p < 0.1)).sum()}/{len(grp)}")
# 2016 check: how did rice area / yield / production move in 2016-17?
print("\n2016-17 median anomaly across districts:")
for k in ("yield", "area", "production"):
    vals = []
    for d, s in g.groupby("district_name"):
        if d not in areas or len(s) < 15 or s.area.median() < 5000:
            continue
        s = s.sort_values("y0"); a = detrend(s.y0.to_numpy(float), s[k].to_numpy(float))
        m = dict(zip(s.y0, a))
        if 2016 in m:
            vals.append(m[2016])
    print(f"  {k:10s} {np.median(vals):+.2f} (n={len(vals)})")
