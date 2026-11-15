"""Does our upstream Cauvery index predict what Mettur actually did? (RESEARCH_LOG I-18)

Compares canal_index (IMERG upper-Cauvery catchment JJAS rain, with carry-over) with official Mettur records
(pipeline/data/mettur_releases.json, TN Agriculture Dept tables VII.8 / VII.10), 2001-2020:
  - opening delay (days after the customary 12 June)  -> expect negative correlation
  - season release (TMC) and storage at opening        -> expect positive correlation
Also fits the simplest opening rule (canals open late when the index is below a threshold) with
leave-one-out validation, so the threshold isn't just fitted to every year.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import numpy as np
from scipy import stats

HERE = Path(__file__).resolve().parent
M = json.loads((HERE / "data" / "mettur_releases.json").read_text())["seasons"]
C = json.loads((HERE / "data" / "cauvery_catchment_jjas.json").read_text())["jjas_mm"]
yrs_all = sorted(C["kodagu"])
cat = np.mean([[C[p][y] for y in yrs_all] for p in C], axis=0)
raw = {int(y): v / cat.mean() for y, v in zip(yrs_all, cat)}
combo = {y: 0.6 * raw[y] + 0.4 * raw.get(y - 1, raw[y]) for y in raw}
prev = {y: raw.get(y - 1, raw[y]) for y in raw}

years = sorted(int(y) for y in M)
delay = np.array([(dt.date.fromisoformat(M[str(y)]["opening"]) - dt.date(y, 6, 12)).days for y in years])
release = np.array([M[str(y)]["release_tmc"] for y in years])
storage = np.array([M[str(y)]["storage_tmc"] for y in years])
late = delay > 33          # opened after ~15 July: the Kuruvai sowing window is effectively lost

print(f"years {years[0]}-{years[-1]} (n={len(years)}); late openings (>15 Jul): {[y for y, l in zip(years, late) if l]}")
for name, idx in (("this year JJAS", raw), ("last year JJAS", prev), ("0.6/0.4 combo", combo)):
    x = np.array([idx[y] for y in years])
    r_d = stats.spearmanr(x, delay); r_r = stats.spearmanr(x, release); r_s = stats.spearmanr(x, storage)
    print(f"  {name:15s} vs opening delay rho {r_d[0]:+.2f} (p={r_d[1]:.3f}) | vs release rho {r_r[0]:+.2f} "
          f"(p={r_r[1]:.3f}) | vs storage-at-opening rho {r_s[0]:+.2f} (p={r_s[1]:.3f})")

# Leave-one-out: predict "late opening" from last year's index (storage carry-over is what's known in June)
x = np.array([prev[y] for y in years])
hits = 0
preds = []
for i in range(len(years)):
    tr = [j for j in range(len(years)) if j != i]
    best_t, best_acc = None, -1
    for t in np.unique(x[tr]):
        acc = np.mean((x[tr] <= t) == late[tr])
        if acc > best_acc:
            best_t, best_acc = t, acc
    pred = x[i] <= best_t
    preds.append(bool(pred))
    hits += pred == late[i]
base = max(late.mean(), 1 - late.mean())
print(f"\nLeave-one-out 'late opening' from last year's catchment index: accuracy {hits}/{len(years)} "
      f"= {hits/len(years):.0%} (always-guess-majority baseline {base:.0%})")
print("  per year (pred/actual late):", [(y, int(p), int(a)) for y, p, a in zip(years, preds, late)])
