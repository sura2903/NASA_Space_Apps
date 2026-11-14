"""Fetch NASA POWER daily data for one site and write web/data/sites/<id>.json.

Output format: docs/data_contract.md

Example:
    python pipeline/fetch_power.py --id iowa_ames --name "Ames, Iowa" --lat 42.03 --lon -93.62
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
SITES_DIR = ROOT / "web" / "data" / "sites"

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = ["T2M_MAX", "T2M_MIN", "PRECTOTCORR", "GWETROOT"]
HEAT_C = 35.0  # heat-stress threshold for tmax


def fetch_power(lat: float, lon: float, start: int, end: int, site_id: str) -> pd.DataFrame:
    """Download (or load cached) daily POWER data as a DataFrame indexed by date."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    cache = RAW_DIR / f"power_{site_id}_{start}_{end}.json"
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


def frost_dates(df: pd.DataFrame) -> dict:
    """Median last spring / first fall frost DOY (northern-hemisphere convention)."""
    last_spring, first_fall = [], []
    for _, g in df.groupby(df.index.year):
        frost = g[g["tmin"] < 0].index.dayofyear
        spring = frost[frost < 182]
        fall = frost[frost >= 182]
        last_spring.append(spring.max() if len(spring) else np.nan)
        first_fall.append(fall.min() if len(fall) else np.nan)
    ls = float(np.nanmedian(last_spring)) if not np.all(np.isnan(last_spring)) else None
    ff = float(np.nanmedian(first_fall)) if not np.all(np.isnan(first_fall)) else None
    ffd = (ff if ff is not None else 366) - (ls if ls is not None else 0)
    return {
        "last_spring_frost_doy_median": None if ls is None else round(ls),
        "first_fall_frost_doy_median": None if ff is None else round(ff),
        "frost_free_days_median": round(ffd),
    }


def slope_per_decade(years: np.ndarray, values: np.ndarray) -> float:
    mask = ~np.isnan(values)
    if mask.sum() < 3:
        return float("nan")
    return float(np.polyfit(years[mask], values[mask], 1)[0] * 10)


def build_site(site_id: str, name: str, lat: float, lon: float, start: int, end: int) -> dict:
    df = fetch_power(lat, lon, start, end, site_id)
    df["et0"] = hargreaves_et0(df, lat)
    df["frost"] = (df["tmin"] < 0).astype(int)
    df["heat"] = (df["tmax"] > HEAT_C).astype(int)
    df["year"] = df.index.year
    df["month"] = df.index.month

    # Per year-month totals/means, then climatology across years.
    ym = df.groupby(["year", "month"]).agg(
        tmax=("tmax", "mean"),
        tmin=("tmin", "mean"),
        precip=("precip", "sum"),
        gwetroot=("gwetroot", "mean"),
        frost=("frost", "sum"),
        heat=("heat", "sum"),
        et0=("et0", "sum"),
    )
    clim = ym.groupby("month").mean()
    monthly = [
        {
            "month": int(m),
            "tmax_c": round(r.tmax, 1),
            "tmin_c": round(r.tmin, 1),
            "precip_mm": round(r.precip, 1),
            "root_soil_wetness": round(r.gwetroot, 3),
            "frost_days": round(r.frost, 1),
            "heat_days": round(r.heat, 1),
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

    return {
        "id": site_id,
        "name": name,
        "lat": lat,
        "lon": lon,
        "source": "NASA POWER daily, community=AG",
        "period": {"start": start, "end": end},
        "monthly": monthly,
        "frost": frost_dates(df),
        "trends": trends,
        "annual": annual,
    }


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
    a = p.parse_args()

    SITES_DIR.mkdir(parents=True, exist_ok=True)
    site = build_site(a.id, a.name, a.lat, a.lon, a.start, a.end)
    out = SITES_DIR / f"{a.id}.json"
    out.write_text(json.dumps(site, indent=2))
    update_index(site)
    print(f"Wrote {out} ({site['frost']['frost_free_days_median']} frost-free days)")


if __name__ == "__main__":
    main()
