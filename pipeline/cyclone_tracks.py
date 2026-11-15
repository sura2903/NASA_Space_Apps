"""Cyclone passes per place from NOAA IBTrACS best tracks (RESEARCH_LOG I-35; fixes NASA POWER missing compact storms).

NASA POWER's ~50 km daily wind smooths compact cyclones away (Gaja 2018 ranked ~400th at Thanjavur, I-26). Best
tracks record each storm's centre and intensity every 3 hours, so we count actual passes:
  source  NOAA NCEI IBTrACS v04r01, North Indian basin CSV (ibtracs.NI.list.v04r01.csv, raw file outside the repo)
  rule    a storm "passes" a place if its track comes within 100 km at cyclonic-storm strength (>= 34 kt);
          intensity = strongest wind reported by any agency at the closest 3-hourly fix (IMD 3-min WMO_WIND or
          US 1-min USA_WIND, so values mix averaging periods; categories use IMD thresholds)
  period  1981-2024 (satellite era; earlier tracks are less complete)
Adds `cyclones` to web/data/wind/<id>.json and prints a check for known storms.

    python pipeline/cyclone_tracks.py <path to ibtracs.NI.list.v04r01.csv>
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
WIND = ROOT / "web" / "data" / "wind"
RADIUS_KM, MIN_KT, Y0, Y1 = 100, 34, 1981, 2024
CATS = [(120, "super cyclonic storm"), (90, "extremely severe cyclonic storm"), (64, "very severe cyclonic storm"),
        (48, "severe cyclonic storm"), (34, "cyclonic storm")]


def cat(kt):
    return next((n for lim, n in CATS if kt >= lim), "depression")


def km(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = np.sin((lat2 - lat1) * p / 2) ** 2 + np.cos(lat1 * p) * np.cos(lat2 * p) * np.sin((lon2 - lon1) * p / 2) ** 2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


def main():
    df = pd.read_csv(sys.argv[1], skiprows=[1], low_memory=False,
                     usecols=["SID", "SEASON", "NAME", "ISO_TIME", "LAT", "LON", "WMO_WIND", "USA_WIND"])
    df = df[(df.SEASON >= Y0) & (df.SEASON <= Y1)].copy()
    for c in ("LAT", "LON", "WMO_WIND", "USA_WIND"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["kt"] = df[["WMO_WIND", "USA_WIND"]].max(axis=1)
    df = df.dropna(subset=["LAT", "LON"])
    idx = json.loads((WIND / "index.json").read_text())["points"]
    summary = {}
    for pid in idx:
        f = WIND / f"{pid}.json"
        w = json.loads(f.read_text())
        d = km(w["lat"], w["lon"], df.LAT.to_numpy(), df.LON.to_numpy())
        near = df.assign(dist=d)[d <= RADIUS_KM]
        passes = []
        for sid, g in near.groupby("SID"):
            g = g.sort_values("dist")
            strongest = g[g.kt >= MIN_KT]
            if strongest.empty:
                continue
            r = strongest.iloc[0]
            passes.append({"name": str(r.NAME).title() if str(r.NAME) not in ("NOT_NAMED", "nan") else "unnamed",
                           "date": str(r.ISO_TIME)[:10], "dist_km": int(round(r.dist)), "wind_kt": int(r.kt),
                           "category": cat(r.kt)})
        passes.sort(key=lambda p: p["date"])
        months = [int(p["date"][5:7]) for p in passes]
        w["cyclones"] = {
            "source": "NOAA NCEI IBTrACS v04r01, North Indian basin best tracks",
            "rule": f"track within {RADIUS_KM} km at >= {MIN_KT} kt (cyclonic-storm strength), {Y0}-{Y1}",
            "years": [Y0, Y1], "count": len(passes),
            "per_decade": round(10 * len(passes) / (Y1 - Y0 + 1), 1),
            "severe_count": sum(p["wind_kt"] >= 48 for p in passes),
            "months": {str(m): months.count(m) for m in sorted(set(months))},
            "passes": passes,
        }
        f.write_text(json.dumps(w, indent=1))
        summary[pid] = w["cyclones"]
    # checks
    for pid in ("thanjavur", "g1075_7975", "g1325_8025", "g1125_7975", "madurai", "tirunelveli"):
        c = summary.get(pid)
        if c:
            print(f"{pid:12s} {c['count']:2d} passes ({c['per_decade']}/decade, {c['severe_count']} severe): "
                  + ", ".join(f"{p['name']} {p['date'][:7]} {p['wind_kt']}kt {p['dist_km']}km" for p in c["passes"][-6:]))
    for name, ym in (("Gaja", "2018-11"), ("Thane", "2011-12"), ("Vardah", "2016-12"), ("Nivar", "2020-11"), ("Ockhi", "2017-11")):
        hits = [pid for pid, c in summary.items() if any(p["name"].lower() == name.lower() and p["date"].startswith(ym) for p in c["passes"])]
        print(f"{name} {ym}: {len(hits)} places -> {hits[:6]}")
    counts = np.array([c["count"] for c in summary.values()])
    print(f"passes per place 1981-2024: min {counts.min()} median {int(np.median(counts))} max {counts.max()}; zero at {int((counts == 0).sum())} places")


if __name__ == "__main__":
    main()
