"""Add dry-spell risk and monsoon-onset dates to every site and grid file (Lane B requests 1 and 2).

Input: pipeline/data/imerg_dryspells_onset.json, computed from GPM IMERG Final daily V07 (2001-2024)
via the GES DISC Giovanni API in the browser (same session as the IMERG rain pull).
Adds to web/data/sites/<id>.json and web/data/grid/<id>.json:
  dry_spells: { threshold_mm: 2.5, window_days: 30, by_sow_month: { "10": { years, ge10, ge15 }, ... } }
  ne_onset: { method, search_from, median_doy, median_date, years: [{year, doy}] }      (from 10 Oct)
  sowing_rain_onset: { same shape }                                                      (from 15 Sep)
Run after build_all.py / build_grid.py / merge_imerg.py (those rebuild the files without these fields).

    python pipeline/merge_dryspells.py
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = json.loads((Path(__file__).resolve().parent / "data" / "imerg_dryspells_onset.json").read_text())


def with_median(block: dict, method: str) -> dict:
    d = sorted(o["doy"] for o in block["years"] if o["doy"] is not None)
    med = d[len(d) // 2] if d else None
    return {"method": method, "search_from": block.get("search_from"), "median_doy": med,
            "median_date": None if med is None else (dt.date(2021, 1, 1) + dt.timedelta(days=med - 1)).strftime("%d %b"),
            "years_without_onset": sum(1 for o in block["years"] if o["doy"] is None), "years": block["years"]}


def main() -> None:
    m = SRC["method"]
    done = 0
    for sid, v in SRC["sites"].items():
        path = ROOT / "web" / "data" / ("grid" if sid.startswith("g") and sid[1:5].isdigit() else "sites") / f"{sid}.json"
        if not path.exists():
            print("skip", sid)
            continue
        site = json.loads(path.read_text(encoding="utf-8"))
        site["dry_spells"] = v["dry_spells"] | {"source": m["source"], "definition": m["dry_spell"]}
        site["ne_onset"] = with_median(v["ne_onset"], m["ne_onset"])
        site["sowing_rain_onset"] = with_median(v["sowing_rain_onset"], m["sowing_rain_onset"])
        path.write_text(json.dumps(site, indent=2, allow_nan=False), encoding="utf-8")
        done += 1
    # keep sample_site in sync with the hero site
    sites = ROOT / "web" / "data" / "sites"
    (sites / "sample_site.json").write_text((sites / "tirunelveli.json").read_text(encoding="utf-8"), encoding="utf-8")
    print(f"updated {done} files")
    for sid in ("tirunelveli", "madurai", "thanjavur"):
        s = json.loads((sites / f"{sid}.json").read_text(encoding="utf-8"))
        risk = {k: round(100 * x["ge10"] / x["years"]) for k, x in s["dry_spells"]["by_sow_month"].items()}
        print(f"  {sid}: NE onset median {s['ne_onset']['median_date']} (none in {s['ne_onset']['years_without_onset']} yrs), "
              f"sowing rains {s['sowing_rain_onset']['median_date']}; 10+ day dry spell after sowing %: {risk}")


if __name__ == "__main__":
    main()
