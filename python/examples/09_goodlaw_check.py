"""Example 09 -- Goodlaw check (Python)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient

case_id = sys.argv[1] if len(sys.argv) > 1 else "2812209"

with LawDiverClient() as client:
    recent = client.goodlaw_check(case_id, limit="10", order="recent")
    print(f"=== Goodlaw check (recent, limit 10) total={recent.get('total')} ===")
    for row in recent.get("citingCases") or []:
        pin = f" [{row.get('pin')}]" if row.get("pin") else ""
        print(f"* {row.get('caseName')} -- {row.get('status')}{pin}")

    negative = client.goodlaw_check(case_id, limit="10", order="negative")
    print(f"\n=== Goodlaw check (negative, limit 10) total={negative.get('total')} ===")
    for row in negative.get("citingCases") or []:
        pin = f" [{row.get('pin')}]" if row.get("pin") else ""
        print(f"* {row.get('caseName')} -- {row.get('status')}{pin}")
