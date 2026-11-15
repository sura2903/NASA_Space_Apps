"""IMD 1.0 deg daily gridded rainfall 1901-2024 for Tamil Nadu (RESEARCH_LOG I-34; extends the 24-year IMERG record).

Source: India Meteorological Department, Pune, "Yearly Gridded Rainfall (1.0 x 1.0) data", Rajeevan et al. (2008),
https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_1_NetCDF.html (POST rainfallone.php, one NetCDF3 file per year,
~3.4 MB). Station-based, so it complements satellite IMERG (2001-2024) and NASA POWER (1981-).
The yearly files (~420 MB in all) go to a raw folder OUTSIDE the synced project (argument 1); only the Tamil Nadu
cells are kept, as per-year summaries:
  ne_mm      Oct-Dec total            (NE-monsoon drought return levels with 124 years)
  rx1/rx3/rx5 annual max 1/3/5-day rain (cell averages: smoother than point rain, so lower than gauges)
    python pipeline/fetch_imd.py <raw_dir>      -> pipeline/data/imd_1deg_tn.json
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import requests
from scipy.io import netcdf_file

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "pipeline" / "data" / "imd_1deg_tn.json"
URL = "https://www.imdpune.gov.in/cmpg/Griddata/rainfallone.php"
LAT = (8.5, 13.5)     # 1-deg cell centres covering Tamil Nadu
LON = (76.5, 80.5)
YEARS = range(1901, 2025)


def fetch(raw: Path, y: int) -> Path:
    f = raw / f"{y}.nc"
    if f.exists() and f.stat().st_size > 1_000_000:
        return f
    for attempt in range(5):
        try:
            r = requests.post(URL, data={"rainone": str(y)}, timeout=300)
            r.raise_for_status()
            if not r.content.startswith(b"CDF"):
                raise ValueError("not netcdf")
            f.write_bytes(r.content)
            return f
        except Exception as e:  # noqa: BLE001
            print(f"  {y} attempt {attempt + 1}: {e}", flush=True)
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(y)


def summarise(f: Path, y: int, cells):
    n = netcdf_file(f, mmap=False)
    lat, lon = n.variables["LATITUDE"][:], n.variables["LONGITUDE"][:]
    rain = n.variables["RAINFALL"][:].astype(float)          # (days, lat, lon)
    rain[(rain < 0) | (rain > 2000)] = np.nan                 # -999 fill / bad values
    doy = np.arange(rain.shape[0])
    mon = np.array([(np.datetime64(f"{y}-01-01") + int(d)).astype(object).month for d in doy])
    out = {}
    for la, lo in cells:
        s = rain[:, int(np.argmin(np.abs(lat - la))), int(np.argmin(np.abs(lon - lo)))]
        if np.all(np.isnan(s)):
            continue                                          # sea cell
        roll = lambda k: np.nanmax(np.convolve(np.nan_to_num(s), np.ones(k), "valid"))
        out[f"{la}_{lo}"] = {"ne_mm": round(float(np.nansum(s[mon >= 10])), 1), "rx1": round(float(np.nanmax(s)), 1),
                             "rx3": round(float(roll(3)), 1), "rx5": round(float(roll(5)), 1)}
    return out


def main():
    raw = Path(sys.argv[1]); raw.mkdir(parents=True, exist_ok=True)
    cells = [(la, lo) for la in np.arange(LAT[0], LAT[1] + 0.1, 1.0) for lo in np.arange(LON[0], LON[1] + 0.1, 1.0)]
    cells = [(round(float(a), 1), round(float(b), 1)) for a, b in cells]
    data = json.loads(OUT.read_text()) if OUT.exists() else {"years": {}}
    for y in YEARS:
        if str(y) in data["years"]:
            continue
        data["years"][str(y)] = summarise(fetch(raw, y), y, cells)
        if y % 10 == 0:
            print(f"{y} done", flush=True)
            OUT.write_text(json.dumps(data))
    data["source"] = ("IMD Pune 1.0 x 1.0 deg daily gridded rainfall (Rajeevan et al. 2008), "
                      "https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_1_NetCDF.html")
    data["fields"] = "per year, per land cell 'lat_lon': ne_mm (Oct-Dec total), rx1/rx3/rx5 (annual max 1/3/5-day mm)"
    OUT.write_text(json.dumps(data))
    print(f"finished {len(data['years'])} years, cells {len(next(iter(data['years'].values())))}", flush=True)


if __name__ == "__main__":
    main()
