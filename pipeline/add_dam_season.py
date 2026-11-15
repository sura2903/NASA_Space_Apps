"""Seasonal canal water from what Mettur dam actually did each year (TASKS A22, RESEARCH_LOG I-29).

Delta canal water depends on WHEN Mettur opens (customary 12 June), when it closes (customary 28 January) and how
much it releases, not just on rain. TN Agriculture Dept Season & Crop tables give all three for every year:
  VII.10 Mettur opening & closing details (opening date, storage, inflow, outflow = release, closing date)
  VII.12 Mettur opening date vs paddy area (Kuruvai / Samba / Thaladi, lakh acres)  -> validation
This step caches both as pipeline/data/mettur_seasons.json and adds to every Cauvery-command site/grid file
(the ones that already carry canal_index):
  dam: { name, source, normal: {open: "06-12", close: "01-28"}, median_release_tmc,
         years: { "2016": { open: "2016-08-21", close: "2017-01-11", release_tmc: 69.3, release_index: 0.36 } } }
scoring.js then serves canal water only in the months the canals were open that water-year, with a budget
scaled by that year's release. Years without dam data (2021-2024) fall back to canal_index.

    python pipeline/add_dam_season.py
"""
from __future__ import annotations

import io
import json
import re
from datetime import date
from pathlib import Path

import numpy as np
import requests
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "pipeline" / "data" / "mettur_seasons.json"
URL = "http://tnagriculture.in/dashboard/report/{}.pdf"


def pdf_text(name):
    r = requests.get(URL.format(name), timeout=120)
    r.raise_for_status()
    return "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(r.content)).pages)


def dmy(s, default_century=2000):
    d, m, y = (int(x) for x in s.split("."))
    if y < 100:
        y += default_century
    return date(y, m, d)


def parse():
    seasons, notes = {}, []
    for ln in pdf_text("07_10").split("\n"):
        m = re.match(r"^(\d{4})-(\d{4})\s+(\d{1,2}\.\d{1,2}\.\d{2,4})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d{1,2}\.\d{1,2}\.\d{2,4})", ln.strip())
        if not m:
            continue
        y = int(m.group(1))
        if y < 2000:
            continue
        op, cl = dmy(m.group(3)), dmy(m.group(8))
        if not (date(y, 5, 1) <= op <= date(y, 12, 31)):
            notes.append(f"{y}: opening {op} outside the water year, skipped"); continue
        if not (op < cl <= date(y + 1, 3, 31)):
            # 2016-17 prints "11.11.17", impossible (the next season opened 2 Oct 2017); read as 11 Jan 2017
            fixed = date(y + 1, 1, cl.day) if cl.month > 3 else None
            notes.append(f"{y}: closing {cl} implausible, read as {fixed}")
            cl = fixed
        seasons[str(y)] = {"open": op.isoformat(), "close": cl.isoformat() if cl else None,
                           "storage_at_open_tmc": float(m.group(5)), "inflow_tmc": float(m.group(6)),
                           "release_tmc": float(m.group(7))}
    for ln in pdf_text("07_12").split("\n"):
        m = re.match(r"^\d+\s+(\d{4})\s+(\d{1,2}\.\d{1,2}\.\d{4})\s+[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)", ln.strip())
        if not m or m.group(1) not in seasons:
            continue
        y = m.group(1)
        if dmy(m.group(2)).year != int(y):
            notes.append(f"{y}: paddy-area row has release date {m.group(2)} (other year), areas skipped"); continue
        seasons[y]["paddy_lakh_acres"] = {"kuruvai": float(m.group(3)), "samba": float(m.group(4)),
                                          "thaladi": float(m.group(5)), "total": float(m.group(6))}
    return seasons, notes


def main():
    if CACHE.exists():
        cache = json.loads(CACHE.read_text())
    else:
        seasons, notes = parse()
        cache = {"source": "Tamil Nadu Dept of Agriculture, Season & Crop statistics tables VII.10 (Mettur opening & "
                           "closing details) and VII.12 (Mettur opening date vs paddy area), tnagriculture.in/dashboard/report/",
                 "notes": notes, "seasons": seasons}
        CACHE.write_text(json.dumps(cache, indent=1))
    seasons = {y: s for y, s in cache["seasons"].items() if s.get("close")}
    med = float(np.median([s["release_tmc"] for s in seasons.values()]))
    years = {y: {"open": s["open"], "close": s["close"], "release_tmc": s["release_tmc"],
                 "release_index": round(s["release_tmc"] / med, 3)} for y, s in seasons.items()}
    dam = {"name": "Mettur (Stanley) reservoir, Cauvery delta canals", "source": cache["source"],
           "normal": {"open": "06-12", "close": "01-28"}, "median_release_tmc": round(med, 1),
           "years": years, "notes": cache["notes"]}
    targets = []
    for d in ("sites", "grid"):
        for f in sorted((ROOT / "web" / "data" / d).glob("*.json")):
            if f.stem == "index":
                continue
            s = json.loads(f.read_text(encoding="utf-8"))
            if "canal_index" in s:
                s["dam"] = dam
                f.write_text(json.dumps(s, indent=2, allow_nan=False), encoding="utf-8")
                targets.append(f.stem)
    print(f"dam season added to {len(targets)} files: {targets}")
    print(f"{len(years)} water-years {min(years)}-{max(years)}, median release {med:.0f} TMC; notes: {cache['notes']}")
    for y in sorted(years):
        s = cache["seasons"][y]
        pa = s.get("paddy_lakh_acres", {})
        print(f"  {y} open {s['open'][5:]} close {s['close'][5:] if s['close'] else '-'} release {s['release_tmc']:6.1f} "
              f"(x{years[y]['release_index']:.2f})  kuruvai {pa.get('kuruvai', '-')} samba {pa.get('samba', '-')}")


if __name__ == "__main__":
    main()
