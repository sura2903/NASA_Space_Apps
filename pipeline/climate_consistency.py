"""Climate-change Layer 2: are the observed trends consistent with what climate science expects? (TASKS A15)

Reads web/data/trends/<id>.json (Layer 1), compares each indicator with the change expected for
South India / Tamil Nadu from published assessments, and writes the result back into the same file:
  indicators[k]["layer2"] = {expected, expected_confidence, status, note, refs}
  "layer2_summary" (plain-language bullets) and "references".

Wording rule: "consistent with" / "not consistent with" / "no detectable change yet" / "inconclusive".
This is a consistency check, never formal attribution.

    python pipeline/climate_consistency.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRENDS = ROOT / "web" / "data" / "trends"

REFERENCES = {
    "ipcc_asia": {
        "short": "IPCC AR6 WGI Regional Fact Sheet: Asia (2021)",
        "url": "https://www.ipcc.ch/report/ar6/wg1/downloads/factsheets/IPCC_AR6_WGI_Regional_Fact_Sheet_Asia.pdf",
    },
    "ipcc_wg2_ch10": {
        "short": "IPCC AR6 WGII Chapter 10: Asia (2022)",
        "url": "https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-10/",
    },
    "moes_2020": {
        "short": "MoES (Govt of India), Assessment of Climate Change over the Indian Region (Krishnan et al., 2020)",
        "url": "https://link.springer.com/book/10.1007/978-981-15-4327-2",
    },
    "imd_nem": {
        "short": "IMD Met Monograph: Northeast Monsoon of South Asia",
        "url": "https://mausam.imd.gov.in/imd_latest/contents/met_monograph.pdf",
    },
}

# expected direction: "rising" | "falling" | None (no robust expectation); confidence: high | medium | low
EXPECTED = {
    "tmax_mean": ("rising", "high", ["ipcc_asia", "moes_2020"],
                  "Asia and India have warmed (India ~0.7 °C since 1901); warming continues."),
    "hot_days": ("rising", "high", ["ipcc_asia", "moes_2020"],
                 "Hot extremes have increased across Asia (high confidence); India's warmest days have warmed."),
    "warm_nights": ("rising", "high", ["ipcc_asia", "moes_2020"],
                    "Cold extremes decreasing and nights warming are among the most robust warming signals."),
    "annual_rain": (None, "low", ["ipcc_wg2_ch10", "imd_nem"],
                    "No robust observed trend expected for Tamil Nadu's total rain; projections lean wetter with more variability (medium confidence)."),
    "ne_rain": (None, "low", ["imd_nem"],
                "The northeast monsoon is highly variable (~25% year to year) with no established long-term trend in totals."),
    "sw_rain": ("falling", "medium", ["ipcc_wg2_ch10", "moes_2020"],
                "South Asian summer-monsoon rain declined in the late 20th century (high confidence), notably over the Western Ghats; less certain for Tamil Nadu, which gets little SW rain."),
    "heavy_days": ("rising", "medium", ["ipcc_wg2_ch10", "moes_2020"],
                   "Heavy rain has increased in South Asia (high confidence), but signals at one location are noisy."),
    "max_1day": ("rising", "medium", ["ipcc_wg2_ch10", "moes_2020"],
                 "Rain extremes are intensifying regionally (high confidence); local single-point signals are noisy."),
    "ne_dry_spell": (None, "low", ["moes_2020"],
                     "More frequent dry spells are reported for the summer monsoon; no clear expectation for the NE monsoon."),
    "et0_annual": ("rising", "medium", ["moes_2020"],
                   "Warming raises evaporative demand, though humidity, wind and cloud changes can offset it locally."),
    "water_balance": (None, "low", ["ipcc_wg2_ch10"],
                      "Depends on rain (uncertain) minus crop thirst (rising with heat); no robust local expectation."),
    "soil_wetness": (None, "low", ["ipcc_wg2_ch10"],
                     "No robust expectation at a single location; depends on rain and irrigation."),
}

STATUS_TEXT = {
    "consistent": "consistent with expected climate change",
    "not_consistent": "opposite to what climate change would suggest; look for local causes (irrigation, land use) or data problems",
    "not_detected": "expected change not detectable yet: it may be too small against year-to-year swings in 44 years at one place",
    "inconclusive": "inconclusive: datasets disagree",
    "artefact_risk": "inconclusive: the shift lines up with a likely change in the reanalysis behind NASA POWER",
    "no_expectation": "no strong climate-change expectation here; treat any trend as local variability",
}


def compare(ind: dict, exp_dir: str | None) -> str:
    conf, obs = ind["confidence"], ind["direction"]
    if conf == "uncertain":
        return "inconclusive"
    if exp_dir is None:
        return "no_expectation"
    if conf == "none":
        return "not_detected"
    return "consistent" if obs == exp_dir else "not_consistent"


def main() -> None:
    index = json.loads((TRENDS / "index.json").read_text(encoding="utf-8"))
    for s in index:
        path = TRENDS / f"{s['id']}.json"
        d = json.loads(path.read_text(encoding="utf-8"))
        buckets = {k: [] for k in STATUS_TEXT}
        # Same clustering rule as Layer 1: >=4 significant change points within +/-1 year
        cps = [i["change_point"]["year"] for i in d["indicators"].values() if i["change_point"]["p"] < 0.1]
        cluster_year = None
        if cps:
            mode = max(set(cps), key=lambda y: sum(abs(c - y) <= 1 for c in cps))
            if sum(abs(c - mode) <= 1 for c in cps) >= 4:
                cluster_year = mode
        for key, ind in d["indicators"].items():
            exp_dir, exp_conf, refs, why = EXPECTED[key]
            status = compare(ind, exp_dir)
            in_cluster = (cluster_year is not None and ind["change_point"]["p"] < 0.1
                          and abs(ind["change_point"]["year"] - cluster_year) <= 1)
            if in_cluster and status == "not_consistent":
                status = "artefact_risk"
            ind["layer2"] = {
                "expected": exp_dir or "no robust expectation", "expected_confidence": exp_conf,
                "status": status, "status_text": STATUS_TEXT[status],
                "artefact_risk": bool(in_cluster and status in ("consistent", "artefact_risk")),
                "why_expected": why, "refs": refs,
            }
            label = ind["label"] + (" (shift lines up with a possible data artefact)"
                                    if in_cluster and status == "consistent" else "")
            buckets[status].append(label)
        summary = []
        if buckets["consistent"]:
            summary.append("Consistent with climate change: " + "; ".join(buckets["consistent"]) + ".")
        if buckets["not_consistent"]:
            summary.append("Opposite to expectations (check local causes or data): " + "; ".join(buckets["not_consistent"]) + ".")
        if buckets["not_detected"]:
            summary.append("Expected to change but not detectable yet here: " + "; ".join(buckets["not_detected"]) + ".")
        if buckets["artefact_risk"]:
            summary.append(f"Opposite to expectations but probably a data artefact (shift around {cluster_year}): "
                           + "; ".join(buckets["artefact_risk"]) + ".")
        if buckets["inconclusive"]:
            summary.append("Inconclusive because NASA POWER and satellite rain disagree: " + "; ".join(buckets["inconclusive"]) + ".")
        summary.append("This is a consistency check against published assessments, not proof that climate change caused any single trend.")
        d["layer2_summary"] = summary
        d["references"] = REFERENCES
        path.write_text(json.dumps(d, indent=1, allow_nan=False), encoding="utf-8")
        print(f"\n=== {d['name']}")
        for line in summary:
            print("  -", line)


if __name__ == "__main__":
    main()
