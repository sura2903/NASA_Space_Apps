"""NASA NEX-GDDP-CMIP6 projections for the 47-point statewide grid (TASKS A16, grid part).

Point requests would be 47 x 900; instead each of the 900 files (5 models x 3 periods x 20 years x 3 variables)
is fetched ONCE as a Tamil Nadu bounding-box subset (NetCDF3 from the NCCS THREDDS NetCDF Subset Service, ~600 KB,
no login). Grid points sit on the corners of 0.25 deg cells, so each point's daily value is the mean of its four
surrounding cells. Only a compact array [47 points x days] per file is kept (data/raw/nex_grid/, gitignored); then
the same change-factor code as the demo sites (nex_deltas.build_projection) writes web/data/projections/<grid id>.json.

    python pipeline/fetch_nex_grid.py            # fetch (resumable) + build
    python pipeline/fetch_nex_grid.py --build    # build only
"""
from __future__ import annotations

import io
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from scipy.io import netcdf_file

from fetch_nex import BASE, MODELS, PERIODS, VARS, catalog_files
from nex_deltas import OUT, build_projection, print_summary

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "nex_grid"
# whole Tamil Nadu boxes (all 0.25 deg cells), kept so any grid can be cut from them without re-downloading;
# ~0.5 GB, so by default OUTSIDE the synced project (set NEX_BOX_DIR)
BOX = Path(os.environ.get("NEX_BOX_DIR", str(ROOT / "data" / "raw" / "nex_box")))
GRID = json.loads((ROOT / "web" / "data" / "grid" / "index.json").read_text(encoding="utf-8"))["points"]
BBOX = {"north": 13.6, "south": 8.0, "west": 76.1, "east": 80.4}


def npz_path(model, scen, var, year):
    return RAW / f"{model}_{scen}_{var}_{year}.npz"


def box_path(model, scen, var, year):
    return BOX / f"{model}_{scen}_{var}_{year}.npz"


def points_from_box(f):
    b = np.load(f)
    data, lat, lon = b["values"], b["lat"], b["lon"]
    cols = []
    for p in GRID:
        li = np.argsort(np.abs(lat - p["lat"]))[:2]
        lj = np.argsort(np.abs(lon - p["lon"]))[:2]
        cols.append(np.nanmean(data[:, li][:, :, lj].reshape(data.shape[0], -1), axis=1))
    return np.stack(cols)


def derive():
    """Cut per-point series (mean of the 4 cells around each grid point) for the CURRENT grid from the boxes."""
    RAW.mkdir(parents=True, exist_ok=True)
    n = 0
    for f in sorted(BOX.glob("*.npz")):
        np.savez_compressed(RAW / f.name, values=points_from_box(f)); n += 1
    print(f"derived {n} files for {len(GRID)} grid points", flush=True)


def fetch_one(model, scen, var, year, fname):
    out = box_path(model, scen, var, year)
    if out.exists():
        return "cached"
    url = f"{BASE}/ncss/grid/AMES/NEX/GDDP-CMIP6/{model}/{scen}/{MODELS[model]}/{var}/{fname}"
    err = None
    for _ in range(4):
        try:
            r = requests.get(url, params={"var": var, **BBOX, "accept": "netcdf",
                                          "time_start": f"{year}-01-01T00:00:00Z", "time_end": f"{year}-12-31T23:59:59Z"},
                             timeout=300)
            r.raise_for_status()
            if not r.content.startswith(b"CDF"):
                raise ValueError("not netcdf")
            n = netcdf_file(io.BytesIO(r.content), mmap=False)
            lat, lon = n.variables["lat"][:].copy(), n.variables["lon"][:].copy()
            data = n.variables[var].data.astype("float32")           # (time, lat, lon)
            data[np.abs(data) > 1e10] = np.nan
            if data.shape[0] < 300:
                raise ValueError(f"only {data.shape[0]} days")
            BOX.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(out, values=data, lat=lat, lon=lon)   # (time, lat, lon), all cells
            return "ok"
        except Exception as e:  # noqa: BLE001
            err = e
    return f"FAIL {model} {scen} {var} {year}: {err}"


def dates_for(year, n):
    d = pd.date_range(f"{year}-01-01", f"{year}-12-31", freq="D")
    if n == len(d):
        return d
    if n == 365:                                   # noleap calendar
        return d[~((d.month == 2) & (d.day == 29))]
    if n == 360:                                   # 360-day calendar: approximate with the first 360 days
        return d[:360]
    return d[:n]


_cache = {}


def loader(model, scen, var, site_id, years):
    k = [p["id"] for p in GRID].index(site_id)
    parts = []
    for y in years:
        f = npz_path(model, scen, var, y)
        if not f.exists():
            continue
        if f not in _cache:
            _cache[f] = np.load(f)["values"]
        v = _cache[f][k]
        parts.append(pd.Series(v.astype(float), index=dates_for(y, len(v))))
    if not parts:
        return pd.Series(dtype=float)
    s = pd.concat(parts)
    return s * 86400.0 if var == "pr" else s - 273.15


def fetch_all():
    jobs = []
    for model in MODELS:
        for scen, years in PERIODS.items():
            for var in VARS:
                files = catalog_files(model, scen, var)
                jobs += [(model, scen, var, y, files[y]) for y in years if y in files]
    todo = [j for j in jobs if not box_path(*j[:4]).exists()]
    print(f"{len(jobs)} files, {len(todo)} to fetch", flush=True)
    done = fail = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        for f in as_completed([ex.submit(fetch_one, *j) for j in todo]):
            res = f.result(); done += 1
            if res.startswith("FAIL"):
                fail += 1; print(res, flush=True)
            if done % 50 == 0:
                print(f"{done}/{len(todo)} ({fail} failed)", flush=True)
    print(f"fetch finished: {done} files, {fail} failed", flush=True)


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    index = json.loads((OUT / "index.json").read_text()) if (OUT / "index.json").exists() else []
    index = [e for e in index if not e["id"].startswith("g")]
    for p in GRID:
        out = build_projection(p, loader, "NCCS THREDDS Tamil Nadu box subsets, mean of 4 cells around the grid point")
        (OUT / f"{p['id']}.json").write_text(json.dumps(out, indent=1))
        index.append({"id": p["id"], "name": p["name"]})
    (OUT / "index.json").write_text(json.dumps(index, indent=1))
    print(f"built {len(GRID)} grid projections", flush=True)
    for p in GRID[:: max(1, len(GRID) // 4)]:
        print_summary(p, json.loads((OUT / f"{p['id']}.json").read_text())["ensemble"])


if __name__ == "__main__":
    if "--build" not in sys.argv and "--derive" not in sys.argv:
        fetch_all()
    if "--build" not in sys.argv:
        derive()
    build()
