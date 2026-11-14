"""Rebuild the demo sites, web/data/sites/index.json, sample_site.json and pipeline/points.csv.

    python pipeline/build_all.py            # Tamil Nadu sites: POWER + SoilGrids + NDVI
    python pipeline/build_all.py --no-ndvi  # skip NDVI (writes "ndvi": null; fast)
    python pipeline/build_all.py --ndvi-cache-only  # NDVI from already-downloaded dates (fast)
    python pipeline/build_all.py --us       # old US sites -> web/data/sites/_us_backup/ (index untouched)
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
from pathlib import Path

import fetch_power
from fetch_power import SITES_DIR, build_site, write_site

HERE = Path(__file__).resolve().parent

# Order matters: index.json keeps it, and the first site is the hero / sample site.
TN_SITES = [
    {"id": "tirunelveli", "name": "Tirunelveli (Thamirabarani valley)", "lat": 8.70, "lon": 77.75},
    {"id": "madurai", "name": "Madurai (Vaigai / Periyar command)", "lat": 10.03, "lon": 78.33},
    {"id": "thanjavur", "name": "Thanjavur (Cauvery delta)", "lat": 10.85, "lon": 79.25},
]
TN_HEAT_C = 38.0

US_SITES = [
    {"id": "iowa_ames", "name": "Boone County, Iowa (corn belt)", "lat": 42.10, "lon": -93.80},
    {"id": "fresno_ca", "name": "Kerman, California (Central Valley)", "lat": 36.60, "lon": -120.10},
    {"id": "garden_city_ks", "name": "Finney County, Kansas (semi-arid)", "lat": 37.90, "lon": -100.70},
]
US_HEAT_C = 35.0
US_DIR = SITES_DIR / "_us_backup"

POINT_OFFSET_DEG = 0.02  # ~2.2 km in longitude at these latitudes


def write_points_csv(sites: list[dict], path: Path) -> None:
    """AppEEARS point-sample CSV: the site point plus one point either side in lon."""
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ID", "Category", "Latitude", "Longitude"])
        for s in sites:
            for i, dlon in enumerate((0.0, -POINT_OFFSET_DEG, POINT_OFFSET_DEG), start=1):
                w.writerow([f"{s['id']}_{i}", s["id"], f"{s['lat']:.4f}", f"{s['lon'] + dlon:.4f}"])


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--start", type=int, default=2001)
    p.add_argument("--end", type=int, default=2024)
    p.add_argument("--no-ndvi", action="store_true")
    p.add_argument("--ndvi-cache-only", action="store_true",
                   help="build NDVI from already-downloaded dates only (no ORNL requests)")
    p.add_argument("--us", action="store_true", help="build the US backup sites instead")
    a = p.parse_args()
    if a.no_ndvi:
        fetch_power.fetch_ndvi = lambda *args, **kw: None
    elif a.ndvi_cache_only:
        _orig = fetch_power.fetch_ndvi
        fetch_power.fetch_ndvi = lambda *args, **kw: _orig(*args, cache_only=True, **kw)

    sites, heat_c, out_dir = (US_SITES, US_HEAT_C, US_DIR) if a.us else (TN_SITES, TN_HEAT_C, SITES_DIR)
    for s in sites:
        site = build_site(s["id"], s["name"], s["lat"], s["lon"], a.start, a.end, heat_c=heat_c)
        out = write_site(site, out_dir)
        soil = site["soil"]["texture_class"] if site["soil"] else "none"
        print(f"Wrote {out.relative_to(SITES_DIR)}: {site['frost']['frost_free_days_median']} frost-free days, "
              f"soil={soil}, ndvi={'yes' if site['ndvi'] else 'null'}")

    if a.us:
        return  # backups are not listed in index.json
    (SITES_DIR / "index.json").write_text(json.dumps(sites, indent=2))
    shutil.copyfile(SITES_DIR / f"{sites[0]['id']}.json", SITES_DIR / "sample_site.json")
    write_points_csv(sites, HERE / "points.csv")
    print(f"Wrote index.json ({len(sites)} sites), sample_site.json (= {sites[0]['id']}), pipeline/points.csv")


if __name__ == "__main__":
    main()
