"""Example 07 -- Good-law + cited-by (Python)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient

case_id = sys.argv[1] if len(sys.argv) > 1 else "2812209"

with LawDiverClient() as client:
    good = client.good_law(case_id)
    print("=== Good-law ===")
    print(json.dumps(good, indent=2)[:1500])
    print()

    cited = client.cited_by(case_id, limit=10, offset=0)
    print("=== Cited by (first page) ===")
    print(f"total~ {cited.get('total', '?')} · requestId={cited.get('requestId')}")
    rows = cited.get("results") or cited.get("cases") or []
    for row in rows[:10]:
        print(f"* {row.get('caseName')} -- {row.get('citation')} ({row.get('year')})")

    meta = client.case_metadata(case_id)
    print("\n=== Metadata (truncated) ===")
    print(json.dumps(meta, indent=2)[:800])
