# Data pipeline

Builds `web/data/sites/<id>.json` (format: `docs/data_contract.md` section 2).
Demo region: Tamil Nadu, India (`tirunelveli` is the hero / sample site).

```bash
pip install -r pipeline/requirements.txt

# Tamil Nadu sites -> web/data/sites/, index.json, sample_site.json (= tirunelveli), pipeline/points.csv
python pipeline/build_all.py

# Same, but skip MODIS NDVI (fast; writes "ndvi": null)
python pipeline/build_all.py --no-ndvi

# NDVI from already-downloaded dates only (no ORNL requests; "years" = span actually cached)
python pipeline/build_all.py --ndvi-cache-only

# Old US demo sites -> web/data/sites/_us_backup/ (not listed in index.json)
python pipeline/build_all.py --us

# One site (also upserts it into index.json)
python pipeline/fetch_power.py --id tirunelveli --name "Tirunelveli (Thamirabarani valley)" --lat 8.70 --lon 77.75 --heat-c 38
```

| Module | Source | Produces |
|---|---|---|
| `fetch_power.py` | NASA POWER daily (AG), 2001-2024 | `monthly`, `frost`, `trends`, `annual`, `by_year`, `heat_threshold_c` |
| `fetch_soil.py` | ISRIC SoilGrids 2.0 (~15 s/call) | `soil` (0-30 cm thickness-weighted mean, USDA texture) |
| `fetch_ndvi.py` | MODIS MOD13Q1 via ORNL DAAC REST | `ndvi` (monthly median 2019-2024, bare months < 0.3) |
| `build_all.py` | all of the above | site files, index, sample, `points.csv` |

Each fetcher can also be run alone, e.g. `python pipeline/fetch_soil.py --id madurai --lat 10.03 --lon 78.33`.

Thresholds
- `heat_days`: days with tmax > `heat_threshold_c` (38 C for Tamil Nadu, 35 C for US sites).
- `heavy_rain_days`: days with precip >= 64.5 mm (India Meteorological Department "heavy rain").
- No frost in a year -> frost DOYs are `null` and `frost_free_days` is 365.

`points.csv` is a NASA AppEEARS point-sample upload (`ID,Category,Latitude,Longitude`):
each site's coordinate plus points 0.02 deg (~2 km) west and east.

Notes
- Raw responses are cached in `data/raw/` (gitignored), keyed by site id **and**
  lat/lon, so moving a site re-downloads. Delete a cache file to force a refresh.
- Soil and NDVI failures never stop the build; the field is written as `null`.
- NDVI is slow: ORNL takes ~40-55 s per request and 502s on anything longer than
  ~60 s, so we fetch one composite per month (72 single-date requests per site,
  8 in parallel, cached per date, 20-minute cap per site). A capped run keeps its
  cache, so re-running continues where it stopped.
