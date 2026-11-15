"""Climate-change Layer 1: is the climate at each site actually shifting? (TASKS A14)

For each demo site, pull NASA POWER daily 1981-2024, compute yearly agro-climate indicators,
and test each for change:
  - Mann-Kendall trend test (scipy kendalltau on year vs value) + Sen's slope with 95% CI
  - then-vs-now: 1981-2000 vs 2001-2024 means (Mann-Whitney U) and variability (Levene)
  - Pettitt change-point test (most likely year the series shifted)
Rain indicators are cross-checked against GPM IMERG (satellite, 2001-2024) already stored in
web/data/sites/<id>.json, because POWER rain before 2001 is reanalysis-based.

Output: web/data/trends/<id>.json and web/data/trends/index.json (format: docs/data_contract.md).

    python pipeline/climate_trends.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

from fetch_power import fetch_power, hargreaves_et0
from build_all import TN_SITES

ROOT = Path(__file__).resolve().parents[1]
SITES_DIR = ROOT / "web" / "data" / "sites"
OUT_DIR = ROOT / "web" / "data" / "trends"
START, END, SPLIT = 1981, 2024, 2000          # "then" = START..SPLIT, "now" = SPLIT+1..END
HEAT_C, HEAVY_MM, RAINY_MM = 38.0, 64.5, 2.5  # IMD heavy-rain and rainy-day thresholds

INDICATORS = {  # id: (label, unit, group, higher_is_worse_for_crops or None)
    "tmax_mean":     ("Average daytime high", "°C", "heat", True),
    "hot_days":      (f"Very hot days (above {HEAT_C:.0f} °C)", "days/yr", "heat", True),
    "warm_nights":   ("Warm nights (above the 1981–2010 90th percentile)", "nights/yr", "heat", True),
    "annual_rain":   ("Rain per year", "mm", "rain", None),
    "ne_rain":       ("Northeast monsoon rain (Oct–Dec)", "mm", "rain", None),
    "sw_rain":       ("Southwest monsoon rain (Jun–Sep)", "mm", "rain", None),
    "heavy_days":    ("Heavy-rain days (≥64.5 mm)", "days/yr", "extremes", True),
    "max_1day":      ("Biggest one-day rain", "mm", "extremes", True),
    "ne_dry_spell":  ("Longest dry spell inside the NE monsoon", "days", "extremes", True),
    "et0_annual":    ("Crop thirst (reference evapotranspiration)", "mm/yr", "water", True),
    "water_balance": ("Rain minus crop thirst", "mm/yr", "water", False),
    "soil_wetness":  ("Root-zone soil wetness", "0–1", "water", False),
}
IMERG_CHECK = {"annual_rain": "precip", "ne_rain": "ne", "sw_rain": "sw", "heavy_days": "heavy", "max_1day": "max"}


def longest_run(mask: np.ndarray) -> int:
    best = cur = 0
    for v in mask:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def yearly_indicators(df: pd.DataFrame, lat: float) -> pd.DataFrame:
    df = df.copy()
    df["et0"] = hargreaves_et0(df, lat)
    base = df[(df.index.year >= 1981) & (df.index.year <= 2010)]
    tn90 = float(np.nanpercentile(base["tmin"], 90))
    rows = []
    for y, g in df.groupby(df.index.year):
        m = g.index.month
        ne = g[m >= 10]
        rows.append({
            "year": int(y),
            "tmax_mean": g["tmax"].mean(),
            "hot_days": int((g["tmax"] > HEAT_C).sum()),
            "warm_nights": int((g["tmin"] > tn90).sum()),
            "annual_rain": g["precip"].sum(),
            "ne_rain": ne["precip"].sum(),
            "sw_rain": g[(m >= 6) & (m <= 9)]["precip"].sum(),
            "heavy_days": int((g["precip"] >= HEAVY_MM).sum()),
            "max_1day": g["precip"].max(),
            "ne_dry_spell": longest_run((ne["precip"] < RAINY_MM).to_numpy()),
            "et0_annual": g["et0"].sum(),
            "water_balance": g["precip"].sum() - g["et0"].sum(),
            "soil_wetness": g["gwetroot"].mean(),
        })
    out = pd.DataFrame(rows).set_index("year")
    out.attrs["tn90"] = tn90
    return out


def pettitt(x: np.ndarray) -> tuple[int, float]:
    """Pettitt (1979) change-point test: index of the most likely shift and approx p-value."""
    n = len(x)
    s = np.sign(x[:, None] - x[None, :])
    u = np.array([s[: t + 1, t + 1:].sum() for t in range(n - 1)])
    k = int(np.argmax(np.abs(u)))
    kmax = np.abs(u[k])
    p = float(min(1.0, 2 * np.exp(-6 * kmax ** 2 / (n ** 3 + n ** 2))))
    return k, p


def trend_stats(years: np.ndarray, vals: np.ndarray) -> dict:
    ok = ~np.isnan(vals)
    years, vals = years[ok], vals[ok]
    tau, p_mk = stats.kendalltau(years, vals)
    slope, _, lo, hi = stats.theilslopes(vals, years, 0.95)
    return {"sen_per_decade": slope * 10, "sen_ci95": [lo * 10, hi * 10], "mk_tau": float(tau), "mk_p": float(p_mk)}


def verdict(p: float, slope: float, tau: float = 0.0) -> tuple[str, str]:
    # Sen's slope is 0 for count series that are mostly zeros (e.g. heavy-rain days); fall back to
    # the Kendall tau sign for the direction in that case.
    s = slope if slope != 0 else tau
    direction = "rising" if s > 0 else "falling" if s < 0 else "flat"
    if p < 0.05:
        return direction, "clear"
    if p < 0.10:
        return direction, "likely"
    return "no clear change", "none"


def fmt(v: float, unit: str) -> str:
    nd = 2 if unit in ("0–1",) else 1 if (unit == "°C" or "days" in unit or "nights" in unit) and abs(v) < 20 else 0
    return f"{v:.{nd}f}"


def pfmt(p: float) -> str:
    return "p<0.01" if p < 0.01 else f"p={p:.2f}"


def analyse_site(s: dict) -> dict:
    df = fetch_power(s["lat"], s["lon"], START, END, s["id"])
    yi = yearly_indicators(df, s["lat"])
    site_json = json.loads((SITES_DIR / f"{s['id']}.json").read_text(encoding="utf-8"))

    # IMERG yearly values (2001-2024) from the site file's by_year
    im = {}
    for y in site_json["by_year"]:
        ms = y["months"]
        im[y["year"]] = {
            "precip": sum(m["precip_mm"] for m in ms),
            "ne": sum(m["precip_mm"] for m in ms[9:12]),
            "sw": sum(m["precip_mm"] for m in ms[5:9]),
            "heavy": sum(m["heavy_rain_days"] for m in ms),
            "max": max((m.get("max_daily_precip_mm") or 0) for m in ms),
        }

    years = yi.index.to_numpy()
    out_ind = {}
    for key, (label, unit, group, worse_up) in INDICATORS.items():
        vals = yi[key].to_numpy(dtype=float)
        t = trend_stats(years, vals)
        then, now = vals[years <= SPLIT], vals[years > SPLIT]
        mw_p = float(stats.mannwhitneyu(then, now, alternative="two-sided").pvalue)
        lev_p = float(stats.levene(then, now).pvalue)
        k, pet_p = pettitt(vals)
        direction, conf = verdict(t["mk_p"], t["sen_per_decade"], t["mk_tau"])
        # Rain trends: if the satellite record (IMERG, 2001-2024) disagrees on direction with POWER
        # over the same years, don't present the POWER trend as established.
        imerg_disagrees = False
        if key in IMERG_CHECK:
            yrs_c = np.array(sorted(im))
            ti_c = trend_stats(yrs_c, np.array([im[y][IMERG_CHECK[key]] for y in yrs_c], dtype=float))
            tp_c = trend_stats(years[years >= yrs_c[0]], vals[years >= yrs_c[0]])
            imerg_disagrees = np.sign(ti_c["sen_per_decade"] or ti_c["mk_tau"]) != np.sign(tp_c["sen_per_decade"] or tp_c["mk_tau"])
            if imerg_disagrees and conf != "none":
                conf = "uncertain"
        conf_word = {"clear": "clear trend", "likely": "likely trend", "none": "not significant",
                     "uncertain": "uncertain: the satellite record disagrees"}[conf]
        size = (f" by {'+' if t['sen_per_decade'] > 0 else ''}{fmt(t['sen_per_decade'], unit)} {unit} per decade"
                if t["sen_per_decade"] != 0 else "")
        sentence = (f"{label}: " + (f"{direction}{size}" if conf != "none" else "no clear trend")
                    + f" ({conf_word}, {pfmt(t['mk_p'])}). {START}–{SPLIT} average {fmt(then.mean(), unit)} → "
                      f"{SPLIT + 1}–{END} average {fmt(now.mean(), unit)} {unit}.")
        entry = {
            "label": label, "unit": unit, "group": group,
            "higher_is_worse": worse_up,
            "series": [{"year": int(y), "value": round(float(v), 3)} for y, v in zip(years, vals)],
            "sen_per_decade": round(t["sen_per_decade"], 3),
            "sen_ci95": [round(x, 3) for x in t["sen_ci95"]],
            "mk_p": round(t["mk_p"], 4),
            "direction": direction, "confidence": conf,
            "then": {"years": [START, SPLIT], "mean": round(float(then.mean()), 3), "sd": round(float(then.std(ddof=1)), 3)},
            "now": {"years": [SPLIT + 1, END], "mean": round(float(now.mean()), 3), "sd": round(float(now.std(ddof=1)), 3)},
            "then_vs_now_p": round(mw_p, 4), "variability_change_p": round(lev_p, 4),
            "change_point": {"year": int(years[k] + 1), "p": round(pet_p, 4)},
            "source": "NASA POWER daily (MERRA-2 based), 1981–2024",
            "sentence": sentence,
        }
        if key in IMERG_CHECK:
            yrs_i = np.array(sorted(im))
            v_i = np.array([im[y][IMERG_CHECK[key]] for y in yrs_i], dtype=float)
            ti = trend_stats(yrs_i, v_i)
            tp = trend_stats(years[years >= yrs_i[0]], vals[years >= yrs_i[0]])
            same = not imerg_disagrees  # same sign rule as above (tau fallback for zero slopes)
            entry["imerg_check"] = {
                "years": [int(yrs_i[0]), int(yrs_i[-1])],
                "imerg_sen_per_decade": round(ti["sen_per_decade"], 3), "imerg_mk_p": round(ti["mk_p"], 4),
                "power_same_period_sen_per_decade": round(tp["sen_per_decade"], 3), "power_same_period_mk_p": round(tp["mk_p"], 4),
                "same_direction": bool(same),
                "note": ("POWER and IMERG agree on the direction since 2001" if same
                         else "POWER and IMERG disagree on the direction since 2001: treat this rain trend as uncertain"),
            }
        out_ind[key] = entry

    # Data-quality flag: many unrelated indicators shifting in the same few years usually points
    # to a change in the reanalysis inputs rather than the climate.
    cps = [e["change_point"]["year"] for e in out_ind.values() if e["change_point"]["p"] < 0.1]
    caveats = []
    if cps:
        yr_mode = max(set(cps), key=lambda y: sum(abs(c - y) <= 1 for c in cps))
        cluster = sum(abs(c - yr_mode) <= 1 for c in cps)
        if cluster >= 4:
            caveats.append(f"{cluster} indicators show a change point around {yr_mode}. A simultaneous shift across "
                           "unrelated variables can be an artefact of changing inputs to the MERRA-2 reanalysis behind "
                           "NASA POWER, so read the then-vs-now numbers with care.")
    dis = [INDICATORS[k][0] for k, e in out_ind.items() if e.get("imerg_check") and not e["imerg_check"]["same_direction"]]
    if dis:
        caveats.append("Satellite rain (GPM IMERG, 2001–2024) disagrees with NASA POWER on the direction of: "
                       + ", ".join(dis) + ". Those rain trends are marked uncertain.")
    return {
        "id": s["id"], "name": s["name"], "lat": s["lat"], "lon": s["lon"],
        "caveats": caveats,
        "period": [START, END], "split_year": SPLIT,
        "warm_night_threshold_c": round(yi.attrs["tn90"], 1),
        "method": ("Mann-Kendall test with Sen's slope (95% CI); then-vs-now Mann-Whitney U and Levene tests "
                   f"({START}–{SPLIT} vs {SPLIT + 1}–{END}); Pettitt change point. 'clear' = p<0.05, 'likely' = p<0.10. "
                   "Short records and year-to-year swings make rain trends noisy; heat trends are more robust."),
        "indicators": out_ind,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index = []
    for s in TN_SITES:
        res = analyse_site(s)
        (OUT_DIR / f"{s['id']}.json").write_text(json.dumps(res, indent=1, allow_nan=False), encoding="utf-8")
        index.append({"id": s["id"], "name": s["name"]})
        print(f"\n=== {s['name']} (warm-night threshold {res['warm_night_threshold_c']} °C)")
        for key, e in res["indicators"].items():
            chk = e.get("imerg_check")
            extra = f"  | IMERG 2001–24: {chk['imerg_sen_per_decade']:+.1f}/dec p={chk['imerg_mk_p']:.2f} ({'agree' if chk['same_direction'] else 'DISAGREE'})" if chk else ""
            print(f"  {key:13s} {e['direction']:16s} {e['confidence']:6s} sen={e['sen_per_decade']:+8.2f}/dec p={e['mk_p']:.3f} "
                  f"then {e['then']['mean']:8.1f} now {e['now']['mean']:8.1f} cp={e['change_point']['year']}{extra}")
    (OUT_DIR / "index.json").write_text(json.dumps(index, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
