# SowSmart (ஸ்மார்ட் விதைப்பு)

Formerly Field Shift.

NASA Space Apps 2026: a crop-rotation decision-support tool built on NASA Earth observations.

## Quick start
```bash
pip install -r pipeline/requirements.txt
python pipeline/fetch_power.py --id iowa_ames --name "Ames, Iowa" --lat 42.03 --lon -93.62
python -m http.server 8000 --directory web
```
Then open http://localhost:8000.

## Layout
- `pipeline/`: Python scripts that pull NASA data and write `web/data/`
- `web/`: static site (GitHub Pages-ready)
- `docs/data_contract.md`: JSON formats shared between the two halves
- `CLAUDE.md`: plan, lanes, and rules for Claude Code sessions

## Data
- NASA POWER (https://power.larc.nasa.gov): daily temperature, precipitation, soil wetness

The tool supports farmer judgment and local agricultural expertise. It does not replace them.
