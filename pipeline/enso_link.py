"""Is Tamil Nadu's NE-monsoon rain linked to ENSO / IOD in our data? (FIELD_NOTES E1 sanity check)

For each of the 50 points (3 sites + 47 grid), IMERG Oct-Dec rain 2001-2024 vs ONI (OND) and DMI (SON):
rank correlation per point, plus pooled mean NE rain anomaly by phase.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
IDX = json.loads((ROOT / "web" / "data" / "climate_indices.json").read_text())["years"]
files = list((ROOT / "web" / "data" / "sites").glob("[!_s]*.json"))
files = [f for f in files if f.stem in ("tirunelveli", "madurai", "thanjavur")] + \
        [f for f in (ROOT / "web" / "data" / "grid").glob("g*.json")]

rho_oni, rho_dmi, pooled = [], [], {"el_nino": [], "la_nina": [], "neutral": [],
                                    "iod_positive": [], "iod_negative": [], "iod_neutral": []}
for f in files:
    s = json.loads(f.read_text(encoding="utf-8"))
    ne = {y["year"]: sum(m["precip_mm"] for m in y["months"][9:12]) for y in s["by_year"]}
    yrs = [y for y in ne if str(y) in IDX and IDX[str(y)]["oni_ond"] is not None]
    v = np.array([ne[y] for y in yrs])
    anom = (v - v.mean()) / v.mean()
    oni = np.array([IDX[str(y)]["oni_ond"] for y in yrs])
    dmi = np.array([IDX[str(y)]["dmi_son"] if IDX[str(y)]["dmi_son"] is not None else np.nan for y in yrs])
    rho_oni.append(stats.spearmanr(v, oni))
    ok = ~np.isnan(dmi)
    rho_dmi.append(stats.spearmanr(v[ok], dmi[ok]))
    for y, a in zip(yrs, anom):
        pooled[IDX[str(y)]["enso"]].append(a)
        if IDX[str(y)]["iod"]:
            pooled["iod_" + IDX[str(y)]["iod"]].append(a)

r_o = np.array([r[0] for r in rho_oni]); p_o = np.array([r[1] for r in rho_oni])
r_d = np.array([r[0] for r in rho_dmi]); p_d = np.array([r[1] for r in rho_dmi])
print(f"{len(files)} points | NE rain vs ONI: median rho {np.median(r_o):+.2f}, positive at {np.mean(r_o > 0):.0%} of points, "
      f"significant (p<0.1, +) at {np.mean((r_o > 0) & (p_o < 0.1)):.0%}")
print(f"           | NE rain vs DMI: median rho {np.median(r_d):+.2f}, positive at {np.mean(r_d > 0):.0%}, "
      f"significant (+) at {np.mean((r_d > 0) & (p_d < 0.1)):.0%}")
print("mean NE-rain anomaly by phase (pooled over points):")
for k, v in pooled.items():
    if v:
        print(f"  {k:13s} {np.mean(v):+.0%}  (n={len(v)})")
