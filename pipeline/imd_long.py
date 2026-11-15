"""124 years of IMD rainfall as a check on the 24-year extremes (RESEARCH_LOG I-36).

Input: pipeline/data/imd_1deg_tn.json (pipeline/fetch_imd.py: IMD 1.0 deg daily gridded rain, 1901-2024).
For each demo site / grid point, the nearest 1-deg land cell:
  drought  NE-monsoon (Oct-Dec) totals, 124 years -> gamma return levels (no pooling needed), the driest years on
           record, where 2016 ranks, and its empirical return period (124+1)/rank
  rain     annual max 1-day rain (a 1-deg CELL AVERAGE, so lower than IMERG 0.1 deg or a rain gauge) -> GEV by
           L-moments; used to check the tail SHAPE of the 24-year pooled IMERG fit, not to replace its levels
  change   share of deficient NE monsoons (<= 80% of the 1901-2024 mean) in 1901-1962 vs 1963-2024
Adds `long_record` to web/data/extremes/<id>.json.

    python pipeline/imd_long.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from scipy import stats

from extremes import fit_gev

ROOT = Path(__file__).resolve().parents[1]
IMD = json.loads((ROOT / "pipeline" / "data" / "imd_1deg_tn.json").read_text())
EXT = ROOT / "web" / "data" / "extremes"
YEARS = sorted(int(y) for y in IMD["years"])
CELLS = sorted({c for y in IMD["years"].values() for c in y})
T_LIST = [10, 25, 50, 100]


def nearest_cell(lat, lon):
    return min(CELLS, key=lambda c: math.hypot(float(c.split("_")[0]) - lat, float(c.split("_")[1]) - lon))


def series(cell, key):
    s = np.array([IMD["years"][str(y)].get(cell, {}).get(key, np.nan) for y in YEARS], float)
    # two coastal cells (10.5_79.5, 9.5_79.5) report exactly 0 mm for whole years: gaps, not real (they average
    # 600+ mm Oct-Dec), so treat 0 as missing
    s[s <= 0] = np.nan
    return s


def analyse(ex):
    cell = nearest_cell(ex["lat"], ex["lon"])
    ne = series(cell, "ne_mm"); ok = ~np.isnan(ne)
    mean = float(np.nanmean(ne))
    a, loc, sc = stats.gamma.fit(ne[ok] / mean, floc=0)
    levels = {str(T): {"mm": round(mean * stats.gamma.ppf(1 / T, a, loc, sc)),
                       "pct_of_normal": round(100 * stats.gamma.ppf(1 / T, a, loc, sc))} for T in T_LIST}
    order = np.argsort(ne[ok]); yrs = np.array(YEARS)[ok]
    driest = [{"year": int(yrs[i]), "pct_of_normal": round(100 * ne[ok][i] / mean)} for i in order[:5]]
    rank16 = int(np.where(yrs[order] == 2016)[0][0]) + 1 if 2016 in yrs else None
    half = len(YEARS) // 2
    defic = ne <= 0.8 * mean
    rx1 = series(cell, "rx1"); rk = ~np.isnan(rx1)
    g = fit_gev(rx1[rk] / np.nanmedian(rx1))
    rain_levels = {str(T): round(float(np.nanmedian(rx1) * stats.genextreme.ppf(1 - 1 / T, *g))) for T in T_LIST}
    wettest = [{"year": int(np.array(YEARS)[rk][i]), "mm": round(float(rx1[rk][i]))} for i in np.argsort(-rx1[rk])[:5]]
    imerg_shape = ex["rain"]["rx1"]["gev"][0]
    return {
        "source": IMD["source"], "cell": cell, "years": [YEARS[0], YEARS[-1]],
        "drought": {"normal_ne_mm": round(mean), "levels": levels, "driest": driest,
                    "rank_2016": rank16, "return_period_2016_yr": round((ok.sum() + 1) / rank16, 1) if rank16 else None,
                    "imerg_24yr_100yr_pct": ex["drought"]["levels"]["100"]["pct_of_normal"]},
        "rain_1day_cell": {"note": "1-deg cell average: lower than point rain; compare shapes, not levels",
                           "levels_mm": rain_levels, "wettest": wettest, "gev_shape": round(g[0], 3),
                           "imerg_pooled_shape": imerg_shape},
        "change": {"deficient_share_1901_1962": round(float(defic[:half].mean()), 2),
                   "deficient_share_1963_2024": round(float(defic[half:].mean()), 2)},
    }


def main():
    print(f"IMD {YEARS[0]}-{YEARS[-1]} ({len(YEARS)} years), {len(CELLS)} land cells")
    idx = json.loads((EXT / "index.json").read_text())["points"]
    out = {}
    ordinal = lambda n: f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"
    for pid in idx:
        f = EXT / f"{pid}.json"
        ex = json.loads(f.read_text())
        lr = ex["long_record"] = analyse(ex)
        # The 24-year gamma tail called 2016 "rarer than 1-in-100" everywhere; 124 years say 2nd-4th driest at most
        # places. Use the long record for the drought record's label/return period (keep the IMERG one alongside).
        rec = ex["drought"]["record"]
        rec.setdefault("label_24yr", rec.get("label")); rec.setdefault("return_period_24yr", rec.get("return_period_yr"))
        cell = lr["cell"]; ne = series(cell, "ne_mm"); ok = ~np.isnan(ne)
        yrs = np.array(YEARS)[ok]; order = np.argsort(ne[ok])
        if rec["year"] in yrs:
            rank = int(np.where(yrs[order] == rec["year"])[0][0]) + 1
            T = (ok.sum() + 1) / rank
            rec.update(return_period_yr=round(float(T), 1), beyond_record=False, rank_since_1901=rank,
                       label=f"about 1-in-{int(round(T))} ({ordinal(rank)} driest Oct-Dec since 1901, IMD)")
        ex["drought"]["levels_124yr"] = lr["drought"]["levels"]
        # wettest IMERG day: is it also the wettest day in the 124-year IMD cell record?
        r1 = ex["rain"]["rx1"]["record"]; rx = series(cell, "rx1")
        if r1.get("year") in YEARS and not np.isnan(rx[YEARS.index(r1["year"])]):
            rk = int((rx > rx[YEARS.index(r1["year"])]).sum()) + 1
            r1.pop("rank_since_1901", None); r1.pop("note", None)
            if rk <= 10:   # a very local storm (e.g. Madurai 2007, rank 92) is diluted in a ~100 km cell; don't show it
                r1["rank_since_1901"] = rk
            if rk == 1:
                r1["note"] = "wettest day in the 1901-2024 IMD record for this area; satellite rain under-reads it"
        f.write_text(json.dumps(ex, indent=1))
        out[pid] = ex["long_record"]
    for pid in ("tirunelveli", "madurai", "thanjavur"):
        r = out[pid]; d = r["drought"]; ra = r["rain_1day_cell"]
        print(f"\n=== {pid} (cell {r['cell']})")
        print(f"  NE drought 124 yr: 1-in-100 = {d['levels']['100']['pct_of_normal']}% of normal (IMERG 24 yr said {d['imerg_24yr_100yr_pct']}%)")
        print(f"  driest: {d['driest']}  | 2016 rank {d['rank_2016']} -> ~1-in-{d['return_period_2016_yr']}")
        print(f"  1-day rain (cell avg) 1-in-100 {ra['levels_mm']['100']} mm; GEV shape IMD {ra['gev_shape']} vs IMERG pooled {ra['imerg_pooled_shape']}; wettest {ra['wettest'][:3]}")
        print(f"  deficient NE monsoons: {r['change']['deficient_share_1901_1962']} (1901-62) vs {r['change']['deficient_share_1963_2024']} (1963-2024)")
    ranks = [r["drought"]["rank_2016"] for r in out.values() if r["drought"]["rank_2016"]]
    d100 = np.array([[r["drought"]["levels"]["100"]["pct_of_normal"], r["drought"]["imerg_24yr_100yr_pct"]] for r in out.values()])
    print(f"\n2016 rank across places: median {int(np.median(ranks))}, driest-on-record at {sum(x == 1 for x in ranks)} of {len(ranks)}")
    print(f"1-in-100 drought % of normal, IMD 124 yr vs IMERG 24 yr: median {np.median(d100[:,0]):.0f} vs {np.median(d100[:,1]):.0f}; r = {np.corrcoef(d100.T)[0,1]:.2f}")
    sh = np.array([[r["rain_1day_cell"]["gev_shape"], r["rain_1day_cell"]["imerg_pooled_shape"]] for r in out.values()])
    print(f"GEV shape IMD vs IMERG: median {np.median(sh[:,0]):.2f} vs {np.median(sh[:,1]):.2f}")
    ch = np.array([[r["change"]["deficient_share_1901_1962"], r["change"]["deficient_share_1963_2024"]] for r in out.values()])
    print(f"deficient-monsoon share, median place: {np.median(ch[:,0]):.2f} -> {np.median(ch[:,1]):.2f}")


if __name__ == "__main__":
    main()
