"""Give every statewide grid point a local name from the cached OpenStreetMap lookups (fetch_place_names.py).

Old: "near Chennai (47 km)" (no direction, same HQ for many points).
New (English): "<town or village> (<taluk> taluk, <district>)", e.g. "Chenbagaramanputhur (Thovalai taluk, Kanniyakumari)".
New (Tamil):   "<town or village in Tamil> (<district in Tamil>)". OSM has no Tamil taluk names, and we don't guess them.
Each point in grid/index.json also gets place / taluk / district (+ _ta) fields so the UI can group by district.

They are ADDED to grid/index.json as local_name / local_name_ta (+ place, taluk, district, side). The old `name`
stays unchanged because the web UI parses it (district-town grouping, compass direction from the HQ).

    python pipeline/name_grid_points.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "pipeline" / "data" / "nominatim_grid.json"
DATA = ROOT / "web" / "data"
PLACE_KEYS = ("city", "town", "municipality", "village", "suburb", "hamlet", "neighbourhood")


def clean_district(s: str | None) -> str | None:
    if not s:
        return None
    return re.sub(r"\s*(district|மாவட்டம்)$", "", s.strip(), flags=re.I)


STATE_TA = {"Kerala": "கேரளா", "Karnataka": "கர்நாடகா", "Andhra Pradesh": "ஆந்திரப் பிரதேசம்", "Puducherry": "புதுச்சேரி"}


def clean_taluk(s: str | None) -> str | None:
    return re.sub(r"\s+(taluk|mandal)$", "", s.strip(), flags=re.I) if s else None


def names(cache: dict, pid: str) -> dict:
    en = (cache.get(f"{pid}|en") or {}).get("address", {})
    ta = (cache.get(f"{pid}|ta") or {}).get("address", {})
    # a town or village first; "city" last because OSM tags whole metro areas ("Chennai Metropolitan Area") as city
    key = next((k for k in ("town", "village", "suburb", "hamlet", "municipality", "city") if en.get(k)), None)
    place = en.get(key) if key else None
    place_ta = ta.get(key) if key else None
    taluk = clean_taluk(en.get("county"))
    district = clean_district(en.get("state_district") or en.get("district"))
    district_ta = clean_district(ta.get("state_district") or ta.get("district")) or district
    state = en.get("state")
    if not place:          # forest, reservoir or fields at the cell centre: the taluk is the best name
        place, place_ta = (f"{taluk} taluk" if taluk else district), (f"{taluk} வட்டம்" if taluk else district_ta)
        name = f"{place} ({district})"
    else:
        name = f"{place} ({taluk} taluk, {district})" if taluk and taluk != place else f"{place} ({district})"
    name_ta = f"{place_ta or place} ({district_ta})"
    return {"name": name, "name_ta": name_ta, "place": place, "place_ta": place_ta or place,
            "taluk": taluk, "district": district, "district_ta": district_ta, "state": state}


def border_names(table: dict, pts: list[dict]) -> None:
    """Cells whose centre falls just over the state border: name them by the place over the border AND the nearest
    Tamil Nadu district, since the farmer using that cell is on the Tamil Nadu side."""
    tn = [p for p in pts if table[p["id"]]["state"] == "Tamil Nadu"]
    for p in pts:
        t = table[p["id"]]
        if t["state"] == "Tamil Nadu":
            continue
        near = min(tn, key=lambda q: (q["lat"] - p["lat"]) ** 2 + (q["lon"] - p["lon"]) ** 2)
        d, d_ta = table[near["id"]]["district"], table[near["id"]]["district_ta"]
        st, st_ta = t["state"], STATE_TA.get(t["state"], t["state"])
        t["name"] = f"{d} district, by the {st} border (near {t['place']})"
        t["name_ta"] = f"{d_ta} மாவட்டம், {st_ta} எல்லை அருகில் ({t['place_ta']})"
        t["border_state"] = st
        t.update(district=d, district_ta=d_ta)


def rewrite(obj, table, full=False):
    """Recursively set name/name_ta on any dict whose id is a grid point (place fields only when full)."""
    n = 0
    if isinstance(obj, dict):
        pid = obj.get("id")
        if isinstance(pid, str) and pid in table and "name" in obj:
            t = table[pid]
            obj["local_name"], obj["local_name_ta"] = t["name"], t["name_ta"]
            obj.update({k: t[k] for k in ("place", "place_ta", "taluk", "district", "district_ta", "side", "border_state") if k in t})
            n += 1
        for v in obj.values():
            n += rewrite(v, table, full)
    elif isinstance(obj, list):
        for v in obj:
            n += rewrite(v, table, full)
    return n


def main():
    cache = json.loads(CACHE.read_text(encoding="utf-8"))
    idx_path = DATA / "grid" / "index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8"))
    table = {p["id"]: names(cache, p["id"]) for p in idx["points"]}
    missing = [pid for pid in table if f"{pid}|en" not in cache]
    if missing:
        raise SystemExit(f"{len(missing)} points not looked up yet: run fetch_place_names.py")
    border_names(table, idx["points"])

    # the same name in several cells (usually a taluk with no village at the cell centre): add which side of the group
    # each cell is on, e.g. "Thovalai taluk, north (Kanniyakumari)", so every option is unique and still readable
    SIDE = {"N": ("north", "வடக்கு"), "S": ("south", "தெற்கு"), "E": ("east", "கிழக்கு"), "W": ("west", "மேற்கு"),
            "NE": ("north-east", "வடகிழக்கு"), "NW": ("north-west", "வடமேற்கு"),
            "SE": ("south-east", "தென்கிழக்கு"), "SW": ("south-west", "தென்மேற்கு"), "C": ("centre", "மையம்")}
    ll = lambda pid: tuple(int(x) / 100 for x in pid[1:].split("_"))
    seen = {}
    for pid, t in table.items():
        seen.setdefault(t["name"], []).append(pid)
    for nm, pids in seen.items():
        if len(pids) < 2:
            continue
        mlat = sum(ll(p)[0] for p in pids) / len(pids)
        mlon = sum(ll(p)[1] for p in pids) / len(pids)
        used = set()
        for pid in pids:
            lat, lon = ll(pid)
            ns = "N" if lat - mlat > 0.06 else "S" if mlat - lat > 0.06 else ""
            ew = "E" if lon - mlon > 0.06 else "W" if mlon - lon > 0.06 else ""
            side = (ns + ew) or "C"
            if side in used:                      # still clashing: fall back to coordinates
                side_en = side_ta = f"{lat:.2f}°N {lon:.2f}°E"
            else:
                side_en, side_ta = SIDE[side]
            used.add(side)
            t = table[pid]
            head, _, rest = t["name"].partition(" (")
            t["name"] = f"{head}, {side_en} ({rest}"
            head_ta, _, rest_ta = t["name_ta"].partition(" (")
            t["name_ta"] = f"{head_ta}, {side_ta} ({rest_ta}"
            t["side"] = side_en

    # only the index gains the local names: `name` ("near <HQ> (<km> km)") stays, because the web UI parses it for the
    # district-town grouping and compass direction (PR #25); the UI can show local_name alongside
    files = [idx_path]
    total = 0
    for f in files:
        if not f.exists():
            continue
        text = f.read_text(encoding="utf-8")
        d = idx if f == idx_path else json.loads(text)
        n = rewrite(d, table, full=(f == idx_path))
        if n:
            # keep each file's own layout (compact, or its indent width) so the diff is only the names
            lines = text.split("\n", 2)
            indent = (len(lines[1]) - len(lines[1].lstrip(" "))) if len(lines) > 1 else 0
            out = json.dumps(d, ensure_ascii=False, indent=indent) if indent else json.dumps(d, ensure_ascii=False, separators=(",", ":"))
            tmp = f.with_suffix(".tmp")
            tmp.write_text(out, encoding="utf-8")
            tmp.replace(f)
            total += n
    print(f"renamed {len(table)} points, {total} name fields in {len(files)} files")
    for pid in list(table)[:8]:
        print(pid, table[pid]["name"], "|", table[pid]["name_ta"])


if __name__ == "__main__":
    main()
