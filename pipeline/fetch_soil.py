"""Fetch topsoil properties (0-30 cm) from ISRIC SoilGrids 2.0 for one point.

Output: the `soil` object in docs/data_contract.md, or None if unavailable.

Example:
    python pipeline/fetch_soil.py --id iowa_ames --lat 42.10 --lon -93.80
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"

SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PROPERTIES = ["clay", "sand", "silt", "soc", "phh2o"]
DEPTHS = {"0-5cm": 5, "5-15cm": 10, "15-30cm": 15}  # label -> thickness (cm)


def usda_texture_class(sand: float, silt: float, clay: float) -> str:
    """USDA soil texture triangle (percentages; normalised to sum to 100)."""
    total = sand + silt + clay
    if total <= 0:
        return "unknown"
    sand, silt, clay = (100 * v / total for v in (sand, silt, clay))
    if silt + 1.5 * clay < 15:
        return "sand"
    if silt + 1.5 * clay < 30:
        return "loamy sand"
    if (7 <= clay < 20 and sand > 52 and silt + 2 * clay >= 30) or (
        clay < 7 and silt < 50 and silt + 2 * clay >= 30
    ):
        return "sandy loam"
    if 7 <= clay < 27 and 28 <= silt < 50 and sand <= 52:
        return "loam"
    if (silt >= 50 and 12 <= clay < 27) or (50 <= silt < 80 and clay < 12):
        return "silt loam"
    if silt >= 80 and clay < 12:
        return "silt"
    if 20 <= clay < 35 and silt < 28 and sand > 45:
        return "sandy clay loam"
    if 27 <= clay < 40 and 20 < sand <= 45:
        return "clay loam"
    if 27 <= clay < 40 and sand <= 20:
        return "silty clay loam"
    if clay >= 35 and sand > 45:
        return "sandy clay"
    if clay >= 40 and silt >= 40:
        return "silty clay"
    if clay >= 40 and sand <= 45 and silt < 40:
        return "clay"
    return "loam"  # boundary fallthrough


def _query(lat: float, lon: float) -> dict:
    params = [("lon", lon), ("lat", lat)]
    params += [("property", p) for p in PROPERTIES]
    params += [("depth", d) for d in DEPTHS]
    params += [("value", "mean")]
    r = requests.get(SOILGRIDS_URL, params=params, timeout=120)
    r.raise_for_status()
    return r.json()


def _parse(payload: dict) -> dict | None:
    """Thickness-weighted 0-30 cm mean of each property, in target units."""
    out = {}
    for layer in payload["properties"]["layers"]:
        d_factor = layer["unit_measure"].get("d_factor", 1) or 1
        num, den = 0.0, 0.0
        for d in layer["depths"]:
            val = d["values"].get("mean")
            thick = DEPTHS.get(d["label"])
            if val is None or thick is None:
                continue
            num += (val / d_factor) * thick
            den += thick
        out[layer["name"]] = num / den if den else None
    if any(out.get(p) is None for p in ("clay", "sand", "silt")):
        return None  # e.g. water, urban or no-data pixel
    return out


def fetch_soil(lat: float, lon: float, site_id: str) -> dict | None:
    """Return the contract's `soil` object, or None on any failure (never raises)."""
    try:
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        cache = RAW_DIR / f"soilgrids_{site_id}_{lat:.4f}_{lon:.4f}.json"
        if cache.exists():
            payload = json.loads(cache.read_text())
        else:
            payload = _query(lat, lon)
            cache.write_text(json.dumps(payload))
        v = _parse(payload)
        if v is None:
            print(f"[soil] {site_id}: SoilGrids returned no data at this point")
            return None
        rnd = lambda x, n=1: None if x is None else round(x, n)
        return {
            "source": "ISRIC SoilGrids 2.0 (250 m)",
            "clay_pct": rnd(v["clay"]),
            "sand_pct": rnd(v["sand"]),
            "silt_pct": rnd(v["silt"]),
            "soc_g_per_kg": rnd(v.get("soc")),
            "ph": rnd(v.get("phh2o")),
            "texture_class": usda_texture_class(v["sand"], v["silt"], v["clay"]),
        }
    except Exception as e:  # network, HTTP, schema changes: degrade to null
        print(f"[soil] {site_id}: failed ({type(e).__name__}: {e})")
        return None


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--id", required=True)
    p.add_argument("--lat", type=float, required=True)
    p.add_argument("--lon", type=float, required=True)
    a = p.parse_args()
    print(json.dumps(fetch_soil(a.lat, a.lon, a.id), indent=2))
