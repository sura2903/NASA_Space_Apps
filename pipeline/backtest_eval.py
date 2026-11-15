"""Backtest step 2: do the engine's predicted failure years match real bad-yield years?

Inputs: pipeline/data/yield_anomalies.json (backtest_prep.py) and pipeline/data/backtest_replay.json
(web/dev/backtest.html?post=1, the engine's per-year replay at each district's nearest grid point).
Year mapping: a crop sown Jan-May of year y belongs to crop year (y-1)-(y); otherwise y-(y+1).

Per crop (pooled over districts) and overall:
  - 2x2 table model-fail vs bad-yield year (bad = bottom 25% detrended yield anomaly)
  - lift = P(bad | model fail) / P(bad | model ok); one-sided Fisher exact p
  - mean yield anomaly in model-fail vs model-ok years (one-sided Mann-Whitney)
Output: web/data/backtest.json + console summary.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy import stats

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
ANOM = json.loads((HERE / "data" / "yield_anomalies.json").read_text())
REPLAY = json.loads((HERE / "data" / "backtest_replay.json").read_text())


def evaluate(pairs):
    a = sum(1 for f, b, _ in pairs if f and b)
    bb = sum(1 for f, b, _ in pairs if f and not b)
    c = sum(1 for f, b, _ in pairs if not f and b)
    d = sum(1 for f, b, _ in pairs if not f and not b)
    p_bad_fail = a / (a + bb) if a + bb else None
    p_bad_ok = c / (c + d) if c + d else None
    lift = (p_bad_fail / p_bad_ok) if p_bad_fail is not None and p_bad_ok else None
    fisher_p = stats.fisher_exact([[a, bb], [c, d]], alternative="greater")[1] if (a + bb) and (c + d) else None
    an_fail = [x for f, _, x in pairs if f]
    an_ok = [x for f, _, x in pairs if not f]
    mw_p = stats.mannwhitneyu(an_fail, an_ok, alternative="less").pvalue if an_fail and an_ok else None
    return {
        "n_years": len(pairs), "model_fail_years": a + bb, "bad_years": a + c,
        "table": {"fail_bad": a, "fail_ok": bb, "pass_bad": c, "pass_ok": d},
        "p_bad_given_fail": None if p_bad_fail is None else round(p_bad_fail, 3),
        "p_bad_given_pass": None if p_bad_ok is None else round(p_bad_ok, 3),
        "lift": None if lift is None else round(lift, 2),
        "fisher_p": None if fisher_p is None else round(float(fisher_p), 4),
        # medians: a few extreme yield ratios (tiny areas, data errors) distort means
        "median_anomaly_fail": None if not an_fail else round(float(np.median(an_fail)), 4),
        "median_anomaly_pass": None if not an_ok else round(float(np.median(an_ok)), 4),
        "mannwhitney_p": None if mw_p is None else round(float(mw_p), 4),
    }


def main() -> None:
    by_crop, all_pairs, per_series, per_year = defaultdict(list), [], {}, defaultdict(lambda: [0, 0, 0, 0])
    never_fail = 0
    tgt_pairs = {"area": defaultdict(list), "production": defaultdict(list)}
    for key, a in ANOM.items():
        rp = REPLAY.get(key)
        if not rp:
            continue
        sow = rp["sow"]
        pairs = []
        for ry, v in rp["years"].items():
            cy = int(ry) - 1 if sow <= 5 else int(ry)
            ya = a["years"].get(str(cy)) or a["years"].get(cy)
            if ya is None:
                continue
            fail = not v["ok"]
            pairs.append((fail, ya["bad"], ya["anomaly"]))
            for tgt in ("area", "production"):
                if f"{tgt}_bad" in ya:
                    tgt_pairs[tgt][a["crop"]].append((fail, ya[f"{tgt}_bad"], ya[f"{tgt}_anomaly"]))
            pc = per_year[cy]; pc[0] += fail; pc[1] += ya["bad"]; pc[2] += fail and ya["bad"]; pc[3] += 1
        if not any(f for f, _, _ in pairs):
            never_fail += 1
        per_series[key] = evaluate(pairs) | {"district": a["district"], "crop": a["crop"], "water_source": a["water_source"]}
        by_crop[a["crop"]] += pairs
        all_pairs += pairs

    overall = evaluate(all_pairs)
    crops = {c: evaluate(p) for c, p in sorted(by_crop.items())}
    years = {y: {"series": n, "model_fail_share": round(f / n, 2), "bad_yield_share": round(b / n, 2), "both": fb}
             for y, (f, b, fb, n) in sorted(per_year.items())}
    ys = sorted(years)
    r_year, p_year = stats.pearsonr([years[y]["model_fail_share"] for y in ys], [years[y]["bad_yield_share"] for y in ys])
    rho_year, prho_year = stats.spearmanr([years[y]["model_fail_share"] for y in ys], [years[y]["bad_yield_share"] for y in ys])
    year_level = {"pearson_r": round(float(r_year), 3), "pearson_p": round(float(p_year), 4),
                  "spearman_rho": round(float(rho_year), 3), "spearman_p": round(float(prho_year), 4),
                  "note": "Across years: share of series the model fails vs share with a bad yield."}
    # Same model failures scored against planted area and production (rice responds by not planting)
    by_target = {"yield": {"overall": overall, "by_crop": crops}}
    for tgt, bc in tgt_pairs.items():
        by_target[tgt] = {"overall": evaluate([p for v in bc.values() for p in v]),
                          "by_crop": {c: evaluate(p) for c, p in sorted(bc.items())}}
    out = {
        "year_level": year_level,
        "by_target": by_target,
        "description": ("Backtest of the Field Shift replay against Tamil Nadu district yields (DES Crop Statistics, "
                        "2001-02 to 2022-23). Bad year = bottom 25% of Theil-Sen-detrended yield anomaly per district "
                        "x crop. Model fail = the engine's replay says the crop failed that season (water, heat or flood) "
                        "at the district HQ's nearest grid point; rice replayed as tank-irrigated, other crops rain-fed."),
        "n_series": len(per_series), "series_where_model_never_fails": never_fail,
        "overall": overall, "by_crop": crops, "by_year": years, "per_series": per_series,
    }
    (ROOT / "web" / "data" / "backtest.json").write_text(json.dumps(out, indent=1))

    def line(name, e):
        return (f"{name:14s} n={e['n_years']:4d} fail={e['model_fail_years']:4d} | P(bad|fail)={e['p_bad_given_fail']} "
                f"P(bad|pass)={e['p_bad_given_pass']} lift={e['lift']} fisher_p={e['fisher_p']} | "
                f"median anom fail={e['median_anomaly_fail']} pass={e['median_anomaly_pass']} mw_p={e['mannwhitney_p']}")
    print(f"series={len(per_series)} (model never fails in {never_fail}); year-level {year_level}")
    print("\nlift by target (yield / area / production):")
    for c in sorted(by_target["yield"]["by_crop"]):
        l = [by_target[t]["by_crop"].get(c, {}) for t in ("yield", "area", "production")]
        print(f"  {c:14s} " + "  ".join(f"{t[:4]} {x.get('lift')} (p={x.get('fisher_p')})" for t, x in zip(("yield", "area", "production"), l)))
    print("  " + "  ".join(f"{t} overall lift {by_target[t]['overall']['lift']}" for t in by_target))
    print(line("OVERALL", overall))
    for c, e in crops.items():
        print(line(c, e))
    print("\nyear  model_fail_share  bad_yield_share")
    for y, v in years.items():
        print(f"{y}   {v['model_fail_share']:.2f}   {v['bad_yield_share']:.2f}   (n={v['series']})")


if __name__ == "__main__":
    main()
