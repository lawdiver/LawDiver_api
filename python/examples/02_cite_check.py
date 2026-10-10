"""Example 02 -- Cite check citations (Python).

Match expanded rows on inputIndex (not array index). There is no cite
verdict "not_found" -- use not_in_corpus / implausible / not_covered / etc.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient


def summarize_negatives(item: dict) -> str | None:
    verdict = item.get("verdict")
    if verdict == "implausible":
        return "strong fabrication signal"
    if verdict == "not_in_corpus":
        return "searched held range, no match"
    if verdict == "not_covered":
        return "range not held / unparseable"
    if verdict == "unverified":
        return "cannot confirm or deny"
    if verdict == "error":
        if item.get("lookupStatus") == "deadline_exceeded":
            return "soft timeout (deadline_exceeded) -- not billed; retry"
        return "row failed -- not billed"
    return None


with LawDiverClient() as client:
    payload = client.cite_check(citations=["570 U.S. 744", "999 F.3d 1"])

print(f"requestId: {payload['requestId']}")
print(f"units: {payload['usage']['quantity']}")
print(f"rows: {len(payload['results'])} (may exceed input count for compounds)")
print()

for item in payload["results"]:
    label = item.get("citationAsSent") or item.get("citationAsWritten") or "(unknown)"
    idx = item.get("inputIndex", "?")
    unit = item.get("unitIndex")
    unit_bit = f" unit {unit}" if unit is not None else ""
    print(f"[input {idx}{unit_bit}] {label} -> {item['verdict']}")
    if item.get("lookupStatus"):
        print(f"  lookupStatus: {item['lookupStatus']}")
    if item.get("correctedCitation"):
        print(f"  Bluebook: {item['correctedCitation']}")
    if item.get("explanation"):
        print(f"  {item['explanation']}")
    if item.get("corpusCaveat"):
        print(f"  caveat: {item['corpusCaveat']}")
    note = summarize_negatives(item)
    if note:
        print(f"  note: {note}")
    if item["verdict"] in ("likely_valid", "name_mismatch", "page_mismatch"):
        for cand in item.get("candidates") or []:
            print(f"  candidate: {cand.get('bluebookCitation') or cand}")
    print()
