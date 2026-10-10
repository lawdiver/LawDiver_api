"""Example 10 -- Bulk upload.

Every API call has a time limit. When usage is high, a complex search can
time out before it finishes. Bulk upload attempts each call 3 times and
returns one JSON document when the job completes. When usage is low, calls
in the file run in parallel.

Docs: https://lawdiver.com/docs/api#bulk
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lawdiver import LawDiverClient

with LawDiverClient() as client:
    output = client.bulk_upload(
        [
            {"id": "jurisdictions", "method": "GET", "path": "/api/v1/jurisdictions"},
            {
                "id": "search",
                "method": "POST",
                "path": "/api/v1/search",
                "body": {
                    "query": "qualified immunity",
                    "jurisdiction": {"type": "us_supreme_court"},
                    "limit": 3,
                },
            },
        ]
    )

print(f"status={output.get('status')} succeeded={output.get('succeeded')} failed={output.get('failed')}")
for row in output.get("results") or []:
    print(f"  {row.get('id')}: ok={row.get('ok')} attempts={row.get('attempts')} http={row.get('httpStatus')}")
print(f"requestId: {output.get('requestId')}")
