"""1-in-100-year events: extreme-rain and NE-monsoon-drought return levels (FIELD_NOTES E4, RESEARCH_LOG I-24).

No ready-made NASA return-period product exists (NASA publishes IMERG and climatologies; GFMS and LHASA use
percentile thresholds), so we follow the method common in IMERG studies:
  Flood side   annual maxima of 1/3/5-day rain (IMERG daily 2001-2024, pipeline/data/imerg_annual_maxima.json)
               -> regional "index-flood" GEV: each point's maxima / its median, pooled with neighbours within
                  0.6 deg, GEV fitted to the pooled values, scaled back by the local median.
  Drought side NE-monsoon (Oct-Dec) totals from the site/grid files -> gamma fit (SPI-style) on totals / local
               mean, pooled the same way; lower-tail return levels.
  Uncertainty  bootstrap over YEARS (neighbours resampled together, they share weather), 300 refits, 5-95% range.
  Climate      demo sites: rain extremes scaled ~7%/degC (Clausius-Clapeyron) by NEX-GDDP warming, NE totals by the
               projected NE-rain change -> how often today's 1-in-100 event would occur by 2041-2060.
Limits: 24 years per point, and satellite/gridded rain under-reads local extremes (some Dec 2023 gauges recorded
far more than any 0.1 deg cell), so treat levels as conservative and ranges as wide.

    python pipeline/extremes.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
MAX = json.loads((ROOT / "pipeline" / "data" / "imerg_annual_maxima.json").read_text())["sites"]
OUT = ROOT / "web" / "data" / "extremes"
T_LIST = [10, 25, 50, 100]
RADIUS = 0.6
N_BOOT = 300
LIFE = 30
BEYOND = 100   # past ~4x the record length the fitted tail is extrapolation
rng = np.random.default_rng(42)


def site_file(pid):
    return ROOT / "web" / "data" / ("sites" if not pid.startswith("g") else "grid") / f"{pid}.json"


ne_tot = {}
for pid in MAX:
    s = json.loads(site_file(pid).read_text(encoding="utf-8"))
    ne_tot[pid] = {y["year"]: sum(m["precip_mm"] for m in y["months"][9:12]) for y in s["by_year"]}
YEARS = list(range(2001, 2025))


def neighbours(pid):
    a = MAX[pid]
    return [q for q, b in MAX.items()
            if math.hypot(a["lat"] - b["lat"], (a["lon"] - b["lon"]) * math.cos(math.radians(a["lat"]))) <= RADIUS]


def series(pid, key):
    if key == "ne":
        return np.array([ne_tot[pid].get(y, np.nan) for y in YEARS], float)
    return np.array([MAX[pid]["years"].get(str(y), {}).get(key, np.nan) for y in YEARS], float)


def pooled(nbrs, key, year_idx, norm):
    vals = []
    for q in nbrs:
        s = series(q, key)
        scale = np.nanmedian(s) if norm == "median" else np.nanmean(s)
        v = s[year_idx] / scale
        vals.append(v[~np.isnan(v)])
    return np.concatenate(vals)


def fit_gev(x):
    """GEV by L-moments (Hosking 1985), the standard for regional index-flood analysis; returns scipy (c, loc, scale)."""
    x = np.sort(x); n = len(x); i = np.arange(n)
    b0 = x.mean(); b1 = np.sum(i * x) / (n * (n - 1)); b2 = np.sum(i * (i - 1) * x) / (n * (n - 1) * (n - 2))
    l1, l2, l3 = b0, 2 * b1 - b0, 6 * b2 - 6 * b1 + b0
    t3 = l3 / l2
    cc = 2 / (3 + t3) - math.log(2) / math.log(3)
    k = float(np.clip(7.8590 * cc + 2.9554 * cc * cc, -0.4, 0.4))   # keep tail shape plausible for short records
    if abs(k) < 1e-6:
        k = 1e-6
    g = math.gamma(1 + k)
    alpha = l2 * k / ((1 - 2 ** (-k)) * g)
    xi = l1 - alpha * (1 - g) / k
    return k, xi, alpha


def label_T(T):
    """Human label; beyond ~4x the record length the fitted tail is extrapolation, so don't print a precise number."""
    if T > BEYOND:
        return f"rarer than 1-in-{BEYOND} (beyond what {len(YEARS)} years can pin down)"
    for lim in (10, 25, 50, 100):
        if T <= lim * 1.25:
            return f"about 1-in-{lim}" if T >= lim * 0.75 else f"about 1-in-{round(T)}"
    return f"about 1-in-{round(T, -1):.0f}"


def analyse(pid):
    nb = neighbours(pid)
    idx_all = np.arange(len(YEARS))
    out = {"id": pid, "lat": MAX[pid]["lat"], "lon": MAX[pid]["lon"], "neighbours": len(nb), "years": [2001, 2024],
           "rain": {}, "drought": {}}
    for key in ("rx1", "rx3", "rx5"):
        local = series(pid, key)
        med = float(np.nanmedian(local))
        g = fit_gev(pooled(nb, key, idx_all, "median"))
        boots = []
        for _ in range(N_BOOT):
            bi = rng.choice(idx_all, size=len(idx_all), replace=True)
            try:
                boots.append(fit_gev(pooled(nb, key, bi, "median")))
            except Exception:
                pass
        levels = {}
        for T in T_LIST:
            q = 1 - 1 / T
            best = med * stats.genextreme.ppf(q, *g)
            bs = np.array([med * stats.genextreme.ppf(q, *b) for b in boots])
            levels[str(T)] = {"mm": round(float(best)), "range": [round(float(np.percentile(bs, 5))), round(float(np.percentile(bs, 95)))]}
        # biggest event on record at this point and its return period
        iy = int(np.nanargmax(local))
        x = float(local[iy])
        T_rec = 1 / max(1e-6, 1 - stats.genextreme.cdf(x / med, *g))
        out["rain"][key] = {"median_annual_max_mm": round(med), "levels": levels, "gev": [round(v, 4) for v in g],
                            "record": {"year": YEARS[iy], "mm": round(x), "return_period_yr": round(T_rec, 1),
                                       "beyond_record": bool(T_rec > BEYOND), "label": label_T(T_rec),
                                       "date": MAX[pid]["years"][str(YEARS[iy])].get("rx1_date") if key == "rx1" else None}}
    # drought: NE-monsoon totals, gamma on totals/mean, lower tail
    local = series(pid, "ne")
    mean_ne = float(np.nanmean(local))
    pool = pooled(nb, "ne", idx_all, "mean")
    pool = pool[pool > 0]
    a, loc, sc = stats.gamma.fit(pool, floc=0)
    boots = []
    for _ in range(N_BOOT):
        bi = rng.choice(idx_all, size=len(idx_all), replace=True)
        p = pooled(nb, "ne", bi, "mean"); p = p[p > 0]
        try:
            boots.append(stats.gamma.fit(p, floc=0))
        except Exception:
            pass
    levels = {}
    for T in T_LIST:
        q = 1 / T
        best = mean_ne * stats.gamma.ppf(q, a, loc, sc)
        bs = np.array([mean_ne * stats.gamma.ppf(q, *b) for b in boots])
        levels[str(T)] = {"mm": round(float(best)), "pct_of_normal": round(100 * best / mean_ne),
                          "range": [round(float(np.percentile(bs, 5))), round(float(np.percentile(bs, 95)))]}
    iy = int(np.nanargmin(local))
    x = float(local[iy])
    T_dry = 1 / max(1e-6, stats.gamma.cdf(x / mean_ne, a, loc, sc))
    out["drought"] = {"normal_ne_mm": round(mean_ne), "levels": levels, "gamma": [round(a, 4), 0, round(sc, 4)],
                      "record": {"year": YEARS[iy], "mm": round(x), "pct_of_normal": round(100 * x / mean_ne),
                                 "return_period_yr": round(T_dry, 1), "beyond_record": bool(T_dry > BEYOND),
                                 "label": label_T(T_dry)}}
    out["lifetime_chance"] = {f"1_in_{T}": round(1 - (1 - 1 / T) ** LIFE, 2) for T in T_LIST}
    out["lifetime_years"] = LIFE
    # climate shift for demo sites with projections
    proj_f = ROOT / "web" / "data" / "projections" / f"{pid}.json"
    if proj_f.exists():
        proj = json.loads(proj_f.read_text())
        out["future"] = {}
        g1 = out["rain"]["rx1"]["gev"]; med1 = out["rain"]["rx1"]["median_annual_max_mm"]
        rl100 = out["rain"]["rx1"]["levels"]["100"]["mm"]
        dl100 = out["drought"]["levels"]["100"]["mm"]
        for ssp, per in proj["summary"].items():
            Ts_rain, Ts_dry = [], []
            for m, smm in per.items():
                factor = 1.07 ** smm["d_tmax_annual"]
                Ts_rain.append(1 / max(1e-6, 1 - stats.genextreme.cdf(rl100 / (med1 * factor), *g1)))
                ne_factor = 1 + smm["ne_rain_change_pct"] / 100
                Ts_dry.append(1 / max(1e-6, stats.gamma.cdf(dl100 / (mean_ne * ne_factor), a, loc, sc)))
            out["future"][ssp] = {
                "period": proj["future"],
                "todays_100yr_rain_becomes_1_in": [round(min(Ts_rain)), round(float(np.median(Ts_rain))), round(max(Ts_rain))],
                "todays_100yr_drought_becomes_1_in": [round(min(Ts_dry)), round(float(np.median(Ts_dry))), round(max(Ts_dry))],
                "note": "[min, median, max] across 5 CMIP6 models; rain extremes scaled 7%/degC, NE totals by projected NE-rain change",
            }
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for pid in MAX:
        res = analyse(pid)
        (OUT / f"{pid}.json").write_text(json.dumps(res, indent=1))
        index.append(pid)
    (OUT / "index.json").write_text(json.dumps({"method": __doc__.split("\n\n")[1], "points": index}, indent=1))
    for pid in ("tirunelveli", "madurai", "thanjavur"):
        r = json.loads((OUT / f"{pid}.json").read_text())
        rx1, rx3, dr = r["rain"]["rx1"], r["rain"]["rx3"], r["drought"]
        print(f"\n=== {pid} ({r['neighbours']} pooled points)")
        print("  1-day rain:  " + "  ".join(f"1-in-{T} {v['mm']} [{v['range'][0]}-{v['range'][1]}]" for T, v in rx1["levels"].items())
              + f" | record {rx1['record']['mm']} mm on {rx1['record']['date']} ≈ 1-in-{rx1['record']['return_period_yr']}")
        print("  3-day rain:  " + "  ".join(f"1-in-{T} {v['mm']}" for T, v in rx3["levels"].items()))
        print("  NE drought:  " + "  ".join(f"1-in-{T} {v['mm']} mm ({v['pct_of_normal']}%)" for T, v in dr["levels"].items())
              + f" | record {dr['record']['year']} {dr['record']['mm']} mm ({dr['record']['pct_of_normal']}%) ≈ 1-in-{dr['record']['return_period_yr']}")
        for ssp, f in r.get("future", {}).items():
            print(f"  {ssp}: today's 1-in-100 rain → 1-in-{f['todays_100yr_rain_becomes_1_in']}, drought → 1-in-{f['todays_100yr_drought_becomes_1_in']}")
    rl = [json.loads((OUT / f"{p}.json").read_text())["rain"]["rx1"]["levels"]["100"]["mm"] for p in MAX]
    print(f"\ngrid spread of 1-in-100 1-day rain: {min(rl)}-{max(rl)} mm (median {int(np.median(rl))})")


if __name__ == "__main__":
    main()
