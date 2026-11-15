"""Mismatch map step 2: combine district crop areas with the engine run -> web/data/districts.json.

Per district (format requested by Lane B in PROGRESS.md, extended with mismatch metrics):
  area_ha {crop: ha}           recent average (2018-22) for crops the engine models
  crops {crop: {area_ha, rainfed_share, irrigation_mm, water_mcm}}
  mismatch:
    rainfed_reliability        area-weighted share of real seasons the current crop mix would come
                               through on rain alone (0-1)
    water_dependent_share      share of modelled area in crops that fail most years on rain alone
                               (rain-fed share < 0.5) -> "mismatch index" 0-100
    irrigation_demand_mcm      water the current mix needs beyond rain (engine irrigation mm x area)
  switch_scenarios             move 25% / 100% of the water-dependent area to the district's best
                               rain-fed crop: new reliability, water saved (illustrative)
irrigation_share is null: per-district irrigation sources are not in the APY data (needs the DES
Season and Crop Report). Without it we cannot say how much of the water-dependent area is actually irrigated.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
AREAS = json.loads((HERE / "data" / "district_areas.json").read_text())
ENGINE = json.loads((HERE / "data" / "mismatch_engine.json").read_text())
_g = json.loads((ROOT / "web" / "data" / "grid" / "index.json").read_text(encoding="utf-8"))
GRID_PTS = _g["points"] if isinstance(_g, dict) else _g
FAIL_CUT = 0.5
MCM_PER_HA_MM = 10 / 1e6   # 1 mm over 1 ha = 10 m3


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def scenario(crops: dict, best: dict, frac: float) -> dict:
    area = sum(c["area_ha"] for c in crops.values())
    moved = sum(c["area_ha"] for c in crops.values() if c["rainfed_share"] < FAIL_CUT) * frac
    rel = sum(c["area_ha"] * (1 - (frac if c["rainfed_share"] < FAIL_CUT else 0)) * c["rainfed_share"] for c in crops.values())
    rel = (rel + moved * best["rainfed_share"]) / area if area else None
    water = sum(c["water_mcm"] * (1 - (frac if c["rainfed_share"] < FAIL_CUT else 0)) for c in crops.values())
    water += moved * best["irrigation_mm"] * MCM_PER_HA_MM
    return {"fraction_switched": frac, "to_crop": best["crop"], "area_moved_ha": round(moved),
            "rainfed_reliability": None if rel is None else round(rel, 3), "irrigation_demand_mcm": round(water, 1)}


def main() -> None:
    out = []
    for name, d in sorted(AREAS.items()):
        eng = ENGINE[name]
        crops = {}
        for cid, ha in d["area_ha"].items():
            e = eng["crops"][cid]
            crops[cid] = {"area_ha": ha, "rainfed_share": e["rainfed_share"], "irrigation_mm": e["irrigation_mm"],
                          "water_mcm": round(ha * e["irrigation_mm"] * MCM_PER_HA_MM, 2)}
        area = sum(c["area_ha"] for c in crops.values())
        if not area:
            continue
        rel = sum(c["area_ha"] * c["rainfed_share"] for c in crops.values()) / area
        dep = sum(c["area_ha"] for c in crops.values() if c["rainfed_share"] < FAIL_CUT) / area
        demand = sum(c["water_mcm"] for c in crops.values())
        top = eng["top_rainfed"]
        best_id = top[0]["crop"]
        best = {"crop": best_id, "rainfed_share": eng["crops"][best_id]["rainfed_share"],
                "irrigation_mm": eng["crops"][best_id]["irrigation_mm"]}
        sc = [scenario(crops, best, f) for f in (0.25, 1.0)]
        for s in sc:
            s["water_saved_mcm"] = round(demand - s["irrigation_demand_mcm"], 1)
        biggest = max(crops.items(), key=lambda kv: kv[1]["area_ha"])
        # confidence: small modelled area (hill / plantation districts) or a representative grid point far
        # from the HQ (e.g. Kanniyakumari's point sits ~37 km east, in the drier rain shadow)
        rp = next(p for p in GRID_PTS if p["id"] == d["rep_point"])
        rep_km = 111 * np.hypot(rp["lat"] - d["hq"][0], (rp["lon"] - d["hq"][1]) * np.cos(np.radians(d["hq"][0])))
        reasons = []
        if area < 20000:
            reasons.append(f"only {area/1000:.0f} thousand ha of modelled crops")
        if rep_km > 30:
            reasons.append(f"nearest climate grid point is {rep_km:.0f} km from the district HQ")
        out.append({
            "id": slug(name), "name": name, "hq": d["hq"], "points": d["points"], "rep_point": d["rep_point"],
            "years": d["years"], "area_ha": d["area_ha"], "tree_crops_ha": d["tree_crops_ha"],
            "other_crops_ha": d["other_crops_ha"], "irrigation_share": None,
            "crops": crops,
            "mismatch": {"modelled_area_ha": round(area), "rainfed_reliability": round(rel, 3),
                         "water_dependent_share": round(dep, 3), "mismatch_index": round(100 * dep),
                         "irrigation_demand_mcm": round(demand, 1),
                         "largest_crop": biggest[0], "largest_crop_share": round(biggest[1]["area_ha"] / area, 3),
                         "confidence": "low" if reasons else "normal", "confidence_reasons": reasons,
                         "rep_point_km": round(float(rep_km))},
            "top_rainfed": top, "switch_scenarios": sc,
        })
    meta = {"source": "Areas: Govt of India DES Crop Statistics (district APY) avg 2018-19..2022-23; reliability and "
                      "irrigation need: Field Shift engine replay 2001-2024 at the district's representative grid point.",
            "fail_cut": FAIL_CUT,
            "caveats": ["irrigation_share is unknown (null): a high mismatch index means the district's crops "
                        "depend on irrigation, not that they are failing; it flags where water supply is the "
                        "critical risk.", "Rice is not split by season in the APY data; all rice uses the "
                        "long-duration (Samba/Thaladi/Pishanam) profile.", "Switch scenarios are illustrative."]}
    (ROOT / "web" / "data" / "districts.json").write_text(json.dumps({"meta": meta, "districts": out}, indent=1))

    # ---- sanity checks ----
    mi = np.array([x["mismatch"]["mismatch_index"] for x in out])
    rr = np.array([x["mismatch"]["rainfed_reliability"] for x in out])
    print(f"{len(out)} districts | mismatch index {mi.min()}-{mi.max()} (sd {mi.std():.0f}) | rain-fed reliability "
          f"{rr.min():.2f}-{rr.max():.2f} (sd {rr.std():.2f}) | total irrigation demand "
          f"{sum(x['mismatch']['irrigation_demand_mcm'] for x in out)/1000:.1f} BCM")
    print(f"distinct best rain-fed crops: {sorted({x['top_rainfed'][0]['crop'] for x in out})}")
    for x in sorted(out, key=lambda x: -x["mismatch"]["mismatch_index"]):
        m, s = x["mismatch"], x["switch_scenarios"][0]
        print(f"  {x['name']:16s} {'LOW ' if m['confidence']=='low' else '    '}idx {m['mismatch_index']:3d}  rel {m['rainfed_reliability']:.2f}  "
              f"largest {m['largest_crop']}({m['largest_crop_share']:.0%})  demand {m['irrigation_demand_mcm']:7.0f} MCM  "
              f"| 25%→{s['to_crop']}: saves {s['water_saved_mcm']:6.0f} MCM, rel→{s['rainfed_reliability']:.2f}")


if __name__ == "__main__":
    main()
