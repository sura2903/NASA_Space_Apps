"""Fetch NASA NEX-GDDP-CMIP6 daily projections at the demo sites (climate-change Layer 3, TASKS A16).

Source: NASA NEX-GDDP-CMIP6 (bias-corrected, downscaled CMIP6, 0.25 deg, daily), point subsets from the
NCCS THREDDS NetCDF Subset Service (no login): https://ds.nccs.nasa.gov/thredds/catalog/AMES/NEX/GDDP-CMIP6/
Models: 5 that represent the Indian monsoon reasonably well and are widely used for South Asia.
Periods: historical 1995-2014 (baseline) and 2041-2060 under SSP2-4.5 and SSP5-8.5.
Variables: pr (kg m-2 s-1 -> mm/day), tasmax, tasmin (K -> deg C).
Raw CSVs are cached in data/raw/nex/ (gitignored); summary is built by pipeline/nex_deltas.py.

    python pipeline/fetch_nex.py
"""
from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

from build_all import TN_SITES

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "nex"
BASE = "https://ds.nccs.nasa.gov/thredds"
MODELS = {"ACCESS-CM2": "r1i1p1f1", "EC-Earth3": "r1i1p1f1", "MPI-ESM1-2-HR": "r1i1p1f1",
          "MRI-ESM2-0": "r1i1p1f1", "NorESM2-MM": "r1i1p1f1"}
PERIODS = {"historical": range(1995, 2015), "ssp245": range(2041, 2061), "ssp585": range(2041, 2061)}
VARS = ["pr", "tasmax", "tasmin"]


def catalog_files(model: str, scen: str, var: str) -> dict[int, str]:
    v = MODELS[model]
    url = f"{BASE}/catalog/AMES/NEX/GDDP-CMIP6/{model}/{scen}/{v}/{var}/catalog.html"
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    files = {}
    for f in set(re.findall(rf"{var}_day_{re.escape(model)}_{scen}_{v}_gn_(\d{{4}})[^<\"']*?\.nc", r.text)):
        pass
    for m in re.finditer(rf"({var}_day_{re.escape(model)}_{scen}_{v}_gn_(\d{{4}})(?:_v[\d.]+)?\.nc)", r.text):
        fname, year = m.group(1), int(m.group(2))
        # prefer the highest version string if several exist
        if year not in files or fname > files[year]:
            files[year] = fname
    return files


def fetch_one(model, scen, var, year, fname, site) -> str:
    out = RAW / f"{model}_{scen}_{var}_{site['id']}_{year}.csv"
    if out.exists() and out.stat().st_size > 1000:
        return "cached"
    v = MODELS[model]
    url = f"{BASE}/ncss/grid/AMES/NEX/GDDP-CMIP6/{model}/{scen}/{v}/{var}/{fname}"
    for attempt in range(4):
        try:
            r = requests.get(url, params={"var": var, "latitude": site["lat"], "longitude": site["lon"], "accept": "csv"},
                             timeout=180)
            r.raise_for_status()
            if r.text.count("\n") < 300:
                raise ValueError("short response")
            out.write_text(r.text)
            return "ok"
        except Exception as e:  # retry on transient errors
            err = e
    return f"FAIL {err}"


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    jobs = []
    for model in MODELS:
        for scen, years in PERIODS.items():
            for var in VARS:
                try:
                    files = catalog_files(model, scen, var)
                except Exception as e:
                    print(f"catalog FAIL {model} {scen} {var}: {e}", flush=True)
                    continue
                missing = [y for y in years if y not in files]
                if missing:
                    print(f"  {model} {scen} {var}: missing years {missing[:5]}...", flush=True)
                for y in years:
                    if y in files:
                        for s in TN_SITES:
                            jobs.append((model, scen, var, y, files[y], s))
    print(f"{len(jobs)} point requests", flush=True)
    done = fail = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = [ex.submit(fetch_one, *j) for j in jobs]
        for f in as_completed(futs):
            res = f.result()
            done += 1
            if res.startswith("FAIL"):
                fail += 1
                print(res, flush=True)
            if done % 200 == 0:
                print(f"{done}/{len(jobs)} done ({fail} failed)", flush=True)
    print(f"finished: {done} requests, {fail} failed", flush=True)


if __name__ == "__main__":
    main()
