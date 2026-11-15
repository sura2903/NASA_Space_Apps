"""Fetch Tamil Nadu district crop Area-Production-Yield (APY) statistics for the yield backtest.

Source: Govt of India, Ministry of Agriculture & Farmers Welfare, Crop Statistics Information System
(DES), via the India Data Portal CKAN datastore (open API, no login):
  dataset "area-production-yield-apy", resource a000ce51-a257-42e3-8ab7-3cd212966f88
Output: pipeline/data/apy_tamil_nadu.csv

    python pipeline/fetch_apy.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import requests

BASE = "https://ckan.indiadataportal.com/api/3/action/datastore_search"
RESOURCE = "a000ce51-a257-42e3-8ab7-3cd212966f88"
OUT = Path(__file__).resolve().parent / "data" / "apy_tamil_nadu.csv"


def main() -> None:
    rows, offset, page = [], 0, 10000
    while True:
        r = requests.get(BASE, params={"resource_id": RESOURCE, "filters": json.dumps({"state_name": "Tamil Nadu"}),
                                       "limit": page, "offset": offset}, timeout=300)
        r.raise_for_status()
        res = r.json()["result"]
        rows += res["records"]
        print(f"fetched {len(rows)} / {res.get('total')}")
        offset += page
        if offset >= res.get("total", 0) or not res["records"]:
            break
    df = pd.DataFrame(rows).drop(columns=["_id"], errors="ignore")
    df.to_csv(OUT, index=False)
    print(f"wrote {OUT} ({len(df)} rows)")


if __name__ == "__main__":
    main()
