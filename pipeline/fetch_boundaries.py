"""Tamil Nadu state and district outlines for the maps, from OpenStreetMap (Nominatim), ODbL.

Writes web/data/boundaries.json:
  { source, licence, state: <GeoJSON geometry>, districts: [{ name, name_ta, geometry }] }
The 38 district names come from web/data/grid/index.json (`district`, also from OSM via fetch_place_names.py), so a
grid point's district and the outline it is drawn in always use the same names (RESEARCH_LOG I-42).

Outlines are simplified (Nominatim polygon_threshold, then Douglas-Peucker to ~0.005 deg, about 500 m) and rounded to
3 decimals, so the whole file stays small enough for a phone. Raw answers are cached in
pipeline/data/nominatim_boundaries.json. One request per ~1.1 s (Nominatim usage policy).

    python pipeline/fetch_boundaries.py
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "pipeline" / "data" / "nominatim_boundaries.json"
OUT = ROOT / "web" / "data" / "boundaries.json"
URL = "https://nominatim.openstreetmap.org/search"
UA = {"User-Agent": "field-shift-pipeline/1.0 (NASA Space Apps student project)"}
TOL = 0.005          # degrees, Douglas-Peucker tolerance (~500 m)
ALIASES = {"Kanchipuram": ["Kancheepuram", "Kanchipuram district"]}


def lookup(cache, key, q, want):
    if key in cache:
        return cache[key]
    for attempt in range(3):
        try:
            r = requests.get(URL, params={"format": "jsonv2", "q": q, "polygon_geojson": 1, "polygon_threshold": 0.002,
                                          "limit": 5, "accept-language": "en"}, headers=UA, timeout=60)
            r.raise_for_status()
            hits = [x for x in r.json() if x.get("addresstype") in (want if isinstance(want, tuple) else (want,)) and x["geojson"]["type"] in ("Polygon", "MultiPolygon")]
            cache[key] = hits[0] if hits else None
            break
        except Exception as e:  # network blip
            print(key, "retry", e)
            time.sleep(5)
    time.sleep(1.1)
    return cache.get(key)


def dp(pts, tol):
    """Douglas-Peucker on a list of [lon, lat]."""
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
    best, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
        if d > best:
            best, idx = d, i
    if best <= tol:
        return [pts[0], pts[-1]]
    return dp(pts[: idx + 1], tol)[:-1] + dp(pts[idx:], tol)


def simplify_ring(ring):
    # a closed ring starts and ends on the same point, so split it at the point farthest from the start first
    # (otherwise the start-end "line" has zero length and every point looks within tolerance)
    x0, y0 = ring[0]
    k = max(range(len(ring)), key=lambda i: (ring[i][0] - x0) ** 2 + (ring[i][1] - y0) ** 2)
    out = dp(ring[: k + 1], TOL)[:-1] + dp(ring[k:], TOL) if 0 < k < len(ring) - 1 else dp(ring, TOL)
    out = [[round(x, 3), round(y, 3)] for x, y in out]
    if out[0] != out[-1]:
        out.append(out[0])
    return out if len(out) >= 4 else None


def simplify(geom):
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    keep = []
    for poly in polys:
        rings = [r for r in (simplify_ring(r) for r in poly) if r]
        if rings:
            keep.append(rings)
    return {"type": "Polygon", "coordinates": keep[0]} if len(keep) == 1 else {"type": "MultiPolygon", "coordinates": keep}


def main():
    pts = json.loads((ROOT / "web" / "data" / "grid" / "index.json").read_text(encoding="utf-8"))["points"]
    names = {}
    for p in pts:
        if p.get("district") and not p.get("border_state"):
            names.setdefault(p["district"], p.get("district_ta") or p["district"])
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    state = lookup(cache, "state", "Tamil Nadu, India", "state")
    districts, missing = [], []
    for name in sorted(names):
        hit = lookup(cache, f"d|{name}", f"{name} district, Tamil Nadu, India", ("state_district", "district"))
        for alt in ALIASES.get(name, []):          # OSM spells a few districts differently in its search index
            if hit:
                break
            hit = lookup(cache, f"d|{alt}", f"{alt}, Tamil Nadu, India", ("state_district", "district"))
        if not hit:
            missing.append(name)
            continue
        districts.append({"name": name, "name_ta": names[name], "osm_name": hit["name"], "geometry": simplify(hit["geojson"])})
    CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    out = {"source": "OpenStreetMap contributors, via Nominatim (simplified to ~500 m)",
           "licence": "ODbL 1.0, https://www.openstreetmap.org/copyright",
           "state": simplify(state["geojson"]) if state else None, "districts": districts}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(districts)} districts, missing {missing}; state {'ok' if state else 'MISSING'}; "
          f"{OUT.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
