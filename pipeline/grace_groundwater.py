"""Groundwater trends from NASA GRACE-assimilated GLDAS (TASKS A11, RESEARCH_LOG I-37).

Input: pipeline/data/gldas_gws_monthly.json, fetched in the browser from NASA Giovanni (user's Earthdata session):
  GLDAS-2.2 Catchment model, 0.25 deg daily, WITH GRACE data assimilation (GLDAS_CLSM025_DA1_D.2.2,
  doi 10.5067/TXBMLX370XX8), variable GWS_tavg = groundwater storage (mm). Feb 2003 - Dec 2024.
  Grid points sit on cell corners, so their series is the mean of the 4 surrounding 0.25 deg cells.
GRACE itself resolves only ~300 km features; the 0.25 deg model spreads that signal using rain and soil, so read
the result as REGIONAL groundwater change, not one village's wells.
Per place:
  lwe_trend_cm_per_year  Sen slope of the deseasonalised monthly series (cm/yr), Mann-Kendall p-value
  then_vs_now_cm         mean 2014-2024 minus mean 2003-2013
  drought_low            lowest 12-month mean and when (e.g. after the 2016-17 drought)
  latest_vs_normal_cm    Dec 2024 vs the Dec mean
Writes `groundwater` into web/data/grid/<id>.json and web/data/sites/<id>.json (the Policy view's existing
"Groundwater trend" sign reads groundwater.lwe_trend_cm_per_year).

    python pipeline/grace_groundwater.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
SRC = json.loads((ROOT / "pipeline" / "data" / "gldas_gws_monthly.json").read_text())
W = ROOT / "web" / "data"


def mann_kendall_p(x):
    n = len(x)
    s = sum(np.sign(x[j] - x[i]) for i in range(n - 1) for j in range(i + 1, n))
    var = n * (n - 1) * (2 * n + 5) / 18
    z = (s - np.sign(s)) / np.sqrt(var) if s != 0 else 0.0
    return float(2 * (1 - stats.norm.cdf(abs(z))))


def analyse(series: dict):
    months = sorted(series)
    v = np.array([series[m] for m in months], float)
    mon = np.array([int(m[5:7]) for m in months])
    t = np.array([int(m[:4]) + (int(m[5:7]) - 0.5) / 12 for m in months])
    clim = {k: v[mon == k].mean() for k in range(1, 13)}
    anom = v - np.array([clim[k] for k in mon])                     # deseasonalised, mm
    slope = stats.theilslopes(anom, t)[0]                            # mm / yr
    p = mann_kendall_p(anom[::3])                                    # every 3rd month: less autocorrelation
    yrs = np.array([int(m[:4]) for m in months])
    then = v[(yrs >= 2003) & (yrs <= 2013)].mean(); now = v[(yrs >= 2014) & (yrs <= 2024)].mean()
    roll = np.convolve(anom, np.ones(12) / 12, "valid")
    i = int(np.argmin(roll))
    last = months[-1]
    return {
        "source": SRC["source"], "units_note": "groundwater storage, cm of water", "period": [months[0], last],
        "lwe_trend_cm_per_year": round(float(slope) / 10, 2),
        "trend_p": round(p, 3), "trend_significant": bool(p < 0.05),
        "then_vs_now_cm": round(float(now - then) / 10, 1),
        "drought_low": {"ending": months[i + 11], "anomaly_cm": round(float(roll[i]) / 10, 1)},
        "latest_vs_normal_cm": {"month": last, "anomaly_cm": round(float(anom[-1]) / 10, 1)},
        "note": "GRACE resolves ~300 km; read as regional groundwater change, not one village's wells",
    }


def main():
    out = {}
    for pid, series in SRC["points"].items():
        if len(series) < 200:
            print("skip", pid, len(series)); continue
        g = analyse(series)
        out[pid] = g
        f = W / ("grid" if pid.startswith("g") else "sites") / f"{pid}.json"
        s = json.loads(f.read_text(encoding="utf-8"))
        s["groundwater"] = g
        f.write_text(json.dumps(s, indent=2, allow_nan=False, ensure_ascii=False), encoding="utf-8")
    tr = {k: v["lwe_trend_cm_per_year"] for k, v in out.items()}
    names = {p["id"]: p["name"] for p in json.loads((W / "grid" / "index.json").read_text(encoding="utf-8"))["points"]}
    srt = sorted(tr.items(), key=lambda x: x[1])
    print(f"{len(out)} places; trend cm/yr p10/50/90: {np.percentile(list(tr.values()), [10, 50, 90]).round(2)}")
    print(f"significant: {sum(v['trend_significant'] for v in out.values())}; falling: {sum(x < 0 for x in tr.values())}; rising: {sum(x > 0 for x in tr.values())}")
    print("most falling:", [(names.get(k, k)[:26], v) for k, v in srt[:6]])
    print("most rising: ", [(names.get(k, k)[:26], v) for k, v in srt[-5:]])
    for pid in ("tirunelveli", "madurai", "thanjavur"):
        g = out[pid]
        print(f"  {pid}: trend {g['lwe_trend_cm_per_year']} cm/yr (p={g['trend_p']}), then-vs-now {g['then_vs_now_cm']} cm, "
              f"lowest 12 months ending {g['drought_low']['ending']} ({g['drought_low']['anomaly_cm']} cm), latest {g['latest_vs_normal_cm']}")


if __name__ == "__main__":
    main()
