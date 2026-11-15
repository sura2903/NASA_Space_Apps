"""Wind / cyclone exposure from NASA POWER daily (FIELD_NOTES E5, RESEARCH_LOG I-26).

NASA POWER (MERRA-2, ~0.5 deg) daily WS10M (mean 10 m wind), WS10M_MAX (highest hourly 10 m wind of the day)
and PRECTOTCORR (rain) for the 3 demo sites + 47 grid points, 2001-2024.

Per point we keep, for every year and month, the number of "strong-wind days" (WS10M_MAX >= 10 m/s, ~Beaufort 5-6,
when tall crops start to lodge in a ~0.5 deg average) and "storm days" (WS10M_MAX >= 10 m/s AND >= 50 mm rain the
same day: the cyclone / deep-depression signature), plus the windiest days with their dates for validation.
A 0.5 deg reanalysis smooths a cyclone's core a lot (real gusts are 2-4x higher), so thresholds are relative
markers of exposure, not wind speeds a farmer would measure.

    python pipeline/fetch_wind.py           -> pipeline/data/power_wind_daily/<id>.csv (cache)
                                               web/data/wind/<id>.json
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "pipeline" / "data" / "power_wind_daily"
OUT = ROOT / "web" / "data" / "wind"
URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = ["WS10M", "WS10M_MAX", "PRECTOTCORR"]
STRONG = 10.0      # m/s, WS10M_MAX
STORM_RAIN = 50.0  # mm/day with a strong-wind day


def points():
    pts = {}
    for d in ("sites", "grid"):
        for f in sorted((ROOT / "web" / "data" / d).glob("*.json")):
            if f.stem in ("index", "sample_site") or f.stem.startswith("_"):
                continue
            s = json.loads(f.read_text(encoding="utf-8"))
            if "lat" in s:
                pts[f.stem] = (s["lat"], s["lon"], s.get("name", f.stem))
    return pts


def fetch(pid, lat, lon):
    f = CACHE / f"{pid}.csv"
    if f.exists():
        return pd.read_csv(f, parse_dates=["date"])
    for attempt in range(4):
        try:
            r = requests.get(URL, params={"parameters": ",".join(PARAMS), "community": "AG", "latitude": lat,
                                          "longitude": lon, "start": "20010101", "end": "20241231", "format": "JSON"},
                             timeout=120)
            r.raise_for_status()
            p = r.json()["properties"]["parameter"]
            df = pd.DataFrame({k: pd.Series(v) for k, v in p.items()})
            df.index = pd.to_datetime(df.index, format="%Y%m%d")
            df = df.replace(-999.0, float("nan")).rename_axis("date").reset_index()
            CACHE.mkdir(parents=True, exist_ok=True)
            df.to_csv(f, index=False)
            return df
        except Exception as e:  # noqa: BLE001
            print(f"  {pid} attempt {attempt + 1}: {e}")
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(pid)


def summarise(pid, lat, lon, name, df):
    df = df.dropna(subset=["WS10M_MAX"]).copy()
    df["year"], df["month"] = df.date.dt.year, df.date.dt.month
    df["strong"] = df.WS10M_MAX >= STRONG
    df["storm"] = df.strong & (df.PRECTOTCORR >= STORM_RAIN)
    by_year = {}
    for (y, m), g in df.groupby(["year", "month"]):
        e = by_year.setdefault(str(y), {"strong_days": [0] * 12, "storm_days": [0] * 12, "max_wind_ms": [0.0] * 12})
        e["strong_days"][m - 1] = int(g.strong.sum())
        e["storm_days"][m - 1] = int(g.storm.sum())
        e["max_wind_ms"][m - 1] = round(float(g.WS10M_MAX.max()), 1)
    monthly = []
    for m in range(1, 13):
        g = df[df.month == m]
        monthly.append({"month": m, "mean_wind_ms": round(float(g.WS10M.mean()), 1),
                        "strong_days_per_year": round(float(g.strong.sum()) / df.year.nunique(), 1),
                        "storm_days_per_year": round(float(g.storm.sum()) / df.year.nunique(), 2)})
    top = df.sort_values("WS10M_MAX", ascending=False).head(8)
    return {"id": pid, "name": name, "lat": lat, "lon": lon,
            "source": "NASA POWER daily (MERRA-2), WS10M / WS10M_MAX / PRECTOTCORR, community=AG",
            "years": [int(df.year.min()), int(df.year.max())],
            "thresholds": {"strong_wind_ms": STRONG, "storm_rain_mm": STORM_RAIN,
                           "note": "0.5 deg reanalysis smooths cyclone cores; read as relative exposure"},
            "annual": {"strong_days_per_year": round(float(df.strong.sum()) / df.year.nunique(), 1),
                       "storm_days_per_year": round(float(df.storm.sum()) / df.year.nunique(), 2),
                       "years_with_storm_day": int(df.groupby("year").storm.any().sum())},
            "monthly": monthly, "by_year": by_year,
            "windiest_days": [{"date": d.date.strftime("%Y-%m-%d"), "max_wind_ms": round(float(d.WS10M_MAX), 1),
                               "rain_mm": round(float(d.PRECTOTCORR), 1)} for d in top.itertuples()]}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pts = points()
    print(f"{len(pts)} points")
    for i, (pid, (lat, lon, name)) in enumerate(pts.items()):
        df = fetch(pid, lat, lon)
        (OUT / f"{pid}.json").write_text(json.dumps(summarise(pid, lat, lon, name, df), indent=1))
        if i % 10 == 0:
            print(f"  {i + 1}/{len(pts)} {pid}")
    (OUT / "index.json").write_text(json.dumps({"points": list(pts)}, indent=1))


if __name__ == "__main__":
    main()
