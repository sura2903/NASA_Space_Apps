"""Tamil names for the 47 statewide grid places (`name_ta`), e.g. "near Karur (30 km)" -> "கரூர் அருகில் (30 கி.மீ.)".

Writes name_ta into web/data/grid/index.json and every web/data/grid/<id>.json. The UI shows it in the Tamil view
(i18n siteName falls back to it). Town spellings follow the Tamil Nadu government's district names.

    python pipeline/add_tamil_names.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRID = ROOT / "web" / "data" / "grid"
TA = {
    "Chennai": "சென்னை", "Dharmapuri": "தருமபுரி", "Dindigul": "திண்டுக்கல்", "Erode": "ஈரோடு",
    "Kanchipuram": "காஞ்சிபுரம்", "Karur": "கரூர்", "Krishnagiri": "கிருஷ்ணகிரி", "Madurai": "மதுரை",
    "Nagapattinam": "நாகப்பட்டினம்", "Nagercoil (Kanyakumari)": "நாகர்கோவில் (கன்னியாகுமரி)", "Namakkal": "நாமக்கல்",
    "Perambalur": "பெரம்பலூர்", "Pudukkottai": "புதுக்கோட்டை", "Ramanathapuram": "இராமநாதபுரம்", "Salem": "சேலம்",
    "Sivaganga": "சிவகங்கை", "Tenkasi": "தென்காசி", "Thanjavur": "தஞ்சாவூர்", "Theni": "தேனி",
    "Tiruchirappalli": "திருச்சிராப்பள்ளி", "Tirunelveli": "திருநெல்வேலி", "Tiruppur": "திருப்பூர்",
    "Tiruvallur": "திருவள்ளூர்", "Tiruvannamalai": "திருவண்ணாமலை", "Udhagamandalam (Nilgiris)": "உதகமண்டலம் (நீலகிரி)",
    "Vellore": "வேலூர்", "Villupuram": "விழுப்புரம்", "Virudhunagar": "விருதுநகர்",
}


def tamil(name: str) -> str:
    m = re.match(r"^near\s+(.*?)\s*\((\d+)\s*km\)$", name)
    if not m:
        raise ValueError(name)
    town, km = m.groups()
    return f"{TA[town]} அருகில் ({km} கி.மீ.)"


def main():
    idx = json.loads((GRID / "index.json").read_text(encoding="utf-8"))
    for p in idx["points"]:
        p["name_ta"] = tamil(p["name"])
        f = GRID / f"{p['id']}.json"
        s = json.loads(f.read_text(encoding="utf-8"))
        s["name_ta"] = p["name_ta"]
        f.write_text(json.dumps(s, indent=2, allow_nan=False, ensure_ascii=False), encoding="utf-8")
    (GRID / "index.json").write_text(json.dumps(idx, indent=2, ensure_ascii=False), encoding="utf-8")
    print(len(idx["points"]), "names, e.g.", [(p["name"], p["name_ta"]) for p in idx["points"][:3]])


if __name__ == "__main__":
    main()
