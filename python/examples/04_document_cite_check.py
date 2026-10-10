"""Example 04 -- Document cite check (Python).

Usage: python examples/04_document_cite_check.py path/to/brief.pdf
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient

if len(sys.argv) < 2:
    print("Usage: python examples/04_document_cite_check.py <brief.pdf|docx>")
    raise SystemExit(1)

path = Path(sys.argv[1])

with LawDiverClient() as client:
    print(f"Uploading {path.name} ({path.stat().st_size} bytes)...")
    result = client.cite_check_document(path, download_report=True)

job = result["job"]
print(f"status: {job['status']}")
print(f"pages: {job.get('pageCount')} · citations: {job.get('citationCount')}")
print(f"counts: {job.get('counts')}")
if job.get("otherAuthoritiesFound"):
    print(f"other authorities (not verified): {job['otherAuthoritiesFound']}")

for item in job.get("citations") or []:
    label = item.get("citationAsSent") or item.get("citationAsWritten") or "(unknown)"
    status = f" ({item['lookupStatus']})" if item.get("lookupStatus") else ""
    print(f"  [input {item.get('inputIndex', '?')}] {label} -> {item.get('verdict')}{status}")

report = result.get("report")
if report:
    out = Path(f"cite-report-{job['jobId']}.pdf")
    out.write_bytes(report)
    print(f"wrote {out}")
