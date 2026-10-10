"""Example 01 -- Case search (Python).

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
        query="qualified immunity excessive force",
        jurisdiction={"type": "federal_circuit", "circuit": "11"},
        limit=5,
        filters={"dateFrom": "2015-01-01"},
        idempotency_key=f"search-demo-{uuid.uuid4()}",
    )

print(f"requestId: {found['requestId']}")
print(f"returned {found['total']} of ~{found.get('totalAvailable', '?')} matches")
usage = found["usage"]
print(f"usage: {usage['quantity']} unit(s) · operation={usage['operation']}")
print()

for r in found["results"]:
    gl = r.get("goodLaw") or {}
    flag = " (NEGATIVE)" if gl.get("negative") else ""
    print(f"* {r.get('caseName')}")
    print(f"  {r.get('citation') or '(no citation)'} · {r.get('courtAbbreviation') or r.get('court') or ''}")
    print(f"  goodLaw={gl.get('status', '?')}{flag}")
    snippet = r.get("snippet") or ""
    if snippet:
        print(f"  snippet: {snippet[:140]}...")
    print()
