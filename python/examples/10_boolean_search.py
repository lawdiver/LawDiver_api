"""Example 10 -- Boolean (terms-and-connectors) search (Python).

searchType "boolean" is strict Terms and Connectors. keyword is the old name and runs the same search.
On this pin, lowercase and/or/not are connectors. /s is 25 words and /p is 80 words.
searchInfo.booleanOperatorsDetected is true when the parser saw them.

Docs: https://lawdiver.com/docs/api
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient

with LawDiverClient() as client:
    found = client.search(
        query='"qualified immunity" /s "clearly established" AND NOT prison',
        jurisdiction={"type": "federal_circuit", "circuit": "11"},
        searchType="boolean",
        limit=5,
        filters={"dateFrom": "2015-01-01"},
        idempotency_key=f"boolean-demo-{uuid.uuid4()}",
    )

info = found.get("searchInfo") or {}
print(f"requestId: {found['requestId']}")
print(f"booleanOperatorsDetected: {info.get('booleanOperatorsDetected')}")
print(f"returned {found['total']}")
print()

for r in found["results"]:
    flag = " connectorMatch=false" if r.get("connectorMatch") is False else ""
    print(f"* {r.get('caseName')}{flag}")
    print(f"  {r.get('citation') or '(no citation)'}")
    print()

if found.get("suggestion"):
    print("Suggestion:", found["suggestion"])
