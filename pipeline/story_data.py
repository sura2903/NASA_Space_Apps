"""Small data file for the home (landing) page: web/data/story.json (a few KB, so the first page loads fast).

  seasons     Thanjavur year-by-year outcomes (1 came through, 0 failed) from docs/video/thanjavur_seasons.json
              (engine replay): today's rice-rice plan and the bigger shift on canal water, and lake-fed long rice
  districts   per district (grid/index.json `district`, OpenStreetMap): mean 1-in-100-year NE-monsoon drought
              (% of normal, IMD 124 years) and mean extra very hot days by 2041-2060 (SSP2-4.5), from
              web/data/statewide_risk.json; drawn on the district outlines in data/boundaries.json
  stats       headline numbers, each read from its data file (not typed in)

    python pipeline/story_data.py
"""
from __future__ import annotations

import json
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
W = ROOT / "web" / "data"


def main():
    seasons = json.loads((ROOT / "docs" / "video" / "thanjavur_seasons.json").read_text(encoding="utf-8"))
    risk = json.loads((W / "statewide_risk.json").read_text(encoding="utf-8"))
    idx = {p["id"]: p for p in json.loads((W / "grid" / "index.json").read_text(encoding="utf-8"))["points"]}
    bt = json.loads((W / "backtest.json").read_text(encoding="utf-8"))
    crops = json.loads((W / "crops.json").read_text(encoding="utf-8"))
    crops = crops if isinstance(crops, list) else crops["crops"]

    by = {}
    for p in risk["points"]:
        meta = idx.get(p["id"], {})
        d = meta.get("district")
        if not d or meta.get("border_state"):
            continue
        drought = (p.get("extremes") or {}).get("drought_100yr_pct_of_normal")
        heat = ((p.get("future") or {}).get("ssp245") or {}).get("hot_days_change")
        a = by.setdefault(d, {"drought": [], "heat": [], "ta": meta.get("district_ta") or d})
        if drought is not None:
            a["drought"].append(drought)
        if heat is not None:
            a["heat"].append(heat)
    districts = {d: {"name_ta": a["ta"], "n": max(len(a["drought"]), len(a["heat"])),
                     "drought_pct": round(mean(a["drought"]), 1) if a["drought"] else None,
                     "hot_days_2050": round(mean(a["heat"]), 1) if a["heat"] else None} for d, a in sorted(by.items())}

    y2016 = bt["by_year"]["2016"] if isinstance(bt["by_year"], dict) else next(x for x in bt["by_year"] if x["year"] == 2016)
    heat_all = [((p.get("future") or {}).get("ssp245") or {}).get("hot_days_change") for p in risk["points"]]
    tmax_all = [((p.get("future") or {}).get("ssp245") or {}).get("tmax_change_c") for p in risk["points"]]
    stats = {
        "places": len(idx), "districts": len(districts), "crops": len(crops),
        "layers": len(risk["layers"]) + 1,     # the Policy map also offers the combined exposure score
        "lift": bt["overall"]["lift"], "p_bad_fail": bt["overall"]["p_bad_given_fail"],
        "p_bad_pass": bt["overall"]["p_bad_given_pass"], "r_years": bt["year_level"]["pearson_r"],
        "series": bt["n_series"], "y2016_flagged": y2016["model_fail_share"], "y2016_bad": y2016["bad_yield_share"],
        "hot_days_2050_max": round(max(x for x in heat_all if x is not None), 1),
        "tmax_2050_median": round(sorted(x for x in tmax_all if x is not None)[len(tmax_all) // 2], 1),
    }
    out = {"source": "Built by pipeline/story_data.py from web/data (engine replay, statewide_risk, backtest)",
           "seasons": {k: v for k, v in seasons.items() if k != "note"}, "districts": districts, "stats": stats}
    (W / "story.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"story.json: {len(districts)} districts, {(W / 'story.json').stat().st_size / 1024:.1f} KB", stats)


if __name__ == "__main__":
    main()
