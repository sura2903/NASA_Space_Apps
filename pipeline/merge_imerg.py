"""Compare NASA POWER vs GPM IMERG rainfall and make IMERG the rainfall source.

Input : pipeline/data/imerg_monthly_2001_2024.json  (monthly IMERG aggregates per site,
        pulled from the GES DISC Giovanni Time Series API; see docs/PROGRESS.md)
Output: updates web/data/sites/<id>.json in place:
  - monthly[] / by_year[].months[]: precip_mm, water_balance_mm, heavy_rain_days,
    max_daily_precip_mm now come from IMERG; POWER values kept as power_precip_mm
  - top-level "precip_source" and "rain_comparison" (POWER vs IMERG summary)
Re-running is safe (it always starts from the POWER values it preserved).

    python pipeline/merge_imerg.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
IMERG = ROOT / "pipeline" / "data" / "imerg_monthly_2001_2024.json"
SITES = ROOT / "web" / "data" / "sites"


def r1(x):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), 1)


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", action="store_true",
                    help="merge pipeline/data/imerg_grid_monthly_2001_2024.json into web/data/grid/")
    args = ap.parse_args()
    imerg_path = IMERG.with_name("imerg_grid_monthly_2001_2024.json") if args.grid else IMERG
    target = SITES.parent / "grid" if args.grid else SITES
    src = json.loads(imerg_path.read_text(encoding="utf-8"))
    for site_id, im in src["sites"].items():
        path = target / f"{site_id}.json"
        if not path.exists():
            print(f"skip {site_id}: no site file")
            continue
        site = json.loads(path.read_text(encoding="utf-8"))
        years = [y["year"] for y in site["by_year"]]

        power_ann, imerg_ann, power_ne, imerg_ne = [], [], [], []
        pm_all, im_all = [], []
        for y in site["by_year"]:
            pa = ia = pn = inn = 0.0
            for mi, m in enumerate(y["months"]):
                p = m.get("power_precip_mm", m["precip_mm"])
                tot, heavy, mx = im["months"][f"{y['year']}-{mi + 1:02d}"]
                et0 = m["et0_mm"]
                m["power_precip_mm"] = r1(p)
                m["precip_mm"] = r1(tot)
                m["water_balance_mm"] = r1(tot - et0)
                m["heavy_rain_days"] = int(heavy)
                m["max_daily_precip_mm"] = r1(mx)
                pa += p; ia += tot
                if mi >= 9:
                    pn += p; inn += tot
                pm_all.append(p); im_all.append(tot)
            power_ann.append(pa); imerg_ann.append(ia); power_ne.append(pn); imerg_ne.append(inn)

        # monthly climatology from the per-year IMERG values
        for mi, m in enumerate(site["monthly"]):
            vals = [y["months"][mi] for y in site["by_year"]]
            if "power_precip_mm" not in m:
                m["power_precip_mm"] = m["precip_mm"]
            m["precip_mm"] = r1(np.mean([v["precip_mm"] for v in vals]))
            m["water_balance_mm"] = r1(m["precip_mm"] - m["et0_mm"])
            m["heavy_rain_days"] = r1(np.mean([v["heavy_rain_days"] for v in vals]))

        # annual series + rainfall trend from IMERG
        for a, ia in zip(site["annual"], imerg_ann):
            a["power_precip_mm"] = a.get("power_precip_mm", a["precip_mm"])
            a["precip_mm"] = round(ia)
        site["trends"]["power_precip_mm_per_decade"] = site["trends"].get(
            "power_precip_mm_per_decade", site["trends"]["precip_mm_per_decade"])
        site["trends"]["precip_mm_per_decade"] = round(float(np.polyfit(years, imerg_ann, 1)[0] * 10), 1)

        corr_month = float(np.corrcoef(pm_all, im_all)[0, 1])
        corr_ne = float(np.corrcoef(power_ne, imerg_ne)[0, 1])
        dry_p = years[int(np.argmin(power_ne))]
        dry_i = years[int(np.argmin(imerg_ne))]
        site["precip_source"] = (
            f"GPM IMERG Final daily V07 at {im['grid_lat']:.2f}N {im['grid_lon']:.2f}E (0.1° grid); "
            "temperature/ET0 from NASA POWER")
        site["rain_comparison"] = {
            "power_annual_mean_mm": round(float(np.mean(power_ann))),
            "imerg_annual_mean_mm": round(float(np.mean(imerg_ann))),
            "power_ne_monsoon_mean_mm": round(float(np.mean(power_ne))),
            "imerg_ne_monsoon_mean_mm": round(float(np.mean(imerg_ne))),
            "monthly_correlation": round(corr_month, 2),
            "ne_monsoon_correlation": round(corr_ne, 2),
            "driest_ne_year_power": dry_p,
            "driest_ne_year_imerg": dry_i,
        }
        path.write_text(json.dumps(site, indent=2, allow_nan=False), encoding="utf-8")
        c = site["rain_comparison"]
        print(f"{site_id:12s} annual POWER {c['power_annual_mean_mm']:5d} vs IMERG {c['imerg_annual_mean_mm']:5d} mm | "
              f"Oct-Dec {c['power_ne_monsoon_mean_mm']} vs {c['imerg_ne_monsoon_mean_mm']} | r_month={c['monthly_correlation']} "
              f"r_NE={c['ne_monsoon_correlation']} | driest NE: {dry_p} vs {dry_i} | "
              f"trend {site['trends']['power_precip_mm_per_decade']} -> {site['trends']['precip_mm_per_decade']} mm/dec")

    if args.grid:
        return
    # keep sample_site in sync with the hero site
    (SITES / "sample_site.json").write_text((SITES / "tirunelveli.json").read_text(encoding="utf-8"), encoding="utf-8")


if __name__ == "__main__":
    main()
