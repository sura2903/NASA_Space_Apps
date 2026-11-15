"""Turn NEX-GDDP-CMIP6 point series into monthly change factors per model (climate-change Layer 3).

For each demo site, model and SSP: change between 2041-2060 and the 1995-2014 baseline, per calendar month:
  d_tmax, d_tmin (deg C, additive) | p_ratio (rain, multiplicative, capped 0.4-2.5)
  d_heat (days with tmax > 38 C, additive) | d_heavy (days >= 64.5 mm, additive) | et0_ratio (Hargreaves)
NEX-GDDP is bias-corrected to observations, so fixed thresholds (38 C, 64.5 mm) are applied directly.
The engine applies these factors to every observed year (2001-2024) to make "future-like years".
Output: web/data/projections/<site>.json + index.json.

    python pipeline/nex_deltas.py
"""
from __future__ import annotations

import io
import json
from pathlib import Path

import numpy as np
import pandas as pd

from build_all import TN_SITES
from fetch_nex import MODELS, PERIODS, RAW
from fetch_power import hargreaves_et0

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "data" / "projections"
HEAT_C, HEAVY_MM = 38.0, 64.5


def load(model, scen, var, site_id, years) -> pd.Series:
    parts = []
    for y in years:
        f = RAW / f"{model}_{scen}_{var}_{site_id}_{y}.csv"
        if not f.exists():
            continue
        df = pd.read_csv(io.StringIO(f.read_text()))
        col = [c for c in df.columns if c.startswith(var)][0]
        s = pd.Series(df[col].to_numpy(float), index=pd.to_datetime(df["time"].str.slice(0, 10)))
        parts.append(s)
    if not parts:
        return pd.Series(dtype=float)
    s = pd.concat(parts)
    return s * 86400.0 if var == "pr" else s - 273.15


def monthly_stats(model, scen, site) -> dict | None:
    yrs = PERIODS[scen]
    pr, tx, tn = (load(model, scen, v, site["id"], yrs) for v in ("pr", "tasmax", "tasmin"))
    if min(len(pr), len(tx), len(tn)) < 300 * len(yrs) * 0.8:
        return None
    df = pd.DataFrame({"precip": pr, "tmax": tx, "tmin": tn}).dropna()
    df["et0"] = hargreaves_et0(df, site["lat"])
    df["hot"] = (df.tmax > HEAT_C).astype(int)
    df["heavy"] = (df.precip >= HEAVY_MM).astype(int)
    df["y"], df["m"] = df.index.year, df.index.month
    ym = df.groupby(["y", "m"]).agg(tmax=("tmax", "mean"), tmin=("tmin", "mean"), precip=("precip", "sum"),
                                    et0=("et0", "sum"), hot=("hot", "sum"), heavy=("heavy", "sum"))
    clim = ym.groupby("m").mean()
    return {"years": [yrs[0], yrs[-1]], "n_years": int(df.y.nunique()),
            **{k: [round(float(clim.loc[m, k]), 3) for m in range(1, 13)] for k in clim.columns}}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    index = []
    for site in TN_SITES:
        stats, deltas, summary = {}, {}, {}
        for model in MODELS:
            hist = monthly_stats(model, "historical", site)
            if hist is None:
                print(f"  {site['id']} {model}: missing historical data, skipped")
                continue
            stats.setdefault("historical", {})[model] = hist
            for ssp in ("ssp245", "ssp585"):
                fut = monthly_stats(model, ssp, site)
                if fut is None:
                    print(f"  {site['id']} {model} {ssp}: missing data, skipped")
                    continue
                stats.setdefault(ssp, {})[model] = fut
                d = {
                    "d_tmax": [round(f - h, 3) for f, h in zip(fut["tmax"], hist["tmax"])],
                    "d_tmin": [round(f - h, 3) for f, h in zip(fut["tmin"], hist["tmin"])],
                    "p_ratio": [round(float(np.clip((f + 1) / (h + 1), 0.4, 2.5)), 3) for f, h in zip(fut["precip"], hist["precip"])],
                    "d_heat": [round(f - h, 2) for f, h in zip(fut["hot"], hist["hot"])],
                    "d_heavy": [round(f - h, 3) for f, h in zip(fut["heavy"], hist["heavy"])],
                    "et0_ratio": [round(f / h, 3) if h > 0 else 1.0 for f, h in zip(fut["et0"], hist["et0"])],
                }
                deltas.setdefault(ssp, {})[model] = d
                summary.setdefault(ssp, {})[model] = {
                    "d_tmax_annual": round(float(np.mean(d["d_tmax"])), 2),
                    "d_tmin_annual": round(float(np.mean(d["d_tmin"])), 2),
                    "rain_change_pct": round(100 * (sum(fut["precip"]) / sum(hist["precip"]) - 1), 1),
                    "ne_rain_change_pct": round(100 * (sum(fut["precip"][9:12]) / sum(hist["precip"][9:12]) - 1), 1),
                    "d_heat_days_annual": round(float(sum(d["d_heat"])), 1),
                    "d_heavy_days_annual": round(float(sum(d["d_heavy"])), 2),
                }
        ens = {}
        for ssp, per in summary.items():
            ens[ssp] = {k: {"min": min(v[k] for v in per.values()), "median": float(np.median([v[k] for v in per.values()])),
                            "max": max(v[k] for v in per.values())} for k in next(iter(per.values()))}
        out = {
            "id": site["id"], "name": site["name"], "lat": site["lat"], "lon": site["lon"],
            "source": "NASA NEX-GDDP-CMIP6 (bias-corrected, downscaled CMIP6, 0.25 deg daily), NCCS THREDDS point subsets",
            "baseline": [1995, 2014], "future": [2041, 2060], "models": list(deltas.get("ssp245", {})),
            "scenarios": {"ssp245": "SSP2-4.5 (middle of the road)", "ssp585": "SSP5-8.5 (high emissions)"},
            "method": ("Monthly change factors (2041-2060 vs 1995-2014) per model, applied to every observed year "
                       "2001-2024 to make future-like years; results are reported as a range across models."),
            "deltas": deltas, "summary": summary, "ensemble": ens,
        }
        (OUT / f"{site['id']}.json").write_text(json.dumps(out, indent=1))
        index.append({"id": site["id"], "name": site["name"]})
        print(f"\n=== {site['name']}")
        for ssp, e in ens.items():
            print(f"  {ssp}: Tmax {e['d_tmax_annual']['median']:+.2f} °C [{e['d_tmax_annual']['min']:+.2f}..{e['d_tmax_annual']['max']:+.2f}] | "
                  f"rain {e['rain_change_pct']['median']:+.0f}% [{e['rain_change_pct']['min']:+.0f}..{e['rain_change_pct']['max']:+.0f}] | "
                  f"NE rain {e['ne_rain_change_pct']['median']:+.0f}% | hot days {e['d_heat_days_annual']['median']:+.0f}/yr "
                  f"[{e['d_heat_days_annual']['min']:+.0f}..{e['d_heat_days_annual']['max']:+.0f}] | heavy days {e['d_heavy_days_annual']['median']:+.2f}/yr")
    (OUT / "index.json").write_text(json.dumps(index, indent=1))


if __name__ == "__main__":
    main()
