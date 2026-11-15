"""Merge the NASA AppEEARS point bundle into the demo-site files (TASKS A8, RESEARCH_LOG I-31).

Request `field-shift-tn-points` (3 points around each demo site, 2015-04-01 .. 2024-12-31), unzipped into
data/raw/appeears/ (gitignored):
  MOD13Q1.061  250 m 16-day NDVI + pixel reliability   -> `ndvi` (replaces the 2019-2024 single-window ORNL
                                                           version; same keys the UI already reads)
  SPL3SMP_E.006 9 km daily AM surface soil moisture    -> `smap` (monthly climatology, per-year months, latest)
  SRTMGL1_NC.003 30 m elevation                        -> `elevation_m`
Quality: NDVI kept only where pixel_reliability <= 1 (good / marginal); SMAP kept where soil moisture > 0 and the
retrieval quality flag has the "recommended quality" bit clear (flag even), per the SMAP L3 user guide.
Sanity checks printed: SMAP vs IMERG monthly rain and vs POWER root-zone wetness (should move together).

    python pipeline/merge_appeears.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "appeears"
SITES = ROOT / "web" / "data" / "sites"
P = "field-shift-tn-points"
BARE_NDVI, MIN_MONTH_SAMPLES = 0.3, 2


def main():
    nd = pd.read_csv(RAW / f"{P}-MOD13Q1-061-results.csv",
                     usecols=["Category", "ID", "Date", "MOD13Q1_061__250m_16_days_NDVI", "MOD13Q1_061__250m_16_days_pixel_reliability"])
    nd.columns = ["site", "pt", "date", "ndvi", "rel"]
    nd = nd[(nd.rel <= 1) & nd.ndvi.between(-0.2, 1)]
    sm = pd.read_csv(RAW / f"{P}-SPL3SMP-E-006-results.csv")
    smc = [c for c in sm.columns if c.endswith("AM_soil_moisture")][0]
    qc = [c for c in sm.columns if c.endswith("AM_retrieval_qual_flag")][0]
    sm = sm[["Category", "ID", "Date", smc, qc]]
    sm.columns = ["site", "pt", "date", "sm", "q"]
    n_all = len(sm[sm.sm > 0])
    sm = sm[sm.sm > 0].copy()
    sm["recommended"] = sm.q.astype(int) % 2 == 0
    # Thanjavur's 9 km cells are almost all flagged "not recommended" (flag 9: standing water in paddy / tanks /
    # canals). Where a site has no recommended retrievals, keep all valid ones and label the quality.
    good_sites = set(sm[sm.recommended].groupby("site").size().loc[lambda x: x >= 100].index)
    sm = sm[sm.recommended | ~sm.site.isin(good_sites)]
    el = pd.read_csv(RAW / f"{P}-SRTMGL1-NC-003-results.csv")
    for df in (nd, sm):
        df["date"] = pd.to_datetime(df.date)
        df["y"], df["m"] = df.date.dt.year, df.date.dt.month
    print(f"NDVI good rows {len(nd)}; SMAP rows used {len(sm)} of {n_all} valid; recommended-quality sites {sorted(good_sites)}")

    for site_id in sorted(nd.site.unique()):
        f = SITES / f"{site_id}.json"
        s = json.loads(f.read_text(encoding="utf-8"))
        # NDVI: per-date median across the 3 points, then per-month median across years
        n = nd[nd.site == site_id].groupby("date").ndvi.median().reset_index()
        n["y"], n["m"] = n.date.dt.year, n.date.dt.month
        ym = n.groupby(["y", "m"]).ndvi.median()
        med = []
        for m in range(1, 13):
            v = ym[ym.index.get_level_values("m") == m]
            med.append(round(float(v.median()), 3) if len(v) >= MIN_MONTH_SAMPLES else None)
        s["ndvi"] = {"source": "NASA AppEEARS: MODIS MOD13Q1.061 250 m, 3 points, good-quality pixels",
                     "years": [int(n.y.min()), int(n.y.max())], "monthly_median": med,
                     "bare_months": [i + 1 for i, v in enumerate(med) if v is not None and v < BARE_NDVI],
                     "by_year": {str(y): [round(float(ym.get((y, m))), 3) if (y, m) in ym.index else None for m in range(1, 13)]
                                 for y in sorted(n.y.unique())}}
        # SMAP: daily mean across points, then monthly
        d = sm[sm.site == site_id].groupby("date").sm.mean().reset_index()
        d["y"], d["m"] = d.date.dt.year, d.date.dt.month
        mm = d.groupby(["y", "m"]).sm.agg(["mean", "count"])
        clim = d.groupby("m").sm.mean()
        last = d.sort_values("date").iloc[-1]
        last_m = d[(d.y == last.y) & (d.m == last.m)].sm.mean()
        s["smap"] = {
            "source": "NASA AppEEARS: SMAP L3 enhanced SPL3SMP_E.006, 9 km, AM pass, recommended-quality retrievals, 3 points",
            "units": "m3/m3 (surface 0-5 cm)", "years": [int(d.y.min()), int(d.y.max())],
            "quality": ("recommended-quality retrievals" if site_id in good_sites else
                        "SMAP flags these retrievals 'not recommended' (likely standing water from paddy, tanks and canals "
                        "in the 9 km cell); use with care"),
            "monthly_mean": [round(float(clim.get(m, np.nan)), 3) if m in clim.index else None for m in range(1, 13)],
            "by_year": {str(y): [round(float(mm.loc[(y, m), "mean"]), 3) if (y, m) in mm.index and mm.loc[(y, m), "count"] >= 3 else None
                                 for m in range(1, 13)] for y in sorted(d.y.unique())},
            "latest": {"month": f"{int(last.y)}-{int(last.m):02d}", "value": round(float(last_m), 3),
                       "anomaly": round(float(last_m - clim[last.m]), 3)},
        }
        e = el[el.Category == site_id]["SRTMGL1_NC_003_SRTMGL1_DEM"]
        s["elevation_m"] = {"source": "NASA AppEEARS: SRTMGL1_NC.003 30 m, mean of 3 points", "mean": round(float(e.mean())),
                            "range": [int(e.min()), int(e.max())]}
        f.write_text(json.dumps(s, indent=2, allow_nan=False, ensure_ascii=False), encoding="utf-8")

        # sanity: SMAP monthly vs rain and POWER root-zone wetness, same months
        pairs = []
        for y in s["by_year"]:
            for i, mo in enumerate(y["months"]):
                v = s["smap"]["by_year"].get(str(y["year"]), [None] * 12)[i]
                if v is not None:
                    pairs.append((v, mo["precip_mm"]))
        a = np.array(pairs)
        r_rain = np.corrcoef(a[:, 0], a[:, 1])[0, 1] if len(a) > 10 else float("nan")
        clim_r = np.corrcoef([x for x in s["smap"]["monthly_mean"]], [m["root_soil_wetness"] for m in s["monthly"]])[0, 1]
        print(f"{site_id:12s} elev {s['elevation_m']['mean']} m | NDVI {s['ndvi']['years']} bare {s['ndvi']['bare_months']} "
              f"med {s['ndvi']['monthly_median']} | SMAP mean {np.nanmean([x for x in s['smap']['monthly_mean'] if x]):.3f} "
              f"r(month SMAP, rain) {r_rain:.2f} r(SMAP clim, POWER root wetness clim) {clim_r:.2f} | latest {s['smap']['latest']}")


if __name__ == "__main__":
    main()
