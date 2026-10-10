"""Example 05 -- Agent-oriented search (Python)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient

with LawDiverClient() as client:
    found = client.search(
        query="can a landlord withhold a deposit for ordinary wear and tear",
        jurisdiction={"type": "one_state_plus_federal", "state": "FL"},
        limit=5,
        include={"caseCard": True, "opinionText": True, "goodLawReport": True},
        opinionTextMaxChars=10000,
    )

print(f"requestId: {found['requestId']}")
info = found.get("searchInfo") or {}
print(f"engines: {info.get('enginesUsed')}")
print()

for r in found["results"]:
    gl = r.get("goodLaw") or {}
    if gl.get("negative"):
        print(f"WARNING: BAD LAW · {r.get('caseName')} · {gl.get('status')}")
    elif gl.get("unknown"):
        print(f"? UNKNOWN treatment · {r.get('caseName')}")

    card = r.get("caseCard") or {}
    summary = (card.get("summaryAi") or "(no case card yet)")[:160]
    print(f"* {r.get('caseName')} -- {r.get('citation')}")
    print(f"  summary: {summary}")
    opinion = r.get("opinion")
    if opinion:
        text = " ".join((opinion.get("text") or "").split())
        print(
            f"  opinion: mode={opinion.get('mode')} chars={opinion.get('charCount')} "
            f"truncated={opinion.get('truncated')}"
        )
        print(f"  excerpt: {text[:120]}...")
    print()
