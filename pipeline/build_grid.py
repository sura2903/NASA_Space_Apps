"""Build a Tamil Nadu climate grid for the crop-suitability heatmap and "click anywhere".

Writes web/data/grid/<id>.json (same format as web/data/sites/<id>.json) and
web/data/grid/index.json, plus pipeline/grid_points.csv (for the IMERG step).
Rain is NASA POWER here; run pipeline/merge_imerg.py --grid afterwards to switch to IMERG.

    python pipeline/build_grid.py              # all points (POWER + SoilGrids), 4 workers
    python pipeline/build_grid.py --list       # just print the points
"""
from __future__ import annotations

import argparse
import csv
import json
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import fetch_power
from fetch_power import build_site, write_site

HERE = Path(__file__).resolve().parent
GRID_DIR = HERE.parent / "web" / "data" / "grid"
HEAT_C = 38.0
STEP = 0.5

# Rough outline of Tamil Nadu (lon, lat), clockwise from the north-east coast. Accurate to
# roughly 10-20 km, which is enough to decide which 0.5° cells are inside the state.
TN_OUTLINE = [
    (80.35, 13.55), (79.90, 13.45), (79.35, 13.25), (78.70, 13.00), (78.30, 12.85), (77.75, 12.70),
    (77.55, 12.35), (77.40, 12.05), (77.05, 11.85), (76.55, 11.75), (76.25, 11.45), (76.55, 11.20),
    (76.75, 10.85), (76.85, 10.55), (77.05, 10.25), (77.20, 9.90), (77.15, 9.45), (77.20, 9.05),
    (77.20, 8.60), (77.35, 8.20), (77.55, 8.05), (77.85, 8.20), (78.12, 8.45), (78.18, 8.85),
    (78.45, 9.10), (78.90, 9.25), (79.30, 9.25), (78.95, 9.55), (79.05, 9.85), (79.40, 10.25),
    (79.85, 10.30), (79.85, 10.80), (79.80, 11.40), (79.75, 11.75), (79.85, 12.00), (80.15, 12.50),
    (80.30, 13.10),
]

# Nearest-town labels (approximate district headquarters).
TOWNS = [
    ("Chennai", 13.08, 80.27), ("Tiruvallur", 13.14, 79.91), ("Kanchipuram", 12.83, 79.70),
    ("Vellore", 12.92, 79.13), ("Tiruvannamalai", 12.23, 79.07), ("Krishnagiri", 12.52, 78.21),
    ("Dharmapuri", 12.13, 78.16), ("Villupuram", 11.94, 79.49), ("Cuddalore", 11.75, 79.75),
    ("Salem", 11.66, 78.15), ("Namakkal", 11.22, 78.17), ("Erode", 11.34, 77.72),
    ("Udhagamandalam (Nilgiris)", 11.41, 76.70), ("Coimbatore", 11.02, 76.96), ("Tiruppur", 11.11, 77.34),
    ("Karur", 10.96, 78.08), ("Perambalur", 11.23, 78.88), ("Tiruchirappalli", 10.80, 78.69),
    ("Thanjavur", 10.79, 79.14), ("Tiruvarur", 10.77, 79.64), ("Nagapattinam", 10.77, 79.84),
    ("Pudukkottai", 10.38, 78.82), ("Dindigul", 10.36, 77.98), ("Theni", 10.01, 77.48),
    ("Madurai", 9.93, 78.12), ("Sivaganga", 9.85, 78.48), ("Ramanathapuram", 9.37, 78.83),
    ("Virudhunagar", 9.58, 77.96), ("Tenkasi", 8.96, 77.30), ("Tirunelveli", 8.71, 77.76),
    ("Thoothukudi", 8.76, 78.13), ("Nagercoil (Kanyakumari)", 8.18, 77.41),
]


def inside(lon: float, lat: float, poly=TN_OUTLINE) -> bool:
    """Ray-casting point-in-polygon test."""
    hit = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def nearest_town(lat: float, lon: float) -> tuple[str, float]:
    best = min(TOWNS, key=lambda t: (t[1] - lat) ** 2 + ((t[2] - lon) * math.cos(math.radians(lat))) ** 2)
    km = 111 * math.hypot(best[1] - lat, (best[2] - lon) * math.cos(math.radians(lat)))
    return best[0], km


def grid_points() -> list[dict]:
    pts = []
    lat = 8.25
    while lat <= 13.25 + 1e-9:
        lon = 76.75
        while lon <= 80.25 + 1e-9:
            if inside(lon, lat):
                town, km = nearest_town(lat, lon)
                pid = f"g{round(lat * 100):04d}_{round(lon * 100):04d}"
                pts.append({"id": pid, "name": f"near {town} ({km:.0f} km)", "lat": round(lat, 2), "lon": round(lon, 2)})
            lon += STEP
        lat += STEP
    return pts


def build_one(p: dict, start: int, end: int) -> str:
    site = build_site(p["id"], p["name"], p["lat"], p["lon"], start, end, heat_c=HEAT_C)
    write_site(site, GRID_DIR)
    return f"{p['id']} {p['name']}: soil={site['soil']['texture_class'] if site['soil'] else 'none'}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--start", type=int, default=2001)
    ap.add_argument("--end", type=int, default=2024)
    a = ap.parse_args()
    pts = grid_points()
    print(f"{len(pts)} grid points inside Tamil Nadu")
    if a.list:
        for p in pts:
            print(p)
        return
    fetch_power.fetch_ndvi = lambda *args, **kw: None  # NDVI is too slow for a grid
    GRID_DIR.mkdir(parents=True, exist_ok=True)
    with (HERE / "grid_points.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "lat", "lon", "name"])
        for p in pts:
            w.writerow([p["id"], p["lat"], p["lon"], p["name"]])
    done = []
    with ThreadPoolExecutor(max_workers=a.workers) as ex:
        futs = {ex.submit(build_one, p, a.start, a.end): p for p in pts}
        for fut in as_completed(futs):
            p = futs[fut]
            try:
                print("ok  ", fut.result(), flush=True)
                done.append(p)
            except Exception as e:  # keep going; report failures at the end
                print("FAIL", p["id"], repr(e)[:200], flush=True)
    done.sort(key=lambda p: (p["lat"], p["lon"]))
    (GRID_DIR / "index.json").write_text(json.dumps(done, indent=1))
    print(f"Wrote {len(done)}/{len(pts)} points to {GRID_DIR}")


if __name__ == "__main__":
    main()
