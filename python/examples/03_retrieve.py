"""Example 03 -- Case retrieve with did-you-mean (Python)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient

query = sys.argv[1] if len(sys.argv) > 1 else "410 U.S. 113"

with LawDiverClient() as client:
    hit = client.retrieve(query=query)

    if hit["status"] == "did_you_mean":
        print("Ambiguous -- candidates:")
        for c in hit.get("candidates") or []:
            print(
                f"  [{c.get('caseId')}] {c.get('bluebookCitation') or c.get('caseName')} "
                f"(confidence={c.get('confidence')})"
            )
        chosen = (hit.get("candidates") or [None])[0]
        if not chosen:
            print("No candidates returned.")
            raise SystemExit(0)
        print(f"\nResolving with caseId={chosen['caseId']}...")
        hit = client.retrieve(query=query, case_id=chosen["caseId"])

if hit["status"] == "not_found":
    print("No match.", hit.get("corpusCaveat") or "")
    print(f"requestId: {hit['requestId']}")
elif hit["status"] == "ok":
    case = hit["case"]
    print("OK")
    print(f"  caseId: {case.get('caseId')}")
    print(f"  name:   {case.get('caseName')}")
    print(f"  pdfUrl: {case.get('pdfUrl')}")
    print(f"  requestId: {hit['requestId']}")
