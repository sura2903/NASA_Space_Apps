"""MODIS MOD13Q1 NDVI greenness calendar for one point, via the ORNL DAAC REST API.

Output: the `ndvi` object in docs/data_contract.md, or None if unavailable.

The ORNL subset service is slow (~40-55 s per request regardless of size) and
returns 502 when a request exceeds ~60 s, so we:
  * sample ONE 16-day composite per calendar month (the one nearest mid-month)
    instead of all 23 per year -> 12 x 6 = 72 single-date requests per site;
  * run them concurrently, retry failures, and cache each date under data/raw/
    so re-runs are instant and a partial run resumes where it stopped.
MOD13Q1 (Terra) composites start on DOY 1, 17, 33, ... 353 every year, so the
dates are computed rather than listed via the /dates endpoint (which itself
takes ~60 s).

Example:
    python pipeline/fetch_ndvi.py --id iowa_ames --lat 42.10 --lon -93.80
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from concurrent.futures import TimeoutError as FuturesTimeout
from pathlib import Path

import numpy as np
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"

ORNL_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
BAND = "250m_16_days_NDVI"
SCALE = 0.0001
VALID = (-2000, 10000)  # MOD13Q1 valid range; fill value is -3000
YEARS = (2019, 2024)
BARE_NDVI = 0.3
WORKERS = 8
RETRIES = 3
DEADLINE_S = 20 * 60  # give up (return what we have / None) after this
MIN_MONTH_SAMPLES = 2  # need >= this many valid years per month


def composite_dates(year: int) -> list[tuple[int, str]]:
    """(month, 'AYYYYDDD') for the composite whose 16-day window centre is nearest
    the 15th of each month."""
    starts = list(range(1, 366, 16))
    out = []
    for m in range(1, 13):
        target = dt.date(year, m, 15).timetuple().tm_yday
        doy = min(starts, key=lambda s: abs(s + 7.5 - target))
        out.append((m, f"A{year}{doy:03d}"))
    return out


def _fetch_one(lat: float, lon: float, modis_date: str, cache: Path,
               cache_only: bool = False) -> list[int] | None:
    if cache.exists():
        return json.loads(cache.read_text())
    if cache_only:
        return None
    for attempt in range(RETRIES):
        try:
            r = requests.get(
                ORNL_URL,
                params={
                    "latitude": lat, "longitude": lon, "band": BAND,
                    "startDate": modis_date, "endDate": modis_date,
                    "kmAboveBelow": 1, "kmLeftRight": 1,
                },
                headers={"Accept": "application/json"},
                timeout=120,
            )
            r.raise_for_status()
            subset = r.json().get("subset", [])
            data = subset[0]["data"] if subset else []
            cache.write_text(json.dumps(data))
            return data
        except Exception as e:
            if attempt == RETRIES - 1:
                print(f"[ndvi] {modis_date}: failed ({type(e).__name__}: {e})")
                return None
            time.sleep(5 * (attempt + 1))
    return None


def fetch_ndvi(lat: float, lon: float, site_id: str,
               years: tuple[int, int] = YEARS, deadline_s: float = DEADLINE_S,
               cache_only: bool = False) -> dict | None:
    """Return the contract's `ndvi` object, or None on failure (never raises).
    cache_only=True uses only already-downloaded dates (no network)."""
    try:
        cache_dir = RAW_DIR / f"ndvi_{site_id}_{lat:.4f}_{lon:.4f}"
        cache_dir.mkdir(parents=True, exist_ok=True)
        jobs = [(m, d) for y in range(years[0], years[1] + 1) for m, d in composite_dates(y)]
        by_month: dict[int, list[int]] = {m: [] for m in range(1, 13)}
        years_used: set[int] = set()
        t0 = time.time()
        pool = ThreadPoolExecutor(max_workers=WORKERS)
        futs = {pool.submit(_fetch_one, lat, lon, d, cache_dir / f"{d}.json", cache_only): (m, d)
                for m, d in jobs}
        try:
            for f in as_completed(futs, timeout=deadline_s):
                data = f.result()
                if data:
                    m, d = futs[f]
                    by_month[m].append(data)
                    years_used.add(int(d[1:5]))
        except FuturesTimeout:
            print(f"[ndvi] {site_id}: deadline reached; using partial results")
        finally:
            pool.shutdown(wait=False, cancel_futures=True)
        print(f"[ndvi] {site_id}: {sum(len(v) for v in by_month.values())}/{len(jobs)} "
              f"dates in {time.time() - t0:.0f}s")

        medians = []
        for m in range(1, 13):
            # per-date scene median across the 3x3 km window, then median across years
            scene = []
            for data in by_month[m]:
                v = np.array(data, dtype=float)
                v = v[(v >= VALID[0]) & (v <= VALID[1])] * SCALE
                if v.size:
                    scene.append(np.median(v))
            medians.append(round(float(np.median(scene)), 3) if len(scene) >= MIN_MONTH_SAMPLES else None)
        if any(v is None for v in medians):
            print(f"[ndvi] {site_id}: incomplete months {[i + 1 for i, v in enumerate(medians) if v is None]}")
            return None
        return {
            "source": "MODIS MOD13Q1 via ORNL DAAC",
            "years": [min(years_used), max(years_used)],  # span actually fetched (may be < requested)
            "monthly_median": medians,
            "bare_months": [i + 1 for i, v in enumerate(medians) if v < BARE_NDVI],
        }
    except Exception as e:
        print(f"[ndvi] {site_id}: failed ({type(e).__name__}: {e})")
        return None


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--id", required=True)
    p.add_argument("--lat", type=float, required=True)
    p.add_argument("--lon", type=float, required=True)
    p.add_argument("--cache-only", action="store_true", help="use cached dates only, no network")
    a = p.parse_args()
    print(json.dumps(fetch_ndvi(a.lat, a.lon, a.id, cache_only=a.cache_only), indent=2))
