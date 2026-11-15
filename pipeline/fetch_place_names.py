"""Local place names for the statewide grid points from OpenStreetMap (Nominatim reverse geocoding).

The grid points were named "near <district HQ> (<km> km)", which tells a farmer neither direction nor locality
(RESEARCH_LOG I-40). Nominatim's reverse lookup at zoom 14 returns, for each cell centre, the address parts
village / town / suburb, county (= taluk in Tamil Nadu) and state_district. We cache the raw English and Tamil
answers here; name_grid_points.py turns them into display names.

Respects the Nominatim usage policy: one request per ~1.1 s, identifying User-Agent, results cached.

    python pipeline/fetch_place_names.py
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "pipeline" / "data" / "nominatim_grid.json"
INDEX = ROOT / "web" / "data" / "grid" / "index.json"
URL = "https://nominatim.openstreetmap.org/reverse"
UA = {"User-Agent": "field-shift-pipeline/1.0 (NASA Space Apps student project)"}


def main():
    pts = json.loads(INDEX.read_text(encoding="utf-8"))["points"]
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    for i, p in enumerate(pts):
        for lang in ("en", "ta"):
            key = f"{p['id']}|{lang}"
            if key in cache:
                continue
            for attempt in range(3):
                try:
                    r = requests.get(URL, params={"format": "jsonv2", "lat": p["lat"], "lon": p["lon"], "zoom": 14,
                                                  "addressdetails": 1, "accept-language": lang}, headers=UA, timeout=30)
                    r.raise_for_status()
                    cache[key] = r.json()
                    break
                except Exception as e:  # network blips: retry after a pause
                    print(key, "retry", e)
                    time.sleep(5)
            time.sleep(1.1)
        if i % 20 == 0:
            CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
            print(i, p["id"], cache.get(f"{p['id']}|en", {}).get("display_name", "?"))
    CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    print("done", len(cache))


if __name__ == "__main__":
    main()
