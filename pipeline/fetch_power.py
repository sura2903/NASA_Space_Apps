"""Fetch NASA POWER daily data for one site and write web/data/sites/<id>.json.

Output format: docs/data_contract.md

Example:
    python pipeline/fetch_power.py --id tirunelveli --name "Tirunelveli (Thamirabarani valley)" --lat 8.70 --lon 77.75 --heat-c 38

To rebuild all demo sites: python pipeline/build_all.py
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
import requests

try:  # works as `python pipeline/fetch_power.py` and as `import pipeline.fetch_power`
    from fetch_soil import fetch_soil
    from fetch_ndvi import fetch_ndvi
except ImportError:  # pragma: no cover
    from .fetch_soil import fetch_soil
    from .fetch_ndvi import fetch_ndvi

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
SITES_DIR = ROOT / "web" / "data" / "sites"

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = ["T2M_MAX", "T2M_MIN", "PRECTOTCORR", "GWETROOT"]
HEAT_C = 35.0  # default heat-stress threshold for tmax (per-site override via heat_c)
HEAVY_RAIN_MM = 64.5  # India Meteorological Department "heavy rain" day threshold


def fetch_power(lat: float, lon: float, start: int, end: int, site_id: str) -> pd.DataFrame:
    """Download (or load cached) daily POWER data as a DataFrame indexed by date."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    # Keyed by coordinates (not just id) so moving a site never reuses stale data.
    cache = RAW_DIR / f"power_{site_id}_{lat:.4f}_{lon:.4f}_{start}_{end}.json"
    if cache.exists():
        payload = json.loads(cache.read_text())
    else:
        r = requests.get(
            POWER_URL,
            params={
                "parameters": ",".join(PARAMS),
                "community": "AG",
                "latitude": lat,
                "longitude": lon,
                "start": f"{start}0101",
                "end": f"{end}1231",
                "format": "JSON",
            },
            timeout=300,
        )
        r.raise_for_status()
        payload = r.json()
        cache.write_text(json.dumps(payload))

    data = payload["properties"]["parameter"]
    df = pd.DataFrame(data)
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    df = df.replace(-999.0, np.nan)
    return df.rename(
        columns={
            "T2M_MAX": "tmax",
            "T2M_MIN": "tmin",
            "PRECTOTCORR": "precip",
            "GWETROOT": "gwetroot",
        }
    )


def hargreaves_et0(df: pd.DataFrame, lat: float) -> pd.Series:
    """Reference evapotranspiration (mm/day), Hargreaves-Samani (FAO-56 eq. 52)."""
    doy = df.index.dayofyear.values
    phi = math.radians(lat)
    dr = 1 + 0.033 * np.cos(2 * np.pi * doy / 365)
    delta = 0.409 * np.sin(2 * np.pi * doy / 365 - 1.39)
    ws = np.arccos(np.clip(-np.tan(phi) * np.tan(delta), -1, 1))
    ra = (24 * 60 / np.pi) * 0.0820 * dr * (
        ws * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(ws)
    )  # MJ m-2 day-1
    tmean = (df["tmax"] + df["tmin"]) / 2
    trange = (df["tmax"] - df["tmin"]).clip(lower=0)
    return 0.0023 * (tmean + 17.8) * np.sqrt(trange) * ra * 0.408


def year_frost(g: pd.DataFrame) -> tuple[float, float]:
    """(last spring frost DOY, first fall frost DOY) for one year; NaN if none."""
    frost = g[g["tmin"] < 0].index.dayofyear
    spring = frost[frost < 182]
    fall = frost[frost >= 182]
    return (
        float(spring.max()) if len(spring) else np.nan,
        float(fall.min()) if len(fall) else np.nan,
    )


def frost_free_days(last_spring: float | None, first_fall: float | None, ndays: int = 365) -> int:
    """Days between last spring and first fall frost. A missing date means no frost
    on that side of the year, so count from Jan 1 / to Dec 31; no frost at all -> 365."""
    ls = 0 if last_spring is None or np.isnan(last_spring) else last_spring
    ff = ndays if first_fall is None or np.isnan(first_fall) else first_fall
    return int(min(ndays, max(0, round(ff - ls))))


def frost_dates(df: pd.DataFrame) -> dict:
    """Median last spring / first fall frost DOY (northern-hemisphere convention)."""
    last_spring, first_fall = [], []
    for _, g in df.groupby(df.index.year):
        ls, ff = year_frost(g)
        last_spring.append(ls)
        first_fall.append(ff)
    ls = float(np.nanmedian(last_spring)) if not np.all(np.isnan(last_spring)) else None
    ff = float(np.nanmedian(first_fall)) if not np.all(np.isnan(first_fall)) else None
    return {
        "last_spring_frost_doy_median": None if ls is None else round(ls),
        "first_fall_frost_doy_median": None if ff is None else round(ff),
        "frost_free_days_median": frost_free_days(ls, ff),
    }


def _num(x, nd: int | None = 1):
    """Round a number for JSON; NaN/inf/None -> None. nd=None -> int."""
    if x is None:
        return None
    x = float(x)
    if not math.isfinite(x):
        return None
    return int(round(x)) if nd is None else round(x, nd)


def clean_nan(obj):
    """Recursively replace NaN/inf floats with None so the JSON is strict."""
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [clean_nan(v) for v in obj]
    if isinstance(obj, (float, np.floating)):
        return float(obj) if math.isfinite(obj) else None
    if isinstance(obj, np.integer):
        return int(obj)
    return obj


BY_YEAR_KEYS = ("precip_mm", "et0_mm", "water_balance_mm", "heat_days", "frost_days", "tmax_c",
                "heavy_rain_days", "max_daily_precip_mm")


def build_by_year(df: pd.DataFrame, ym: pd.DataFrame) -> list[dict]:
    """Per-year frost dates and 12 months of weather, for historical replay."""
    out = []
    for y, g in df.groupby("year"):
        ls, ff = year_frost(g)
        months = []
        for m in range(1, 13):
            if (y, m) not in ym.index:
                months.append(dict.fromkeys(BY_YEAR_KEYS))
                continue
            r = ym.loc[(y, m)]
            months.append({
                "precip_mm": _num(r.precip),
                "et0_mm": _num(r.et0),
                "water_balance_mm": _num(r.precip - r.et0),
                "heat_days": _num(r.heat, None),
                "frost_days": _num(r.frost, None),
                "tmax_c": _num(r.tmax),
                "heavy_rain_days": _num(r.heavy_rain, None),
                "max_daily_precip_mm": _num(r.max_precip),
            })
        out.append({
            "year": int(y),
            "last_spring_frost_doy": _num(ls, None),
            "first_fall_frost_doy": _num(ff, None),
            "frost_free_days": frost_free_days(ls, ff),
            "months": months,
        })
    return out


def slope_per_decade(years: np.ndarray, values: np.ndarray) -> float:
    mask = ~np.isnan(values)
    if mask.sum() < 3:
        return float("nan")
    return float(np.polyfit(years[mask], values[mask], 1)[0] * 10)


def build_site(site_id: str, name: str, lat: float, lon: float, start: int, end: int,
               heat_c: float = HEAT_C) -> dict:
    df = fetch_power(lat, lon, start, end, site_id)
    df["et0"] = hargreaves_et0(df, lat)
    df["frost"] = (df["tmin"] < 0).astype(int)
    df["heat"] = (df["tmax"] > heat_c).astype(int)
    df["heavy_rain"] = (df["precip"] >= HEAVY_RAIN_MM).astype(int)
    df["year"] = df.index.year
    df["month"] = df.index.month

    # Per year-month totals/means, then climatology across years.
    g = df.groupby(["year", "month"])
    ym = pd.DataFrame({
        "tmax": g["tmax"].mean(),
        "tmin": g["tmin"].mean(),
        "precip": g["precip"].sum(min_count=1),  # all-missing month -> NaN, not 0
        "gwetroot": g["gwetroot"].mean(),
        "frost": g["frost"].sum(),
        "heat": g["heat"].sum(),
        "et0": g["et0"].sum(min_count=1),
        "heavy_rain": g["heavy_rain"].sum(),
        "max_precip": g["precip"].max(),
    })
    clim = ym.groupby("month").mean()
    monthly = [
        {
            "month": int(m),
            "tmax_c": round(r.tmax, 1),
            "tmin_c": round(r.tmin, 1),
            "precip_mm": round(r.precip, 1),
            "et0_mm": round(r.et0, 1),
            "root_soil_wetness": round(r.gwetroot, 3),
            "frost_days": round(r.frost, 1),
            "heat_days": round(r.heat, 1),
            "heavy_rain_days": round(r.heavy_rain, 2),
            "water_balance_mm": round(r.precip - r.et0, 1),
        }
        for m, r in clim.iterrows()
    ]

    yr = df.groupby("year").agg(
        precip=("precip", "sum"),
        tmax=("tmax", "mean"),
        heat=("heat", "sum"),
        frost=("frost", "sum"),
        gwetroot=("gwetroot", "mean"),
    )
    years = yr.index.values.astype(float)
    annual = [
        {
            "year": int(y),
            "precip_mm": round(r.precip),
            "tmax_c": round(r.tmax, 2),
            "heat_days": int(r.heat),
            "frost_days": int(r.frost),
        }
        for y, r in yr.iterrows()
    ]
    trends = {
        "tmax_c_per_decade": round(slope_per_decade(years, yr["tmax"].values), 3),
        "precip_mm_per_decade": round(slope_per_decade(years, yr["precip"].values), 1),
        "heat_days_per_decade": round(slope_per_decade(years, yr["heat"].values.astype(float)), 2),
        "root_soil_wetness_per_decade": round(slope_per_decade(years, yr["gwetroot"].values), 4),
    }

    soil = fetch_soil(lat, lon, site_id)  # None on failure
    ndvi = fetch_ndvi(lat, lon, site_id)  # None on failure

    return clean_nan({
        "id": site_id,
        "name": name,
        "lat": lat,
        "lon": lon,
        "source": "NASA POWER daily, community=AG",
        "period": {"start": start, "end": end},
        "heat_threshold_c": heat_c,
        "monthly": monthly,
        "frost": frost_dates(df),
        "trends": trends,
        "annual": annual,
        "by_year": build_by_year(df, ym),
        "soil": soil,
        "ndvi": ndvi,
    })


def write_site(site: dict, out_dir: Path = SITES_DIR) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{site['id']}.json"
    out.write_text(json.dumps(site, indent=2, allow_nan=False))
    return out


def update_index(site: dict) -> None:
    index_path = SITES_DIR / "index.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else []
    index = [s for s in index if s["id"] != site["id"]]
    index.append({k: site[k] for k in ("id", "name", "lat", "lon")})
    index_path.write_text(json.dumps(index, indent=2))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--id", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--lat", type=float, required=True)
    p.add_argument("--lon", type=float, required=True)
    p.add_argument("--start", type=int, default=2001)
    p.add_argument("--end", type=int, default=2024)
    p.add_argument("--heat-c", type=float, default=HEAT_C, help="heat-day tmax threshold (C)")
    a = p.parse_args()

    site = build_site(a.id, a.name, a.lat, a.lon, a.start, a.end, heat_c=a.heat_c)
    out = write_site(site)
    update_index(site)
    print(f"Wrote {out} ({site['frost']['frost_free_days_median']} frost-free days)")


if __name__ == "__main__":
    main()
