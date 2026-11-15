# Video graphics (from our own data)

Made by `pipeline/video_assets.py` for the 30-second video (issue #20). 1920×1080 PNG, app colours.

| File | What it shows |
|---|---|
| `monsoon_stripes.png` | 124 northeast monsoons at Thanjavur (IMD 1901–2024), one stripe per year; 2001 and 2016 marked |
| `memory_vs_record.png` | What a farmer remembers (2005–2014, lake-fed rice 9 of 10) vs the full record (16 of 23) |
| `plans_24.png` | Thanjavur on canal water: today's rice-rice plan 9 of 24 vs the bigger shift 16 of 24 |
| `gaja_track.png` | Cyclone Gaja's NOAA best track crossing the Cauvery delta, Nov 2018 |
| `map_drought.png`, `map_cyclones.png`, `map_heat2050.png`, `map_groundwater.png` | 0.25° statewide map frames |
| `thanjavur_seasons.json` | the per-year outcomes behind the squares, to animate them yourself |

Regenerate: `python pipeline/video_assets.py <path to ibtracs.NI.list.v04r01.csv>` (the Gaja frame needs the IBTrACS file).
