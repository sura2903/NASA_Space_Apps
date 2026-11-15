"""Data graphics for the 30-second video (docs/video/*.png), all drawn from the project's own data.

  monsoon_stripes.png        124 years of Oct-Dec rain at Thanjavur's IMD cell, one stripe per year (brown dry ->
                             blue wet), 2016 and 2001 marked: "this is what a 10-year memory misses"
  memory_vs_record.png       10 remembered seasons (2005-2014, 9 of 10) vs the full record (16 of 23), lake-fed rice
  plans_24.png               Thanjavur: today's rice-rice plan 9 of 24 vs the bigger shift 16 of 24 (canal water)
  gaja_track.png             Cyclone Gaja's real NOAA best track crossing the Cauvery delta, Nov 2018
  map_<layer>.png            0.25 deg statewide map frames: 1-in-100 drought, cyclones, extra hot days 2041-60,
                             groundwater trend (from web/data/statewide_risk.json)
Colours follow the app (green #2F7D32, monsoon orange #B5561B, paper #F6F3EA, deep green #13241A).
All 1920x1080 unless noted, transparent-free so they drop straight into a video editor.

    python pipeline/video_assets.py [path to ibtracs.NI.list.v04r01.csv]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap, Normalize
from matplotlib.patches import Polygon, Rectangle
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "video"
PAPER, DARK, GREEN, ORANGE, INK2 = "#F6F3EA", "#13241A", "#2F7D32", "#B5561B", "#4B5A50"
RED = "#C0442B"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 22})


def canvas(bg=PAPER):
    fig = plt.figure(figsize=(19.2, 10.8), dpi=100, facecolor=bg)
    return fig


def save(fig, name):
    fig.savefig(OUT / name, facecolor=fig.get_facecolor())
    plt.close(fig)
    print("wrote", name)


def monsoon_stripes():
    imd = json.loads((ROOT / "pipeline" / "data" / "imd_1deg_tn.json").read_text())
    cell = "10.5_79.5"
    yrs = sorted(int(y) for y in imd["years"])
    v = np.array([imd["years"][str(y)].get(cell, {}).get("ne_mm", np.nan) for y in yrs], float)
    v[v <= 0] = np.nan
    pct = 100 * v / np.nanmean(v)
    cmap = LinearSegmentedColormap.from_list("monsoon", ["#7A3E12", "#D9A066", "#F3EAD7", "#7FB3D5", "#1F5E8C"])
    norm = Normalize(30, 170)
    fig = canvas(DARK)
    ax = fig.add_axes([0.04, 0.2, 0.92, 0.5]); ax.set_axis_off()
    for i, (y, p) in enumerate(zip(yrs, pct)):
        ax.add_patch(Rectangle((i, 0), 1, 1, color="#555" if np.isnan(p) else cmap(norm(p)), lw=0))
    ax.set_xlim(0, len(yrs)); ax.set_ylim(0, 1)
    for y, lab in ((2016, "2016"), (2001, "2001")):
        i = yrs.index(y)
        ax.annotate(lab, (i + 0.5, 1.0), (i + 0.5, 1.1), color="#EEF2EA", ha="center", fontsize=26, fontweight="bold",
                    arrowprops=dict(arrowstyle="-", color="#EEF2EA", lw=2))
    fig.text(0.04, 0.88, "124 northeast monsoons at Thanjavur, 1901–2024", color="#EEF2EA", fontsize=40, fontweight="bold")
    fig.text(0.04, 0.09, "one stripe per year · brown = dry, blue = wet · IMD gridded rain", color="#B9CBBE", fontsize=26)
    fig.text(0.04, 0.15, "1901", color="#B9CBBE", fontsize=24); fig.text(0.96, 0.15, "2024", color="#B9CBBE", fontsize=24, ha="right")
    save(fig, "monsoon_stripes.png")


def tiles(ax, years, x0, y0, size, gap, show_years=False):
    for i, (y, ok) in enumerate(years):
        ax.add_patch(Rectangle((x0 + i * (size + gap), y0), size, size, color=GREEN if ok else RED, lw=0))
        if show_years and (i == 0 or i == len(years) - 1 or y == 2016):
            ax.text(x0 + i * (size + gap) + size / 2, y0 - 0.35, str(y), ha="center", va="top", fontsize=20, color=INK2)


def memory_vs_record():
    d = json.loads((OUT / "thanjavur_seasons.json").read_text())["long_rice_lake_pond"]["years"]
    mem = [x for x in d if 2005 <= x[0] <= 2014]
    fig = canvas(); ax = fig.add_axes([0, 0, 1, 1]); ax.set_axis_off(); ax.set_xlim(0, 32); ax.set_ylim(0, 18)
    ax.text(1, 16.2, "What a farmer remembers", fontsize=40, fontweight="bold", color=DARK)
    ax.text(1, 15.0, "2005–2014 · lake-fed long rice, Thanjavur", fontsize=26, color=INK2)
    tiles(ax, mem, 1, 11, 2.2, 0.35, show_years=True)
    ax.text(27.3, 12.1, "9 of 10", fontsize=44, fontweight="bold", color=GREEN)
    ax.text(1, 7.6, "What NASA’s 24-year record shows", fontsize=40, fontweight="bold", color=DARK)
    tiles(ax, d, 1, 3.5, 0.9, 0.15, show_years=True)
    ax.text(28.8, 3.7, "16 of 23", fontsize=40, fontweight="bold", color=ORANGE, ha="center")
    ax.text(1, 0.8, "green = came through · red = failed · engine replay of real seasons", fontsize=22, color=INK2)
    save(fig, "memory_vs_record.png")


def plans_24():
    d = json.loads((OUT / "thanjavur_seasons.json").read_text())
    fig = canvas(); ax = fig.add_axes([0, 0, 1, 1]); ax.set_axis_off(); ax.set_xlim(0, 32); ax.set_ylim(0, 18)
    ax.text(1, 16.2, "Thanjavur · river canal water · 24 real seasons", fontsize=40, fontweight="bold", color=DARK)
    for row, (key, title, col) in enumerate((("current_canal", "Today: rice → rice", ORANGE), ("bigger_shift_canal", "Bigger shift: millet → cotton", GREEN))):
        y = 11 - row * 6
        ax.text(1, y + 2.0, title, fontsize=32, fontweight="bold", color=DARK)
        tiles(ax, d[key]["years"], 1, y, 0.95, 0.15, show_years=True)
        ax.text(29.5, y + 0.2, f"{d[key]['good']} of 24", fontsize=44, fontweight="bold", color=col, ha="center")
    ax.text(1, 0.8, "green = came through · red = failed · SowSmart engine replay", fontsize=22, color=INK2)
    save(fig, "plans_24.png")


def outline():
    from build_grid import TN_OUTLINE   # the state outline used to choose grid cells
    return TN_OUTLINE


def gaja_track(csv):
    import pandas as pd
    df = pd.read_csv(csv, skiprows=[1], low_memory=False, usecols=["SEASON", "NAME", "ISO_TIME", "LAT", "LON", "WMO_WIND", "USA_WIND"])
    g = df[(df.NAME == "GAJA") & (df.SEASON == 2018)].copy()
    for c in ("LAT", "LON", "WMO_WIND", "USA_WIND"):
        g[c] = pd.to_numeric(g[c], errors="coerce")
    g["kt"] = g[["WMO_WIND", "USA_WIND"]].max(axis=1)
    poly = outline()
    fig = canvas(); ax = fig.add_axes([0.05, 0.13, 0.9, 0.74]); ax.set_axis_off()
    ax.add_patch(Polygon(poly, closed=True, facecolor="#E3EDDC", edgecolor=DARK, lw=2))
    ax.plot(g.LON, g.LAT, color=ORANGE, lw=5, alpha=0.9)
    big = g[g.kt >= 48]
    ax.scatter(big.LON, big.LAT, s=(big.kt - 30) * 6, color=ORANGE, alpha=0.5, lw=0)
    ax.scatter([79.14], [10.79], s=180, color=DARK, zorder=5); ax.text(79.0, 10.62, "Thanjavur", fontsize=26, ha="right", color=DARK)
    ax.set_xlim(76.0, 84.0); ax.set_ylim(8.0, 13.8); ax.set_aspect("equal")
    fig.text(0.05, 0.92, "Cyclone Gaja, 16 November 2018 · NOAA best track", fontsize=40, fontweight="bold", color=DARK)
    fig.text(0.05, 0.04, "Delta Samba rice was hit by a cyclone near harvest in 8 of 44 seasons since 1981", fontsize=26, color=INK2)
    save(fig, "gaja_track.png")


def map_frames():
    r = json.loads((ROOT / "web" / "data" / "statewide_risk.json").read_text(encoding="utf-8"))
    cell = json.loads((ROOT / "web" / "data" / "grid" / "index.json").read_text(encoding="utf-8"))["cell_deg"]
    poly = outline()
    layers = [("drought", "extremes.drought_100yr_pct_of_normal", "A 1-in-100-year drought (% of normal Oct–Dec rain)", "YlOrBr_r"),
              ("cyclones", "wind.cyclones_per_decade", "Cyclones passing within 100 km, per decade (NOAA)", "Blues"),
              ("heat2050", "future.ssp245.hot_days_change", "Extra very hot days a year by 2041–2060 (NASA NEX-GDDP)", "OrRd"),
              ("groundwater", "climate.groundwater_trend_cm_per_year", "Groundwater trend, cm per year (NASA GRACE)", "BrBG")]
    for name, key, title, cm in layers:
        vals = []
        for p in r["points"]:
            v = p
            for part in key.split("."):
                v = v.get(part) if isinstance(v, dict) else None
            if isinstance(v, (int, float)):
                vals.append((p["lat"], p["lon"], v))
        if not vals:
            print("skip", name); continue
        a = np.array(vals)
        fig = canvas(); ax = fig.add_axes([0.05, 0.05, 0.62, 0.82]); ax.set_axis_off()
        lo, hi = np.percentile(a[:, 2], [2, 98])
        if name == "groundwater":
            m = max(abs(lo), abs(hi)); lo, hi = -m, m
        norm = Normalize(lo, hi); cmap = plt.get_cmap(cm)
        for la, lo_, v in a:
            ax.add_patch(Rectangle((lo_ - cell / 2, la - cell / 2), cell, cell, color=cmap(norm(v)), lw=0))
        ax.add_patch(Polygon(poly, closed=True, fill=False, edgecolor=DARK, lw=2))
        ax.set_xlim(76.0, 80.7); ax.set_ylim(7.9, 13.8); ax.set_aspect("equal")
        cax = fig.add_axes([0.72, 0.25, 0.02, 0.5])
        sm = plt.cm.ScalarMappable(norm=norm, cmap=cmap); fig.colorbar(sm, cax=cax)
        fig.text(0.05, 0.92, title, fontsize=34, fontweight="bold", color=DARK)
        fig.text(0.72, 0.18, f"{len(vals)} places · 0.25° grid", fontsize=22, color=INK2)
        save(fig, f"map_{name}.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    monsoon_stripes(); memory_vs_record(); plans_24(); map_frames()
    if len(sys.argv) > 1:
        gaja_track(sys.argv[1])


if __name__ == "__main__":
    main()
