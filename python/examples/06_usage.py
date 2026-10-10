"""Example 06 -- Discovery + usage (Python)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient

with LawDiverClient() as client:
    print("=== Discovery (public) ===")
    discovery = client.discovery()
    print(json.dumps(discovery, indent=2)[:800] + "\n...\n")

    print("=== Usage (authenticated) ===")
    usage = client.usage(30)

consumer = usage.get("consumer") or {}
limits = usage.get("limits") or {}
print(f"consumer: {consumer.get('name')} <{consumer.get('email')}> [{consumer.get('status')}]")
print(f"periodDays: {usage.get('periodDays')} since {usage.get('since')}")
print(f"rateLimitPerMinute: {limits.get('rateLimitPerMinute')}")
print(f"dailyRequestLimit: {limits.get('dailyRequestLimit')}")
print(f"maxCasesPerSearch: {limits.get('maxCasesPerSearch')}")
print()
print("byOperation:")
for row in usage.get("byOperation") or []:
    print(f"  {row['operation']}: calls={row['calls']} units={row['units']}")
print(f"requestId: {usage.get('requestId')}")
