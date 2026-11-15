"""Fetch ENSO and IOD indices and classify each year's northeast-monsoon season (FIELD_NOTES E1).

ENSO: NOAA CPC Oceanic Nino Index (ONI, 3-month running mean SST anomaly in Nino 3.4):
      https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt  -> OND value per year
      El Nino if ONI(OND) >= +0.5, La Nina if <= -0.5, else neutral (NOAA convention).
IOD:  NOAA PSL Dipole Mode Index from HadISST: https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data
      -> Sep-Nov mean; positive if >= +0.4 C, negative if <= -0.4 C (BoM-style threshold), else neutral.
Output: web/data/climate_indices.json (per-year phases + the latest available values).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web" / "data" / "climate_indices.json"
RAW = ROOT / "data" / "raw"


def get(url: str, name: str) -> str:
    RAW.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    (RAW / name).write_text(r.text)
    return r.text


def main() -> None:
    oni_txt = get("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", "oni.ascii.txt")
    oni = {}   # (year, season) -> value
    order = []
    for line in oni_txt.splitlines()[1:]:
        p = line.split()
        if len(p) >= 4:
            oni[(int(p[1]), p[0])] = float(p[3])
            order.append((int(p[1]), p[0], float(p[3])))
    dmi_txt = get("https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data", "dmi.had.long.data")
    dmi = {}
    for line in dmi_txt.splitlines()[1:]:
        p = line.split()
        if len(p) == 13 and p[0].isdigit():
            vals = [float(x) for x in p[1:]]
            dmi[int(p[0])] = [None if v < -90 else v for v in vals]

    years = {}
    for y in range(1981, 2026):
        o = oni.get((y, "OND"))
        d = dmi.get(y)
        son = None if d is None or None in d[8:11] else round(float(np.mean(d[8:11])), 3)
        enso = None if o is None else ("el_nino" if o >= 0.5 else "la_nina" if o <= -0.5 else "neutral")
        iod = None if son is None else ("positive" if son >= 0.4 else "negative" if son <= -0.4 else "neutral")
        if o is not None or son is not None:
            years[y] = {"oni_ond": o, "enso": enso, "dmi_son": son, "iod": iod}
    latest_oni = order[-1] if order else None
    latest_dmi = None
    for y in sorted(dmi, reverse=True):
        vals = [(i, v) for i, v in enumerate(dmi[y]) if v is not None]
        if vals:
            latest_dmi = {"year": y, "month": vals[-1][0] + 1, "value": vals[-1][1]}
            break
    out = {
        "source": {"oni": "NOAA CPC ONI (ERSSTv5), https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
                   "dmi": "NOAA PSL Dipole Mode Index (HadISST), https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data"},
        "rules": {"enso": "OND ONI >= +0.5 El Nino, <= -0.5 La Nina", "iod": "Sep-Nov DMI >= +0.4 positive, <= -0.4 negative"},
        "latest": {"oni": None if not latest_oni else {"year": latest_oni[0], "season": latest_oni[1], "value": latest_oni[2]},
                   "dmi": latest_dmi},
        "years": years,
    }
    OUT.write_text(json.dumps(out, indent=1))
    rep = [(y, v["enso"], v["iod"]) for y, v in years.items() if 2001 <= y <= 2024]
    print("2001-2024:", ", ".join(f"{y}:{(e or '?')[:2]}/{(i or '?')[:3]}" for y, e, i in rep))
    print("counts ENSO:", {k: sum(1 for _, e, _ in rep if e == k) for k in ("el_nino", "la_nina", "neutral")},
          "IOD:", {k: sum(1 for _, _, i in rep if i == k) for k in ("positive", "negative", "neutral")})
    print("latest:", out["latest"])


if __name__ == "__main__":
    main()
