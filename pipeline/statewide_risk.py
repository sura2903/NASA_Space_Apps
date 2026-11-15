"""One file for the Policy view: every risk layer per grid point -> web/data/statewide_risk.json (contract 2j).

Inputs (all already built):
  web/data/grid/<id>.json            observed climate (NE-monsoon normal, hot days)
  web/data/districts.json            district + mismatch index (crop mix vs rain-fed reliability)
  web/data/extremes/<id>.json        1-in-100 rain / drought (pipeline/extremes.py)
  web/data/wind/<id>.json            storm days, cyclone months (pipeline/fetch_wind.py)
  web/data/projections/<id>.json     NEX-GDDP 2041-2060 change, when present (pipeline/fetch_nex_grid.py)
  pipeline/data/statewide_engine.json   engine run per point (web/dev/statewide.html?post=1):
                                        top crops, avoid lists, memory check, wind-exposed crops, 2016 survivors,
                                        rice / top-crop reliability today vs 2041-2060
Also writes `layers`: ready-made map colourings (value path, label, unit, which end is "worse") so the UI can
offer a "colour the map by" picker without knowing the internals.

    python pipeline/statewide_risk.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
W = ROOT / "web" / "data"
ENGINE_F = ROOT / "pipeline" / "data" / "statewide_engine.json"
GRID = json.loads((W / "grid" / "index.json").read_text(encoding="utf-8"))["points"]
DIST = json.loads((W / "districts.json").read_text(encoding="utf-8"))["districts"]


def load(p):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def district_of(gid, lat=None, lon=None):
    for d in DIST:
        if gid in d.get("points", []):
            return d
    # 0.25 deg points (RESEARCH_LOG I-38) aren't in the districts' point lists: use the nearest district HQ
    if lat is not None and DIST:
        return min((d for d in DIST if d.get("hq")), key=lambda d: (d["hq"][0] - lat) ** 2 + (d["hq"][1] - lon) ** 2, default=None)
    return None


def main():
    engine = load(ENGINE_F) or {}
    rows = []
    for p in GRID:
        gid = p["id"]
        g, ex, wi, pr = (load(W / sub / f"{gid}.json") for sub in ("grid", "extremes", "wind", "projections"))
        d = district_of(gid, p["lat"], p["lon"])
        ne = [sum(m["precip_mm"] for m in y["months"][9:12]) for y in g["by_year"]]
        row = {
            "id": gid, "name": p["name"], "name_ta": p.get("name_ta"), "lat": p["lat"], "lon": p["lon"],
            "district": {"id": d["id"], "name": d["name"], "mismatch_index": d["mismatch"]["mismatch_index"],
                         "rainfed_reliability": d["mismatch"]["rainfed_reliability"]} if d else None,
            "climate": {"ne_monsoon_mm": round(float(np.mean(ne))),
                        "ne_monsoon_cv_pct": round(float(100 * np.std(ne) / np.mean(ne))),
                        "hot_days_per_year": round(float(np.mean([sum(m["heat_days"] for m in y["months"]) for y in g["by_year"]])), 1),
                        "groundwater_trend_cm_per_year": (g.get("groundwater") or {}).get("lwe_trend_cm_per_year"),
                        "groundwater_then_vs_now_cm": (g.get("groundwater") or {}).get("then_vs_now_cm")},
            "extremes": {
                "rain_1day_100yr_mm": ex["rain"]["rx1"]["levels"]["100"]["mm"],
                "rain_1day_100yr_range": ex["rain"]["rx1"]["levels"]["100"]["range"],
                "rain_3day_100yr_mm": ex["rain"]["rx3"]["levels"]["100"]["mm"],
                "drought_100yr_pct_of_normal": (ex["drought"].get("levels_124yr") or ex["drought"]["levels"])["100"]["pct_of_normal"],   # 124-yr IMD when available
                "drought_100yr_pct_of_normal_24yr": ex["drought"]["levels"]["100"]["pct_of_normal"],
                "worst_drought": {k: ex["drought"]["record"][k] for k in ("year", "pct_of_normal", "label")},
            } if ex else None,
            "wind": {"storm_days_per_year": wi["annual"]["storm_days_per_year"],
                     "years_with_storm_day": wi["annual"]["years_with_storm_day"],
                     "cyclones_per_decade": (wi.get("cyclones") or {}).get("per_decade"),
                     "cyclones_recent": [f"{c['name']} {c['date'][:7]}" for c in (wi.get("cyclones") or {}).get("passes", [])[-4:]],
                     "storm_months": [m["month"] for m in wi["monthly"] if m["storm_days_per_year"] >= 0.1]} if wi else None,
            "future": None,
            "engine": engine.get(gid),
        }
        if pr and pr.get("ensemble"):
            e = pr["ensemble"]
            row["future"] = {
                "period": pr["future"],
                **{ssp: {"tmax_change_c": e[ssp]["d_tmax_annual"]["median"],
                         "hot_days_change": e[ssp]["d_heat_days_annual"]["median"],
                         "ne_rain_change_pct": e[ssp]["ne_rain_change_pct"]["median"],
                         "ne_rain_change_range": [e[ssp]["ne_rain_change_pct"]["min"], e[ssp]["ne_rain_change_pct"]["max"]],
                         "rain_change_pct": e[ssp]["rain_change_pct"]["median"]} for ssp in e},
            }
        rows.append(row)

    layers = [
        {"key": "district.mismatch_index", "label": "Crop mix vs rain (mismatch index)", "unit": "0-100", "worse": "high"},
        # climate.ne_monsoon_cv_pct is kept in the data but not offered as a layer: r = -0.94 with the drought
        # return level (the gamma fit is driven by it), so the two maps would look the same.
        # Extreme rain and storm days correlate 0.88 (both peak on the north coast) but mean different things.
        {"key": "extremes.rain_1day_100yr_mm", "label": "1-in-100-year day of rain", "unit": "mm", "worse": "high"},
        {"key": "extremes.drought_100yr_pct_of_normal", "label": "1-in-100-year NE-monsoon drought (IMD, 124 years)", "unit": "% of normal", "worse": "low"},
        {"key": "wind.cyclones_per_decade", "label": "Cyclones passing within 100 km (NOAA tracks)", "unit": "per decade", "worse": "high"},
        {"key": "wind.storm_days_per_year", "label": "Storm days (strong wind + heavy rain)", "unit": "per year", "worse": "high"},
        {"key": "climate.hot_days_per_year", "label": "Very hot days (>38 °C) today", "unit": "per year", "worse": "high"},
        {"key": "climate.groundwater_trend_cm_per_year", "label": "Groundwater trend 2003-2024 (NASA GRACE-assimilated GLDAS)", "unit": "cm per year", "worse": "low"},
        {"key": "future.ssp245.hot_days_change", "label": "Extra very hot days by 2041-60 (SSP2-4.5)", "unit": "per year", "worse": "high"},
        {"key": "future.ssp245.ne_rain_change_pct", "label": "NE-monsoon change by 2041-60 (SSP2-4.5)", "unit": "%", "worse": "low"},
        {"key": "engine.tank.rice_long.share", "label": "Tank-fed long rice: share of seasons it came through", "unit": "0-1", "worse": "low"},
        {"key": "engine.rainfed.future.rice_long.ssp245.median", "label": "Rain-fed long rice by 2041-60 (seasons of 24)", "unit": "of 24", "worse": "low"},
    ]

    def val(r, key):
        for k in key.split("."):
            r = r.get(k) if isinstance(r, dict) else None
        return r

    for L in layers:
        v = [val(r, L["key"]) for r in rows]
        v = [x for x in v if isinstance(x, (int, float))]
        L["available"] = len(v)
        L["range"] = [min(v), max(v)] if v else None

    out = {
        "meta": {
            "description": "Every risk layer per 0.5 deg grid point, for the Policy view map. See docs/data_contract.md 2j.",
            "water_sources_in_engine": ["rainfed", "tank"],
            "sources": ["NASA GPM IMERG (rain, extremes)", "NASA POWER (temperature, wind)",
                        "NASA NEX-GDDP-CMIP6 (2041-2060)", "DES district crop areas (mismatch)"],
            "engine_run": "web/dev/statewide.html?post=1" if engine else "not run yet",
        },
        "layers": layers,
        "points": rows,
    }
    (W / "statewide_risk.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(rows)} points; engine for {sum(1 for r in rows if r['engine'])}; future for {sum(1 for r in rows if r['future'])}")
    for L in layers:
        print(f"  {L['label'][:58]:58s} n={L['available']:2d} range={L['range']}")


if __name__ == "__main__":
    main()
