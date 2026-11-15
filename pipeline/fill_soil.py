"""Fill missing SoilGrids soil for grid places, one request at a time (SoilGrids times out under parallel load).

    python pipeline/fill_soil.py            # grid files with "soil": null
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from fetch_soil import fetch_soil

GRID = Path(__file__).resolve().parents[1] / "web" / "data" / "grid"


def main():
    todo = []
    for f in sorted(GRID.glob("g*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        if not s.get("soil"):
            todo.append((f, s))
    print(f"{len(todo)} places without soil", flush=True)
    filled = 0
    for f, s in todo:
        for attempt in range(3):
            soil = fetch_soil(s["lat"], s["lon"], s["id"])
            if soil:
                # re-read just before writing (other pipeline steps may have updated the file meanwhile),
                # then replace it atomically so no reader sees a half-written file
                s = json.loads(f.read_text(encoding="utf-8"))
                s["soil"] = soil
                tmp = f.with_suffix(".tmp")
                tmp.write_text(json.dumps(s, indent=2, allow_nan=False, ensure_ascii=False), encoding="utf-8")
                tmp.replace(f)
                filled += 1
                break
            time.sleep(10 * (attempt + 1))
        print(f"  {s['id']}: {s.get('soil', {}) and s['soil'].get('texture_class')}", flush=True)
    print(f"filled {filled}/{len(todo)}", flush=True)


if __name__ == "__main__":
    main()
